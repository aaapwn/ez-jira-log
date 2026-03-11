import { env } from "@ez-jira-log/env/server";

import type { Activity, CalendarEvent } from "../types";
import { cache } from "./cache";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

const MEETING_PATTERNS = [
  { pattern: /stand[-\s]?up/i, type: "standup" },
  { pattern: /retro(spective)?/i, type: "retro" },
  { pattern: /sprint\s*(planning|review)/i, type: "sprint" },
  { pattern: /code\s*review/i, type: "review" },
  { pattern: /1[:\-]1|one[:\-]on[:\-]one/i, type: "1on1" },
  { pattern: /sync/i, type: "sync" },
  { pattern: /grooming|refinement/i, type: "grooming" },
] as const;

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} - ${body}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function getEvents(
  accessToken: string,
  from: string,
  to: string,
): Promise<CalendarEvent[]> {
  const cacheKey = cache.buildKey("calendar", "events", from, to);
  const cached = cache.get<CalendarEvent[]>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    timeMin: `${from}T00:00:00Z`,
    timeMax: `${to}T23:59:59Z`,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Google Calendar API error: ${res.status}`);
  }

  const data = (await res.json()) as { items: CalendarEvent[] };
  const events = data.items ?? [];

  cache.set(cacheKey, events);
  return events;
}

export function classifyEvent(event: CalendarEvent): string {
  const title = event.summary ?? "";
  for (const { pattern, type } of MEETING_PATTERNS) {
    if (pattern.test(title)) return type;
  }
  return "meeting";
}

function isAllDayEvent(event: CalendarEvent): boolean {
  return !event.start.dateTime && !!event.start.date;
}

function getEventDurationHours(event: CalendarEvent): number {
  if (isAllDayEvent(event)) return 0;

  const startStr = event.start.dateTime ?? event.start.date;
  const endStr = event.end.dateTime ?? event.end.date;
  if (!startStr || !endStr) return 0.5;

  const start = new Date(startStr);
  const end = new Date(endStr);
  return Math.round(((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 100) / 100;
}

export function eventsToActivities(events: CalendarEvent[]): Activity[] {
  return events
    .filter((e) => e.summary)
    .map((event) => ({
      id: `calendar-${event.id}`,
      source: "calendar" as const,
      type: "meeting" as const,
      title: event.summary,
      description: `${classifyEvent(event)} (${getEventDurationHours(event)}h)`,
      timestamp: event.start.dateTime ?? event.start.date ?? "",
      suggestedHours: getEventDurationHours(event),
    }));
}
