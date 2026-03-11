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
      };
    }

    return {
      workingHours: config.workingHours,
      timezone: config.timezone,
      defaultComment: config.defaultComment,
      hasGoogleCalendar: !!config.googleRefreshToken,
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
        },
        create: {
          userId,
          workingHours: body.workingHours,
          timezone: body.timezone,
          defaultComment: body.defaultComment,
        },
      });

      return {
        workingHours: config.workingHours,
        timezone: config.timezone,
        defaultComment: config.defaultComment,
        hasGoogleCalendar: !!config.googleRefreshToken,
      };
    },
    {
      body: t.Object({
        workingHours: t.Optional(t.Number({ minimum: 1, maximum: 24 })),
        timezone: t.Optional(t.String()),
        defaultComment: t.Optional(t.Nullable(t.String())),
      }),
    },
  );
