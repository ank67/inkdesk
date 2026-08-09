import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Highlighter,
  ListTree,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  StickyNote,
} from "lucide-react";
import { db } from "@/lib/db";

export const Route = createFileRoute("/reader/$docId")({
  head: () => ({
    meta: [
      { title: "Reading — Offline Reader" },
      { name: "description", content: "Distraction-free offline reading with annotations and text-to-speech." },
      { property: "og:title", content: "Reading — Offline Reader" },
      { property: "og:description", content: "Distraction-free offline reading view." },
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

  useEffect(() => {
    if (!doc) return;
    const objectUrl = URL.createObjectURL(doc.blob);
    setUrl(objectUrl);
    if (doc.format === "txt") void doc.blob.text().then(setText);
    void db.docs.update(id, { lastOpenedAt: Date.now() });
    return () => URL.revokeObjectURL(objectUrl);
  }, [doc, id]);

  const toc = useMemo(
    () =>
      text
        .split("\n")
        .filter((l) => l.trim().length > 0 && l.trim().length < 80)
        .slice(0, 20),
    [text],
  );

  const speak = () => {
    if (typeof speechSynthesis === "undefined") return;
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text || doc?.title || "");
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
          className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ListTree className="size-4.5" aria-hidden="true" />
        </button>
      </header>

      <div className="flex flex-1">
        {tocOpen && (
          <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar p-4 md:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contents
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {toc.length ? (
                toc.map((line, i) => (
                  <li key={i} className="truncate text-muted-foreground">
                    {line}
                  </li>
                ))
              ) : (
                <li className="text-xs text-muted-foreground">No headings detected</li>
              )}
            </ul>
          </aside>
        )}

        <main className="relative flex-1 overflow-hidden p-3">
          <div
            className="mx-auto max-w-4xl origin-top transition-transform"
            style={{ transform: `scale(${zoom})` }}
          >
            {doc?.format === "pdf" && url ? (
              <iframe src={url} title={doc.title} className="h-[75vh] w-full rounded-xl border border-border bg-card" />
            ) : doc?.format === "txt" ? (
              <article className="prose-invert whitespace-pre-wrap rounded-xl border border-border bg-card p-6 text-sm leading-7">
                {text}
              </article>
            ) : (
              <div className="grid h-[60vh] place-items-center rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
                <p>
                  {doc ? `${doc.format.toUpperCase()} rendering comes next` : "Loading document…"}
                </p>
              </div>
            )}
          </div>

          <div className="pointer-events-auto absolute right-4 top-6 flex flex-col gap-2 rounded-xl border border-border bg-card/90 p-1.5 shadow-[var(--shadow-float)] backdrop-blur">
            <button aria-label="Highlight text" className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-highlight">
              <Highlighter className="size-4.5" aria-hidden="true" />
            </button>
            <button aria-label="Add sticky note" className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-accent">
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
        <span className="w-12 text-center text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
          aria-label="Zoom in"
          className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Plus className="size-4.5" aria-hidden="true" />
        </button>
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
