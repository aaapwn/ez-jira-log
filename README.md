# ez-jira-log

A personal work logging tool that aggregates activities from **Jira**, **GitLab**, and **Google Calendar** into a single dashboard — then lets you submit Jira worklogs in one click. It also automates daily check-in/check-out via Google Sheets and sends Web Push notifications as reminders.

Built with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack).

## Features

- **Activity Aggregation** — View Jira issues, GitLab commits/MRs, and Google Calendar events in one place
- **Jira Worklog Submission** — Submit and delete worklogs directly from the dashboard
- **Worklog Templates** — Save frequently-used worklog entries and template sets for quick logging
- **Automated Check-in/Check-out** — Cron jobs tick checkboxes in a Google Sheet at configurable times
- **Web Push Notifications** — Get notified for check-in, check-out, and monthly reminders
- **PWA** — Installable as a Progressive Web App on any device

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TanStack Router, TanStack Query, Vite 6, shadcn/ui, TailwindCSS |
| Backend | Elysia, Bun |
| Database | PostgreSQL, Prisma |
| Auth | Better-Auth (email + password) |
| Monorepo | Turborepo, Bun workspaces |
| Deployment | Docker, Railway, Nginx |

## Project Structure

```
ez-jira-log/
├── apps/
│   ├── web/              # React frontend (Vite + TanStack Router + PWA)
│   └── server/           # Elysia backend API
├── packages/
│   ├── ui/               # Shared shadcn/ui components and styles
│   ├── auth/             # Better-Auth configuration
│   ├── db/               # Prisma schema, migrations, docker-compose
│   ├── env/              # Environment variable validation (server + client)
│   └── config/           # Shared TypeScript config
├── config/
│   └── nginx.frontend.conf
├── turbo.json
└── package.json
```

## Prerequisites

- [Bun](https://bun.sh/) >= 1.3.0
- [Docker](https://www.docker.com/) (for running PostgreSQL locally)
- A Jira Cloud account
- A GitLab account (self-hosted or gitlab.com)
- A Google Cloud project (for Calendar + Sheets OAuth)

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd ez-jira-log
bun install
```

### 2. Start the PostgreSQL database

```bash
cd packages/db
docker compose up -d
```

This starts PostgreSQL 15 on port `5432` with database `ez-jira-log`, user `postgres`, password `password`.

### 3. Configure environment variables

Copy the example env file for the server:

```bash
cp apps/server/.env.example apps/server/.env
```

Create the web env file:

```bash
cat > apps/web/.env << 'EOF'
VITE_SERVER_URL=http://localhost:3000
VITE_VAPID_PUBLIC_KEY=<your-vapid-public-key>
EOF
```

See the [Environment Variables](#environment-variables) section below for how to obtain each value.

### 4. Push the database schema

```bash
bun run db:push
```

### 5. Start development servers

```bash
bun run dev
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:3001 |
| API server | http://localhost:3000 |

---

## Environment Variables

### Server (`apps/server/.env`)

#### Core

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `DATABASE_URL` | PostgreSQL connection string | If using the provided docker-compose: `postgresql://postgres:password@localhost:5432/ez-jira-log` |
| `BETTER_AUTH_SECRET` | Secret key for signing auth tokens (min 32 chars) | Generate with: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Base URL of the server | `http://localhost:3000` for local dev |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3001` for local dev |
| `NODE_ENV` | Environment mode | `development` or `production` |

#### GitLab

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `GITLAB_URL` | GitLab instance URL | Your GitLab URL, e.g. `https://gitlab.com` or `https://gitlab.your-company.com` |
| `GITLAB_TOKEN` | GitLab Personal Access Token | GitLab → **Settings** → **Access Tokens** → **Personal Access Tokens** → Create with `read_api` scope. The token starts with `glpat-`. |
| `GITLAB_USERNAME` | Your GitLab username | Your GitLab username (shown in your profile URL) |

#### Jira

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `JIRA_URL` | Jira Cloud URL | Your Atlassian URL, e.g. `https://your-company.atlassian.net` |
| `JIRA_EMAIL` | Email linked to your Jira account | The email you use to log in to Jira |
| `JIRA_API_TOKEN` | Jira API token | Go to [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) → **Create API token** → Copy the token |

#### Google Calendar & Sheets OAuth2

These are used for both Google Calendar (activity feed) and Google Sheets (automated check-in/check-out).

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `GOOGLE_CLIENT_ID` | OAuth2 client ID | See instructions below |
| `GOOGLE_CLIENT_SECRET` | OAuth2 client secret | See instructions below |
| `GOOGLE_REDIRECT_URI` | OAuth2 callback URL | `http://localhost:3000/calendar/callback` for local dev |

**How to create Google OAuth2 credentials:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services** → **Library**
4. Enable **Google Calendar API** and **Google Sheets API**
5. Navigate to **APIs & Services** → **Credentials**
6. Click **Create Credentials** → **OAuth client ID**
7. If prompted, configure the **OAuth consent screen** first:
   - Choose **External** user type
   - Fill in the app name and your email
   - Add scopes: `calendar.readonly`, `calendar.events.readonly`, `spreadsheets`
   - Add your email as a test user
8. Back in Credentials, select **Web application** as the application type
9. Add `http://localhost:3000/calendar/callback` as an **Authorized redirect URI**
10. Copy the **Client ID** and **Client Secret**

#### Web Push (VAPID)

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `VAPID_PUBLIC_KEY` | VAPID public key for Web Push | Generate with the command below |
| `VAPID_PRIVATE_KEY` | VAPID private key for Web Push | Generate with the command below |
| `VAPID_SUBJECT` | Contact email for the push service | `mailto:your.email@example.com` |

Generate VAPID keys:

```bash
bunx web-push generate-vapid-keys --json
```

This outputs a JSON with `publicKey` and `privateKey`. Use them for `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` respectively.

### Web (`apps/web/.env`)

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `VITE_SERVER_URL` | URL of the API server | `http://localhost:3000` for local dev |
| `VITE_VAPID_PUBLIC_KEY` | Same VAPID public key as the server | Use the same `VAPID_PUBLIC_KEY` from the server env |

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start all apps in development mode |
| `bun run build` | Build all apps |
| `bun run dev:web` | Start only the web app |
| `bun run dev:server` | Start only the server |
| `bun run check-types` | TypeScript type checking across all packages |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run database migrations |
| `bun run db:studio` | Open Prisma Studio (database GUI) |

## UI Customization

This project uses shadcn/ui primitives shared through `packages/ui`.

- Design tokens and global styles: `packages/ui/src/styles/globals.css`
- Shared components: `packages/ui/src/components/*`
- shadcn config: `packages/ui/components.json` and `apps/web/components.json`

Add shared components:

```bash
npx shadcn@latest add <component-name> -c packages/ui
```

Import shared components:

```tsx
import { Button } from "@ez-jira-log/ui/components/button";
```

## Deployment

The project includes Docker and Railway configuration for deployment.

### Docker

Build and run the server:

```bash
docker build -f apps/server/Dockerfile -t ez-jira-log-server .
docker run -p 3000:3000 --env-file apps/server/.env ez-jira-log-server
```

Build and run the web app:

```bash
docker build -f apps/web/Dockerfile -t ez-jira-log-web .
docker run -p 80:80 ez-jira-log-web
```

### Railway

Deployment configs are provided in `railway.server.json` and `railway.web.json`. Connect your Railway project and it will use the Dockerfiles automatically.
