import prisma from "@ez-jira-log/db";

import { refreshAccessToken } from "./calendar";
import { sendNotification, type NotificationResult } from "./notification";
import { getColumnForDay, tickCheckbox } from "./sheets";

function getTodayInTimezone(tz: string): Date {
  const now = new Date();
  const localeDate = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  return localeDate;
}

function parseWorkDays(raw: string): number[] {
  return raw.split(",").map(Number).filter((n) => !Number.isNaN(n));
}

export interface CheckActionResult {
  processed: number;
  skipped: number;
  errors: string[];
  details: string[];
  notification?: NotificationResult;
}

type CheckAction = "checkin" | "checkout" | "leave";

async function processCheckAction(type: CheckAction, userId?: string): Promise<CheckActionResult> {
  const result: CheckActionResult = { processed: 0, skipped: 0, errors: [], details: [] };

  const where = userId
    ? { userId, sheetSpreadsheetId: { not: null }, googleRefreshToken: { not: null } }
    : { sheetSpreadsheetId: { not: null }, googleRefreshToken: { not: null } };

  const configs = await prisma.userConfig.findMany({
    where: where as any,
  });

  if (configs.length === 0) {
    const userConfig = userId
      ? await prisma.userConfig.findUnique({ where: { userId } })
      : null;

    if (!userConfig) {
      result.details.push("No UserConfig found for this user. Save settings first.");
    } else {
      const missing: string[] = [];
      if (!userConfig.googleRefreshToken) missing.push("googleRefreshToken (connect Google in Settings)");
      if (!userConfig.sheetSpreadsheetId) missing.push("sheetSpreadsheetId");
      if (!userConfig.sheetName) missing.push("sheetName");
      if (!userConfig.sheetStartColumn) missing.push("sheetStartColumn");
      if (!userConfig.sheetCheckInRow) missing.push("sheetCheckInRow");
      if (!userConfig.sheetCheckOutRow) missing.push("sheetCheckOutRow");
      result.details.push(`Config missing fields: ${missing.join(", ")}`);
    }
    console.log(`[${type}] No eligible configs found.`, result.details);
    return result;
  }

  for (const config of configs) {
    if (
      !config.googleRefreshToken ||
      !config.sheetSpreadsheetId ||
      !config.sheetName ||
      !config.sheetStartColumn ||
      !config.sheetCheckInRow ||
      !config.sheetCheckOutRow
    ) {
      result.skipped++;
      continue;
    }

    const today = getTodayInTimezone(config.timezone);
    const dayOfWeek = today.getDay();
    const workDays = parseWorkDays(config.sheetWorkDays);
    const isWorkDay = workDays.includes(dayOfWeek);

    let effectiveType = type;
    if (type === "checkin" && !isWorkDay) {
      if (!config.sheetLeaveRow) {
        result.skipped++;
        result.details.push(`${config.userId}: off day but no leave row configured — skipped`);
        continue;
      }
      effectiveType = "leave";
    }

    if (type === "checkout" && !isWorkDay) {
      result.skipped++;
      result.details.push(`${config.userId}: off day — no check-out needed`);
      continue;
    }

    if (effectiveType === "leave" && !config.sheetLeaveRow) {
      result.skipped++;
      result.details.push(`${config.userId}: no leave row configured — skipped`);
      continue;
    }

    try {
      const accessToken = await refreshAccessToken(config.googleRefreshToken);
      const dayOfMonth = today.getDate();
      const column = getColumnForDay(config.sheetStartColumn, dayOfMonth);

      let row: number;
      let icon: string;
      let label: string;
      let notifIcon: string;

      switch (effectiveType) {
        case "checkin":
          row = config.sheetCheckInRow;
          icon = "☀️";
          label = "Checked in";
          notifIcon = "/icons/checkin.svg";
          break;
        case "checkout":
          row = config.sheetCheckOutRow;
          icon = "🌙";
          label = "Checked out";
          notifIcon = "/icons/checkout.svg";
          break;
        case "leave":
          row = config.sheetLeaveRow!;
          icon = "🏖️";
          label = "Leave marked";
          notifIcon = "/icons/reminder.svg";
          break;
      }

      await tickCheckbox(accessToken, config.sheetSpreadsheetId, config.sheetName, column, row);

      const timeStr = new Date().toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: config.timezone,
      });

      const notifResult = await sendNotification(config.userId, {
        title: `${icon} ${label}`,
        body: `${label} at ${timeStr} (column ${column}, row ${row})`,
        icon: notifIcon,
      });
      result.notification = notifResult;

      result.processed++;
      result.details.push(`${config.userId}: ${column}${row} ✓ (${effectiveType})`);
      if (notifResult.subscriptions === 0) {
        result.details.push("No push subscriptions — enable notifications in Settings");
      }
      console.log(`[${effectiveType}] ${config.userId}: ${column}${row} ✓`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      result.errors.push(`${config.userId}: ${msg}`);
      console.error(`[${effectiveType}] Failed for user ${config.userId}:`, err);
      try {
        await sendNotification(config.userId, {
          title: `❌ ${effectiveType === "checkin" ? "Check-in" : effectiveType === "checkout" ? "Check-out" : "Leave"} failed`,
          body: `Could not update Google Sheet. ${msg}`,
          icon: "/icons/error.svg",
        });
      } catch { /* notification failure is non-critical */ }
    }
  }

  return result;
}

export async function runCheckIn(userId?: string): Promise<CheckActionResult> {
  return processCheckAction("checkin", userId);
}

export async function runCheckOut(userId?: string): Promise<CheckActionResult> {
  return processCheckAction("checkout", userId);
}

export async function runLeave(userId?: string): Promise<CheckActionResult> {
  return processCheckAction("leave", userId);
}

export async function runMonthlyReminder(userId?: string): Promise<CheckActionResult> {
  const result: CheckActionResult = { processed: 0, skipped: 0, errors: [], details: [] };

  const where = userId
    ? { userId }
    : { sheetSpreadsheetId: { not: null } };

  const configs = await prisma.userConfig.findMany({ where: where as any });

  if (configs.length === 0) {
    result.details.push("No configs found.");
    return result;
  }

  for (const config of configs) {
    try {
      const notifResult = await sendNotification(config.userId, {
        title: "📅 New month — update config",
        body: "Please update your check-in/check-out row numbers in Settings for this month.",
        url: "/settings",
        icon: "/icons/reminder.svg",
      });
      result.notification = notifResult;
      result.processed++;
      result.details.push(`${config.userId}: notified`);
      if (notifResult.subscriptions === 0) {
        result.details.push("No push subscriptions — enable notifications in Settings");
      }
      console.log(`[monthly-remind] ${config.userId} notified`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      result.errors.push(`${config.userId}: ${msg}`);
      console.error(`[monthly-remind] Failed for user ${config.userId}:`, err);
    }
  }

  return result;
}
