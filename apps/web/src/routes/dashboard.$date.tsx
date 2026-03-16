import { Badge } from "@ez-jira-log/ui/components/badge";
import { Button } from "@ez-jira-log/ui/components/button";
import { Card } from "@ez-jira-log/ui/components/card";
import { Input } from "@ez-jira-log/ui/components/input";
import { Label } from "@ez-jira-log/ui/components/label";
import { Separator } from "@ez-jira-log/ui/components/separator";
import { Skeleton } from "@ez-jira-log/ui/components/skeleton";
import { Switch } from "@ez-jira-log/ui/components/switch";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coffee,
  Layers,
  LayoutTemplate,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import ActivityFeed from "@/components/activity-feed";
import DraftEntryRow from "@/components/draft-entry-row";
import TimeProgressBar from "@/components/time-progress-bar";
import { useActivitySummary } from "@/hooks/use-activity-summary";
import { useDeleteWorklog, useSubmitWorklogs } from "@/hooks/use-submit-worklogs";
import { useTemplateSets } from "@/hooks/use-template-sets";
import type { TemplateSetItem } from "@/hooks/use-template-sets";
import { useTemplates } from "@/hooks/use-templates";
import {
  buildStartedIsoFromTime,
  calculateDraftTimeSlots,
  formatDate,
  getMonthToDateRange,
  getDayName,
  getMonthDay,
  getWorklogTimeRange,
  hoursToSeconds,
  normalizeDate,
} from "@/lib/date-utils";
import type { LunchConfig } from "@/lib/date-utils";
import { buildMagicFillEntries } from "@/lib/smart-fill";
import type { DraftEntry } from "@/lib/smart-fill";

const LUNCH_STORAGE_KEY = "ez-log:lunch-config";
const DAY_START_STORAGE_KEY = "ez-log:day-start";
const DAY_END_STORAGE_KEY = "ez-log:day-end";

