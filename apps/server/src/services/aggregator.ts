import prisma from "@ez-jira-log/db";

import type { Activity, DayActivity } from "../types";
import { eventsToActivities, getEvents, refreshAccessToken } from "./calendar";
import { commitsToActivities, getCommits, mrsToActivities, getMergeRequests } from "./gitlab";
import {
  getMyIssues,
  getDetailedWorklogs,
  issuesToActivities,
} from "./jira";

function groupByDate(activities: Activity[]): Map<string, Activity[]> {
  const map = new Map<string, Activity[]>();
  for (const activity of activities) {
    const dateKey = activity.timestamp.slice(0, 10);
    const existing = map.get(dateKey) ?? [];
    existing.push(activity);
    map.set(dateKey, existing);
  }
  return map;
}

function correlateActivities(activities: Activity[]): Activity[] {
  const jiraActivities = activities.filter((a) => a.source === "jira");
  const jiraKeys = new Set(jiraActivities.map((a) => a.jiraKey).filter(Boolean));

  return activities.map((activity) => {
    if (activity.source !== "jira" && activity.jiraKey && jiraKeys.has(activity.jiraKey)) {
      return activity;
    }
    return activity;
  });
}

export async function getAggregatedActivities(
  userId: string,
  from: string,
  to: string,
): Promise<DayActivity[]> {
  const allActivities: Activity[] = [];

  const [commits, mrs, issues] = await Promise.all([
    getCommits(from, to).catch(() => []),
    getMergeRequests(from, to).catch(() => []),
    getMyIssues(from, to).catch(() => []),
  ]);

  allActivities.push(...commitsToActivities(commits));
  allActivities.push(...mrsToActivities(mrs));
  allActivities.push(...issuesToActivities(issues));

  try {
    const userConfig = await prisma.userConfig.findUnique({
      where: { userId },
    });

    if (userConfig?.googleRefreshToken) {
      const accessToken = await refreshAccessToken(userConfig.googleRefreshToken);
      const events = await getEvents(accessToken, from, to);
      allActivities.push(...eventsToActivities(events));
    }
  } catch {
    // Calendar is optional; skip on failure
  }

  const correlated = correlateActivities(allActivities);
  const grouped = groupByDate(correlated);

  const userConfig = await prisma.userConfig.findUnique({
    where: { userId },
  });
  const targetHours = userConfig?.workingHours ?? 8;

  let detailedResult: Awaited<ReturnType<typeof getDetailedWorklogs>> | null = null;
  try {
    detailedResult = await getDetailedWorklogs(from, to, targetHours);
  } catch (err) {
    console.error("[aggregator] Failed to fetch Jira worklogs:", err);
    detailedResult = null;
  }
  const statusMap = new Map(detailedResult?.statuses.map((s) => [s.date, s]) ?? []);

  const fromDate = new Date(`${from}T12:00:00`);
  const toDate = new Date(`${to}T12:00:00`);
  const days: DayActivity[] = [];

  for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const activities = grouped.get(dateKey) ?? [];
    const wlStatus = statusMap.get(dateKey);
    const existingWorklogs = detailedResult?.worklogsByDate.get(dateKey) ?? [];

    const hoursLogged = wlStatus?.hoursLogged ?? 0;
    const status = isWeekend ? "off" : hoursLogged >= targetHours ? "complete" : "incomplete";

    days.push({
      date: dateKey,
      activities: activities.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
      existingWorklogs,
      worklogStatus: { hoursLogged, target: targetHours },
      status: status as DayActivity["status"],
    });
  }

  return days;
}
