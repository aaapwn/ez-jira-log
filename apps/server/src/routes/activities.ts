import { Elysia, t } from "elysia";

import { getAuthUserId } from "../middleware/auth";
import { getAggregatedActivities } from "../services/aggregator";

export const activitiesRoutes = new Elysia({ prefix: "/activities" }).get(
  "/summary",
  async ({ query, request }) => {
    const userId = await getAuthUserId(request);
    return getAggregatedActivities(userId, query.from, query.to);
  },
  {
    query: t.Object({
      from: t.String({ format: "date" }),
      to: t.String({ format: "date" }),
    }),
  },
);
