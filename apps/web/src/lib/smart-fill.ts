export interface DraftEntry {
  id: string;
  issueKey: string;
  description: string;
  hours: number;
  comment: string;
  startTime?: string;
  endTime?: string;
}

/** Compute hours between two HH:MM strings, returning 0 if invalid. */
export function timeDiffHours(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = (eh * 60 + (em || 0) - (sh * 60 + (sm || 0))) / 60;
  return diff > 0 ? Math.round(diff * 100) / 100 : 0;
}

/** Compute endTime HH:MM from startTime + hours. */
export function addHoursToTime(start: string, hours: number): string {
  const [h, m] = start.split(":").map(Number);
  const totalMin = h * 60 + (m || 0) + Math.round(hours * 60);
  const eh = Math.floor(totalMin / 60) % 24;
  const em = totalMin % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

interface ActivityLike {
  source: string;
  type: string;
  title: string;
  jiraKey?: string;
  timestamp: string;
  suggestedHours?: number;
}

interface ExistingWorklogLike {
  hours: number;
}

function roundTo01(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Distribute hours proportionally by commit count per Jira key.
 * Rounds each allocation to 0.1h; adjusts the largest entry so total is exact.
 */
export function distributeByCommitRatio(
  commitGroups: Array<{ jiraKey: string; count: number }>,
  targetHours: number,
): Array<{ jiraKey: string; hours: number }> {
  if (commitGroups.length === 0 || targetHours <= 0) return [];

  const totalCommits = commitGroups.reduce((s, g) => s + g.count, 0);

  const result = commitGroups.map((g) => ({
    jiraKey: g.jiraKey,
    hours: roundTo01((g.count / totalCommits) * targetHours),
  }));

  // Ensure minimum 0.1h per entry
  for (const r of result) {
    if (r.hours < 0.1) r.hours = 0.1;
  }

  // Fix rounding gap: adjust the largest entry so total matches target exactly
  const allocated = roundTo01(result.reduce((s, r) => s + r.hours, 0));
  const diff = roundTo01(targetHours - allocated);
  if (diff !== 0 && result.length > 0) {
    const largest = result.reduce((max, r) => (r.hours > max.hours ? r : max), result[0]);
    largest.hours = roundTo01(largest.hours + diff);
  }

  return result;
}

/**
 * Build the full set of draft entries when "Magic Fill" is clicked.
 *
 * 1. Calendar events -> ADM-13 entries with actual duration and pinned start time.
 * 2. Git commits (with Jira key) -> proportionally distributed remaining hours.
 *
 * Respects both existing Jira worklogs and current draft entries so that
 * Magic Fill only fills the gap without deleting or overlapping existing drafts.
 */
export function buildMagicFillEntries(
  activities: ActivityLike[],
  existingWorklogs: ExistingWorklogLike[],
  totalWorkingHours: number,
  currentDrafts: DraftEntry[] = [],
): DraftEntry[] {
  const entries: DraftEntry[] = [];
  const now = Date.now();
  let idx = 0;

  const draftHours = currentDrafts.reduce((s, d) => s + d.hours, 0);

  const calendarEvents = activities.filter(
    (a) => a.source === "calendar" && (a.suggestedHours ?? 0) > 0,
  );

  let calendarHours = 0;
  for (const evt of calendarEvents) {
    const hours = roundTo01(evt.suggestedHours ?? 0);
    if (hours <= 0) continue;

    const ts = new Date(evt.timestamp);
    const startTime = `${String(ts.getHours()).padStart(2, "0")}:${String(ts.getMinutes()).padStart(2, "0")}`;

    entries.push({
      id: `magic-${now}-${idx++}`,
      issueKey: "ADM-13",
      description: evt.title,
      hours,
      comment: evt.title,
      startTime,
      endTime: addHoursToTime(startTime, hours),
    });
    calendarHours += hours;
  }

  const hoursAlreadyLogged = existingWorklogs.reduce(
    (s, w) => s + w.hours,
    0,
  );
  const remainingHours = roundTo01(
    Math.max(0, totalWorkingHours - hoursAlreadyLogged - draftHours - calendarHours),
  );

  const commits = activities.filter(
    (a) => a.source === "gitlab" && a.type === "commit" && a.jiraKey,
  );

  const countByKey = new Map<string, number>();
  for (const c of commits) {
    const key = c.jiraKey!;
    countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
  }

  const commitGroups = [...countByKey.entries()].map(([jiraKey, count]) => ({
    jiraKey,
    count,
  }));

  if (commitGroups.length > 0 && remainingHours > 0) {
    const distributed = distributeByCommitRatio(commitGroups, remainingHours);
    for (const d of distributed) {
      entries.push({
        id: `magic-${now}-${idx++}`,
        issueKey: d.jiraKey,
        description: "",
        hours: d.hours,
        comment: "",
      });
    }
  }

  return entries;
}
