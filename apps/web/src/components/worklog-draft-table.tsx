import { Button } from "@ez-jira-log/ui/components/button";
import { Input } from "@ez-jira-log/ui/components/input";
import { Plus, Trash2 } from "lucide-react";

export interface DraftEntry {
  id: string;
  issueKey: string;
  description: string;
  hours: number;
  comment: string;
}

interface WorklogDraftTableProps {
  entries: DraftEntry[];
  onUpdateEntry: (id: string, field: keyof DraftEntry, value: string | number) => void;
  onRemoveEntry: (id: string) => void;
  onAddEntry: () => void;
  totalHours: number;
  targetHours: number;
}

export default function WorklogDraftTable({
  entries,
  onUpdateEntry,
  onRemoveEntry,
  onAddEntry,
  totalHours,
  targetHours,
}: WorklogDraftTableProps) {
  const remaining = Math.max(0, targetHours - totalHours);

  return (
    <div className="space-y-3">
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground rounded-lg border border-dashed border-border/60">
          <p className="text-sm mb-2">No entries yet</p>
          <Button variant="outline" size="sm" onClick={onAddEntry}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Entry
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className="group grid grid-cols-[100px_1fr_70px_1fr_36px] items-center gap-2 rounded-lg border border-border/40 bg-muted/20 p-2 transition-colors hover:bg-muted/40"
            >
              <Input
                value={entry.issueKey}
                onChange={(e) =>
                  onUpdateEntry(entry.id, "issueKey", e.target.value)
                }
                placeholder="PROJ-123"
                className="h-8 text-xs font-mono bg-transparent border-border/40"
              />
              <span className="text-xs text-muted-foreground truncate px-1">
                {entry.description || "—"}
              </span>
              <Input
                type="number"
                value={entry.hours}
                onChange={(e) =>
                  onUpdateEntry(
                    entry.id,
                    "hours",
                    parseFloat(e.target.value) || 0,
                  )
                }
                min={0}
                max={24}
                step={0.25}
                className="h-8 text-xs tabular-nums bg-transparent border-border/40"
              />
              <Input
                value={entry.comment}
                onChange={(e) =>
                  onUpdateEntry(entry.id, "comment", e.target.value)
                }
                placeholder="Work description..."
                className="h-8 text-xs bg-transparent border-border/40"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveEntry(entry.id)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        {entries.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddEntry}
            className="text-xs text-muted-foreground"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Entry
          </Button>
        )}

        <div className="ml-auto flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">
            Total:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {totalHours.toFixed(2)}h
            </span>
          </span>
          <span className="text-muted-foreground">
            Target:{" "}
            <span className="tabular-nums">{targetHours}h</span>
          </span>
          {remaining > 0 && (
            <span className="text-status-incomplete font-medium tabular-nums">
              -{remaining.toFixed(2)}h
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
