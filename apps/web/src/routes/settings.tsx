import { Badge } from "@ez-jira-log/ui/components/badge";
import { Button } from "@ez-jira-log/ui/components/button";
import { Card } from "@ez-jira-log/ui/components/card";
import { Input } from "@ez-jira-log/ui/components/input";
import { Label } from "@ez-jira-log/ui/components/label";
import { Skeleton } from "@ez-jira-log/ui/components/skeleton";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  ExternalLink,
  GitBranch,
  Layers,
  Plus,
  Save,
  Ticket,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import TemplateForm from "@/components/template-form";
import TemplateSetForm from "@/components/template-set-form";
import {
  useCreateTemplateSet,
  useDeleteTemplateSet,
  useTemplateSets,
  useUpdateTemplateSet,
} from "@/hooks/use-template-sets";
import type { TemplateSetItem } from "@/hooks/use-template-sets";
import {
  useCreateTemplate,
  useDeleteTemplate,
  useTemplates,
  useUpdateTemplate,
} from "@/hooks/use-templates";
import { useUpdateUserConfig, useUserConfig } from "@/hooks/use-user-config";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/eden";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

function SettingsPage() {
  const { data: config, isLoading: configLoading } = useUserConfig();
  const updateConfig = useUpdateUserConfig();

  const { data: templates, isLoading: templatesLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const { data: templateSets, isLoading: setsLoading } = useTemplateSets();
  const createSet = useCreateTemplateSet();
  const updateSet = useUpdateTemplateSet();
  const deleteSet = useDeleteTemplateSet();

  const [workingHours, setWorkingHours] = useState<number | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [defaultComment, setDefaultComment] = useState<string | null>(null);

  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [showCreateSet, setShowCreateSet] = useState(false);
  const [editingSet, setEditingSet] = useState<string | null>(null);

  const displayHours = workingHours ?? config?.workingHours ?? 8;
  const displayTimezone = timezone ?? config?.timezone ?? "Asia/Bangkok";
  const displayComment = defaultComment ?? config?.defaultComment ?? "";

  const handleSaveConfig = async () => {
    try {
      await updateConfig.mutateAsync({
        workingHours: displayHours,
        timezone: displayTimezone,
        defaultComment: displayComment || null,
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const { data, error } = await api.calendar["auth-url"].get();
      if (error) throw error;
      window.open(data.url, "_blank");
    } catch {
      toast.error("Failed to get calendar auth URL");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your worklog preferences and integrations
        </p>
      </div>

      <Card className="border-border/50 bg-card/70 backdrop-blur-sm p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            General
          </h2>
        </div>

        {configLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hours" className="text-xs text-muted-foreground">
                  Working Hours per Day
                </Label>
                <Input
                  id="hours"
                  type="number"
                  value={displayHours}
                  onChange={(e) =>
                    setWorkingHours(parseFloat(e.target.value) || 8)
                  }
                  min={1}
                  max={24}
                  step={0.5}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tz" className="text-xs text-muted-foreground">
                  Timezone
                </Label>
                <Input
                  id="tz"
                  value={displayTimezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Asia/Bangkok"
                  className="bg-background/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment" className="text-xs text-muted-foreground">
                Default Comment Template
              </Label>
              <Input
                id="comment"
                value={displayComment}
                onChange={(e) => setDefaultComment(e.target.value)}
                placeholder='e.g., Working on {issueKey}'
                className="bg-background/50"
              />
            </div>
            <Button
              onClick={handleSaveConfig}
              disabled={updateConfig.isPending}
              className="gap-1.5 bg-gradient-to-r from-ocean-400 to-ocean-300 text-white hover:from-ocean-400/90 hover:to-ocean-300/90"
            >
              <Save className="h-3.5 w-3.5" />
              {updateConfig.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </>
        )}
      </Card>

      <Card className="border-border/50 bg-card/70 backdrop-blur-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Integrations
        </h2>
        <div className="space-y-2.5">
          <IntegrationRow
            icon={<GitBranch className="h-4 w-4" />}
            name="GitLab"
            desc="Commits & merge requests"
            status="env"
          />
          <IntegrationRow
            icon={<Ticket className="h-4 w-4" />}
            name="Jira"
            desc="Tickets & worklogs"
            status="env"
          />
          <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 p-3.5 transition-colors hover:bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ocean-300/10 text-ocean-300">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium">Google Calendar</div>
                <div className="text-xs text-muted-foreground">
                  Auto-detect meetings
                </div>
              </div>
            </div>
            {config?.hasGoogleCalendar ? (
              <Badge className="bg-status-complete/15 text-status-complete border-status-complete/25 hover:bg-status-complete/15 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={handleConnectCalendar}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Connect
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="border-border/50 bg-card/70 backdrop-blur-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Worklog Templates
          </h2>
          <Button
            size="sm"
            onClick={() => setShowCreateTemplate(true)}
            className="text-xs gap-1 bg-gradient-to-r from-ocean-400 to-ocean-300 text-white hover:from-ocean-400/90 hover:to-ocean-300/90"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>

        {templatesLoading ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : templates && templates.length > 0 ? (
          <div className="space-y-2">
            {templates.map(
              (t: {
                id: string;
                name: string;
                issueKey?: string | null;
                defaultHours: number;
                isActive: boolean;
                comment: string;
              }) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">
                      <div className="text-sm font-medium">{t.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {t.issueKey && (
                          <span className="text-[10px] font-mono text-ocean-300">
                            {t.issueKey}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {t.defaultHours}h
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${t.isActive ? "border-status-complete/30 text-status-complete" : "text-muted-foreground"}`}
                    >
                      {t.isActive ? "Active" : "Off"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingTemplate(t.id)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTemplate.mutate(t.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground rounded-lg border border-dashed border-border/60">
            <p className="text-sm">No templates yet.</p>
            <p className="text-xs mt-1">
              Create one for recurring tasks like meetings or stand-ups.
            </p>
          </div>
        )}
      </Card>

      {/* Template Sets */}
      <Card className="border-border/50 bg-card/70 backdrop-blur-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Template Sets
            </h2>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Bundles of worklog entries applied together with optional time slots
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreateSet(true)}
            className="text-xs gap-1 bg-gradient-to-r from-ocean-400 to-ocean-300 text-white hover:from-ocean-400/90 hover:to-ocean-300/90"
          >
            <Plus className="h-3.5 w-3.5" />
            New Set
          </Button>
        </div>

        {setsLoading ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : templateSets && templateSets.length > 0 ? (
          <div className="space-y-2">
            {templateSets.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-border/40 bg-muted/20 p-3.5 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Layers className="h-4 w-4 text-ocean-300 shrink-0" />
                    <div className="text-sm font-medium">{s.name}</div>
                    <Badge
                      variant="outline"
                      className="text-[10px] shrink-0 tabular-nums"
                    >
                      {s.items.length} entries
                    </Badge>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {s.items
                        .reduce((sum: number, it: TemplateSetItem) => sum + it.hours, 0)
                        .toFixed(1)}
                      h total
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${s.isActive ? "border-status-complete/30 text-status-complete" : "text-muted-foreground"}`}
                    >
                      {s.isActive ? "Active" : "Off"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingSet(s.id)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteSet.mutate(s.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {/* Item preview */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.items.map((it: TemplateSetItem, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-md bg-ocean-300/10 px-2 py-0.5 text-[10px]"
                    >
                      {it.startTime && (
                        <Clock className="h-2.5 w-2.5 text-ocean-300/60" />
                      )}
                      {it.startTime && (
                        <span className="tabular-nums text-ocean-300/70">
                          {it.startTime}
                        </span>
                      )}
                      {it.issueKey && (
                        <span className="font-mono text-ocean-300">
                          {it.issueKey}
                        </span>
                      )}
                      <span className="text-muted-foreground truncate max-w-[120px]">
                        {it.comment}
                      </span>
                      <span className="tabular-nums font-medium">
                        {it.hours}h
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground rounded-lg border border-dashed border-border/60">
            <p className="text-sm">No template sets yet.</p>
            <p className="text-xs mt-1">
              Create a set for your daily routine — e.g., stand-up + review +
              meeting.
            </p>
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <TemplateForm
        open={showCreateTemplate}
        onOpenChange={setShowCreateTemplate}
        title="Create Template"
        isLoading={createTemplate.isPending}
        onSubmit={async (data) => {
          try {
            await createTemplate.mutateAsync({
              ...data,
              issueKey: data.issueKey || null,
            });
            setShowCreateTemplate(false);
            toast.success("Template created");
          } catch {
            toast.error("Failed to create template");
          }
        }}
      />

      {editingTemplate && templates && (
        <TemplateForm
          open={!!editingTemplate}
          onOpenChange={(open) => {
            if (!open) setEditingTemplate(null);
          }}
          title="Edit Template"
          isLoading={updateTemplate.isPending}
          initialValues={
            templates.find(
              (t: { id: string }) => t.id === editingTemplate,
            ) ?? undefined
          }
          onSubmit={async (data) => {
            try {
              await updateTemplate.mutateAsync({
                id: editingTemplate,
                ...data,
                issueKey: data.issueKey || null,
              });
              setEditingTemplate(null);
              toast.success("Template updated");
            } catch {
              toast.error("Failed to update template");
            }
          }}
        />
      )}

      <TemplateSetForm
        open={showCreateSet}
        onOpenChange={setShowCreateSet}
        title="Create Template Set"
        isLoading={createSet.isPending}
        onSubmit={async (data) => {
          try {
            await createSet.mutateAsync(data);
            setShowCreateSet(false);
            toast.success("Template set created");
          } catch {
            toast.error("Failed to create template set");
          }
        }}
      />

      {editingSet && templateSets && (
        <TemplateSetForm
          open={!!editingSet}
          onOpenChange={(open) => {
            if (!open) setEditingSet(null);
          }}
          title="Edit Template Set"
          isLoading={updateSet.isPending}
          initialValues={
            templateSets.find((s) => s.id === editingSet) ?? undefined
          }
          onSubmit={async (data) => {
            try {
              await updateSet.mutateAsync({ id: editingSet, ...data });
              setEditingSet(null);
              toast.success("Template set updated");
            } catch {
              toast.error("Failed to update template set");
            }
          }}
        />
      )}
    </div>
  );
}

function IntegrationRow({
  icon,
  name,
  desc,
  status,
}: {
  icon: React.ReactNode;
  name: string;
  desc: string;
  status: "env" | "connected";
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 p-3.5 transition-colors hover:bg-muted/30">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ocean-300/10 text-ocean-300">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <Badge
        variant="outline"
        className="text-[10px] border-muted-foreground/20 text-muted-foreground"
      >
        via .env
      </Badge>
    </div>
  );
}
