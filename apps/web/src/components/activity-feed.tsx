import { Badge } from "@ez-jira-log/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ez-jira-log/ui/components/tooltip";
import {
  Calendar,
  ExternalLink,
  GitBranch,
  GitMerge,
  Plus,
  Ticket,
} from "lucide-react";

interface Activity {
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

const sourceConfig = {
  gitlab: { icon: GitBranch, label: "GitLab", color: "text-orange-400", line: "border-orange-400/30" },
  jira: { icon: Ticket, label: "Jira", color: "text-ocean-300", line: "border-ocean-300/30" },
  calendar: { icon: Calendar, label: "Calendar", color: "text-ocean-200", line: "border-ocean-200/30" },
} as const;

const typeIcons = {
  commit: GitBranch,
  merge_request: GitMerge,
  ticket: Ticket,
  meeting: Calendar,
} as const;

const typeLabels: Record<string, string> = {
  commit: "Commit",
  merge_request: "Merge Request",
  ticket: "Ticket",
  meeting: "Meeting",
};

interface ActivityFeedProps {
  activities: Activity[];
  onAddDraft?: (issueKey: string, comment: string, hours: number) => void;
}

export default function ActivityFeed({
  activities,
  onAddDraft,
}: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <Calendar className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No activities found for this day.</p>
      </div>
    );
  }

  const grouped = {
    gitlab: activities.filter((a) => a.source === "gitlab"),
    jira: activities.filter((a) => a.source === "jira"),
    calendar: activities.filter((a) => a.source === "calendar"),
  };

  return (
    <TooltipProvider delay={200}>
      <div className="space-y-5">
        {(
          Object.entries(grouped) as [
            keyof typeof sourceConfig,
            Activity[],
          ][]
        ).map(([source, items]) => {
          if (items.length === 0) return null;
          const config = sourceConfig[source];
          const SourceIcon = config.icon;

          return (
            <div key={source}>
              <div className="flex items-center gap-2 mb-2.5">
                <SourceIcon className={`h-3.5 w-3.5 ${config.color}`} />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {config.label}
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground/60 rounded-full bg-muted px-1.5 py-0.5">
                  {items.length}
                </span>
              </div>
              <div className={`ml-1.5 border-l-2 ${config.line} pl-3 space-y-1`}>
                {items.map((activity) => {
                  const TypeIcon = typeIcons[activity.type];
                  const isCalendar = activity.source === "calendar";

                  return (
                    <div
                      key={activity.id}
                      className={`group flex items-start gap-2.5 rounded-lg p-2 transition-colors hover:bg-muted/50 ${isCalendar && onAddDraft ? "cursor-pointer" : ""}`}
                      onClick={
                        isCalendar && onAddDraft
                          ? () =>
                              onAddDraft(
                                "ADM-13",
                                activity.title,
                                activity.suggestedHours ?? 1,
                              )
                          : undefined
                      }
                    >
                      <Tooltip>
                        <TooltipTrigger>
                          <TypeIcon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          {typeLabels[activity.type] ?? activity.type}
                        </TooltipContent>
                      </Tooltip>
                      <div className="min-w-0 flex-1">
                        {activity.url ? (
                          <a
                            href={activity.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm leading-snug truncate block hover:text-ocean-300 hover:underline transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {activity.title}
                          </a>
                        ) : (
                          <div className="text-sm leading-snug truncate">
                            {activity.title}
                          </div>
                        )}
                        {activity.jiraKey && (
                          <Badge
                            variant="outline"
                            className="mt-1 text-[10px] px-1.5 py-0 font-mono border-ocean-300/25 text-ocean-300"
                          >
                            {activity.jiraKey}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-0.5">
                        {activity.url && (
                          <ExternalLink className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" />
                        )}
                        {isCalendar && onAddDraft && (
                          <Plus className="h-3.5 w-3.5 text-ocean-200/0 group-hover:text-ocean-200 transition-colors" />
                        )}
                        {activity.suggestedHours && (
                          <span className="text-[10px] font-mono text-ocean-300">
                            {activity.suggestedHours}h
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                          {new Date(activity.timestamp).toLocaleTimeString(
                            "en-US",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
