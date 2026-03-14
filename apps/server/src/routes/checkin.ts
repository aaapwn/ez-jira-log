import { env } from "@ez-jira-log/env/server";
import { Elysia } from "elysia";

import { getAuthUserId } from "../middleware/auth";
import { runCheckIn, runCheckOut, runMonthlyReminder } from "../services/checkin";

async function requireDevAuth(request: Request, set: { status?: number | string }) {
  if (env.NODE_ENV !== "development") {
    set.status = 501;
    return { error: "Not Implemented" };
  }
  try {
    return await getAuthUserId(request);
  } catch {
    set.status = 401;
    return { error: "Unauthorized — call this from the browser while logged in" };
  }
}

export const checkinRoutes = new Elysia({ prefix: "/checkin" })
  .post("/test-checkin", async ({ request, set }) => {
    const result = await requireDevAuth(request, set);
    if (typeof result !== "string") return result;
    const actionResult = await runCheckIn(result);
    return { success: true, action: "checkin", ...actionResult };
  })
  .post("/test-checkout", async ({ request, set }) => {
    const result = await requireDevAuth(request, set);
    if (typeof result !== "string") return result;
    const actionResult = await runCheckOut(result);
    return { success: true, action: "checkout", ...actionResult };
  })
  .post("/test-monthly-remind", async ({ request, set }) => {
    const result = await requireDevAuth(request, set);
    if (typeof result !== "string") return result;
    const actionResult = await runMonthlyReminder(result);
    return { success: true, action: "monthly-remind", ...actionResult };
  });
