import prisma from "@ez-jira-log/db";
import { Elysia, t } from "elysia";

import { getAuthUserId } from "../middleware/auth";

export const holidayRoutes = new Elysia({ prefix: "/holidays" })
  .get(
    "/",
    async ({ query, request }) => {
      const userId = await getAuthUserId(request);
      const where: any = { userId };
      if (query.from || query.to) {
        where.date = {};
        if (query.from) where.date.gte = query.from;
        if (query.to) where.date.lte = query.to;
      }

      return prisma.holiday.findMany({
        where,
        orderBy: { date: "asc" },
      });
    },
    {
      query: t.Object({
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/",
    async ({ body, request }) => {
      const userId = await getAuthUserId(request);

      return prisma.holiday.upsert({
        where: { userId_date: { userId, date: body.date } },
        update: { reason: body.reason ?? null },
        create: { userId, date: body.date, reason: body.reason ?? null },
      });
    },
    {
      body: t.Object({
        date: t.String(),
        reason: t.Optional(t.Nullable(t.String())),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, request }) => {
      const userId = await getAuthUserId(request);

      await prisma.holiday.deleteMany({
        where: { id: params.id, userId },
      });

      return { success: true };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  );
