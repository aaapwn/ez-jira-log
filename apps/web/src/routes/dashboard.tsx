import { Badge } from "@ez-jira-log/ui/components/badge";
import { Button } from "@ez-jira-log/ui/components/button";
import { Card } from "@ez-jira-log/ui/components/card";
import { Input } from "@ez-jira-log/ui/components/input";
import { Skeleton } from "@ez-jira-log/ui/components/skeleton";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { CheckSquare, Clock, AlertTriangle, CheckCircle2, RefreshCw, Send, MousePointer } from "lucide-react";
import { useState } from "react";

import TimelineGrid from "@/components/timeline-grid";
import { useActivitySummary } from "@/hooks/use-activity-summary";
import { authClient } from "@/lib/auth-client";
import { getMonthToDateRange, hoursToTimeString } from "@/lib/date-utils";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

function DashboardPage() {
  const { from, to } = getMonthToDateRange();
  const [dateFrom, setDateFrom] = useState(from);
  const [dateTo, setDateTo] = useState(to);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  const { data: allDays, isLoading, refetch, isFetching } = useActivitySummary(dateFrom, dateTo);

  const days = allDays?.filter((d) => {
    const day = new Date(d.date).getDay();
    return day !== 0 && day !== 6;
  });

  const totalLogged = days?.reduce((acc, d) => acc + d.worklogStatus.hoursLogged, 0) ?? 0;
  const incompleteDays = days?.filter((d) => d.status === "incomplete").length ?? 0;
  const completeDays = days?.filter((d) => d.status === "complete").length ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Track and submit your daily worklogs
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 p-1 backdrop-blur-sm">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 w-34 border-0 bg-transparent text-sm focus-visible:ring-0"
            />
            <span className="text-xs text-muted-foreground px-1">-</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 w-34 border-0 bg-transparent text-sm focus-visible:ring-0"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetch()}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Clock className="h-4 w-4 text-ocean-300" />}
          label="Total Logged"
          value={hoursToTimeString(totalLogged)}
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4 text-status-incomplete" />}
          label="Incomplete"
          value={String(incompleteDays)}
          valueClass="text-status-incomplete"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4 text-status-complete" />}
          label="Complete"
          value={String(completeDays)}
          valueClass="text-status-complete"
        />
        <StatCard
          icon={<MousePointer className="h-4 w-4 text-ocean-200" />}
          label="Selected"
          value={String(selectedDates.size)}
        />
      </div>

      {selectedDates.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ocean-300/20 bg-ocean-300/5 p-3 backdrop-blur-sm">
          <Badge variant="secondary" className="bg-ocean-300/15 text-ocean-300 border-ocean-300/25">
            {selectedDates.size} selected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => {
              if (!days) return;
              const incomplete = days
                .filter((d) => d.status === "incomplete")
                .map((d) => d.date);
              setSelectedDates(new Set(incomplete));
            }}
          >
            <CheckSquare className="h-3.5 w-3.5 mr-1" />
            Select All Incomplete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setSelectedDates(new Set())}
          >
            Clear
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-ocean-400 to-ocean-300 text-white hover:from-ocean-400/90 hover:to-ocean-300/90 shadow-sm"
            disabled
          >
            <Send className="h-3.5 w-3.5" />
            Sync to Jira
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : days ? (
        <TimelineGrid
          days={days}
          selectedDates={selectedDates}
          onSelectionChange={setSelectedDates}
        />
      ) : (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            Failed to load activities. Check your GitLab/Jira connection in Settings.
          </p>
        </Card>
      )}

      <Outlet />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/70 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`text-2xl font-bold tracking-tight ${valueClass ?? ""}`}>
        {value}
      </div>
    </Card>
  );
}
