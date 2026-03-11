import { Button } from "@ez-jira-log/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ez-jira-log/ui/components/dialog";
import { Input } from "@ez-jira-log/ui/components/input";
import { Label } from "@ez-jira-log/ui/components/label";
import { Separator } from "@ez-jira-log/ui/components/separator";
import { Switch } from "@ez-jira-log/ui/components/switch";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import type { TemplateSetItem } from "@/hooks/use-template-sets";
import { timeDiffHours } from "@/lib/smart-fill";

interface TemplateSetFormData {
  name: string;
  items: TemplateSetItem[];
  isActive: boolean;
}

interface TemplateSetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TemplateSetFormData) => void;
  initialValues?: Partial<TemplateSetFormData>;
  title: string;
  isLoading?: boolean;
}

const EMPTY_ITEM: TemplateSetItem = {
  issueKey: "",
  comment: "",
  hours: 0,
  startTime: null,
  endTime: null,
};

export default function TemplateSetForm({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  title,
  isLoading,
}: TemplateSetFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? true);
  const [items, setItems] = useState<TemplateSetItem[]>(
    initialValues?.items?.length ? initialValues.items : [{ ...EMPTY_ITEM }],
  );

  const handleAddItem = useCallback(() => {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }, []);

  const handleRemoveItem = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleUpdateItem = useCallback(
    (idx: number, field: keyof TemplateSetItem, value: string | number | null) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== idx) return item;
          const updated = { ...item, [field]: value };

          if (field === "startTime" || field === "endTime") {
            const start = field === "startTime" ? (value as string) : item.startTime;
            const end = field === "endTime" ? (value as string) : item.endTime;
            const h = timeDiffHours(start ?? undefined, end ?? undefined);
            if (h > 0) updated.hours = h;
          }

          return updated;
        }),
      );
    },
    [],
  );

  const totalHours = items.reduce((sum, it) => sum + it.hours, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((it) => it.comment && it.hours > 0);
    if (validItems.length === 0) return;
    onSubmit({
      name,
      items: validItems.map((it) => ({
        ...it,
        issueKey: it.issueKey || null,
        startTime: it.startTime || null,
        endTime: it.endTime || null,
      })),
      isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="set-name">Set Name</Label>
              <Input
                id="set-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Daily Routine"
                required
              />
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <Label htmlFor="set-active" className="text-xs">
                Active
              </Label>
              <Switch
                id="set-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Entries ({items.length})
              </Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                Total: {totalHours.toFixed(2)}h
              </span>
            </div>

            <div className="grid grid-cols-[80px_6px_80px_50px_100px_1fr_1fr_36px] gap-2 px-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
              <span>Start</span>
              <span />
              <span>End</span>
              <span>Hours</span>
              <span>Issue Key</span>
              <span>Comment</span>
              <span />
              <span />
            </div>

            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[80px_6px_80px_50px_100px_1fr_1fr_36px] items-center gap-2 rounded-lg border border-border/40 bg-muted/10 p-2"
              >
                <Input
                  type="time"
                  value={item.startTime ?? ""}
                  onChange={(e) =>
                    handleUpdateItem(idx, "startTime", e.target.value || null)
                  }
                  className="h-7 text-xs tabular-nums bg-transparent border-border/40"
                />
                <span className="text-center text-muted-foreground/40">–</span>
                <Input
                  type="time"
                  value={item.endTime ?? ""}
                  onChange={(e) =>
                    handleUpdateItem(idx, "endTime", e.target.value || null)
                  }
                  className="h-7 text-xs tabular-nums bg-transparent border-border/40"
                />
                <span className="text-[11px] font-mono tabular-nums text-muted-foreground text-center">
                  {item.hours > 0
                    ? `${item.hours.toFixed(item.hours % 1 === 0 ? 0 : 1)}h`
                    : "—"}
                </span>
                <Input
                  value={item.issueKey ?? ""}
                  onChange={(e) =>
                    handleUpdateItem(idx, "issueKey", e.target.value)
                  }
                  placeholder="PROJ-123"
                  className="h-7 text-xs font-mono bg-transparent border-border/40"
                />
                <Input
                  value={item.comment}
                  onChange={(e) =>
                    handleUpdateItem(idx, "comment", e.target.value)
                  }
                  placeholder="Work description"
                  required
                  className="h-7 text-xs bg-transparent border-border/40"
                />
                <span />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(idx)}
                  disabled={items.length <= 1}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="w-full text-xs gap-1 border-dashed"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Entry
            </Button>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
