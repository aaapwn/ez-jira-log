import { cron } from "@elysiajs/cron";

import { runCheckIn, runCheckOut, runMonthlyReminder } from "../services/checkin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerCron(app: any): void {
  app
    .use(
      cron({
        name: "checkin",
        pattern: "0 30 9 * * 1-5",
        timezone: "Asia/Bangkok",
        async run() {
          console.log("[cron] Running check-in...");
          await runCheckIn();
        },
      }),
    )
    .use(
      cron({
        name: "checkout",
        pattern: "0 30 18 * * 1-5",
        timezone: "Asia/Bangkok",
        async run() {
          console.log("[cron] Running check-out...");
          await runCheckOut();
        },
      }),
    )
    .use(
      cron({
        name: "monthly-remind",
        pattern: "0 0 9 1 * *",
        timezone: "Asia/Bangkok",
        async run() {
          console.log("[cron] Running monthly reminder...");
          await runMonthlyReminder();
        },
      }),
    );
}
