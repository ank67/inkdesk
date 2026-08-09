import { Link } from "@tanstack/react-router";
import { Archive, FileText, MoreVertical, Presentation, Trash2, BookOpen } from "lucide-react";
import { deleteDoc, formatBytes, toggleArchive, type DocRecord } from "@/lib/db";
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
  epub: "bg-chart-5/20 text-chart-5",
  txt: "bg-muted text-muted-foreground",
};

function Icon({ format }: { format: string }) {
  if (format === "pptx") return <Presentation className="size-7" aria-hidden="true" />;
  if (format === "epub") return <BookOpen className="size-7" aria-hidden="true" />;
  return <FileText className="size-7" aria-hidden="true" />;
}

export function DocCard({ doc, view }: { doc: DocRecord; view: "grid" | "list" }) {
  const badge = (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase ${FORMAT_STYLE[doc.format]}`}
    >
      {doc.format}
    </span>
  );

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${doc.title}`}
        className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void toggleArchive(doc.id!)}>
          <Archive className="size-4" aria-hidden="true" />
          {doc.archived ? "Unarchive" : "Archive"}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => void deleteDoc(doc.id!)}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (view === "list") {
    return (
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card/60 p-3 transition-colors hover:border-primary/50">
        <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-accent">
          <Icon format={doc.format} />
        </div>
        <Link to="/reader/$docId" params={{ docId: String(doc.id) }} className="min-w-0">
          <p className="truncate text-sm font-medium">{doc.title}</p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            {badge} {formatBytes(doc.size)}
          </p>
        </Link>
        {menu}
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-[image:var(--gradient-surface)] p-4 transition-all hover:border-primary/50 hover:shadow-[var(--shadow-float)]">
      <div className="absolute right-2 top-2">{menu}</div>
      <Link to="/reader/$docId" params={{ docId: String(doc.id) }} className="block">
        <div className="grid aspect-[3/4] place-items-center rounded-xl bg-secondary/70 text-accent">
          <Icon format={doc.format} />
        </div>
        <p className="mt-3 truncate text-sm font-medium">{doc.title}</p>
        <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          {badge} {formatBytes(doc.size)}
        </p>
      </Link>
    </div>
  );
}
