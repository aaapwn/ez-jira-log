export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function normalizeDate(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return formatDate(new Date());
  return formatDate(parsed);
}

export function getDateRange(daysBack: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - daysBack);
  return { from: formatDate(from), to: formatDate(to) };
}

export function getMonthToDateRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: formatDate(from), to: formatDate(now) };
}

export function getDayName(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
}

export function getMonthDay(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isToday(dateStr: string): boolean {
  return dateStr === formatDate(new Date());
}

export function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
}

export function hoursToTimeString(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function secondsToHours(seconds: number): number {
  return Math.round((seconds / 3600) * 100) / 100;
}

export function hoursToSeconds(hours: number): number {
  return Math.round(hours * 3600);
}

export function formatTimeHHMM(dateOrIso: Date | string): string {
  const d = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  startIso: string;
}

export interface LunchConfig {
  enabled: boolean;
  startHour: number;
  endHour: number;
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function buildStartedIsoFromTime(dateStr: string, timeHHMM: string): string {
  const [h, m] = timeHHMM.split(":").map(Number);
  return buildStartedIso(dateStr, h * 60 + (m || 0));
}

export function buildStartedIso(dateStr: string, startMinutes: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const oh = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const om = String(Math.abs(offset) % 60).padStart(2, "0");
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${Y}-${M}-${D}T${hh}:${mm}:00.000${sign}${oh}${om}`;
}

/**
 * Gap-based time slot calculator.
 *
 * Collects all occupied ranges (existing worklogs, pinned drafts, lunch break),
 * computes available gaps within [dayStart, dayEnd], then places unpinned draft
 * entries into those gaps sequentially. This prevents entries from spilling
 * past end-of-day and correctly fills gaps between pinned entries.
 */
export function calculateDraftTimeSlots(
  dateStr: string,
  existingWorklogs: Array<{ started: string; hours: number }>,
  drafts: Array<{ hours: number; startTime?: string }>,
  lunch: LunchConfig = { enabled: true, startHour: 12, endHour: 13 },
  dayStartHour: number = 9.5,
  dayEndHour: number = 18.5,
): TimeSlot[] {
  const dayStartMin = Math.round(dayStartHour * 60);
  const dayEndMin = Math.round(dayEndHour * 60);

  const occupied: Array<[number, number]> = [];

  for (const wl of existingWorklogs) {
    const s = new Date(wl.started);
    const sMin = s.getHours() * 60 + s.getMinutes();
    occupied.push([sMin, sMin + Math.round(wl.hours * 60)]);
  }

  if (lunch.enabled) {
    occupied.push([lunch.startHour * 60, lunch.endHour * 60]);
  }

  for (const d of drafts) {
    if (d.startTime) {
      const [h, m] = d.startTime.split(":").map(Number);
      const sMin = h * 60 + (m || 0);
      occupied.push([sMin, sMin + Math.round(d.hours * 60)]);
    }
  }

  occupied.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [s, e] of occupied) {
    if (merged.length > 0 && s <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
    } else {
      merged.push([s, e]);
    }
  }

  const gaps: Array<{ start: number; end: number }> = [];
  let edge = dayStartMin;
  for (const [s, e] of merged) {
    if (s > edge && edge < dayEndMin) {
      gaps.push({ start: edge, end: Math.min(s, dayEndMin) });
    }
    if (e > edge) edge = e;
  }
  if (edge < dayEndMin) {
    gaps.push({ start: edge, end: dayEndMin });
  }

  let gapIdx = 0;
  let gapCursor = gaps.length > 0 ? gaps[0].start : dayEndMin;

  function placeInGaps(durMin: number): { startMin: number; endMin: number } {
    while (gapIdx < gaps.length && gapCursor >= gaps[gapIdx].end) {
      gapIdx++;
      if (gapIdx < gaps.length) gapCursor = gaps[gapIdx].start;
    }

    const startMin = gapIdx < gaps.length ? gapCursor : dayEndMin;
    let remaining = durMin;
    let endMin = startMin;

    while (remaining > 0 && gapIdx < gaps.length) {
      const available = gaps[gapIdx].end - Math.max(gapCursor, gaps[gapIdx].start);
      if (remaining <= available) {
        endMin = Math.max(gapCursor, gaps[gapIdx].start) + remaining;
        gapCursor = endMin;
        remaining = 0;
      } else {
        remaining -= available;
        endMin = gaps[gapIdx].end;
        gapCursor = endMin;
        gapIdx++;
        if (gapIdx < gaps.length) {
          gapCursor = gaps[gapIdx].start;
          endMin = gapCursor;
        }
      }
    }

    if (remaining > 0 && gaps.length > 0) {
      endMin = gaps[gaps.length - 1].end;
      gapCursor = endMin;
    }
    return { startMin, endMin };
  }

  return drafts.map(({ hours, startTime: pinned }) => {
    if (pinned) {
      const [h, m] = pinned.split(":").map(Number);
      const startMin = h * 60 + (m || 0);
      const endMin = startMin + Math.round(hours * 60);
      return {
        startTime: minutesToHHMM(startMin),
        endTime: minutesToHHMM(endMin),
        startIso: buildStartedIso(dateStr, startMin),
      };
    }

    const durMin = Math.round(hours * 60);
    const { startMin, endMin } = placeInGaps(durMin);

    return {
      startTime: minutesToHHMM(startMin),
      endTime: minutesToHHMM(endMin),
      startIso: buildStartedIso(dateStr, startMin),
    };
  });
}

export function getWorklogTimeRange(
  started: string,
  hours: number,
): { startTime: string; endTime: string } {
  const s = new Date(started);
  const e = new Date(s.getTime() + hours * 3600 * 1000);
  return { startTime: formatTimeHHMM(s), endTime: formatTimeHHMM(e) };
}
