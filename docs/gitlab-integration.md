# GitLab Integration Guide

## Overview

EZ-Log connects to your company's GitLab instance to fetch **Commit History** and **Merge Request** events, then correlates them with Jira tickets by parsing issue keys from commit messages and branch names.

## Prerequisites

- Access to a GitLab instance (self-hosted or GitLab.com)
- A GitLab account with access to the projects you want to track

## Step 1: Generate a Personal Access Token

1. Log in to your GitLab instance
2. Navigate to **User Settings** > **Access Tokens** (or visit `https://<your-gitlab>/~/-/user_settings/personal_access_tokens`)
3. Click **Add new token**
4. Fill in:
   - **Token name**: `ez-log`
   - **Expiration date**: Set to a reasonable date (e.g., 1 year)
   - **Scopes**: Select the following:
     - `read_api` — Read access to the API (needed for commits, MRs, events)
     - `read_repository` — Read access to repositories (needed for commit details)
5. Click **Create personal access token**
6. Copy the token immediately — it will only be shown once

## Step 2: Find Your GitLab Username

Your GitLab username is used to filter commits and MRs to only show your own activity.

1. Go to your GitLab profile page
2. Your username is shown in the URL: `https://<your-gitlab>/<username>`
3. Or look at your profile settings under **Username**

## Step 3: Configure Environment Variables

Add the following to your `apps/server/.env` file:

```env
GITLAB_URL=https://gitlab.example.com
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
GITLAB_USERNAME=your.username
```

| Variable | Description | Example |
|----------|-------------|---------|
| `GITLAB_URL` | Base URL of your GitLab instance (no trailing slash) | `https://gitlab.example.com` |
| `GITLAB_TOKEN` | Personal Access Token from Step 1 | `glpat-abc123...` |
| `GITLAB_USERNAME` | Your GitLab username from Step 2 | `john.doe` |

## How It Works

### Commit Tracking

- EZ-Log fetches push events from the GitLab Events API
- For each project you pushed to, it fetches commits filtered by your username and the date range
- Commit messages are parsed for Jira issue keys using the pattern `[A-Z][A-Z0-9]+-\d+` (e.g., `FEAT-123`, `BUG-456`)

### Merge Request Tracking

- MRs are fetched via the MRs API, filtered by `author_username` and date range
- Jira keys are extracted from:
  1. MR title
  2. MR description
  3. Source branch name (e.g., `feature/FEAT-123-add-login`)

### Caching

- GitLab data is cached in memory for 5 minutes to avoid hitting rate limits
- Cache is automatically invalidated when you submit worklogs

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Token is invalid or expired — regenerate it |
| Empty results | Verify `GITLAB_USERNAME` matches your GitLab username exactly |
| Missing commits | Ensure the token has `read_repository` scope |
| Rate limited | Wait a few minutes; EZ-Log caches results to minimize API calls |
