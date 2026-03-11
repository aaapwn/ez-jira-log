import { Badge } from "@ez-jira-log/ui/components/badge";
import { Button } from "@ez-jira-log/ui/components/button";
import { Input } from "@ez-jira-log/ui/components/input";
import { Loader2, PenLine, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { useJiraIssueLookup } from "@/hooks/use-jira-issue-lookup";
import type { DraftEntry } from "@/lib/smart-fill";
import { timeDiffHours } from "@/lib/smart-fill";

interface DraftEntryRowProps {
  entry: DraftEntry;
  onUpdate: (id: string, field: keyof DraftEntry, value: string | number) => void;
  onRemove: (id: string) => void;
}

export default function DraftEntryRow({
  entry,
  onUpdate,
  onRemove,
}: DraftEntryRowProps) {
  const { summary, isLoading } = useJiraIssueLookup(entry.issueKey);
  const prevSummaryRef = useRef<string | null>(null);

  useEffect(() => {
    if (summary && summary !== prevSummaryRef.current) {
      prevSummaryRef.current = summary;
      onUpdate(entry.id, "description", summary);
    }
  }, [summary, entry.id, onUpdate]);

  const handleTimeChange = useCallback(
    (field: "startTime" | "endTime", value: string) => {
      onUpdate(entry.id, field, value);
      const start = field === "startTime" ? value : entry.startTime;
      const end = field === "endTime" ? value : entry.endTime;
      const newHours = timeDiffHours(start, end);
      if (newHours > 0) {
        onUpdate(entry.id, "hours", newHours);
      }
    },
    [entry.id, entry.startTime, entry.endTime, onUpdate],
  );

  const hoursLabel =
    entry.hours > 0
      ? `${entry.hours.toFixed(entry.hours % 1 === 0 ? 0 : 1)}h`
      : "—";

  return (
    <div className="group grid grid-cols-[auto_110px_6px_110px_40px_100px_1fr_1fr_auto_36px] items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/5 p-2.5">
      <PenLine className="h-4 w-4 shrink-0 text-amber-400" />
      <Input
        type="time"
        value={entry.startTime ?? ""}
        onChange={(e) => handleTimeChange("startTime", e.target.value)}
        className="h-7 text-xs tabular-nums bg-transparent border-border/40"
      />
      <span className="text-center text-muted-foreground/50">–</span>
      <Input
        type="time"
        value={entry.endTime ?? ""}
        onChange={(e) => handleTimeChange("endTime", e.target.value)}
        className="h-7 text-xs tabular-nums bg-transparent border-border/40"
      />
      <span className="text-[10px] font-mono tabular-nums text-amber-300/70 text-center">
        {hoursLabel}
      </span>
      <Input
        value={entry.issueKey}
        onChange={(e) => onUpdate(entry.id, "issueKey", e.target.value)}
        placeholder="PROJ-123"
        className="h-7 text-xs font-mono bg-transparent border-border/40"
      />
      <span className="text-xs text-muted-foreground truncate px-1 flex items-center gap-1">
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin text-ocean-300/60" />
        ) : (
          entry.description || "—"
        )}
      </span>
      <Input
        value={entry.comment}
        onChange={(e) => onUpdate(entry.id, "comment", e.target.value)}
        placeholder="Work description..."
        className="h-7 text-xs bg-transparent border-border/40"
      />
      <Badge
        variant="outline"
        className="shrink-0 text-[10px] px-1.5 py-0 border-amber-400/30 text-amber-400"
      >
        Draft
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(entry.id)}
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
