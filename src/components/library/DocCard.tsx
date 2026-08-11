import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Archive, Loader2, MoreVertical, Sparkles, Star, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteDoc,
  formatBytes,
  middleTruncate,
  readingProgress,
  saveSummary,
  tagColorClass,
  toggleArchive,
  toggleStar,
  type DocRecord,
  type TagRecord,
} from "@/lib/db";
import { summarizeDocument } from "@/lib/ai.functions";
import { DocThumb, ProgressRing } from "@/components/library/DocThumb";
import { TagDialog } from "@/components/library/TagDialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FORMAT_STYLE: Record<string, string> = {
  pdf: "bg-destructive/15 text-destructive",
  docx: "bg-primary/20 text-primary",
  pptx: "bg-accent/20 text-accent",
  txt: "bg-muted text-muted-foreground",
};

type Props = {
  doc: DocRecord;
  view: "grid" | "list";
  tags: TagRecord[];
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: (id: number) => void;
};

export function DocCard({ doc, view, tags, selectionMode, selected, onToggleSelect }: Props) {
  const [tagOpen, setTagOpen] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [dx, setDx] = useState(0);
  const startX = useRef(0);
  const swiping = useRef(false);

  const id = doc.id!;
  const progress = readingProgress(doc);

  const summarize = async () => {
    const text = doc.textIndex ?? "";
    if (text.trim().length < 40) {
      toast.error("Open this document once so it can be indexed, then summarise it.");
      return;
    }
    setSummarizing(true);
    try {
      const { bullets } = await summarizeDocument({ data: { title: doc.title, text } });
      if (!bullets.length) throw new Error("No summary returned.");
      await saveSummary(id, bullets);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not summarise this document.");
    } finally {
      setSummarizing(false);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (selectionMode) return;
    startX.current = e.touches[0]!.clientX;
    swiping.current = true;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!swiping.current) return;
    setDx(Math.max(-120, Math.min(120, e.touches[0]!.clientX - startX.current)));
  };
  const onTouchEnd = () => {
    swiping.current = false;
    if (dx > 70) {
      void toggleStar(id);
      toast.success(doc.starred ? "Removed from starred" : "Starred");
    } else if (dx < -70) {
      void deleteDoc(id);
      toast.success(`Deleted “${doc.title}”`);
    }
    setDx(0);
  };

  const badge = (
    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase ${FORMAT_STYLE[doc.format]}`}>
      {doc.format}
    </span>
  );

  const docTags = doc.tags.map((name) => ({ name, color: tags.find((t) => t.name === name)?.color ?? "primary" }));

  const tagChips = docTags.length > 0 && (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {docTags.slice(0, 3).map((t) => (
        <span key={t.name} className={`rounded-full border px-1.5 text-[10px] font-medium ${tagColorClass(t.color)}`}>
          #{t.name}
        </span>
      ))}
    </div>
  );

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${doc.title}`}
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-card/70 text-muted-foreground backdrop-blur transition-colors hover:bg-secondary hover:text-foreground"
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void toggleStar(id)}>
          <Star className={`size-4 ${doc.starred ? "fill-highlight text-highlight" : ""}`} aria-hidden="true" />
          {doc.starred ? "Unstar" : "Star"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTagOpen(true)}>
          <Tag className="size-4" aria-hidden="true" /> Tags…
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void summarize()}>
          <Sparkles className="size-4" aria-hidden="true" /> Summarise
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void toggleArchive(id)}>
          <Archive className="size-4" aria-hidden="true" />
          {doc.archived ? "Unarchive" : "Archive"}
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={() => void deleteDoc(id)}>
          <Trash2 className="size-4" aria-hidden="true" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const summarizeBadge = (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void summarize();
      }}
      disabled={summarizing}
      aria-label={`Summarise ${doc.title}`}
      className="inline-flex min-h-7 items-center gap-1 rounded-full border border-accent/40 bg-accent/15 px-2 text-[11px] font-semibold text-accent transition-transform hover:scale-105 disabled:opacity-60"
    >
      {summarizing ? (
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles className="size-3" aria-hidden="true" />
      )}
      Summarise
    </button>
  );

  const summaryBlock = doc.summary?.length ? (
    <ul className="mt-2 animate-fade-in space-y-1 rounded-lg bg-secondary/60 p-2">
      {doc.summary.map((b, i) => (
        <li key={i} className="flex gap-1.5 text-[11px] leading-4 text-muted-foreground">
          <span className="text-accent">•</span>
          <span className="min-w-0">{b}</span>
        </li>
      ))}
    </ul>
  ) : null;

  const selectOverlay = selectionMode && (
    <button
      onClick={() => onToggleSelect(id)}
      aria-label={`${selected ? "Deselect" : "Select"} ${doc.title}`}
      className="absolute inset-0 z-10 grid place-items-start p-2"
    >
      <Checkbox checked={selected} className="pointer-events-none bg-card" />
    </button>
  );

  const shell = `relative transition-all duration-300 ${selected ? "ring-2 ring-primary" : ""}`;

  const swipeHints = (
    <>
      <span
        className="absolute inset-y-0 left-0 grid w-16 place-items-center rounded-l-2xl bg-highlight/20 text-highlight"
        aria-hidden="true"
      >
        <Star className="size-4" />
      </span>
      <span
        className="absolute inset-y-0 right-0 grid w-16 place-items-center rounded-r-2xl bg-destructive/20 text-destructive"
        aria-hidden="true"
      >
        <Trash2 className="size-4" />
      </span>
    </>
  );

  if (view === "list") {
    return (
      <>
        <div className="relative overflow-hidden rounded-xl">
          {dx !== 0 && swipeHints}
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ transform: `translateX(${dx}px)` }}
            className={`${shell} grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card/60 p-2.5 hover:border-primary/50`}
          >
            {selectOverlay}
            <div className="relative">
              <DocThumb doc={doc} className="size-12 shrink-0 rounded-lg" />
              {progress > 0 && (
                <span className="absolute -bottom-1 -right-1">
                  <ProgressRing value={progress} size={22} />
                </span>
              )}
            </div>
            <Link to="/reader/$docId" params={{ docId: String(id) }} className="min-w-0">
              <p className="truncate text-sm font-medium">{middleTruncate(doc.title, 34)}</p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                {badge} {formatBytes(doc.size)}
                {doc.starred ? <Star className="size-3 fill-highlight text-highlight" aria-hidden="true" /> : null}
              </p>
              {tagChips}
              {summaryBlock}
            </Link>
            <div className="flex shrink-0 items-center gap-1">
              {summarizeBadge}
              {menu}
            </div>
          </div>
        </div>
        <TagDialog doc={doc} open={tagOpen} onOpenChange={setTagOpen} />
      </>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl">
        {dx !== 0 && swipeHints}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ transform: `translateX(${dx}px)` }}
          className={`${shell} group overflow-hidden rounded-2xl border border-border bg-[image:var(--gradient-surface)] p-3 hover:border-primary/50 hover:shadow-[var(--shadow-float)]`}
        >
          {selectOverlay}
          <div className="absolute right-2 top-2 z-[5]">{menu}</div>
          {doc.starred ? (
            <span className="absolute left-2 top-2 z-[5] grid size-7 place-items-center rounded-full bg-card/80 backdrop-blur">
              <Star className="size-3.5 fill-highlight text-highlight" aria-hidden="true" />
            </span>
          ) : null}
          <Link to="/reader/$docId" params={{ docId: String(id) }} className="block">
            <div className="relative">
              <DocThumb doc={doc} className="aspect-3/4 w-full rounded-xl" />
              {progress > 0 && (
                <span className="absolute bottom-1.5 right-1.5 rounded-full bg-card/80 p-0.5 backdrop-blur">
                  <ProgressRing value={progress} />
                </span>
              )}
            </div>
            <p className="mt-2.5 truncate text-sm font-medium">{middleTruncate(doc.title, 24)}</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {badge} {formatBytes(doc.size)}
            </p>
            {tagChips}
            {summaryBlock}
          </Link>
          <div className="mt-2">{summarizeBadge}</div>
        </div>
      </div>
      <TagDialog doc={doc} open={tagOpen} onOpenChange={setTagOpen} />
    </>
  );
}
