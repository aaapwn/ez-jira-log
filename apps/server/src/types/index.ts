export interface Activity {
  id: string;
  source: "gitlab" | "jira" | "calendar";
  type: "commit" | "merge_request" | "ticket" | "meeting";
  title: string;
  description: string;
  jiraKey?: string;
  timestamp: string;
  suggestedHours?: number;
  url?: string;
}

export interface ExistingWorklog {
  id: string;
  issueKey: string;
  issueSummary: string;
  hours: number;
  comment: string;
  started: string;
}

export interface DayActivity {
  date: string;
  activities: Activity[];
  existingWorklogs: ExistingWorklog[];
  worklogStatus: { hoursLogged: number; target: number };
  status: "incomplete" | "complete" | "off";
}

export interface DayStatus {
  date: string;
  hoursLogged: number;
  target: number;
  status: "incomplete" | "complete" | "off";
}

export interface WorklogEntry {
  issueKey: string;
  date: string;
  timeSpentSeconds: number;
  comment: string;
  started?: string;
}

export interface WorklogSubmitResult {
  issueKey: string;
  date: string;
  success: boolean;
  error?: string;
}

export interface GitLabCommit {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  authored_date: string;
  web_url: string;
}

export interface GitLabMergeRequest {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: string;
  created_at: string;
  merged_at: string | null;
  web_url: string;
  source_branch: string;
  target_branch: string;
}

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: { name: string };
    assignee?: { displayName: string; emailAddress: string } | null;
    issuetype: { name: string };
    project: { key: string; name: string };
  };
}

export interface JiraWorklog {
  id: string;
  issueId: string;
  author: { accountId: string; emailAddress?: string; displayName?: string };
  started: string;
  timeSpentSeconds: number;
  comment?: { content?: Array<{ content?: Array<{ text?: string }> }> };
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: Array<{ email: string; responseStatus: string }>;
}
