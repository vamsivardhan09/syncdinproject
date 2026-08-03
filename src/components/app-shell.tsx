import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BrainCircuit,
  Settings,
  UserRound,
  Sparkles,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { useTwin } from "@/lib/twin-store";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/network", label: "My Network", icon: Users },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/twin", label: "My AI Twin", icon: BrainCircuit },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { intelligence } = useTwin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/signin", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-5">
      <Link to="/dashboard" className="focus-ring rounded-lg">
        <BrandLogo />
      </Link>

      <nav aria-label="Primary" className="flex flex-col gap-1">
        {nav.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "focus-ring flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon aria-hidden="true" className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-primary/20 bg-primary-soft/70 p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Sparkles aria-hidden="true" className="size-3.5" /> Twin Intelligence
        </p>
        <p className="mt-1 text-2xl font-extrabold tabular-nums">{intelligence}%</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Each new source makes your twin a sharper negotiator.
        </p>
        <Button asChild size="sm" className="mt-3 w-full">
          <Link to="/onboarding">Improve my Twin</Link>
        </Button>
      </div>

      <div className="mt-auto space-y-2">
        <p className="truncate px-1 text-xs text-muted-foreground">{email ?? "Signed in"}</p>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut aria-hidden="true" className="size-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-sidebar-border bg-sidebar">
            <div className="flex justify-end p-2">
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X aria-hidden="true" className="size-4" />
                <span className="sr-only">Close menu</span>
              </Button>
            </div>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <Menu aria-hidden="true" className="size-5" />
            <span className="sr-only">Open menu</span>
          </Button>
          <BrandLogo />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
