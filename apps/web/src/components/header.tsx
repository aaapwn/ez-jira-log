import { Button } from "@ez-jira-log/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from "@ez-jira-log/ui/components/dialog";
import { Separator } from "@ez-jira-log/ui/components/separator";
import { Link, useMatches } from "@tanstack/react-router";
import { LayoutDashboard, Menu, Settings, Sheet, X, Zap } from "lucide-react";
import { useState } from "react";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/checkin", label: "Check-in", icon: Sheet },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const matches = useMatches();
  const isActive = (to: string) => matches.some((m) => m.pathname.startsWith(to));

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <Link
              to="/dashboard"
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
                  {({ isActive: active }) => (
                    <Button
                      variant={active ? "secondary" : "ghost"}
                      size="sm"
                      className={`gap-1.5 text-sm ${active ? "text-foreground" : "text-muted-foreground"}`}
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

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent
            showCloseButton={false}
            className="fixed inset-y-0 left-0 top-0 z-50 flex h-full w-72 -translate-x-0 translate-y-0 flex-col rounded-none border-r border-border bg-background p-0 data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left sm:max-w-72"
          >
            <div className="flex h-14 items-center justify-between border-b border-border/50 px-4">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 font-bold text-lg tracking-tight"
                onClick={() => setMobileOpen(false)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ocean-300 to-ocean-400 text-white">
                  <Zap className="h-4 w-4" />
                </div>
                <span className="bg-gradient-to-r from-ocean-400 to-ocean-300 bg-clip-text text-transparent">
                  EZ-Log
                </span>
              </Link>
              <DialogClose
                render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
              >
                <X className="h-4 w-4" />
              </DialogClose>
            </div>

            <nav className="flex flex-col gap-1 p-3">
              {navItems.map(({ to, label, icon: Icon }) => {
                const active = isActive(to);
                return (
                  <Link key={to} to={to} onClick={() => setMobileOpen(false)}>
                    <Button
                      variant={active ? "secondary" : "ghost"}
                      className={`w-full justify-start gap-2.5 text-sm ${active ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            <Separator />

            <div className="p-3">
              <ModeToggle />
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
}
