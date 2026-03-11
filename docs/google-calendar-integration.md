# Google Calendar Integration Guide

## Overview

EZ-Log connects to Google Calendar to automatically detect meetings and events, creating activity entries that can be turned into worklog entries (e.g., "Stand-up 0.5h", "Sprint Planning 1h").

## Prerequisites

- A Google account with access to Google Calendar
- A Google Cloud project (free tier is sufficient)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** > **New Project**
3. Enter project name: `ez-log`
4. Click **Create**

## Step 2: Enable the Google Calendar API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on **Google Calendar API**
4. Click **Enable**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the consent screen first:
   - User type: **External** (or Internal if you have a Google Workspace org)
   - App name: `EZ-Log`
   - User support email: your email
   - Developer contact: your email
   - Click **Save and Continue** through all steps
4. Back in credentials, select:
   - Application type: **Web application**
   - Name: `EZ-Log`
   - Authorized redirect URIs: `http://localhost:3000/calendar/callback`
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

## Step 4: Configure Environment Variables

Add the following to your `apps/server/.env` file:

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/calendar/callback
```

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Step 3 | `123456789-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret from Step 3 | `GOCSPX-xxx...` |
| `GOOGLE_REDIRECT_URI` | Callback URL registered in Step 3 | `http://localhost:3000/calendar/callback` |

## Step 5: Connect Your Calendar

1. Start EZ-Log and go to **Settings**
2. Under **Integrations**, find **Google Calendar**
3. Click **Connect** — this opens a Google sign-in window
4. Sign in and grant permission to read your calendar
5. You'll be redirected back; the status should change to **Connected**

## How It Works

### OAuth 2.0 Flow

```
[User clicks Connect] → [Redirect to Google] → [User grants access]
    → [Google redirects to /calendar/callback with code]
    → [EZ-Log exchanges code for refresh_token]
    → [Refresh token stored in database]
```

On subsequent requests, EZ-Log uses the refresh token to get a new access token automatically.

### Event Fetching

- Events are fetched from your **primary calendar**
- Filtered by the selected date range
- Only single events (recurring events are expanded)
- Maximum 250 events per request

### Event Classification

Events are automatically classified by title:

| Pattern | Category |
|---------|----------|
| "stand-up", "standup" | standup |
| "retrospective", "retro" | retro |
| "sprint planning", "sprint review" | sprint |
| "code review" | review |
| "1:1", "one-on-one" | 1on1 |
| "sync" | sync |
| "grooming", "refinement" | grooming |
| Everything else | meeting |

### Duration Calculation

The suggested hours for each event are calculated from the event's start and end time. For example, a meeting from 10:00 to 11:30 suggests 1.5 hours.

### Required Scopes

EZ-Log only requests **read-only** access:

```
https://www.googleapis.com/auth/calendar.readonly
```

This means EZ-Log can only read your events — it cannot create, modify, or delete any calendar entries.

## Production Deployment

For production, update the redirect URI:

1. Go to Google Cloud Console > Credentials
2. Edit your OAuth client
3. Add your production callback URL: `https://your-domain.com/calendar/callback`
4. Update `GOOGLE_REDIRECT_URI` in your production environment

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Access denied" during OAuth | Ensure the redirect URI matches exactly (including protocol and port) |
| No events showing | Check that events exist on your **primary** calendar, not a shared one |
| Token expired | EZ-Log auto-refreshes tokens; if this fails, disconnect and reconnect |
| "Calendar not connected" error | Go to Settings and click Connect to authorize |
| "Consent screen not verified" | In development, click "Continue" on the warning screen; for production, submit for verification |
