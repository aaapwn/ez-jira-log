import { Button } from "@ez-jira-log/ui/components/button";
import { Link } from "@tanstack/react-router";
import { BarChart3, LayoutDashboard, Settings, Zap } from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-lg tracking-tight"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ocean-300 to-ocean-400 text-white">
              <Zap className="h-4 w-4" />
            </div>
            <span className="bg-gradient-to-r from-ocean-400 to-ocean-300 bg-clip-text text-transparent">
              EZ-Log
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}>
                {({ isActive }) => (
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={`gap-1.5 text-sm ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Button>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
