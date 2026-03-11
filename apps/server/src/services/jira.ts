import { env } from "@ez-jira-log/env/server";

import type {
  Activity,
  DayStatus,
  ExistingWorklog,
  JiraIssue,
  JiraWorklog,
  WorklogEntry,
  WorklogSubmitResult,
} from "../types";
import { cache } from "./cache";

const authHeader = `Basic ${btoa(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`)}`;

const headers = {
  Authorization: authHeader,
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function fetchJira<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${env.JIRA_URL}/rest/api/3${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira API error: ${res.status} ${res.statusText} - ${body}`);
  }
  return res.json() as Promise<T>;
}

let _currentAccountId: string | null = null;

async function getCurrentAccountId(): Promise<string> {
  if (_currentAccountId) return _currentAccountId;

  const me = await fetchJira<{ accountId: string }>("/myself");
  _currentAccountId = me.accountId;
  return _currentAccountId;
}

export async function getIssueSummary(
  issueKey: string,
): Promise<{ key: string; summary: string } | null> {
  const cacheKey = cache.buildKey("jira", "issue", issueKey);
  const cached = cache.get<{ key: string; summary: string }>(cacheKey);
  if (cached) return cached;

  try {
    const issue = await fetchJira<JiraIssue>(
      `/issue/${issueKey}?fields=summary`,
    );
    const result = { key: issue.key, summary: issue.fields.summary };
    cache.set(cacheKey, result, 10 * 60 * 1000);
    return result;
  } catch {
    return null;
  }
}

export async function getMyIssues(from: string, to: string): Promise<JiraIssue[]> {
  const cacheKey = cache.buildKey("jira", "issues", from, to);
  const cached = cache.get<JiraIssue[]>(cacheKey);
  if (cached) return cached;

  const jql = `worklogAuthor = currentUser() AND worklogDate >= "${from}" AND worklogDate <= "${to}" ORDER BY updated DESC`;

  const allIssues: JiraIssue[] = [];
  let nextPageToken: string | undefined;
  const maxResults = 50;

  for (let page = 0; page < 100; page++) {
    const params = new URLSearchParams({
      jql,
      maxResults: String(maxResults),
      fields: "summary,status,assignee,issuetype,project",
    });
    if (nextPageToken) params.set("nextPageToken", nextPageToken);

    const result = await fetchJira<{ issues: JiraIssue[]; isLast?: boolean; nextPageToken?: string }>(
      `/search/jql?${params.toString()}`,
    );

    allIssues.push(...(result.issues ?? []));

    if (result.isLast !== false || !result.nextPageToken) break;
    nextPageToken = result.nextPageToken;
  }

  cache.set(cacheKey, allIssues);
  return allIssues;
}

