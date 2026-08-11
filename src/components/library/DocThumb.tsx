import { useEffect, useRef, useState } from "react";
import { FileText, Presentation } from "lucide-react";
import { saveThumb, type DocRecord } from "@/lib/db";

const COVER: Record<string, string> = {
  pdf: "from-destructive/30 via-destructive/10 to-card",
  docx: "from-primary/35 via-primary/10 to-card",
  pptx: "from-accent/35 via-accent/10 to-card",
  txt: "from-muted via-secondary to-card",
};

/** Renders page 1 of a PDF as a real preview; other formats get a styled cover card. */
export function DocThumb({ doc, className = "" }: { doc: DocRecord; className?: string }) {
  const [thumb, setThumb] = useState(doc.thumb ?? "");
  const [txtPeek, setTxtPeek] = useState("");
  const tried = useRef(false);

  useEffect(() => {
    if (doc.format === "txt" && !txtPeek) {
      void doc.blob
        .slice(0, 800)
        .text()
        .then((t) => setTxtPeek(t.slice(0, 400)))
        .catch(() => {});
    }
    if (doc.format !== "pdf" || thumb || tried.current) return;
    tried.current = true;
    let cancelled = false;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(await doc.blob.arrayBuffer()) }).promise;
        const page = await pdf.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2, 320 / base.width) });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        const url = canvas.toDataURL("image/jpeg", 0.7);
        void (pdf as unknown as { destroy: () => Promise<void> }).destroy();
        if (cancelled) return;
        setThumb(url);
        if (doc.id) void saveThumb(doc.id, url);
      } catch {
        /* preview is optional */
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id, doc.format]);

  if (thumb) {
    return (
      <div className={`overflow-hidden bg-secondary/70 ${className}`}>
        <img
          src={thumb}
          alt={`First page of ${doc.title}`}
          loading="lazy"
          className="size-full animate-fade-in object-cover object-top"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-linear-to-br ${COVER[doc.format] ?? COVER["txt"]} ${className}`}
      aria-hidden="true"
    >
      {doc.format === "txt" && txtPeek ? (
        <p className="line-clamp-6 p-2.5 text-[7px] leading-[1.5] text-muted-foreground">{txtPeek}</p>
      ) : (
        <div className="grid size-full place-items-center text-foreground/70">
          {doc.format === "pptx" ? (
            <Presentation className="size-7" />
          ) : (
            <FileText className="size-7" />
          )}
        </div>
      )}
      <span className="absolute bottom-1.5 left-2 text-[9px] font-bold uppercase tracking-widest text-foreground/50">
        {doc.format}
      </span>
    </div>
  );
}

export function ProgressRing({ value, size = 28 }: { value: number; size?: number }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${value}% completed`}
      title={`${value}% completed`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="2.5" className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * value) / 100}
          className="stroke-accent transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute text-[7px] font-bold tabular-nums text-muted-foreground">{value}</span>
    </span>
  );
}
