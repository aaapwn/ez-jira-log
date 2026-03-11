import { treaty } from "@elysiajs/eden";
import type { App } from "server/src/index";

import { env } from "@ez-jira-log/env/web";

export const api = treaty<App>(env.VITE_SERVER_URL, {
  fetch: {
    credentials: "include",
  },
});
