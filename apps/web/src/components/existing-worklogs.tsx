import { Badge } from "@ez-jira-log/ui/components/badge";
import { CheckCircle2, Clock } from "lucide-react";

export interface ExistingWorklog {
  id: string;
  issueKey: string;
  issueSummary: string;
  hours: number;
  comment: string;
  started: string;
}

interface ExistingWorklogsProps {
  worklogs: ExistingWorklog[];
}

export default function ExistingWorklogs({ worklogs }: ExistingWorklogsProps) {
  if (worklogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground rounded-lg border border-dashed border-border/60">
        <Clock className="h-5 w-5 mb-2 opacity-50" />
        <p className="text-sm">No worklogs submitted yet</p>
      </div>
    );
  }

  const totalHours = worklogs.reduce((sum, w) => sum + w.hours, 0);

  return (
    <div className="space-y-2">
      {worklogs.map((wl) => (
        <div
          key={wl.id}
          className="flex items-start gap-3 rounded-lg border border-ocean-300/15 bg-ocean-300/5 p-3 transition-colors"
        >
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-ocean-300" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="shrink-0 font-mono text-[11px] bg-ocean-400/15 text-ocean-300 border-ocean-300/20"
              >
                {wl.issueKey}
              </Badge>
              <span className="text-sm truncate text-foreground/80">
                {wl.issueSummary}
              </span>
            </div>
            {wl.comment && (
              <p className="mt-1 text-xs text-muted-foreground truncate">
                {wl.comment}
              </p>
            )}
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-ocean-300">
            {wl.hours.toFixed(2)}h
          </span>
        </div>
      ))}

      <div className="flex items-center justify-end pt-1 text-xs text-muted-foreground">
        <span>
          Logged:{" "}
          <span className="font-semibold tabular-nums text-ocean-300">
            {totalHours.toFixed(2)}h
          </span>
        </span>
      </div>
    </div>
  );
}
