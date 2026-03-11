import { Badge } from "@ez-jira-log/ui/components/badge";
import { Card } from "@ez-jira-log/ui/components/card";
import { Checkbox } from "@ez-jira-log/ui/components/checkbox";
import { Link } from "@tanstack/react-router";
import { Calendar, GitBranch } from "lucide-react";

import { getDayName, getMonthDay, hoursToTimeString, isToday } from "@/lib/date-utils";

interface DayCardProps {
  date: string;
  hoursLogged: number;
  target: number;
  status: "incomplete" | "complete" | "off";
  activityCount: number;
  commitCount: number;
  calendarCount: number;
  selected: boolean;
  onSelectChange: (checked: boolean) => void;
}

const statusBorder = {
  complete: "border-status-complete/30 hover:border-status-complete/50",
  incomplete: "border-status-incomplete/30 hover:border-status-incomplete/50",
  off: "border-border/40 opacity-60",
} as const;

export default function DayCard({
  date,
  hoursLogged,
  target,
  status,
  activityCount,
  commitCount,
  calendarCount,
  selected,
  onSelectChange,
}: DayCardProps) {
  const progress = Math.min((hoursLogged / target) * 100, 100);
  const today = isToday(date);

  return (
    <Card
      className={`group relative overflow-hidden border bg-card/60 backdrop-blur-sm p-3.5 transition-all hover:shadow-lg hover:shadow-ocean-300/5 ${statusBorder[status]} ${today ? "ring-2 ring-ocean-300/50" : ""} ${selected ? "ring-2 ring-ocean-300" : ""}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectChange(!!checked)}
            aria-label={`Select ${date}`}
            className="relative z-20"
          />
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
}
