import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, Loader2, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  listNotifications,
  markAllRead,
  type NotificationRow,
} from "@/lib/network-activity";
import { useTwin } from "@/lib/twin-store";

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Activity bell: real persisted notifications only, with an unread count. */
export function NotificationBell() {
  const { state } = useTwin();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    void listNotifications(15)
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);

  // Reload on mount and whenever a new connection lands (which writes activity).
  useEffect(load, [load, state.connectionsMade.length]);

  const unread = rows?.filter((r) => !r.read).length ?? 0;

  async function readAll() {
    setRows((prev) => prev?.map((r) => ({ ...r, read: true })) ?? prev);
    try {
      await markAllRead();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark as read.");
      load();
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) load();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell aria-hidden="true" className="size-5" />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 font-mono text-[10px] leading-4 font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold">Activity</h2>
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => void readAll()}
              className="focus-ring ml-auto flex items-center gap-1 text-xs font-semibold text-primary"
            >
              <Check aria-hidden="true" className="size-3.5" /> Mark all read
            </button>
          ) : null}
        </header>

        <div className="max-h-80 overflow-y-auto">
          {error ? (
            <div className="p-4 text-sm">
              <p className="text-destructive">{error}</p>
              <button
                type="button"
                onClick={load}
                className="focus-ring mt-2 font-semibold text-primary"
              >
                Retry
              </button>
            </div>
          ) : rows === null ? (
            <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Loading activity…
            </p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nothing yet. Connect with someone or run Event Radar and your Twin's activity shows up
              here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li key={row.id} className="flex items-start gap-2.5 px-4 py-3 text-sm">
                  <Radar
                    aria-hidden="true"
                    className={row.read ? "mt-0.5 size-4 shrink-0 text-muted-foreground" : "mt-0.5 size-4 shrink-0 text-primary"}
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold">{row.title}</span>
                    {row.body ? (
                      <span className="block text-xs text-muted-foreground">{row.body}</span>
                    ) : null}
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {timeAgo(row.created_at)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-border p-2">
          <Button asChild variant="ghost" size="sm" className="w-full" onClick={() => setOpen(false)}>
            <Link to="/networks">Open Event Radar</Link>
          </Button>
        </footer>
      </PopoverContent>
    </Popover>
  );
}
