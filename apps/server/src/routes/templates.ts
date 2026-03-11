import prisma from "@ez-jira-log/db";
import { Elysia, t } from "elysia";

import { getAuthUserId } from "../middleware/auth";

export const templatesRoutes = new Elysia({ prefix: "/templates" })
  .get("/", async ({ request }) => {
    const userId = await getAuthUserId(request);
    return prisma.worklogTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  })
  .post(
    "/",
    async ({ body, request }) => {
      const userId = await getAuthUserId(request);
      return prisma.worklogTemplate.create({
        data: {
          userId,
          name: body.name,
          issueKey: body.issueKey,
          comment: body.comment,
          defaultHours: body.defaultHours,
          isActive: body.isActive ?? true,
        },
      });
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        issueKey: t.Optional(t.Nullable(t.String())),
        comment: t.String({ minLength: 1 }),
        defaultHours: t.Number({ minimum: 0.25, maximum: 24 }),
        isActive: t.Optional(t.Boolean()),
      }),
    },
  )
  .put(
    "/:id",
    async ({ params, body, request }) => {
      await getAuthUserId(request);
      return prisma.worklogTemplate.update({
        where: { id: params.id },
        data: {
          name: body.name,
          issueKey: body.issueKey,
          comment: body.comment,
          defaultHours: body.defaultHours,
          isActive: body.isActive,
        },
      });
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        issueKey: t.Optional(t.Nullable(t.String())),
        comment: t.Optional(t.String({ minLength: 1 })),
        defaultHours: t.Optional(t.Number({ minimum: 0.25, maximum: 24 })),
        isActive: t.Optional(t.Boolean()),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, request }) => {
      await getAuthUserId(request);
      await prisma.worklogTemplate.delete({ where: { id: params.id } });
      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
    },
  );
