import { env } from "@ez-jira-log/env/server";

import type { Activity, GitLabCommit, GitLabMergeRequest } from "../types";
import { cache } from "./cache";

const JIRA_KEY_REGEX = /([A-Z][A-Z0-9]+-\d+)/g;

const headers = {
  "PRIVATE-TOKEN": env.GITLAB_TOKEN,
  "Content-Type": "application/json",
};

async function fetchGitLab<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${env.GITLAB_URL}/api/v4${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    throw new Error(`GitLab API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function fetchAllPages<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  const perPage = "100";

  while (true) {
    const data = await fetchGitLab<T[]>(path, { ...params, page: String(page), per_page: perPage });
    results.push(...data);
    if (data.length < Number(perPage)) break;
    page++;
  }
  return results;
}

export function parseJiraKeys(text: string): string[] {
  const matches = text.match(JIRA_KEY_REGEX);
  return matches ? [...new Set(matches)] : [];
}

export async function getCommits(from: string, to: string): Promise<GitLabCommit[]> {
  const cacheKey = cache.buildKey("gitlab", "commits", from, to);
  const cached = cache.get<GitLabCommit[]>(cacheKey);
  if (cached) return cached;

  const events = await fetchAllPages<{ project_id: number }>("/events", {
    after: from,
    before: to,
    action: "pushed",
  });

  const projectIds = [...new Set(events.map((e) => e.project_id))];

  const seen = new Set<string>();
  const allCommits: GitLabCommit[] = [];
  for (const projectId of projectIds) {
    const commits = await fetchAllPages<GitLabCommit>(
      `/projects/${projectId}/repository/commits`,
      {
        since: `${from}T00:00:00Z`,
        until: `${to}T23:59:59Z`,
        author: env.GITLAB_USERNAME,
        all: "true",
      },
    );
    for (const c of commits) {
      if (seen.has(c.id)) continue;
      if (/^Merge\s+(branch|remote-tracking)\s+/i.test(c.title)) continue;
      seen.add(c.id);
      allCommits.push(c);
    }
  }

  cache.set(cacheKey, allCommits);
  return allCommits;
}

export async function getMergeRequests(from: string, to: string): Promise<GitLabMergeRequest[]> {
  const cacheKey = cache.buildKey("gitlab", "mrs", from, to);
  const cached = cache.get<GitLabMergeRequest[]>(cacheKey);
  if (cached) return cached;

  const mrs = await fetchAllPages<GitLabMergeRequest>("/merge_requests", {
    author_username: env.GITLAB_USERNAME,
    created_after: `${from}T00:00:00Z`,
    created_before: `${to}T23:59:59Z`,
    scope: "all",
  });

  cache.set(cacheKey, mrs);
  return mrs;
}

export function commitsToActivities(commits: GitLabCommit[]): Activity[] {
  return commits.map((c) => ({
    id: `gitlab-commit-${c.short_id}`,
    source: "gitlab" as const,
    type: "commit" as const,
    title: c.title,
    description: c.message,
    jiraKey: parseJiraKeys(c.message)[0],
    timestamp: c.authored_date,
    url: c.web_url,
  }));
}

export function mrsToActivities(mrs: GitLabMergeRequest[]): Activity[] {
  return mrs.map((mr) => {
    const keysFromTitle = parseJiraKeys(mr.title);
    const keysFromDesc = parseJiraKeys(mr.description ?? "");
    const keysFromBranch = parseJiraKeys(mr.source_branch);
    const jiraKey = keysFromTitle[0] ?? keysFromDesc[0] ?? keysFromBranch[0];

    return {
      id: `gitlab-mr-${mr.iid}`,
      source: "gitlab" as const,
      type: "merge_request" as const,
      title: mr.title,
      description: mr.description ?? "",
      jiraKey,
      timestamp: mr.created_at,
      url: mr.web_url,
    };
  });
}
