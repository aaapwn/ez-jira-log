import { Button } from "@ez-jira-log/ui/components/button";
import { Card } from "@ez-jira-log/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, Clock, GitBranch, Sparkles, Ticket, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

const features = [
  {
    icon: GitBranch,
    title: "GitLab Sync",
    desc: "Auto-import commits & merge requests",
  },
  {
    icon: Ticket,
    title: "Jira Integration",
    desc: "Correlate activities with Jira tickets",
  },
  {
    icon: Calendar,
    title: "Calendar Aware",
    desc: "Detect meetings from Google Calendar",
  },
  {
    icon: Sparkles,
    title: "Magic Fill",
    desc: "One-click to fill 8 hours intelligently",
  },
  {
    icon: Clock,
    title: "Bulk Submit",
    desc: "Catch up on 15 days in under 2 minutes",
  },
  {
    icon: Zap,
    title: "Type-Safe",
    desc: "End-to-end typed with Eden Treaty",
  },
];

function HomeComponent() {
  return (
    <div className="relative flex flex-col items-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-ocean-300/10 blur-[120px] dark:bg-ocean-300/5" />
        <div className="absolute top-20 -right-20 h-[400px] w-[400px] rounded-full bg-ocean-400/8 blur-[100px] dark:bg-ocean-400/5" />
      </div>

      <section className="flex flex-col items-center gap-6 px-4 pt-20 pb-16 text-center max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-ocean-300/30 bg-ocean-300/10 px-4 py-1.5 text-sm text-ocean-300 dark:border-ocean-300/20 dark:bg-ocean-300/5">
          <Zap className="h-3.5 w-3.5" />
          The Developer's Worklog Copilot
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1]">
          <span className="bg-gradient-to-r from-ocean-400 via-ocean-300 to-ocean-200 bg-clip-text text-transparent">
            Stop forgetting
          </span>
          <br />
          <span>your worklogs</span>
        </h1>

        <p className="max-w-lg text-lg text-muted-foreground leading-relaxed">
          EZ-Log aggregates your GitLab commits, Jira tickets, and calendar events
          to auto-draft daily worklogs. Fill 15 days of backlogs in under 2 minutes.
        </p>

        <div className="flex gap-3 mt-2">
          <Link to="/dashboard">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-ocean-400 to-ocean-300 text-white hover:from-ocean-400/90 hover:to-ocean-300/90 shadow-lg shadow-ocean-400/25">
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/settings">
            <Button variant="outline" size="lg">
              Configure
            </Button>
          </Link>
        </div>
      </section>

      <section className="w-full max-w-5xl px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <Card
              key={title}
              className="group relative overflow-hidden border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:border-ocean-300/40 hover:shadow-lg hover:shadow-ocean-300/5"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-300/20 to-ocean-400/20 text-ocean-300 transition-colors group-hover:from-ocean-300/30 group-hover:to-ocean-400/30">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