export async function getWorklogs(
  issueKey: string,
  from: string,
  to: string,
): Promise<JiraWorklog[]> {
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T23:59:59Z`);

  const startedAfter = fromDate.getTime();
  const startedBefore = toDate.getTime();

  const [result, myAccountId] = await Promise.all([
    fetchJira<{ worklogs: JiraWorklog[] }>(
      `/issue/${issueKey}/worklog?startedAfter=${startedAfter}&startedBefore=${startedBefore}`,
    ),
    getCurrentAccountId(),
  ]);

  return result.worklogs.filter((w) => {
    const started = new Date(w.started);
    return (
      started >= fromDate &&
      started <= toDate &&
      w.author.accountId === myAccountId
    );
  });
}

function extractWorklogComment(wl: JiraWorklog): string {
  try {
    return wl.comment?.content?.[0]?.content?.[0]?.text ?? "";
  } catch {
    return "";
  }
}

export interface DetailedWorklogResult {
  statuses: DayStatus[];
  worklogsByDate: Map<string, ExistingWorklog[]>;
}

export async function getDetailedWorklogs(
  from: string,
  to: string,
  targetHours: number,
): Promise<DetailedWorklogResult> {
  const cacheKey = cache.buildKey("jira", "detailed", from, to);
  const cached = cache.get<DetailedWorklogResult>(cacheKey);
  if (cached) return cached;

  const issues = await getMyIssues(from, to);
  const issueMap = new Map(issues.map((i) => [i.key, i]));

  const dayHours = new Map<string, number>();
  const worklogsByDate = new Map<string, ExistingWorklog[]>();

  const fromDate = new Date(`${from}T12:00:00`);
  const toDate = new Date(`${to}T12:00:00`);
  for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dayHours.set(key, 0);
    worklogsByDate.set(key, []);
  }

  for (const issue of issues) {
    try {
      const worklogs = await getWorklogs(issue.key, from, to);
      for (const w of worklogs) {
        const wStarted = new Date(w.started);
      const dateKey = `${wStarted.getFullYear()}-${String(wStarted.getMonth() + 1).padStart(2, "0")}-${String(wStarted.getDate()).padStart(2, "0")}`;
        const hours = w.timeSpentSeconds / 3600;

        const currentHours = dayHours.get(dateKey) ?? 0;
        dayHours.set(dateKey, currentHours + hours);

        const dayWorklogs = worklogsByDate.get(dateKey) ?? [];
        dayWorklogs.push({
          id: w.id,
          issueKey: issue.key,
          issueSummary: issueMap.get(issue.key)?.fields.summary ?? issue.key,
          hours: Math.round(hours * 100) / 100,
          comment: extractWorklogComment(w),
          started: w.started,
        });
        worklogsByDate.set(dateKey, dayWorklogs);
      }
    } catch (err) {
      console.warn(`[jira] Failed to fetch worklogs for ${issue.key}:`, err);
    }
  }

  const statuses: DayStatus[] = [];
  for (const [date, hoursLogged] of dayHours) {
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    statuses.push({
      date,
      hoursLogged: Math.round(hoursLogged * 100) / 100,
      target: targetHours,
      status: isWeekend ? "off" : hoursLogged >= targetHours ? "complete" : "incomplete",
    });
  }

  const result = { statuses, worklogsByDate };
  cache.set(cacheKey, result);
  return result;
}

export async function getWorklogStatus(
  from: string,
  to: string,
  targetHours: number,
): Promise<DayStatus[]> {
  const { statuses } = await getDetailedWorklogs(from, to, targetHours);
  return statuses;
}

export async function submitWorklog(entry: WorklogEntry): Promise<WorklogSubmitResult> {
  try {
    const startedDate = entry.started
      ? new Date(entry.started)
      : new Date(`${entry.date}T09:00:00.000+0700`);

    await fetchJira(`/issue/${entry.issueKey}/worklog`, {
      method: "POST",
      body: JSON.stringify({
        timeSpentSeconds: entry.timeSpentSeconds,
        started: startedDate.toISOString().replace("Z", "+0000"),
        comment: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: entry.comment }],
            },
          ],
        },
      }),
    });

    return { issueKey: entry.issueKey, date: entry.date, success: true };
  } catch (error) {
    return {
      issueKey: entry.issueKey,
      date: entry.date,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deleteWorklog(
  issueKey: string,
  worklogId: string,
): Promise<void> {
  const res = await fetch(
    `${env.JIRA_URL}/rest/api/3/issue/${issueKey}/worklog/${worklogId}`,
    { method: "DELETE", headers },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Failed to delete worklog: ${res.status} ${res.statusText} - ${body}`,
    );
  }
  cache.invalidate("jira");
}

export async function batchSubmitWorklogs(entries: WorklogEntry[]): Promise<WorklogSubmitResult[]> {
  const results: WorklogSubmitResult[] = [];
  for (const entry of entries) {
    const result = await submitWorklog(entry);
    results.push(result);
  }

  cache.invalidate("jira");
  return results;
}

export function issuesToActivities(issues: JiraIssue[]): Activity[] {
  return issues.map((issue) => ({
    id: `jira-${issue.key}`,
    source: "jira" as const,
    type: "ticket" as const,
    title: `[${issue.key}] ${issue.fields.summary}`,
    description: `Status: ${issue.fields.status.name} | Type: ${issue.fields.issuetype.name}`,
    jiraKey: issue.key,
    timestamp: new Date().toISOString(),
  }));
}
