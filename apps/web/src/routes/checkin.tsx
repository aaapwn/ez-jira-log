import { Button } from "@ez-jira-log/ui/components/button";
import { Card } from "@ez-jira-log/ui/components/card";
import { Input } from "@ez-jira-log/ui/components/input";
import { Label } from "@ez-jira-log/ui/components/label";
import { Skeleton } from "@ez-jira-log/ui/components/skeleton";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronDown,
  LogIn,
  LogOut,
  MoreHorizontal,
  Palmtree,
  Plus,
  Save,
  Sheet,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useCreateHoliday, useDeleteHoliday, useHolidays } from "@/hooks/use-holidays";
import { useUpdateUserConfig, useUserConfig } from "@/hooks/use-user-config";
import { prefetchSession } from "@/hooks/use-session";
import { api } from "@/lib/eden";

export const Route = createFileRoute("/checkin")({
  component: CheckinPage,
  beforeLoad: async () => {
    const session = await prefetchSession();
    if (!session) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

function CheckinPage() {
  const { data: config, isLoading: configLoading } = useUserConfig();
  const updateConfig = useUpdateUserConfig();

  const { data: holidays } = useHolidays();
  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const [holidayDate, setHolidayDate] = useState("");
  const [holidayReason, setHolidayReason] = useState("");

  const [sheetSpreadsheetId, setSheetSpreadsheetId] = useState<string | null>(null);
  const [sheetName, setSheetName] = useState<string | null>(null);
  const [sheetStartColumn, setSheetStartColumn] = useState<string | null>(null);
  const [sheetCheckInRow, setSheetCheckInRow] = useState<number | null>(null);
  const [sheetCheckOutRow, setSheetCheckOutRow] = useState<number | null>(null);
  const [sheetLeaveRow, setSheetLeaveRow] = useState<number | null>(null);
  const [sheetWorkDays, setSheetWorkDays] = useState<string | null>(null);

  const displaySheetId = sheetSpreadsheetId ?? config?.sheetSpreadsheetId ?? "";
  const displaySheetName = sheetName ?? config?.sheetName ?? "";
  const displayStartColumn = sheetStartColumn ?? config?.sheetStartColumn ?? "";
  const displayCheckInRow = sheetCheckInRow ?? config?.sheetCheckInRow ?? "";
  const displayCheckOutRow = sheetCheckOutRow ?? config?.sheetCheckOutRow ?? "";
  const displayLeaveRow = sheetLeaveRow ?? config?.sheetLeaveRow ?? "";
  const displayWorkDays = sheetWorkDays ?? config?.sheetWorkDays ?? "1,2,3,4,5";

  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);

  const handleSaveSheetConfig = async () => {
    try {
      await updateConfig.mutateAsync({
        sheetSpreadsheetId: displaySheetId || null,
        sheetName: displaySheetName || null,
        sheetStartColumn: displayStartColumn || null,
        sheetCheckInRow: displayCheckInRow ? Number(displayCheckInRow) : null,
        sheetCheckOutRow: displayCheckOutRow ? Number(displayCheckOutRow) : null,
        sheetLeaveRow: displayLeaveRow ? Number(displayLeaveRow) : null,
        sheetWorkDays: displayWorkDays,
      });
      toast.success("Sheet config saved");
    } catch {
      toast.error("Failed to save sheet config");
    }
  };

  const handleRunAction = async (action: "test-checkin" | "test-checkout" | "test-leave") => {
    const label = action === "test-checkin" ? "Check-in" : action === "test-checkout" ? "Check-out" : "Leave";
    setRunningAction(action);
    try {
      const { data, error } = await api.checkin[action].post();
      if (error) {
        const msg = typeof error === "object" && error !== null && "error" in error
          ? String((error as any).error)
          : JSON.stringify(error);
        toast.error(`${label} failed: ${msg}`);
        return;
      }
      const result = data as any;
      if (result.processed > 0) {
        toast.success(`${label} done!`);
        if (result.notification?.subscriptions === 0) {
          toast.warning("No push subscriptions — enable notifications in Settings");
        }
      } else if (result.errors?.length > 0) {
        toast.error(`${label} failed: ${result.errors[0]}`);
      } else {
        toast.warning(`${label}: ${result.details?.[0] || "Nothing processed"}`);
      }
    } catch (err) {
      toast.error(`${label} failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunningAction(null);
    }
  };

  const needsNewMonthConfig = (() => {
    if (!config?.hasSheetConfig || !config.updatedAt) return false;
    const updated = new Date(config.updatedAt);
    const now = new Date();
    return updated.getMonth() !== now.getMonth() || updated.getFullYear() !== now.getFullYear();
  })();

  const todayColumn = (() => {
    if (!displayStartColumn) return null;
    const day = new Date().getDate();
    const startIdx =
      displayStartColumn.split("").reduce((acc, c) => acc * 26 + c.charCodeAt(0) - 64, 0) - 1;
    const targetIdx = startIdx + (day - 1) * 2;
    let n = targetIdx + 1;
    let result = "";
    while (n > 0) {
      n--;
      result = String.fromCharCode((n % 26) + 65) + result;
      n = Math.floor(n / 26);
    }
    return result;
  })();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Google Sheets Check-in</h1>
        <p className="text-sm text-muted-foreground">
          Auto check-in/check-out on your attendance sheet
        </p>
      </div>

      <Card className={`border-border/50 bg-card/70 backdrop-blur-sm p-6 space-y-5 overflow-visible ${needsNewMonthConfig ? "ring-2 ring-destructive/50" : ""}`}>
        {needsNewMonthConfig && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-xs text-destructive font-medium">
              New month detected — please update the check-in/check-out row numbers below and save.
            </span>
          </div>
        )}

        {configLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="sheet-id" className="text-xs text-muted-foreground">
                Spreadsheet ID
              </Label>
              <Input
                id="sheet-id"
                value={displaySheetId}
                onChange={(e) => setSheetSpreadsheetId(e.target.value)}
                placeholder="e.g., 1ogAajWSZTsZHeBXK-..."
                className="bg-background/50 font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sheet-name" className="text-xs text-muted-foreground">
                  Sheet Name (tab)
                </Label>
                <Input
                  id="sheet-name"
                  value={displaySheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder="e.g., Sheet1"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-col" className="text-xs text-muted-foreground">
                  Start Column (day 1)
                </Label>
                <Input
                  id="start-col"
                  value={displayStartColumn}
                  onChange={(e) => setSheetStartColumn(e.target.value.toUpperCase())}
                  placeholder="e.g., F"
                  className="bg-background/50 font-mono uppercase"
                  maxLength={3}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="checkin-row" className="text-xs text-muted-foreground">
                  Check-in Row
                </Label>
                <Input
                  id="checkin-row"
                  type="number"
                  value={displayCheckInRow}
                  onChange={(e) => setSheetCheckInRow(parseInt(e.target.value) || null)}
                  placeholder="e.g., 53"
                  min={1}
                  className="bg-background/50 tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkout-row" className="text-xs text-muted-foreground">
                  Check-out Row
                </Label>
                <Input
                  id="checkout-row"
                  type="number"
                  value={displayCheckOutRow}
                  onChange={(e) => setSheetCheckOutRow(parseInt(e.target.value) || null)}
                  placeholder="e.g., 54"
                  min={1}
                  className="bg-background/50 tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-row" className="text-xs text-muted-foreground">
                  Leave Row
                </Label>
                <Input
                  id="leave-row"
                  type="number"
                  value={displayLeaveRow}
                  onChange={(e) => setSheetLeaveRow(parseInt(e.target.value) || null)}
                  placeholder="e.g., 55"
                  min={1}
                  className="bg-background/50 tabular-nums"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Work Days
              </Label>
              <div className="flex flex-wrap items-center gap-1.5">
                {([
                  { day: 1, label: "Mon" },
                  { day: 2, label: "Tue" },
                  { day: 3, label: "Wed" },
                  { day: 4, label: "Thu" },
                  { day: 5, label: "Fri" },
                ] as const).map(({ day, label }) => {
                  const days = displayWorkDays.split(",").map(Number);
                  const active = days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const next = active
                          ? days.filter((d) => d !== day)
                          : [...days, day].sort();
                        setSheetWorkDays(next.join(","));
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "border-ocean-300/50 bg-ocean-300/15 text-ocean-300"
                          : "border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Off days → tick leave row
              </p>
            </div>
            {todayColumn && (() => {
              const todayDow = new Date().getDay();
              const isWorkDay = displayWorkDays.split(",").map(Number).includes(todayDow);
              return (
                <div className="flex items-center gap-2 rounded-lg border border-ocean-300/20 bg-ocean-300/5 px-3 py-2">
                  <Sheet className="h-3.5 w-3.5 text-ocean-300" />
                  <span className="text-xs text-muted-foreground">
                    Today (day {new Date().getDate()}) column:{" "}
                    <span className="font-mono font-semibold text-ocean-300">{todayColumn}</span>
                    {isWorkDay ? (
                      <>
                        {displayCheckInRow && (
                          <>
                            {" — Check-in: "}
                            <span className="font-mono font-semibold text-ocean-300">
                              {todayColumn}{displayCheckInRow}
                            </span>
                          </>
                        )}
                        {displayCheckOutRow && (
                          <>
                            {" — Check-out: "}
                            <span className="font-mono font-semibold text-ocean-300">
                              {todayColumn}{displayCheckOutRow}
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="ml-1 text-amber-400 font-medium">OFF DAY</span>
                        {displayLeaveRow && (
                          <>
                            {" — Leave: "}
                            <span className="font-mono font-semibold text-ocean-300">
                              {todayColumn}{displayLeaveRow}
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </span>
                </div>
              );
            })()}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleSaveSheetConfig}
                disabled={updateConfig.isPending}
                className="gap-1.5 bg-linear-to-r from-ocean-400 to-ocean-300 text-white hover:from-ocean-400/90 hover:to-ocean-300/90"
              >
                <Save className="h-3.5 w-3.5" />
                {updateConfig.isPending ? "Saving..." : "Save Config"}
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setShowActions(!showActions)}
                  disabled={!config?.hasSheetConfig}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  Actions
                  <ChevronDown className={`h-3 w-3 transition-transform ${showActions ? "rotate-180" : ""}`} />
                </Button>
                {showActions && (
                  <div className="absolute left-0 bottom-full mb-1 w-44 rounded-lg border border-border/60 bg-popover p-1 shadow-xl z-50">
                    <button
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
                      onClick={() => { handleRunAction("test-checkin"); setShowActions(false); }}
                      disabled={!!runningAction}
                    >
                      <LogIn className="h-3.5 w-3.5 text-ocean-300" />
                      {runningAction === "test-checkin" ? "Running..." : "Check-in Now"}
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
                      onClick={() => { handleRunAction("test-checkout"); setShowActions(false); }}
                      disabled={!!runningAction}
                    >
                      <LogOut className="h-3.5 w-3.5 text-ocean-300" />
                      {runningAction === "test-checkout" ? "Running..." : "Check-out Now"}
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
                      onClick={() => { handleRunAction("test-leave"); setShowActions(false); }}
                      disabled={!!runningAction || !displayLeaveRow}
                    >
                      <Palmtree className="h-3.5 w-3.5 text-amber-400" />
                      {runningAction === "test-leave" ? "Running..." : "Leave Now"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </Card>

      <Card className="border-border/50 bg-card/70 backdrop-blur-sm p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Leave Days
          </h2>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Specific dates to treat as leave (e.g., holidays, personal leave)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={holidayDate}
            onChange={(e) => setHolidayDate(e.target.value)}
            className="h-8 w-36 text-xs bg-background/50"
          />
          <Input
            value={holidayReason}
            onChange={(e) => setHolidayReason(e.target.value)}
            placeholder="Reason (optional)"
            className="h-8 flex-1 text-xs bg-background/50"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1 shrink-0"
            disabled={!holidayDate || createHoliday.isPending}
            onClick={async () => {
              try {
                await createHoliday.mutateAsync({
                  date: holidayDate,
                  reason: holidayReason || null,
                });
                setHolidayDate("");
                setHolidayReason("");
                toast.success("Leave day added");
              } catch {
                toast.error("Failed to add leave day");
              }
            }}
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>

        {holidays && holidays.length > 0 ? (
          <div className="space-y-1">
            {holidays.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Palmtree className="h-3 w-3 text-amber-400 shrink-0" />
                  <span className="text-xs font-mono tabular-nums">{h.date}</span>
                  {h.reason && (
                    <span className="text-xs text-muted-foreground truncate">
                      — {h.reason}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={async () => {
                    try {
                      await deleteHoliday.mutateAsync(h.id);
                      toast.success("Leave day removed");
                    } catch {
                      toast.error("Failed to remove leave day");
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground rounded-lg border border-dashed border-border/60">
            <Palmtree className="h-6 w-6 mb-2 opacity-40" />
            <p className="text-sm">No leave days configured</p>
            <p className="text-xs mt-1">Add dates above for holidays or personal leave</p>
          </div>
        )}
      </Card>
    </div>
  );
}
