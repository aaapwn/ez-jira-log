import { Elysia, t } from "elysia";

import { getAuthUserId } from "../middleware/auth";
import { batchSubmitWorklogs, deleteWorklog, getIssueSummary, getWorklogStatus } from "../services/jira";

export const jiraRoutes = new Elysia({ prefix: "/jira" })
  .get(
    "/issue/:key",
    async ({ params, request }) => {
      await getAuthUserId(request);
      const result = await getIssueSummary(params.key);
      if (!result) throw new Error("Issue not found");
      return result;
    },
    {
      params: t.Object({ key: t.String() }),
    },
  )
  .get(
    "/check-status",
    async ({ query, request }) => {
      await getAuthUserId(request);
      return getWorklogStatus(query.from, query.to, 8);
    },
    {
      query: t.Object({
        from: t.String({ format: "date" }),
        to: t.String({ format: "date" }),
      }),
    },
  )
  .post(
    "/worklog",
    async ({ body, request }) => {
      await getAuthUserId(request);
      const results = await batchSubmitWorklogs(body.entries);
      return { results };
    },
    {
      body: t.Object({
        entries: t.Array(
          t.Object({
            issueKey: t.String(),
            date: t.String({ format: "date" }),
            timeSpentSeconds: t.Number({ minimum: 0 }),
            comment: t.String(),
            started: t.Optional(t.String()),
          }),
        ),
      }),
    },
  )
  .delete(
    "/worklog/:issueKey/:worklogId",
    async ({ params, request }) => {
      await getAuthUserId(request);
      await deleteWorklog(params.issueKey, params.worklogId);
      return { success: true };
    },
    {
      params: t.Object({
        issueKey: t.String(),
        worklogId: t.String(),
      }),
    },
  );
