import prisma from "@ez-jira-log/db";
import { Elysia, t } from "elysia";

import { getAuthUserId } from "../middleware/auth";
import {
  exchangeCodeForTokens,
  eventsToActivities,
  getAuthUrl,
  getEvents,
  refreshAccessToken,
} from "../services/calendar";

export const calendarRoutes = new Elysia({ prefix: "/calendar" })
  .get("/auth-url", async ({ request }) => {
    await getAuthUserId(request);
    return { url: getAuthUrl() };
  })
  .get(
    "/callback",
    async ({ query, request }) => {
      const userId = await getAuthUserId(request);
      const tokens = await exchangeCodeForTokens(query.code);

      await prisma.userConfig.upsert({
        where: { userId },
        update: { googleRefreshToken: tokens.refresh_token },
        create: {
          userId,
          googleRefreshToken: tokens.refresh_token,
        },
      });

      return { success: true };
    },
    {
      query: t.Object({
        code: t.String(),
      }),
    },
  )
  .get(
    "/events",
    async ({ query, request }) => {
      const userId = await getAuthUserId(request);
      const userConfig = await prisma.userConfig.findUnique({
        where: { userId },
      });

      if (!userConfig?.googleRefreshToken) {
        throw new Error("Google Calendar not connected. Please authorize first.");
      }

      const accessToken = await refreshAccessToken(userConfig.googleRefreshToken);
      const events = await getEvents(accessToken, query.from, query.to);
      return eventsToActivities(events);
    },
    {
      query: t.Object({
        from: t.String({ format: "date" }),
        to: t.String({ format: "date" }),
      }),
    },
  );
