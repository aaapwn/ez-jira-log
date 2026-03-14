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
