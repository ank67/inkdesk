import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/db";

type Props = {
  blob: Blob;
  zoom: number;
  onLoaded: (info: { toc: TocItem[]; text: string }) => void;
};

function slug(text: string, i: number) {
  return `h-${i}-${text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)}`;
}

/** Mammoth.js is browser-only, so it is imported lazily inside the effect. */
export function DocxView({ blob, zoom, onLoaded }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const mammoth = await import("mammoth/mammoth.browser.js");
        const buffer = await blob.arrayBuffer();
        const result = await mammoth.convertToHtml(
          { arrayBuffer: buffer },
          {
            styleMap: [
              "p[style-name='Title'] => h1.doc-title:fresh",
              "p[style-name='Subtitle'] => h2:fresh",
              "p[style-name='Heading 1'] => h1:fresh",
              "p[style-name='Heading 2'] => h2:fresh",
              "p[style-name='Heading 3'] => h3:fresh",
              "p[style-name='Heading 4'] => h4:fresh",
            ],
          },
        );
        if (cancelled) return;

        // Give every heading a stable anchor id and collect it as a TOC entry.
        const parsed = new DOMParser().parseFromString(result.value, "text/html");
        const toc: TocItem[] = [];
        parsed.querySelectorAll("h1, h2, h3, h4").forEach((el, i) => {
          const label = (el.textContent ?? "").trim();
          if (!label) return;
          const id = slug(label, i);
          el.setAttribute("id", id);
          toc.push({ label, level: Number(el.tagName.slice(1)) - 1, anchor: id });
        });

        setHtml(parsed.body.innerHTML);
        onLoaded({ toc, text: parsed.body.textContent?.trim() ?? "" });
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("This DOCX file could not be rendered.");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  if (error) {
    return (
      <div className="grid h-[60vh] place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (html === null) {
    return (
      <div className="grid h-[60vh] place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        Rendering document…
      </div>
    );
  }

  return (
    <article
      className="docx-body mx-auto rounded-xl border border-border bg-card p-6 sm:p-10"
      style={{ fontSize: `${zoom}rem`, maxWidth: `${52 * zoom}rem` }}
      // Content comes from a local file the user chose; Mammoth emits a limited HTML subset.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