function loadLunchConfig(): LunchConfig {
  try {
    const raw = localStorage.getItem(LUNCH_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: true, startHour: 12, endHour: 13 };
}

function loadDayStart(): number {
  try {
    const raw = localStorage.getItem(DAY_START_STORAGE_KEY);
    if (raw) return Number(raw);
  } catch {}
  return 9.5;
}

function loadDayEnd(): number {
  try {
    const raw = localStorage.getItem(DAY_END_STORAGE_KEY);
    if (raw) return Number(raw);
  } catch {}
  return 18.5;
}

export const Route = createFileRoute("/dashboard/$date")({
  component: DayDetailPage,
});

function DayDetailPage() {
  const { date: rawDate } = Route.useParams();
  const date = normalizeDate(rawDate);

  const { from: defaultFrom, to: defaultTo } = getMonthToDateRange();
  const dateInRange = date >= defaultFrom && date <= defaultTo;
  const from = dateInRange
    ? defaultFrom
    : (() => {
        const d = new Date(date);
        d.setDate(d.getDate() - 7);
        return formatDate(d);
      })();
  const to = dateInRange ? defaultTo : date;

  const { data: days, isLoading } = useActivitySummary(from, to);
  const { data: templates } = useTemplates();
  const { data: templateSets } = useTemplateSets();
  const submitMutation = useSubmitWorklogs();
  const deleteMutation = useDeleteWorklog();

  const dayData = days?.find((d: any) => d.date === date);

  const [entries, setEntries] = useState<DraftEntry[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [lunchConfig, setLunchConfig] = useState<LunchConfig>(loadLunchConfig);
  const [dayStartHour, setDayStartHour] = useState<number>(loadDayStart);
  const [dayEndHour, setDayEndHour] = useState<number>(loadDayEnd);

  useEffect(() => {
    localStorage.setItem(LUNCH_STORAGE_KEY, JSON.stringify(lunchConfig));
  }, [lunchConfig]);
  useEffect(() => {
    localStorage.setItem(DAY_START_STORAGE_KEY, String(dayStartHour));
  }, [dayStartHour]);
  useEffect(() => {
    localStorage.setItem(DAY_END_STORAGE_KEY, String(dayEndHour));
  }, [dayEndHour]);

  const existingWorklogs = useMemo(
    () => dayData?.existingWorklogs ?? [],
    [dayData?.existingWorklogs],
  );

  const totalDraftedHours = useMemo(
    () => entries.reduce((sum, e) => sum + e.hours, 0),
    [entries],
  );

  const totalLoggedHours = useMemo(
    () =>
      existingWorklogs.reduce(
        (sum: number, w: { hours: number }) => sum + w.hours,
        0,
      ),
    [existingWorklogs],
  );

  const handleUpdateEntry = useCallback(
    (id: string, field: keyof DraftEntry, value: string | number) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
      );
    },
    [],
  );

  const handleRemoveEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleAddEntry = useCallback(() => {
    setEntries((prev) => [
      ...prev,
      {
        id: `draft-${Date.now()}`,
        issueKey: "",
        description: "",
        hours: 0,
        comment: "",
      },
    ]);
  }, []);

  const handleAddTemplate = useCallback(
    (template: {
      issueKey?: string | null;
      comment: string;
      defaultHours: number;
      name: string;
    }) => {
      setEntries((prev) => [
        ...prev,
        {
          id: `template-${Date.now()}`,
          issueKey: template.issueKey ?? "",
          description: template.name,
          hours: template.defaultHours,
          comment: template.comment,
        },
      ]);
      setShowTemplates(false);
    },
    [],
  );

  const handleApplySet = useCallback(
    (items: TemplateSetItem[]) => {
      const now = Date.now();
      setEntries((prev) => [
        ...prev,
        ...items.map((it, i) => ({
          id: `set-${now}-${i}`,
          issueKey: it.issueKey ?? "",
          description: it.comment,
          hours: it.hours,
          comment: it.comment,
          startTime: it.startTime ?? undefined,
          endTime: it.endTime ?? undefined,
        })),
      ]);
      setShowTemplates(false);
    },
    [],
  );

  const handleMagicFill = useCallback(() => {
    if (!dayData) return;
    const target = dayData.worklogStatus.target ?? 8;
    const rawEntries = buildMagicFillEntries(
      dayData.activities,
      existingWorklogs,
      target,
      entries,
    );
    if (rawEntries.length === 0) return;

    const allDraftsForSlots = [
      ...entries.map((e: DraftEntry) => ({ hours: e.hours, startTime: e.startTime })),
      ...rawEntries.map((e: DraftEntry) => ({ hours: e.hours, startTime: e.startTime })),
    ];
    const slots = calculateDraftTimeSlots(
      date,
      existingWorklogs,
      allDraftsForSlots,
      lunchConfig,
      dayStartHour,
      dayEndHour,
    );

    const existingCount = entries.length;
    const newEntries = rawEntries.map((e: DraftEntry, i: number) => {
      const slotIdx = existingCount + i;
      return {
        ...e,
        startTime: e.startTime ?? slots[slotIdx]?.startTime,
        endTime: e.endTime ?? slots[slotIdx]?.endTime,
      };
    });
    setEntries((prev) => [...prev, ...newEntries]);
  }, [dayData, existingWorklogs, entries, date, lunchConfig, dayStartHour, dayEndHour]);

  const handleSubmit = useCallback(async () => {
    const validEntries = entries.filter(
      (e) => e.issueKey && e.hours > 0,
    );

    if (validEntries.length === 0) {
      toast.error("No valid entries to submit");
      return;
    }

    try {
      const result = await submitMutation.mutateAsync(
        validEntries.map((entry) => ({
          issueKey: entry.issueKey,
          date,
          timeSpentSeconds: hoursToSeconds(entry.hours),
          comment: entry.comment || `Work on ${entry.issueKey}`,
          started: entry.startTime
            ? buildStartedIsoFromTime(date, entry.startTime)
            : undefined,
        })),
      );

      const successResults = result.results.filter(
        (r: { success: boolean }) => r.success,
      );
      const failures = result.results.filter(
        (r: { success: boolean }) => !r.success,
      );

      if (successResults.length > 0)
        toast.success(`${successResults.length} worklog(s) submitted`);
      if (failures.length > 0)
        toast.error(`${failures.length} worklog(s) failed`);

      const failedKeys = new Set(
        failures.map((r: { issueKey: string }) => r.issueKey),
      );
      setEntries((prev) =>
        prev.filter((e) => failedKeys.has(e.issueKey)),
      );
    } catch {
      toast.error("Failed to submit worklogs");
    }
  }, [entries, date, submitMutation]);

  const handleDeleteWorklog = useCallback(
    async (issueKey: string, worklogId: string) => {
      try {
        await deleteMutation.mutateAsync({ issueKey, worklogId });
        toast.success("Worklog deleted from Jira");
        setConfirmDeleteId(null);
      } catch {
        toast.error("Failed to delete worklog");
      }
    },
    [deleteMutation],
  );

  if (isLoading) {
    return (
      <div className="space-y-4 mt-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  const target = dayData?.worklogStatus.target ?? 8;
  const grandTotal = totalLoggedHours + totalDraftedHours;
  const remaining = Math.max(0, target - grandTotal);

  return (
    <div className="space-y-5 mt-6">
      <div className="flex items-center gap-3">
        <Link to="/dashboard">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {getDayName(date)}, {getMonthDay(date)}
          </h2>
        </div>
      </div>

      <TimeProgressBar
        hoursLogged={dayData?.worklogStatus.hoursLogged ?? 0}
        hoursDrafted={totalDraftedHours}
        target={target}
      />

      {/* Schedule config */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border/50 bg-card/70 backdrop-blur-sm px-4 py-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Start</span>
          <Input
            type="time"
            value={`${String(Math.floor(dayStartHour)).padStart(2, "0")}:${String(Math.round((dayStartHour % 1) * 60)).padStart(2, "0")}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":").map(Number);
              setDayStartHour(h + (m || 0) / 60);
            }}
            className="h-7 w-[90px] text-xs tabular-nums bg-transparent border-border/40"
          />
          <span className="text-muted-foreground/50">–</span>
          <span>End</span>
          <Input
            type="time"
            value={`${String(Math.floor(dayEndHour)).padStart(2, "0")}:${String(Math.round((dayEndHour % 1) * 60)).padStart(2, "0")}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":").map(Number);
              setDayEndHour(h + (m || 0) / 60);
            }}
            className="h-7 w-[90px] text-xs tabular-nums bg-transparent border-border/40"
          />
        </div>
        <Separator orientation="vertical" className="h-5 bg-border/40" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Coffee className="h-3.5 w-3.5" />
          <Label htmlFor="lunch-toggle" className="text-xs cursor-pointer">
            Skip lunch
          </Label>
          <Switch
            id="lunch-toggle"
            checked={lunchConfig.enabled}
            onCheckedChange={(v) =>
              setLunchConfig((prev) => ({ ...prev, enabled: v }))
            }
          />
          {lunchConfig.enabled && (
            <>
              <Input
                type="time"
                value={`${String(lunchConfig.startHour).padStart(2, "0")}:00`}
                onChange={(e) => {
                  const [h] = e.target.value.split(":");
                  setLunchConfig((prev) => ({
                    ...prev,
                    startHour: Number(h),
                  }));
                }}
                className="h-7 w-[90px] text-xs tabular-nums bg-transparent border-border/40"
              />
              <span>—</span>
              <Input
                type="time"
                value={`${String(lunchConfig.endHour).padStart(2, "0")}:00`}
                onChange={(e) => {
                  const [h] = e.target.value.split(":");
                  setLunchConfig((prev) => ({
                    ...prev,
                    endHour: Number(h),
                  }));
                }}
                className="h-7 w-[90px] text-xs tabular-nums bg-transparent border-border/40"
              />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-border/50 bg-card/70 backdrop-blur-sm p-5 lg:col-span-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Activities
          </h3>
          <ActivityFeed
            activities={(dayData?.activities ?? []).filter(
              (a: { source: string; type: string }) =>
                a.source !== "jira" &&
                !(a.source === "gitlab" && a.type === "merge_request"),
            )}
            onAddDraft={(issueKey, comment, hours) => {
              setEntries((prev) => [
                ...prev,
                {
                  id: `cal-${Date.now()}`,
                  issueKey,
                  description: comment,
                  hours,
                  comment,
                },
              ]);
            }}
          />
        </Card>

        <Card className="border-border/50 bg-card/70 backdrop-blur-sm p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Worklogs
            </h3>
            <div className="flex items-center gap-2">
              {((templates && templates.length > 0) ||
                (templateSets && templateSets.length > 0)) && (
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => setShowTemplates(!showTemplates)}
                  >
                    <LayoutTemplate className="h-3.5 w-3.5" />
                    Templates
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  {showTemplates && (
                    <div className="absolute right-0 top-full mt-1 w-64 rounded-lg border border-border/60 bg-popover p-1 shadow-xl z-30">
                      {templateSets && templateSets.length > 0 && (
                        <>
                          <div className="px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            Sets
                          </div>
                          {templateSets
                            .filter((s) => s.isActive)
                            .map((s) => (
                              <button
                                key={`set-${s.id}`}
                                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
                                onClick={() => handleApplySet(s.items)}
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <Layers className="h-3 w-3 text-ocean-300 shrink-0" />
                                  {s.name}
                                </span>
                                <span className="ml-2 text-[10px] text-muted-foreground tabular-nums">
                                  {s.items.length} entries /{" "}
                                  {s.items
                                    .reduce(
                                      (sum: number, it: TemplateSetItem) =>
                                        sum + it.hours,
                                      0,
                                    )
                                    .toFixed(1)}
                                  h
                                </span>
                              </button>
                            ))}
                        </>
                      )}
                      {templates && templates.length > 0 && (
                        <>
                          {templateSets && templateSets.length > 0 && (
                            <Separator className="my-1 bg-border/40" />
                          )}
                          <div className="px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium flex items-center gap-1">
                            <LayoutTemplate className="h-3 w-3" />
                            Single
                          </div>
                          {templates.map(
                            (t: {
                              id: string;
                              name: string;
                              issueKey?: string | null;
                              comment: string;
                              defaultHours: number;
                            }) => (
                              <button
                                key={t.id}
                                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
                                onClick={() => handleAddTemplate(t)}
                              >
                                <span className="truncate">{t.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                                  {t.defaultHours}h
                                </span>
                              </button>
                            ),
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleMagicFill}
                className="text-xs gap-1 border-ocean-300/30 text-ocean-300 hover:bg-ocean-300/10"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Magic Fill
              </Button>
            </div>
          </div>

          <Separator className="mb-4 bg-border/40" />

          <div className="space-y-2">
            {(() => {
              type UnifiedItem =
                | { kind: "logged"; id: string; sortKey: string; wl: { id: string; issueKey: string; issueSummary: string; hours: number; comment: string; started: string } }
                | { kind: "draft"; id: string; sortKey: string; entry: DraftEntry };

              const items: UnifiedItem[] = [];

              for (const wl of existingWorklogs as Array<{ id: string; issueKey: string; issueSummary: string; hours: number; comment: string; started: string }>) {
                const tr = getWorklogTimeRange(wl.started, wl.hours);
                items.push({ kind: "logged", id: `logged-${wl.id}`, sortKey: tr.startTime, wl });
              }

              for (const entry of entries) {
                items.push({ kind: "draft", id: entry.id, sortKey: entry.startTime ?? "99:99", entry });
              }

              items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

              if (items.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground rounded-lg border border-dashed border-border/60">
                    <p className="text-sm mb-2">No worklogs yet</p>
                    <Button variant="outline" size="sm" onClick={handleAddEntry}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Entry
                    </Button>
                  </div>
                );
              }

              return items.map((item) => {
                if (item.kind === "logged") {
                  const { wl } = item;
                  const tr = getWorklogTimeRange(wl.started, wl.hours);
                  const isConfirming = confirmDeleteId === wl.id;
                  const deleteBtn = isConfirming ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteWorklog(wl.issueKey, wl.id)}
                      disabled={deleteMutation.isPending}
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 animate-pulse"
                      title="Click again to confirm deletion"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDeleteId(wl.id)}
                      className="h-7 w-7 text-muted-foreground/40 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      title="Delete from Jira"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  );
                  return (
                    <div
                      key={item.id}
                      className="group rounded-lg border border-ocean-300/20 bg-ocean-300/5 p-2.5"
                    >
                      {/* Desktop */}
                      <div className="hidden md:grid grid-cols-[auto_110px_6px_110px_40px_100px_1fr_1fr_auto_36px] items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-ocean-300" />
                        <span className="text-xs tabular-nums text-foreground/60 text-center">{tr.startTime}</span>
                        <span className="text-center text-foreground/30">–</span>
                        <span className="text-xs tabular-nums text-foreground/60 text-center">{tr.endTime}</span>
                        <span className="text-[10px] font-mono tabular-nums text-foreground/50 text-center">
                          {wl.hours.toFixed(wl.hours % 1 === 0 ? 0 : 1)}h
                        </span>
                        <Badge
                          variant="secondary"
                          className="shrink-0 font-mono text-[11px] bg-ocean-400/15 text-ocean-300 border-ocean-300/20"
                        >
                          {wl.issueKey}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {wl.issueSummary}
                        </span>
                        <span className="text-xs text-muted-foreground/60 truncate">
                          {wl.comment || ""}
                        </span>
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px] px-1.5 py-0 border-ocean-300/30 text-ocean-300"
                        >
                          Logged
                        </Badge>
                        {deleteBtn}
                      </div>
                      {/* Mobile */}
                      <div className="md:hidden flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-ocean-300" />
                            <span className="text-xs tabular-nums text-foreground/60">{tr.startTime}</span>
                            <span className="text-foreground/30">–</span>
                            <span className="text-xs tabular-nums text-foreground/60">{tr.endTime}</span>
                            <span className="text-[10px] font-mono tabular-nums text-foreground/50">
                              {wl.hours.toFixed(wl.hours % 1 === 0 ? 0 : 1)}h
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className="shrink-0 text-[10px] px-1.5 py-0 border-ocean-300/30 text-ocean-300"
                            >
                              Logged
                            </Badge>
                            {deleteBtn}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 pl-5">
                          <Badge
                            variant="secondary"
                            className="shrink-0 font-mono text-[11px] bg-ocean-400/15 text-ocean-300 border-ocean-300/20"
                          >
                            {wl.issueKey}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">
                            {wl.issueSummary}
                          </span>
                        </div>
                        {wl.comment && (
                          <p className="text-xs text-muted-foreground/60 truncate pl-5">
                            {wl.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <DraftEntryRow
                    key={item.id}
                    entry={item.entry}
                    onUpdate={handleUpdateEntry}
                    onRemove={handleRemoveEntry}
                  />
                );
              });
            })()}
          </div>

          <div className="flex items-center justify-between pt-3">
            {(existingWorklogs.length > 0 || entries.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddEntry}
                className="text-xs text-muted-foreground"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Entry
              </Button>
            )}

            <div className="ml-auto flex items-center gap-4 text-xs">
              {totalLoggedHours > 0 && (
                <span className="text-muted-foreground">
                  Logged:{" "}
                  <span className="font-semibold tabular-nums text-ocean-300">
                    {totalLoggedHours.toFixed(2)}h
                  </span>
                </span>
              )}
              {totalDraftedHours > 0 && (
                <span className="text-muted-foreground">
                  Draft:{" "}
                  <span className="font-semibold tabular-nums text-amber-400">
                    {totalDraftedHours.toFixed(2)}h
                  </span>
                </span>
              )}
              <span className="text-muted-foreground">
                Target:{" "}
                <span className="tabular-nums">{target}h</span>
              </span>
              {remaining > 0 && (
                <span className="text-status-incomplete font-medium tabular-nums">
                  -{remaining.toFixed(2)}h
                </span>
              )}
            </div>
          </div>

          {entries.length > 0 && (
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending || entries.length === 0}
                className="gap-1.5 bg-linear-to-r from-ocean-400 to-ocean-300 text-white hover:from-ocean-400/90 hover:to-ocean-300/90 shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                {submitMutation.isPending ? "Submitting..." : "Submit to Jira"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
