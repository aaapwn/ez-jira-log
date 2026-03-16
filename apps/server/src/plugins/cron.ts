import { Cron } from "croner";

import { runCheckIn, runCheckOut, runMonthlyReminder } from "../services/checkin";

const CRON_KEY = Symbol.for("ez-jira-log:cron-jobs");

function stopPreviousJobs() {
  const prev = (globalThis as any)[CRON_KEY] as Cron[] | undefined;
  if (prev) {
    for (const job of prev) job.stop();
    console.log(`[cron] Stopped ${prev.length} previous job(s) (hot reload cleanup)`);
  }
  (globalThis as any)[CRON_KEY] = [];
}

function trackJob(job: Cron) {
  ((globalThis as any)[CRON_KEY] as Cron[]).push(job);
}

export function registerCron(): void {
  stopPreviousJobs();

  const checkinJob = new Cron("0 30 9 * * 1-5", { timezone: "Asia/Bangkok" }, async () => {
    console.log("[cron] Running check-in...");
    await runCheckIn();
  });

  const checkoutJob = new Cron("0 30 18 * * 1-5", { timezone: "Asia/Bangkok" }, async () => {
    console.log("[cron] Running check-out...");
    await runCheckOut();
  });

  const monthlyJob = new Cron("0 0 9 1 * *", { timezone: "Asia/Bangkok" }, async () => {
    console.log("[cron] Running monthly reminder...");
    await runMonthlyReminder();
  });

  trackJob(checkinJob);
  trackJob(checkoutJob);
  trackJob(monthlyJob);

  console.log("[cron] Registered 3 cron jobs");
}
