import { Archive, FileText, Presentation, ScanText, Star, Tag, UploadCloud } from "lucide-react";

type Props = { tab: string; query: string };

const COPY: Record<string, { icon: typeof FileText; title: string; hint: string }> = {
  all: { icon: UploadCloud, title: "Your library is empty", hint: "Drop a PDF, DOCX, PPTX or TXT file to read it offline." },
  pdf: { icon: FileText, title: "No PDFs yet", hint: "Add a PDF and its first page becomes the cover instantly." },
  docx: { icon: FileText, title: "No Word documents", hint: "DOCX files keep their original headings and styling here." },
  pptx: { icon: Presentation, title: "No presentations", hint: "Add a PPTX to flip through slides in the presenter view." },
  txt: { icon: ScanText, title: "No text files", hint: "Scan a page with your camera or drop a .txt / .md file." },
  archive: { icon: Archive, title: "Archive is clear", hint: "Documents you archive from a card menu land here." },
  starred: { icon: Star, title: "Nothing starred", hint: "Swipe a card right — or tap the star — to keep it close." },
  tag: { icon: Tag, title: "No documents with this tag", hint: "Open a card menu and pick Tags to organise your library." },
};

export function EmptyState({ tab, query }: Props) {
  const copy = query.trim()
    ? { icon: FileText, title: `No matches for “${query.trim()}”`, hint: "Try a different word, or clear the filter chips." }
    : (COPY[tab] ?? COPY["all"]!);
  const Icon = copy.icon;

  return (
    <div className="animate-fade-in rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-linear-to-br from-primary/25 to-accent/20">
        <Icon className="size-7 text-accent" aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-semibold">{copy.title}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">{copy.hint}</p>
    </div>
  );
}
