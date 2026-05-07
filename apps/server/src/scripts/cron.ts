import prisma from "@ez-jira-log/db";

import {
  runCheckIn,
  runCheckOut,
  runMonthlyReminder,
  type CheckActionResult,
} from "../services/checkin";

const jobs = {
  checkin: runCheckIn,
  checkout: runCheckOut,
  "monthly-reminder": runMonthlyReminder,
} as const;

type JobName = keyof typeof jobs;

function isJobName(value: string | undefined): value is JobName {
  return !!value && value in jobs;
}

function printResult(jobName: JobName, result: CheckActionResult) {
  console.log(`[cron:${jobName}] processed=${result.processed} skipped=${result.skipped} errors=${result.errors.length}`);

  for (const detail of result.details) {
    console.log(`[cron:${jobName}] ${detail}`);
  }

  for (const error of result.errors) {
    console.error(`[cron:${jobName}] ERROR ${error}`);
  }
}

async function main() {
  const jobName = Bun.argv[2];
  const userId = Bun.argv[3];

  if (!isJobName(jobName)) {
    console.error("Usage: bun run src/scripts/cron.ts <checkin|checkout|monthly-reminder> [userId]");
    process.exitCode = 1;
    return;
  }

  try {
    const result = await jobs[jobName](userId);
    printResult(jobName, result);

    if (result.errors.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

await main();
