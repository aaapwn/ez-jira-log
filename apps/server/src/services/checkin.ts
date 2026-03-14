import prisma from "@ez-jira-log/db";

import { refreshAccessToken } from "./calendar";
import { sendNotification, type NotificationResult } from "./notification";
import { getColumnForDay, tickCheckbox } from "./sheets";

function getTodayInTimezone(tz: string): Date {
  const now = new Date();
  const localeDate = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  return localeDate;
}

export interface CheckActionResult {
  processed: number;
  skipped: number;
  errors: string[];
  details: string[];
  notification?: NotificationResult;
}

async function processCheckAction(type: "checkin" | "checkout", userId?: string): Promise<CheckActionResult> {
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

    try {
      const accessToken = await refreshAccessToken(config.googleRefreshToken);
      const today = getTodayInTimezone(config.timezone);
      const dayOfMonth = today.getDate();
      const column = getColumnForDay(config.sheetStartColumn, dayOfMonth);
      const row = type === "checkin" ? config.sheetCheckInRow : config.sheetCheckOutRow;

      await tickCheckbox(accessToken, config.sheetSpreadsheetId, config.sheetName, column, row);

      const icon = type === "checkin" ? "☀️" : "🌙";
      const label = type === "checkin" ? "Checked in" : "Checked out";
      const timeStr = new Date().toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: config.timezone,
      });

      const notifResult = await sendNotification(config.userId, {
        title: `${icon} ${label}`,
        body: `${label} at ${timeStr} (column ${column}, row ${row})`,
        icon: type === "checkin" ? "/icons/checkin.svg" : "/icons/checkout.svg",
      });
      result.notification = notifResult;

      result.processed++;
      result.details.push(`${config.userId}: ${column}${row} ✓`);
      if (notifResult.subscriptions === 0) {
        result.details.push("No push subscriptions — enable notifications in Settings");
      }
      console.log(`[${type}] ${config.userId}: ${column}${row} ✓`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      result.errors.push(`${config.userId}: ${msg}`);
      console.error(`[${type}] Failed for user ${config.userId}:`, err);
      try {
        await sendNotification(config.userId, {
          title: `❌ ${type === "checkin" ? "Check-in" : "Check-out"} failed`,
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
