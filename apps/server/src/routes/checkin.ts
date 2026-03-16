import { Elysia } from "elysia";

import { getAuthUserId } from "../middleware/auth";
import { runCheckIn, runCheckOut, runLeave, runMonthlyReminder } from "../services/checkin";

export const checkinRoutes = new Elysia({ prefix: "/checkin" })
  .post("/test-checkin", async ({ request, set }) => {
    let userId: string;
    try {
      userId = await getAuthUserId(request);
    } catch {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const result = await runCheckIn(userId);
    return { success: true, action: "checkin", ...result };
  })
  .post("/test-checkout", async ({ request, set }) => {
    let userId: string;
    try {
      userId = await getAuthUserId(request);
    } catch {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const result = await runCheckOut(userId);
    return { success: true, action: "checkout", ...result };
  })
  .post("/test-leave", async ({ request, set }) => {
    let userId: string;
    try {
      userId = await getAuthUserId(request);
    } catch {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const result = await runLeave(userId);
    return { success: true, action: "leave", ...result };
  })
  .post("/test-monthly-remind", async ({ request, set }) => {
    let userId: string;
    try {
      userId = await getAuthUserId(request);
    } catch {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const result = await runMonthlyReminder(userId);
    return { success: true, action: "monthly-remind", ...result };
  });
