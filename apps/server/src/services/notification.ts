import prisma from "@ez-jira-log/db";
import { env } from "@ez-jira-log/env/server";
import webpush from "web-push";

webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

export interface NotificationResult {
  subscriptions: number;
  sent: number;
  failed: number;
}

export async function sendNotification(
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<NotificationResult> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    console.warn(`[notification] No push subscriptions for user ${userId}. User needs to click "Allow Notifications" in Settings.`);
    return { subscriptions: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
        sent++;
      } catch (err: any) {
        failed++;
        if (err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
          console.warn(`[notification] Removed expired (410 Gone) subscription ${sub.id} for user ${userId}`);
        } else {
          console.warn(`[notification] Failed to send to subscription ${sub.id} (status ${err.statusCode}): ${err.message}`);
        }
      }
    }),
  );

  console.log(`[notification] User ${userId}: ${sent} sent, ${failed} failed out of ${subscriptions.length} subscriptions`);

  return { subscriptions: subscriptions.length, sent, failed };
}
