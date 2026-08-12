import { useLiveQuery } from "dexie-react-hooks";
import { BookOpenCheck, Flame, Timer, Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { formatDuration, readingSummary, READER_LEVELS } from "@/lib/reading-stats";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Reading analytics: active time with a document open, never sign-in or idle time. */
export function ReadingStats({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const stats = useLiveQuery(async () => {
    await db.sessions.count();
    return readingSummary();
  }, [open]);

  const peak = Math.max(1, ...(stats?.week ?? []).map((w) => w.seconds));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="size-4 text-accent" aria-hidden="true" /> Reading analytics
          </DialogTitle>
          <DialogDescription>Only counts active time spent with a document open on this device.</DialogDescription>
        </DialogHeader>

        {!stats ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading your stats…</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-linear-to-br from-primary/15 to-accent/10 p-4">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-highlight" aria-hidden="true" />
                <p className="text-sm font-semibold">
                  Level {stats.current.level} · {stats.current.name}
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-linear-to-r from-primary to-accent transition-all duration-700"
                  style={{ width: `${stats.progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {stats.next
                  ? `${formatDuration(stats.next.minMinutes * 60 - stats.totalSeconds)} of reading to reach ${stats.next.name}`
                  : "Top level reached — you read more than almost anyone."}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Total", value: formatDuration(stats.totalSeconds), icon: BookOpenCheck },
                { label: "Today", value: formatDuration(stats.todaySeconds), icon: Timer },
                { label: "Active days", value: String(stats.activeDays), icon: Flame },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card/60 p-3 text-center">
                  <s.icon className="mx-auto size-4 text-accent" aria-hidden="true" />
                  <p className="mt-1 text-sm font-semibold tabular-nums">{s.value}</p>
                  <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last 7 days</h3>
              <div className="mt-2 flex h-24 items-end gap-1.5">
                {stats.week.map((w) => (
                  <div key={w.day} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-md bg-linear-to-t from-primary/60 to-accent transition-all duration-500"
                      style={{ height: `${Math.max(3, (w.seconds / peak) * 70)}px` }}
                      title={`${formatDuration(w.seconds)} on ${w.day}`}
                    />
                    <span className="text-[0.6rem] text-muted-foreground">{w.day.slice(8)}</span>
                  </div>
                ))}
              </div>
            </section>

            {stats.top.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Most read</h3>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {stats.top.map((t) => (
                    <li key={t.title} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{t.title}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatDuration(t.seconds)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <details className="rounded-xl border border-border bg-card/60 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Reader levels</summary>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                {READER_LEVELS.map((l) => (
                  <li key={l.level} className={l.level === stats.current.level ? "font-semibold text-foreground" : ""}>
                    L{l.level} · {l.name} — {formatDuration(l.minMinutes * 60)}+
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
