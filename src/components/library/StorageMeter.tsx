import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { HardDrive, Trash2 } from "lucide-react";
import { clearCaches, db, formatBytes, getStorageEstimate, type DocFormat } from "@/lib/db";

const SEGMENTS: { format: DocFormat; label: string; bar: string; dot: string }[] = [
  { format: "pdf", label: "PDF", bar: "bg-destructive", dot: "bg-destructive" },
  { format: "docx", label: "DOCX", bar: "bg-primary", dot: "bg-primary" },
  { format: "pptx", label: "PPTX", bar: "bg-accent", dot: "bg-accent" },
  { format: "txt", label: "TXT", bar: "bg-highlight", dot: "bg-highlight" },
];

export function StorageMeter() {
  const [usage, setUsage] = useState(0);
  const [quota, setQuota] = useState(0);

  const docs = useLiveQuery(() => db.docs.toArray(), [], []);

  const refresh = () => {
    void getStorageEstimate().then((e) => {
      setUsage(e.usage);
      setQuota(e.quota);
    });
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, []);

  const byFormat = SEGMENTS.map((s) => ({
    ...s,
    bytes: (docs ?? []).filter((d) => d.format === s.format).reduce((n, d) => n + d.size, 0),
    count: (docs ?? []).filter((d) => d.format === s.format).length,
  }));
  const libraryBytes = byFormat.reduce((n, s) => n + s.bytes, 0);
  const scale = Math.max(libraryBytes, 1);

  return (
    <section className="rounded-xl border border-border bg-card/60 p-4">
      <header className="flex items-center gap-2 text-sm font-medium">
        <HardDrive className="size-4 shrink-0 text-accent" aria-hidden="true" />
        <span className="min-w-0 truncate">Storage</span>
        <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatBytes(libraryBytes)}
        </span>
      </header>

      <div className="mt-3 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
        {byFormat.map((s) => (
          <div
            key={s.format}
            className={`${s.bar} h-full rounded-full transition-[width] duration-700`}
            style={{ width: `${(s.bytes / scale) * 100}%` }}
            aria-hidden="true"
          />
        ))}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {byFormat.map((s) => (
          <li key={s.format} className="flex items-center gap-1.5 text-xs">
            <span className={`size-2 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
            <span className="min-w-0 truncate text-muted-foreground">{s.label}</span>
            <span className="ml-auto shrink-0 tabular-nums">{s.count ? formatBytes(s.bytes) : "—"}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-muted-foreground">
        {formatBytes(usage)} on device{quota ? ` · ${formatBytes(quota)} available` : ""}
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
