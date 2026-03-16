import { Badge } from "@ez-jira-log/ui/components/badge";
import { Card } from "@ez-jira-log/ui/components/card";
import { cn } from "@ez-jira-log/ui/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import { Calendar, GitBranch } from "lucide-react";
import { memo } from "react";

import { getDayName, getMonthDay, hoursToTimeString, isToday } from "@/lib/date-utils";

interface DayCardProps {
  date: string;
  hoursLogged: number;
  target: number;
  status: "incomplete" | "complete" | "off";
  activityCount: number;
  commitCount: number;
  calendarCount: number;
}

const statusBorder = {
  complete: "border-status-complete/30 hover:border-status-complete/50",
  incomplete: "border-status-incomplete/30 hover:border-status-incomplete/50",
  off: "border-border/40 opacity-60",
} as const;

const DayCard = memo(function DayCard({
  date,
  hoursLogged,
  target,
  status,
  activityCount,
  commitCount,
  calendarCount,
}: DayCardProps) {
  const progress = Math.min((hoursLogged / target) * 100, 100);
  const today = isToday(date);
  const { pathname } = useLocation();
  const isActive = pathname === `/dashboard/${date}`;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border backdrop-blur-sm p-3.5 transition-colors hover:shadow-lg hover:shadow-ocean-300/5",
        statusBorder[status],
        today && "ring-2 ring-ocean-300/50",
        isActive ? "border-ocean-400/50 bg-ocean-300/5" : "bg-card/60",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm tracking-tight">
              {getDayName(date)}
            </span>
            {today && (
              <Badge className="text-[10px] px-1.5 py-0 bg-ocean-300/15 text-ocean-300 border-ocean-300/25 hover:bg-ocean-300/15">
                Today
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {getMonthDay(date)}
          </span>
        </div>
        <span className="text-xs font-mono tabular-nums text-muted-foreground">
          {hoursToTimeString(hoursLogged)}/{target}h
        </span>
      </div>

      {status !== "off" && (
        <div className="mb-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background:
                status === "complete"
                  ? "linear-gradient(90deg, #00b4d8, #0077b6)"
                  : "linear-gradient(90deg, #f97316, #fb923c)",
            }}
          />
        </div>
      )}

      <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
        {commitCount > 0 && (
          <span className="flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5">
            <GitBranch className="h-3 w-3" /> {commitCount}
          </span>
        )}
        {calendarCount > 0 && (
          <span className="flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5">
            <Calendar className="h-3 w-3" /> {calendarCount}
          </span>
        )}
        {activityCount === 0 && status !== "off" && (
          <span className="italic text-muted-foreground/60">No activities</span>
        )}
      </div>

      <Link
        to="/dashboard/$date"
        params={{ date }}
        className="absolute inset-0 z-10"
        aria-label={`View details for ${date}`}
      />
    </Card>
  );
});

export default DayCard;
