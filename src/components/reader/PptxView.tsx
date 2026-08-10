import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/db";

type Run = { text: string; sizePt: number; bold: boolean; italic: boolean; color: string | null };
type Para = { runs: Run[]; align: string };
type Shape =
  | { kind: "text"; x: number; y: number; w: number; h: number; paras: Para[] }
  | { kind: "image"; x: number; y: number; w: number; h: number; src: string };
type Slide = { shapes: Shape[]; title: string };

const EMU_PER_PX = 9525; // 914400 EMU per inch @ 96dpi

type Props = {
  blob: Blob;
  onLoaded: (info: { toc: TocItem[]; text: string; slideCount: number }) => void;
};

/** JSZip + DOMParser are browser-only, so parsing happens inside the effect. */
export function PptxView({ blob, onLoaded }: Props) {
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [size, setSize] = useState({ w: 960, h: 540 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];

    (async () => {
      try {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const parser = new DOMParser();

        const presXml = await zip.file("ppt/presentation.xml")?.async("string");
        let slideW = 9144000;
        let slideH = 6858000;
        if (presXml) {
          const sz = parser.parseFromString(presXml, "application/xml").getElementsByTagName("p:sldSz")[0];
          slideW = Number(sz?.getAttribute("cx") ?? slideW);
          slideH = Number(sz?.getAttribute("cy") ?? slideH);
        }

        const names = Object.keys(zip.files)
          .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
          .sort((a, b) => num(a) - num(b));

        const out: Slide[] = [];
        for (const name of names) {
          const xml = await zip.file(name)?.async("string");
          if (!xml) continue;
          const doc = parser.parseFromString(xml, "application/xml");

          // Image relationships for this slide.
          const relPath = name.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
          const relXml = await zip.file(relPath)?.async("string");
          const rels = new Map<string, string>();
          if (relXml) {
            const relDoc = parser.parseFromString(relXml, "application/xml");
            for (const rel of Array.from(relDoc.getElementsByTagName("Relationship"))) {
              const id = rel.getAttribute("Id");
              const target = rel.getAttribute("Target");
              if (id && target) rels.set(id, target.replace(/^\.\.\//, "ppt/"));
            }
          }

          const shapes: Shape[] = [];
          const tree = doc.getElementsByTagName("p:spTree")[0];
          for (const node of Array.from(tree?.children ?? [])) {
            const tag = node.tagName;
            const frame = box(node);
            if (!frame) continue;

            if (tag === "p:pic") {
              const embed = node.getElementsByTagName("a:blip")[0]?.getAttribute("r:embed");
              const path = embed ? rels.get(embed) : undefined;
              const file = path ? zip.file(path) : null;
              if (!file) continue;
              const url = URL.createObjectURL(await file.async("blob"));
              urls.push(url);
              shapes.push({ kind: "image", ...frame, src: url });
              continue;
            }

            if (tag !== "p:sp") continue;
            const paras: Para[] = [];
            for (const p of Array.from(node.getElementsByTagName("a:p"))) {
              const align = p.getElementsByTagName("a:pPr")[0]?.getAttribute("algn") ?? "l";
              const runs: Run[] = [];
              for (const r of Array.from(p.getElementsByTagName("a:r"))) {
                const text = r.getElementsByTagName("a:t")[0]?.textContent ?? "";
                if (!text) continue;
                const rPr = r.getElementsByTagName("a:rPr")[0];
                const clr = rPr?.getElementsByTagName("a:srgbClr")[0]?.getAttribute("val");
                runs.push({
                  text,
                  sizePt: Number(rPr?.getAttribute("sz") ?? 1800) / 100,
                  bold: rPr?.getAttribute("b") === "1",
                  italic: rPr?.getAttribute("i") === "1",
                  color: clr ? `#${clr}` : null,
                });
              }
              if (runs.length) paras.push({ runs, align: ALIGN[align] ?? "left" });
            }
            if (paras.length) shapes.push({ kind: "text", ...frame, paras });
          }

          out.push({ shapes, title: plain(shapes) || `Slide ${out.length + 1}` });
        }

        if (cancelled) {
          urls.forEach((u) => URL.revokeObjectURL(u));
          return;
        }

        setSize({ w: Math.round(slideW / EMU_PER_PX), h: Math.round(slideH / EMU_PER_PX) });
        setSlides(out);
        onLoaded({
          slideCount: out.length,
          toc: out.map((s, i) => ({ label: s.title || `Slide ${i + 1}`, level: 0, anchor: `slide-${i}` })),
          text: out.map((s) => s.shapes.map((sh) => (sh.kind === "text" ? textOf(sh.paras) : "")).join("\n")).join("\n\n"),
        });
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("This PPTX file could not be rendered.");
      }
    })();

    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
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

  if (!slides) {
    return (
      <div className="grid h-[60vh] place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        Rendering slides…
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {slides.map((slide, i) => (
        <section
          key={i}
          id={`slide-${i}`}
          aria-label={`Slide ${i + 1}`}
          className="relative overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-float)]"
          style={{ width: size.w, height: size.h }}
        >
          {slide.shapes.map((shape, j) =>
            shape.kind === "image" ? (
              <img
                key={j}
                src={shape.src}
                alt=""
                className="absolute object-contain"
                style={{ left: shape.x, top: shape.y, width: shape.w, height: shape.h }}
              />
            ) : (
              <div
                key={j}
                className="absolute flex flex-col justify-center"
                style={{ left: shape.x, top: shape.y, width: shape.w, height: shape.h }}
              >
                {shape.paras.map((p, k) => (
                  <p key={k} style={{ textAlign: p.align as "left", margin: 0, lineHeight: 1.25 }}>
                    {p.runs.map((r, m) => (
                      <span
                        key={m}
                        style={{
                          fontSize: `${r.sizePt * 1.333}px`,
                          fontWeight: r.bold ? 700 : 400,
                          fontStyle: r.italic ? "italic" : "normal",
                          color: r.color ?? "#111111",
                        }}
                      >
                        {r.text}
                      </span>
                    ))}
                  </p>
                ))}
              </div>
            ),
          )}
        </section>
      ))}
    </div>
  );
}

const ALIGN: Record<string, string> = { l: "left", ctr: "center", r: "right", just: "justify" };

function num(name: string) {
  return Number(name.match(/(\d+)/)?.[1] ?? 0);
}

function box(node: Element) {
  const off = node.getElementsByTagName("a:off")[0];
  const ext = node.getElementsByTagName("a:ext")[0];
  if (!off || !ext) return null;
  return {
    x: Number(off.getAttribute("x") ?? 0) / EMU_PER_PX,
    y: Number(off.getAttribute("y") ?? 0) / EMU_PER_PX,
    w: Number(ext.getAttribute("cx") ?? 0) / EMU_PER_PX,
    h: Number(ext.getAttribute("cy") ?? 0) / EMU_PER_PX,
  };
}

function textOf(paras: Para[]) {
  return paras.map((p) => p.runs.map((r) => r.text).join("")).join("\n");
}

function plain(shapes: Shape[]) {
  const first = shapes.find((s) => s.kind === "text");
  return first && first.kind === "text" ? textOf(first.paras).split("\n")[0]!.slice(0, 80) : "";
}
