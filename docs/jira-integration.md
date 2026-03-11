# Jira Integration Guide

## Overview

EZ-Log connects to your Jira Cloud instance to:
- Fetch tickets assigned to you or reported by you
- Check existing worklog status (hours logged per day)
- Submit new worklogs (time entries) via the Jira REST API

## Prerequisites

- A Jira Cloud account (Atlassian)
- Access to the Jira projects you want to log time against

## Step 1: Generate a Jira API Token

1. Go to [Atlassian API Token Management](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Enter a label: `ez-log`
4. Click **Create**
5. Copy the token immediately

## Step 2: Find Your Jira Base URL

Your Jira base URL follows this pattern:

```
https://<your-company>.atlassian.net
```

For example: `https://acme-corp.atlassian.net`

You can find this in your browser's address bar when accessing Jira.

## Step 3: Configure Environment Variables

Add the following to your `apps/server/.env` file:

```env
JIRA_URL=https://your-company.atlassian.net
JIRA_EMAIL=your.email@company.com
JIRA_API_TOKEN=your-jira-api-token
```

| Variable | Description | Example |
|----------|-------------|---------|
| `JIRA_URL` | Your Jira Cloud base URL (no trailing slash) | `https://acme.atlassian.net` |
| `JIRA_EMAIL` | The email address associated with your Atlassian account | `john@acme.com` |
| `JIRA_API_TOKEN` | API token from Step 1 | `ATATT3xF...` |

## How It Works

### Authentication

EZ-Log uses **Basic Authentication** with your email and API token. The credentials are sent as:

```
Authorization: Basic base64(email:api_token)
```

### Ticket Discovery

- Tickets are fetched using JQL (Jira Query Language):
  ```
  (assignee = currentUser() OR reporter = currentUser()) AND updated >= "2026-02-23" AND updated <= "2026-03-10"
  ```
- Results include: summary, status, assignee, issue type, and project

### Worklog Status Check

For each discovered ticket:
1. EZ-Log fetches existing worklogs via `GET /rest/api/3/issue/{key}/worklog`
2. Filters by your email and the date range
3. Aggregates hours per day

### Worklog Submission

When you submit worklogs, EZ-Log sends:

```json
{
  "timeSpentSeconds": 3600,
  "started": "2026-03-10T09:00:00.000+0700",
  "comment": {
    "type": "doc",
    "version": 1,
    "content": [
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Your comment here" }]
      }
    ]
  }
}
```

The comment uses Atlassian Document Format (ADF), which is required by Jira Cloud API v3.

### Limitations

- **Jira Server/Data Center**: This integration targets Jira Cloud. For self-hosted Jira, API authentication and endpoints may differ
- **Permissions**: You must have the "Log Work" permission on the Jira project
- **Sequential submission**: Worklogs are submitted sequentially to avoid overwhelming the Jira API

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Verify email and API token are correct |
| 403 Forbidden | Check that you have "Log Work" permission on the project |
| No tickets found | Ensure you're the assignee or reporter on tickets in the date range |
| Worklog not appearing | Check the timezone; worklogs use `+0700` (Asia/Bangkok) by default |
| Rate limited (429) | Jira Cloud has rate limits; wait a moment and retry |
