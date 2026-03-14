import prisma from "@ez-jira-log/db";
import { Elysia, t } from "elysia";

import { getAuthUserId } from "../middleware/auth";

export const configRoutes = new Elysia({ prefix: "/user" })
  .get("/config", async ({ request }) => {
    const userId = await getAuthUserId(request);
    const config = await prisma.userConfig.findUnique({
      where: { userId },
    });

    if (!config) {
      return {
        workingHours: 8,
        timezone: "Asia/Bangkok",
        defaultComment: null,
        hasGoogleCalendar: false,
        sheetSpreadsheetId: null,
        sheetName: null,
        sheetStartColumn: null,
        sheetCheckInRow: null,
        sheetCheckOutRow: null,
        hasSheetConfig: false,
        updatedAt: null as string | null,
      };
    }

    return {
      workingHours: config.workingHours,
      timezone: config.timezone,
      defaultComment: config.defaultComment,
      hasGoogleCalendar: !!config.googleRefreshToken,
      sheetSpreadsheetId: config.sheetSpreadsheetId,
      sheetName: config.sheetName,
      sheetStartColumn: config.sheetStartColumn,
      sheetCheckInRow: config.sheetCheckInRow,
      sheetCheckOutRow: config.sheetCheckOutRow,
      hasSheetConfig: !!(
        config.sheetSpreadsheetId &&
        config.sheetName &&
        config.sheetStartColumn &&
        config.sheetCheckInRow &&
        config.sheetCheckOutRow
      ),
      updatedAt: config.updatedAt.toISOString(),
    };
  })
  .put(
    "/config",
    async ({ body, request }) => {
      const userId = await getAuthUserId(request);
      const config = await prisma.userConfig.upsert({
        where: { userId },
        update: {
          workingHours: body.workingHours,
          timezone: body.timezone,
          defaultComment: body.defaultComment,
          sheetSpreadsheetId: body.sheetSpreadsheetId,
          sheetName: body.sheetName,
          sheetStartColumn: body.sheetStartColumn,
          sheetCheckInRow: body.sheetCheckInRow,
          sheetCheckOutRow: body.sheetCheckOutRow,
        },
        create: {
          userId,
          workingHours: body.workingHours,
          timezone: body.timezone,
          defaultComment: body.defaultComment,
          sheetSpreadsheetId: body.sheetSpreadsheetId,
          sheetName: body.sheetName,
          sheetStartColumn: body.sheetStartColumn,
          sheetCheckInRow: body.sheetCheckInRow,
          sheetCheckOutRow: body.sheetCheckOutRow,
        },
      });

      return {
        workingHours: config.workingHours,
        timezone: config.timezone,
        defaultComment: config.defaultComment,
        hasGoogleCalendar: !!config.googleRefreshToken,
        sheetSpreadsheetId: config.sheetSpreadsheetId,
        sheetName: config.sheetName,
        sheetStartColumn: config.sheetStartColumn,
        sheetCheckInRow: config.sheetCheckInRow,
        sheetCheckOutRow: config.sheetCheckOutRow,
        hasSheetConfig: !!(
          config.sheetSpreadsheetId &&
          config.sheetName &&
          config.sheetStartColumn &&
          config.sheetCheckInRow &&
          config.sheetCheckOutRow
        ),
        updatedAt: config.updatedAt.toISOString(),
      };
    },
    {
      body: t.Object({
        workingHours: t.Optional(t.Number({ minimum: 1, maximum: 24 })),
        timezone: t.Optional(t.String()),
        defaultComment: t.Optional(t.Nullable(t.String())),
        sheetSpreadsheetId: t.Optional(t.Nullable(t.String())),
        sheetName: t.Optional(t.Nullable(t.String())),
        sheetStartColumn: t.Optional(t.Nullable(t.String())),
        sheetCheckInRow: t.Optional(t.Nullable(t.Number({ minimum: 1 }))),
        sheetCheckOutRow: t.Optional(t.Nullable(t.Number({ minimum: 1 }))),
      }),
    },
  );
