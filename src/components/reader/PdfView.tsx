import { useEffect, useRef, useState } from "react";
import type { TocItem } from "@/lib/db";

type Props = {
  blob: Blob;
  page: number;
  zoom: number;
  onLoaded: (info: { pageCount: number; toc: TocItem[]; text: string }) => void;
};

// pdf.js is browser-only, so it is imported lazily inside the effect.
export function PdfView({ blob, page, zoom, onLoaded }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

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

        const toc = await buildToc(pdf);
        const text = await extractText(pdf, 12);
        setReady(true);
        onLoaded({ pageCount: pdf.numPages, toc, text });
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
    if (!ready) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let task: any = null;

    (async () => {
      const pdf = docRef.current;
      const canvas = canvasRef.current;
      if (!pdf || !canvas) return;
      const target = Math.min(Math.max(1, page), pdf.numPages);
      const pdfPage = await pdf.getPage(target);
      if (cancelled) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = pdfPage.getViewport({ scale: zoom * dpr });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      task = pdfPage.render({ canvasContext: ctx, viewport });
      try {
        await task.promise;
      } catch {
        /* render cancelled */
      }
    })();

    return () => {
      cancelled = true;
      if (task) task.cancel?.();
    };
  }, [page, zoom, ready]);

  if (error) {
    return (
      <div className="grid h-[60vh] place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        aria-label={`PDF page ${page}`}
        className="max-w-full rounded-xl border border-border bg-card shadow-[var(--shadow-float)]"
      />
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
  const limit = Math.min(pdf.numPages, 60);
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
      const label = heads[0];
      if (label) out.push({ label, level: 0, page: p });
    } catch {
      /* skip page */
    }
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
  }
  return text.trim();
}
