import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Grid2x2, List, ScanText, Search, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { db, deleteDoc, tagColorClass, toggleStar, type DocRecord } from "@/lib/db";
import { useQuickFilters } from "@/lib/quick-filters";
import { DocCard } from "@/components/library/DocCard";
import { UploadZone } from "@/components/library/UploadZone";
import { EmptyState } from "@/components/library/EmptyState";
import { ScanDialog } from "@/components/library/ScanDialog";
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

const LARGE = 5 * 1024 * 1024;
const WEEK = 7 * 24 * 60 * 60 * 1000;

function LibraryPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [tab, setTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");
  const chips = useQuickFilters();
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [scanOpen, setScanOpen] = useState(false);

  const docs = useLiveQuery(() => db.docs.orderBy("addedAt").reverse().toArray(), [], [] as DocRecord[]);
  const tags = useLiveQuery(() => db.tags.toArray(), [], []);


  const toggleChip = (id: ChipId) => setChips((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    let list = (docs ?? []).filter((d) => {
      if (tab === "archive") return d.archived === 1;
      return d.archived === 0 && (tab === "all" || d.format === tab);
    });
    if (activeTag) list = list.filter((d) => d.tags.includes(activeTag));
    if (chips.includes("starred")) list = list.filter((d) => d.starred === 1);
    if (chips.includes("large")) list = list.filter((d) => d.size >= LARGE);
    if (chips.includes("recent")) {
      list = list
        .filter((d) => (d.lastOpenedAt ?? d.addedAt) > now - WEEK)
        .sort((a, b) => (b.lastOpenedAt ?? b.addedAt) - (a.lastOpenedAt ?? a.addedAt));
    }
    return list.filter((d) => matches(d, q));
  }, [docs, tab, query, chips, activeTag]);

  const selectionMode = selected.length > 0;
  const toggleSelect = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const emptyTab = activeTag ? "tag" : chips.includes("starred") ? "starred" : tab;

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
              className="h-11 w-full rounded-xl border border-border bg-card/60 pl-9 pr-3 text-sm outline-hidden placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <button
            onClick={() => setScanOpen(true)}
            aria-label="Scan a page with the camera"
            className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ScanText className="size-4.5" aria-hidden="true" />
          </button>
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

        <div className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto px-3 pb-2">
          {CHIPS.map((c) => {
            const on = chips.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleChip(c.id)}
                aria-pressed={on}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-105 ${
                  on ? "border-accent/50 bg-accent/15 text-accent" : "border-border text-muted-foreground"
                }`}
              >
                <c.icon className="size-3.5" aria-hidden="true" />
                {c.label}
              </button>
            );
          })}
          {(tags ?? []).map((t) => {
            const on = activeTag === t.name;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTag(on ? null : t.name)}
                aria-pressed={on}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-105 ${
                  on ? tagColorClass(t.color) : "border-border text-muted-foreground"
                }`}
              >
                #{t.name}
              </button>
            );
          })}
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

        <div className="mb-3 mt-5 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {visible.length} {visible.length === 1 ? "document" : "documents"}
          </h2>
          {!selectionMode && visible.length > 0 && (
            <button
              onClick={() => setSelected([visible[0]!.id!])}
              className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Select
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <EmptyState tab={emptyTab} query={query} />
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((d) => (
              <DocCard
                key={d.id}
                doc={d}
                view="grid"
                tags={tags ?? []}
                selectionMode={selectionMode}
                selected={selected.includes(d.id!)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((d) => (
              <DocCard
                key={d.id}
                doc={d}
                view="list"
                tags={tags ?? []}
                selectionMode={selectionMode}
                selected={selected.includes(d.id!)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        )}
      </main>

      {selectionMode && (
        <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 animate-scale-in items-center gap-2 rounded-2xl border border-border bg-card/95 px-3 py-2 shadow-[var(--shadow-float)] backdrop-blur-xl">
          <span className="text-xs font-medium tabular-nums">{selected.length} selected</span>
          <button
            onClick={() => {
              selected.forEach((id) => void toggleStar(id));
              toast.success("Starred selection");
              setSelected([]);
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-highlight hover:bg-secondary"
          >
            <Star className="size-3.5" aria-hidden="true" /> Star
          </button>
          <button
            onClick={() => {
              selected.forEach((id) => void deleteDoc(id));
              toast.success(`Deleted ${selected.length} documents`);
              setSelected([]);
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-destructive hover:bg-secondary"
          >
            <Trash2 className="size-3.5" aria-hidden="true" /> Delete
          </button>
          <button
            onClick={() => setSelected([])}
            aria-label="Cancel selection"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <ScanDialog open={scanOpen} onOpenChange={setScanOpen} />
    </div>
  );
}

function matches(doc: DocRecord, q: string) {
  if (!q) return true;
  return (
    doc.title.toLowerCase().includes(q) ||
    (doc.textIndex ?? "").toLowerCase().includes(q) ||
    doc.tags.some((t) => t.toLowerCase().includes(q))
  );
}
