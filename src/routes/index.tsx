import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Grid2x2, List, Search, Library, Archive } from "lucide-react";
import { db, type DocRecord } from "@/lib/db";
import { StorageMeter } from "@/components/library/StorageMeter";
import { UploadZone } from "@/components/library/UploadZone";
import { DocCard } from "@/components/library/DocCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Offline Reader — Your local eBook & document library" },
      {
        name: "description",
        content:
          "A distraction-free offline-first reader for PDF, DOCX and PPTX files. Everything stays on your device.",
      },
      { property: "og:title", content: "Offline Reader — Local document library" },
      {
        property: "og:description",
        content: "Read, annotate and search PDF, DOCX and PPTX documents fully offline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

const FILTERS = ["all", "pdf", "docx", "pptx", "epub", "txt"] as const;

function LibraryPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const docs = useLiveQuery(() => db.docs.orderBy("addedAt").reverse().toArray(), [], [] as DocRecord[]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (docs ?? []).filter(
      (d) =>
        (showArchived ? d.archived === 1 : d.archived === 0) &&
        (filter === "all" || d.format === filter) &&
        (!q ||
          d.title.toLowerCase().includes(q) ||
          (d.textIndex ?? "").toLowerCase().includes(q)),
    );
  }, [docs, filter, query, showArchived]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-linear-to-br from-primary to-accent">
              <Library className="size-4.5 text-primary-foreground" aria-hidden="true" />
            </div>
            <h1 className="truncate text-base font-semibold tracking-tight">Offline Reader</h1>
          </div>
          <div className="relative order-last col-span-2 w-full sm:order-none sm:max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your library…"
              aria-label="Search library"
              className="h-10 w-full rounded-xl border border-border bg-card/60 pl-9 pr-3 text-sm outline-hidden placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={`grid min-h-11 min-w-11 place-items-center rounded-lg transition-colors ${view === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60"}`}
            >
              <Grid2x2 className="size-4.5" aria-hidden="true" />
            </button>
            <button
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={`grid min-h-11 min-w-11 place-items-center rounded-lg transition-colors ${view === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60"}`}
            >
              <List className="size-4.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          <UploadZone />
          <StorageMeter />
          <nav className="flex flex-wrap gap-2 lg:flex-col">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`min-h-9 rounded-lg px-3 text-left text-sm font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60"
                }`}
              >
                {f === "all" ? "All documents" : f}
              </button>
            ))}
            <button
              onClick={() => setShowArchived((v) => !v)}
              aria-pressed={showArchived}
              className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                showArchived
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              <Archive className="size-4" aria-hidden="true" /> Archive
            </button>
          </nav>
        </aside>

        <section>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {visible.length} {visible.length === 1 ? "document" : "documents"}
            </h2>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-sm font-medium">Nothing here yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add a PDF, DOCX or PPTX file to start your offline library.
              </p>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((d) => (
                <DocCard key={d.id} doc={d} view="grid" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visible.map((d) => (
                <DocCard key={d.id} doc={d} view="list" />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
