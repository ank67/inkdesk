import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  ListTree,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Sparkles,
  Square,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { db, type TocItem } from "@/lib/db";
import { addReadingTime } from "@/lib/reading-stats";
import { PdfView } from "@/components/reader/PdfView";
import { DocxView } from "@/components/reader/DocxView";
import { PptxView } from "@/components/reader/PptxView";
import { TocDrawer } from "@/components/reader/TocDrawer";
import { ZoomPane } from "@/components/reader/ZoomPane";
import { DocChat } from "@/components/reader/DocChat";


export const Route = createFileRoute("/reader/$docId")({
  head: () => ({
    meta: [
      { title: "Reading — E-Book" },
      {
        name: "description",
        content: "Distraction-free offline reading with a real table of contents, annotations and read-aloud.",
      },
      { property: "og:title", content: "Reading — E-Book" },
      { property: "og:description", content: "Distraction-free offline reading view for PDF, DOCX, PPTX and TXT." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReaderPage,
});

const RATES = [0.75, 1, 1.25, 1.5, 2];

function ReaderPage() {
  const { docId } = Route.useParams();
  const id = Number(docId);
  const doc = useLiveQuery(() => db.docs.get(id), [id]);

  const [tocOpen, setTocOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const [rate, setRate] = useState(1);
  const [text, setText] = useState("");
  const [toc, setToc] = useState<TocItem[]>([]);
  const [tocLoading, setTocLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const textRef = useRef("");

  const blob = doc?.blob;
  const format = doc?.format;

  useEffect(() => {
    if (!doc) return;
    setPage(doc.page || 1);
    if (doc.format === "txt") void doc.blob.text().then(setText);
    void db.docs.update(id, { lastOpenedAt: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // Persist reading position.
  useEffect(() => {
    if (!doc || !page) return;
    void db.docs.update(id, { page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, id]);

  // TXT files get a lightweight heading-based TOC.
  useEffect(() => {
    if (format !== "txt") return;
    const items: TocItem[] = [];
    text.split("\n").forEach((line, i) => {
      const t = line.trim();
      if (t.length > 2 && t.length < 80 && (t === t.toUpperCase() || /^(chapter|part|\d+[.)])/i.test(t))) {
        items.push({ label: t, level: 0, anchor: `txt-${i}` });
      }
    });
    setToc(items.slice(0, 200));
    setTocLoading(false);
  }, [format, text]);

  useEffect(() => {
    if (format && format !== "txt") setTocLoading(true);
  }, [format]);

  // Active reading time: only ticks while this document is on screen, the tab is
  // visible and the reader has interacted in the last 2 minutes. Sign-in and
  // background time never count.
  useEffect(() => {
    if (!Number.isFinite(id)) return;
    let pending = 0;
    let lastActive = Date.now();
    const touch = () => {
      lastActive = Date.now();
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart", "scroll", "mousemove"] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    const flush = () => {
      if (pending >= 1) {
        void addReadingTime(id, pending);
        pending = 0;
      }
    };

    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActive > 120000) return;
      pending += 5;
      if (pending >= 30) flush();
    }, 5000);

    document.addEventListener("visibilitychange", flush);
    return () => {
      window.clearInterval(tick);
      events.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener("visibilitychange", flush);
      flush();
    };
  }, [id]);

  // Stop speech when leaving the reader.
  useEffect(() => {
    return () => {
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    };
  }, []);


  // Escape leaves distraction-free mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImmersive(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const enterImmersive = useCallback(() => {
    setTocOpen(false);
    setImmersive(true);
    void document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const exitImmersive = useCallback(() => {
    setImmersive(false);
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
  }, []);

  const onSelect = (item: TocItem) => {
    if (item.page !== undefined) setPage(item.page);
    if (item.anchor) document.getElementById(item.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (window.innerWidth < 768) setTocOpen(false);
  };

  const speak = (nextRate = rate) => {
    if (typeof speechSynthesis === "undefined") {
      toast.error("Read aloud isn't supported in this browser.");
      return;
    }
    const body = textRef.current || doc?.title || "";
    if (!body.trim()) {
      toast.error("No readable text found in this document yet.");
      return;
    }
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(body.slice(0, 30000));
    utter.rate = nextRate;
    utter.onend = () => setSpeaking(false);
    speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  const togglePlay = () => {
    if (typeof speechSynthesis === "undefined") return;
    if (speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      setSpeaking(false);
      return;
    }
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
      setSpeaking(true);
      return;
    }
    speak();
  };

  const stop = () => {
    if (typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();
    setSpeaking(false);
  };

  const changeRate = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length]!;
    setRate(next);
    if (speaking) speak(next);
  };

  const addBookmark = async () => {
    await db.bookmarks.add({ docId: id, page, label: `Page ${page}`, createdAt: Date.now() });
    toast.success(`Bookmarked page ${page}`);
  };

  const content = (
    <>
      {format === "pdf" && blob ? (
        <PdfView
          blob={blob}
          page={page}
          onLoaded={({ pageCount }) => {
            setPageCount(pageCount);
            void db.docs.update(id, { pageCount });
          }}
          onMeta={({ toc, text }) => {
            setToc(toc);
            setText(text);
            setTocLoading(false);
            void db.docs.update(id, { toc, textIndex: text.slice(0, 20000) });
          }}
        />
      ) : format === "docx" && blob ? (
        <DocxView
          blob={blob}
          zoom={1}
          onLoaded={({ toc, text }) => {
            setToc(toc);
            setText(text);
            setTocLoading(false);
            void db.docs.update(id, { toc, textIndex: text.slice(0, 20000) });
          }}
        />
      ) : format === "pptx" && blob ? (
        <PptxView
          blob={blob}
          onLoaded={({ toc, text, slideCount }) => {
            setToc(toc);
            setText(text);
            setPageCount(slideCount);
            setTocLoading(false);
            void db.docs.update(id, { pageCount: slideCount, toc, textIndex: text.slice(0, 20000) });
          }}
        />
      ) : format === "txt" ? (
        <article className="mx-auto max-w-3xl whitespace-pre-wrap rounded-xl border border-border bg-card p-6 leading-7">
          {text.split("\n").map((line, i) => (
            <p key={i} id={`txt-${i}`}>
              {line || "\u00a0"}
            </p>
          ))}
        </article>
      ) : (
        <div className="grid h-[60vh] w-[80vw] max-w-3xl place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          Loading document…
        </div>
      )}
    </>
  );

  if (immersive) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ZoomPane className="min-h-screen overflow-auto p-2">{content}</ZoomPane>
        <button
          onClick={exitImmersive}
          aria-label="Exit distraction-free mode"
          className="fixed bottom-4 right-4 z-40 grid size-11 place-items-center rounded-full bg-card/70 text-muted-foreground opacity-40 backdrop-blur transition-opacity hover:opacity-100"
        >
          <Minimize2 className="size-4.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

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
        <h1 className="min-w-0 truncate text-center text-sm font-medium">{doc?.title ?? "Loading…"}</h1>
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

        <main className="relative flex-1 overflow-hidden">
          <ZoomPane className="h-[calc(100vh-7.5rem)] overflow-auto p-3">{content}</ZoomPane>

          <div className="absolute right-4 top-4 flex flex-col gap-2 rounded-xl border border-border bg-card/90 p-1.5 shadow-[var(--shadow-float)] backdrop-blur">
            <button
              aria-label="Highlight text"
              onClick={() => toast("Select text, then highlight — coming to your annotations soon.")}
              className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-highlight"
            >
              <Highlighter className="size-4.5" aria-hidden="true" />
            </button>
            <button
              aria-label="Add sticky note"
              onClick={async () => {
                await db.annotations.add({ docId: id, page, kind: "note", text: "", createdAt: Date.now() });
                toast.success("Sticky note added to this page");
              }}
              className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-accent"
            >
              <StickyNote className="size-4.5" aria-hidden="true" />
            </button>
            <button
              aria-label="Bookmark this page"
              onClick={() => void addBookmark()}
              className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary"
            >
              <Bookmark className="size-4.5" aria-hidden="true" />
            </button>
            <button
              aria-label="Ask about this document"
              aria-pressed={chatOpen}
              onClick={() => setChatOpen((v) => !v)}
              className={`grid min-h-11 min-w-11 place-items-center rounded-lg transition-colors ${chatOpen ? "bg-secondary text-accent" : "text-muted-foreground hover:bg-secondary hover:text-accent"}`}
            >
              <Sparkles className="size-4.5" aria-hidden="true" />
            </button>

          </div>
        </main>
      </div>

      <footer className="sticky bottom-0 z-20 flex items-center gap-2 border-t border-border bg-background/90 px-3 py-2 backdrop-blur-xl">
        {format === "pdf" && pageCount > 0 && (
          <div className="flex items-center gap-1">
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

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={togglePlay}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-linear-to-r from-primary to-accent px-4 text-sm font-medium text-primary-foreground"
          >
            {speaking ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            Listen
          </button>
          <button
            onClick={stop}
            aria-label="Stop reading aloud"
            className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Square className="size-4" aria-hidden="true" />
          </button>
          <button
            onClick={changeRate}
            aria-label={`Reading speed ${rate}x`}
            className="min-h-11 rounded-lg px-2 text-xs font-semibold tabular-nums text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            {rate}x
          </button>
          <button
            onClick={enterImmersive}
            aria-label="Distraction-free fullscreen"
            className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Maximize2 className="size-4.5" aria-hidden="true" />
          </button>
        </div>
      </footer>

      <DocChat
        title={doc?.title ?? "Document"}
        context={(text || doc?.textIndex || "").slice(0, 12000)}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />

    </div>
  );
}
