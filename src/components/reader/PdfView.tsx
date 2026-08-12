import { useEffect, useRef, useState } from "react";
import type { TocItem } from "@/lib/db";

type Props = {
  blob: Blob;
  page: number;
  onLoaded: (info: { pageCount: number }) => void;
  onMeta?: (info: { toc: TocItem[]; text: string }) => void;
};

// pdf.js is browser-only, so it is imported lazily inside the effect.
export function PdfView({ blob, page, onLoaded, onMeta }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [width, setWidth] = useState(0);
  const [rendering, setRendering] = useState(true);

  // Track the available width so pages always render fit-to-width and sharp.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry?.contentRect.width ?? 0);
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pdf: any = null;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

        const data = new Uint8Array(await blob.arrayBuffer());
        pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled) {
          void pdf.destroy();
          return;
        }
        docRef.current = pdf;
        // Show the first page immediately; heavy metadata work happens after.
        setReady(true);
        onLoaded({ pageCount: pdf.numPages });

        const toc = await buildToc(pdf);
        if (cancelled) return;
        const text = await extractText(pdf, 12);
        if (cancelled) return;
        onMeta?.({ toc, text });
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("This PDF could not be opened.");
      }
    })();

    return () => {
      cancelled = true;
      docRef.current = null;
      if (pdf) void pdf.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  useEffect(() => {
    if (!ready || !width) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let task: any = null;

    (async () => {
      const pdf = docRef.current;
      const canvas = canvasRef.current;
      if (!pdf || !canvas) return;
      setRendering(true);
      const target = Math.min(Math.max(1, page), pdf.numPages);
      const pdfPage = await pdf.getPage(target);
      if (cancelled) return;

      const base = pdfPage.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const fit = width / base.width;
      const viewport = pdfPage.getViewport({ scale: fit * dpr });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;
      task = pdfPage.render({ canvasContext: ctx, viewport });
      try {
        await task.promise;
        if (!cancelled) setRendering(false);
        // Warm the neighbouring pages so navigation feels instant.
        void pdf.getPage(Math.min(pdf.numPages, target + 1)).catch(() => {});
        void pdf.getPage(Math.max(1, target - 1)).catch(() => {});
      } catch {
        /* render cancelled */
      }
    })();

    return () => {
      cancelled = true;
      if (task) task.cancel?.();
    };
  }, [page, ready, width]);

  if (error) {
    return (
      <div className="grid h-[60vh] place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="mx-auto w-full max-w-4xl">
      <div className="relative">
        <canvas
          ref={canvasRef}
          aria-label={`PDF page ${page}`}
          className="mx-auto block max-w-full rounded-xl border border-border bg-card shadow-[var(--shadow-float)]"
        />
        {(!ready || rendering) && (
          <div className="absolute inset-0 grid animate-pulse place-items-center rounded-xl bg-card/60 text-xs text-muted-foreground">
            Rendering page…
          </div>
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildToc(pdf: any): Promise<TocItem[]> {
  const items: TocItem[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = async (nodes: any[], level: number) => {
    for (const node of nodes ?? []) {
      let pageNumber: number | undefined;
      try {
        const dest = typeof node.dest === "string" ? await pdf.getDestination(node.dest) : node.dest;
        if (Array.isArray(dest) && dest[0]) {
          pageNumber = (await pdf.getPageIndex(dest[0])) + 1;
        }
      } catch {
        /* unresolvable destination */
      }
      items.push({
        label: String(node.title ?? "").trim() || "Untitled",
        level,
        ...(pageNumber === undefined ? {} : { page: pageNumber }),
      });
      if (node.items?.length) await walk(node.items, level + 1);
    }
  };

  try {
    const outline = await pdf.getOutline();
    if (outline?.length) await walk(outline, 0);
  } catch {
    /* no outline */
  }

  if (items.length) return items;
  return await headingsFromText(pdf);
}

/** Fallback TOC: treat the largest-font lines on each page as headings. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function headingsFromText(pdf: any): Promise<TocItem[]> {
  const out: TocItem[] = [];
  const limit = Math.min(pdf.numPages, 40);
  for (let p = 1; p <= limit; p++) {
    try {
      const content = await (await pdf.getPage(p)).getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spans = (content.items as any[]).filter((i) => i.str?.trim());
      if (!spans.length) continue;
      const heights = spans.map((i) => Math.abs(i.transform?.[3] ?? 0));
      const body = median(heights);
      const heads = spans
        .filter((i, idx) => (heights[idx] ?? 0) > body * 1.25 && i.str.trim().length > 2 && i.str.trim().length < 90)
        .map((i) => String(i.str).trim());
      const label = heads[0];
      if (label) out.push({ label, level: 0, page: p });
    } catch {
      /* skip page */
    }
    // Yield to the renderer so page rendering stays smooth.
    if (p % 5 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  if (out.length) return out;
  return Array.from({ length: pdf.numPages }, (_, i) => ({
    label: `Page ${i + 1}`,
    level: 0,
    page: i + 1,
  }));
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || 1;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractText(pdf: any, maxPages: number) {
  let text = "";
  const limit = Math.min(pdf.numPages, maxPages);
  for (let p = 1; p <= limit; p++) {
    try {
      const content = await (await pdf.getPage(p)).getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      text += (content.items as any[]).map((i) => i.str).join(" ") + "\n\n";
    } catch {
      /* skip */
    }
    await new Promise((r) => setTimeout(r, 0));
  }
  return text.trim();
}
