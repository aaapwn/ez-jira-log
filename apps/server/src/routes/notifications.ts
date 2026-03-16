import prisma from "@ez-jira-log/db";
import { Elysia, t } from "elysia";

import { getAuthUserId } from "../middleware/auth";

export const notificationRoutes = new Elysia({ prefix: "/notifications" })
  .post(
    "/push-subscribe",
    async ({ body, request }) => {
      const userId = await getAuthUserId(request);

      await prisma.pushSubscription.upsert({
        where: { endpoint: body.endpoint },
        update: {
          userId,
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
        },
        create: {
          userId,
          endpoint: body.endpoint,
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
        },
      });

      const MAX_SUBSCRIPTIONS = 3;
      const allSubs = await prisma.pushSubscription.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (allSubs.length > MAX_SUBSCRIPTIONS) {
        const idsToDelete = allSubs.slice(MAX_SUBSCRIPTIONS).map((s) => s.id);
        await prisma.pushSubscription.deleteMany({
          where: { id: { in: idsToDelete } },
        });
        console.log(`[push-subscribe] Cleaned up ${idsToDelete.length} old subscriptions for user ${userId}`);
      }

      return { success: true };
    },
    {
      body: t.Object({
        endpoint: t.String(),
        keys: t.Object({
          p256dh: t.String(),
          auth: t.String(),
        }),
      }),
    },
  )
  .delete("/push-subscribe", async ({ body, request }) => {
    const userId = await getAuthUserId(request);

    await prisma.pushSubscription.deleteMany({
      where: { userId, endpoint: body.endpoint },
    });

    return { success: true };
  }, {
    body: t.Object({
      endpoint: t.String(),
    }),
  });
