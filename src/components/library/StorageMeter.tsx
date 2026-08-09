import { useEffect, useState } from "react";
import { HardDrive, Trash2 } from "lucide-react";
import { clearCaches, formatBytes, getStorageEstimate } from "@/lib/db";

export function StorageMeter() {
  const [usage, setUsage] = useState(0);
  const [quota, setQuota] = useState(0);

  const refresh = () => {
    getStorageEstimate().then(({ usage, quota }) => {
      setUsage(usage);
      setQuota(quota);
    });
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, []);

  const pct = quota ? Math.min(100, (usage / quota) * 100) : 0;

  return (
    <section className="rounded-xl border border-border bg-card/60 p-4">
      <header className="flex items-center gap-2 text-sm font-medium">
        <HardDrive className="size-4 shrink-0 text-accent" aria-hidden="true" />
        <span className="min-w-0 truncate">Device storage</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
      </header>
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Local storage used"
      >
        <div
          className="h-full rounded-full bg-linear-to-r from-primary to-accent transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {formatBytes(usage)} used {quota ? `of ${formatBytes(quota)} available` : ""}
      </p>
      <button
        onClick={async () => {
          await clearCaches();
          refresh();
        }}
        className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        Clean cache
      </button>
    </section>
  );
}
