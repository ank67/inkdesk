import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Grid2x2, List, Search } from "lucide-react";
import { db, type DocRecord } from "@/lib/db";
import { DocCard } from "@/components/library/DocCard";
import { UploadZone } from "@/components/library/UploadZone";
import { TopBar } from "@/components/layout/TopBar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "E-Book — Your offline document & eBook library" },
      {
        name: "description",
        content:
          "E-Book is a distraction-free, offline-first reader for PDF, DOCX, PPTX and TXT files. Everything stays on your device.",
      },
      { property: "og:title", content: "E-Book — Offline document library" },
      {
        property: "og:description",
        content: "Read, annotate and search PDF, DOCX, PPTX and TXT documents fully offline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

const TABS = [
  { id: "all", label: "All documents" },
  { id: "pdf", label: "PDF" },
  { id: "docx", label: "DOCX" },
  { id: "pptx", label: "PPTX" },
  { id: "txt", label: "TXT" },
  { id: "archive", label: "Archive" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function LibraryPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [tab, setTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");

  const docs = useLiveQuery(() => db.docs.orderBy("addedAt").reverse().toArray(), [], [] as DocRecord[]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (docs ?? []).filter((d) => {
      if (tab === "archive") return d.archived === 1 && matches(d, q);
      return d.archived === 0 && (tab === "all" || d.format === tab) && matches(d, q);
    });
  }, [docs, tab, query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />

      <div className="sticky top-[3.25rem] z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2">
          <div className="relative min-w-0 flex-1">
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

        <nav aria-label="Filter by category" className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto px-3 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "border-primary/50 bg-secondary text-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="mx-auto max-w-7xl px-3 py-5">
        <UploadZone />

        <h2 className="mb-3 mt-5 text-sm font-semibold text-muted-foreground">
          {visible.length} {visible.length === 1 ? "document" : "documents"}
        </h2>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm font-medium">Nothing here yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a PDF, DOCX, PPTX or TXT file to start your offline library.
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
      </main>
    </div>
  );
}

function matches(doc: DocRecord, q: string) {
  if (!q) return true;
  return doc.title.toLowerCase().includes(q) || (doc.textIndex ?? "").toLowerCase().includes(q);
}
