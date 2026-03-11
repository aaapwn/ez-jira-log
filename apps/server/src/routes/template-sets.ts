import prisma from "@ez-jira-log/db";
import { Elysia, t } from "elysia";

import { getAuthUserId } from "../middleware/auth";

const TemplateSetItem = t.Object({
  issueKey: t.Optional(t.Nullable(t.String())),
  comment: t.String({ minLength: 1 }),
  hours: t.Number({ minimum: 0, maximum: 24 }),
  startTime: t.Optional(t.Nullable(t.String())),
  endTime: t.Optional(t.Nullable(t.String())),
});

export const templateSetsRoutes = new Elysia({ prefix: "/template-sets" })
  .get("/", async ({ request }) => {
    const userId = await getAuthUserId(request);
    return prisma.templateSet.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  })
  .post(
    "/",
    async ({ body, request }) => {
      const userId = await getAuthUserId(request);
      return prisma.templateSet.create({
        data: {
          userId,
          name: body.name,
          items: body.items as any,
          isActive: body.isActive ?? true,
        },
      });
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        items: t.Array(TemplateSetItem, { minItems: 1 }),
        isActive: t.Optional(t.Boolean()),
      }),
    },
  )
  .put(
    "/:id",
    async ({ params, body, request }) => {
      await getAuthUserId(request);
      return prisma.templateSet.update({
        where: { id: params.id },
        data: {
          name: body.name,
          items: body.items as any,
          isActive: body.isActive,
        },
      });
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        items: t.Optional(t.Array(TemplateSetItem, { minItems: 1 })),
        isActive: t.Optional(t.Boolean()),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, request }) => {
      await getAuthUserId(request);
      await prisma.templateSet.delete({ where: { id: params.id } });
      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
    },
  );
