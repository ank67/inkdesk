import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  ListTree,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  StickyNote,
} from "lucide-react";
import { db, type TocItem } from "@/lib/db";
import { PdfView } from "@/components/reader/PdfView";
import { DocxView } from "@/components/reader/DocxView";
import { TocDrawer } from "@/components/reader/TocDrawer";

export const Route = createFileRoute("/reader/$docId")({
  head: () => ({
    meta: [
      { title: "Reading — E-Book" },
      {
        name: "description",
        content: "Distraction-free offline reading with a real table of contents, annotations and text-to-speech.",
      },
      { property: "og:title", content: "Reading — E-Book" },
      { property: "og:description", content: "Distraction-free offline reading view for PDF, DOCX, EPUB and TXT." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReaderPage,
});

function ReaderPage() {
  const { docId } = Route.useParams();
  const id = Number(docId);
  const doc = useLiveQuery(() => db.docs.get(id), [id]);
  const [zoom, setZoom] = useState(1);
  const [tocOpen, setTocOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [toc, setToc] = useState<TocItem[]>([]);
  const [tocLoading, setTocLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);

  const blob = doc?.blob;
  const format = doc?.format;

  useEffect(() => {
    if (!doc) return;
    setPage(doc.page || 1);
    const objectUrl = URL.createObjectURL(doc.blob);
    setUrl(objectUrl);
    if (doc.format === "txt") void doc.blob.text().then(setText);
    void db.docs.update(id, { lastOpenedAt: Date.now() });
    return () => URL.revokeObjectURL(objectUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  // Persist reading position.
  useEffect(() => {
    if (!doc || !page) return;
    void db.docs.update(id, { page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, id]);

  // TXT files get a lightweight heading-based TOC.
  useEffect(() => {
    if (format !== "txt") return;
    const lines = text.split("\n");
    const items: TocItem[] = [];
    lines.forEach((line, i) => {
      const t = line.trim();
      if (t.length > 2 && t.length < 80 && (t === t.toUpperCase() || /^(chapter|part|\d+[.)])/i.test(t))) {
        items.push({ label: t, level: 0, anchor: `txt-${i}` });
      }
    });
    setToc(items.slice(0, 200));
    setTocLoading(false);
  }, [format, text]);

  useEffect(() => {
    if (format === "pdf" || format === "docx") setTocLoading(true);
    else if (format && format !== "txt") setTocLoading(false);
  }, [format]);

  const onSelect = (item: TocItem) => {
    if (item.page !== undefined) setPage(item.page);
    if (item.anchor) document.getElementById(item.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (window.innerWidth < 768) setTocOpen(false);
  };

  const speakable = useMemo(() => text || doc?.title || "", [text, doc?.title]);

  const speak = () => {
    if (typeof speechSynthesis === "undefined") return;
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(speakable);
    utter.onend = () => setSpeaking(false);
    speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/85 px-3 py-2 backdrop-blur-xl">
        <Link
          to="/"
          aria-label="Back to library"
          className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4.5" aria-hidden="true" />
        </Link>
        <h1 className="min-w-0 truncate text-sm font-medium">{doc?.title ?? "Loading…"}</h1>
        <button
          onClick={() => setTocOpen((v) => !v)}
          aria-label="Toggle table of contents"
          aria-pressed={tocOpen}
          className={`grid min-h-11 min-w-11 place-items-center rounded-lg transition-colors ${
            tocOpen ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <ListTree className="size-4.5" aria-hidden="true" />
        </button>
      </header>

      <div className="flex flex-1">
        <TocDrawer
          items={toc}
          open={tocOpen}
          loading={tocLoading}
          {...(format === "pdf" ? { activePage: page } : {})}
          onSelect={onSelect}
          onClose={() => setTocOpen(false)}
        />

        <main className="relative flex-1 overflow-auto p-3">
          <div className="mx-auto max-w-5xl">
            {format === "pdf" && blob ? (
              <PdfView
                blob={blob}
                page={page}
                zoom={zoom}
                onLoaded={({ pageCount, toc, text }) => {
                  setPageCount(pageCount);
                  setToc(toc);
                  setText(text);
                  setTocLoading(false);
                  void db.docs.update(id, { pageCount, toc, textIndex: text.slice(0, 20000) });
                }}
              />
            ) : format === "docx" && blob ? (
              <DocxView
                blob={blob}
                zoom={zoom}
                onLoaded={({ toc, text }) => {
                  setToc(toc);
                  setText(text);
                  setTocLoading(false);
                  void db.docs.update(id, { toc, textIndex: text.slice(0, 20000) });
                }}
              />
            ) : format === "txt" ? (
              <article
                className="whitespace-pre-wrap rounded-xl border border-border bg-card p-6 leading-7"
                style={{ fontSize: `${0.875 * zoom}rem` }}
              >
                {text.split("\n").map((line, i) => (
                  <p key={i} id={`txt-${i}`}>
                    {line || "\u00a0"}
                  </p>
                ))}
              </article>
            ) : url && doc ? (
              <div className="grid h-[70vh] place-items-center rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
                <p>{doc.format.toUpperCase()} rendering comes next</p>
              </div>
            ) : (
              <div className="grid h-[60vh] place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                Loading document…
              </div>
            )}
          </div>

          <div className="pointer-events-auto absolute right-4 top-6 flex flex-col gap-2 rounded-xl border border-border bg-card/90 p-1.5 shadow-[var(--shadow-float)] backdrop-blur">
            <button
              aria-label="Highlight text"
              className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-highlight"
            >
              <Highlighter className="size-4.5" aria-hidden="true" />
            </button>
            <button
              aria-label="Add sticky note"
              className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-accent"
            >
              <StickyNote className="size-4.5" aria-hidden="true" />
            </button>
          </div>
        </main>
      </div>

      <footer className="sticky bottom-0 z-20 flex items-center gap-2 border-t border-border bg-background/90 px-3 py-2 backdrop-blur-xl">
        <button
          onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
          aria-label="Zoom out"
          className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Minus className="size-4.5" aria-hidden="true" />
        </button>
        <span className="w-12 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
          aria-label="Zoom in"
          className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Plus className="size-4.5" aria-hidden="true" />
        </button>

        {format === "pdf" && pageCount > 0 && (
          <div className="ml-2 flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="size-4.5" aria-hidden="true" />
            </button>
            <span className="min-w-16 text-center text-xs tabular-nums text-muted-foreground">
              {page} / {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              aria-label="Next page"
              className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
            >
              <ChevronRight className="size-4.5" aria-hidden="true" />
            </button>
          </div>
        )}

        <button
          onClick={speak}
          className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg bg-linear-to-r from-primary to-accent px-4 text-sm font-medium text-primary-foreground"
        >
          {speaking ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          Listen
        </button>
        <button
          onClick={() => void document.documentElement.requestFullscreen?.()}
          aria-label="Fullscreen"
          className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Maximize2 className="size-4.5" aria-hidden="true" />
        </button>
      </footer>
    </div>
  );
}
