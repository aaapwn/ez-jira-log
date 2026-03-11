import { cors } from "@elysiajs/cors";
import { auth } from "@ez-jira-log/auth";
import { env } from "@ez-jira-log/env/server";
import { Elysia } from "elysia";

import { activitiesRoutes } from "./routes/activities";
import { calendarRoutes } from "./routes/calendar";
import { configRoutes } from "./routes/config";
import { jiraRoutes } from "./routes/jira";
import { templateSetsRoutes } from "./routes/template-sets";
import { templatesRoutes } from "./routes/templates";

const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  )
  .all("/api/auth/*", async (context) => {
    const { request, status } = context;
    if (["POST", "GET"].includes(request.method)) {
      return auth.handler(request);
    }
    return status(405);
  })
  .use(activitiesRoutes)
  .use(jiraRoutes)
  .use(calendarRoutes)
  .use(configRoutes)
  .use(templatesRoutes)
  .use(templateSetsRoutes)
  .get("/", () => "OK")
  .listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
  });

export type App = typeof app;
