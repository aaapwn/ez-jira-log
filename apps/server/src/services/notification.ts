import prisma from "@ez-jira-log/db";
import { env } from "@ez-jira-log/env/server";
import webpush from "web-push";

webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

export async function sendNotification(
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
        throw err;
      }
    }),
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0 && failed.length === results.length) {
    console.warn(`All push notifications failed for user ${userId}`);
  }
}
