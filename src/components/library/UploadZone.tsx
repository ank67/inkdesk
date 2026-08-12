import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { addFiles } from "@/lib/db";

export function UploadZone({ compact = false }: { compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handle = async (files: FileList | null) => {
    if (files?.length) await addFiles(Array.from(files));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void handle(e.dataTransfer.files);
      }}
      className={`rounded-xl border border-dashed transition-colors ${
        over ? "border-primary bg-primary/10" : "border-border bg-card/40"
      } ${compact ? "p-1.5" : "p-2"}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.pptx,.txt,.md"
        className="sr-only"
        onChange={(e) => void handle(e.target.files)}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="flex min-h-9 w-full items-center justify-center gap-2 text-center"
      >
        <UploadCloud className="size-4 shrink-0 text-accent" aria-hidden="true" />
        <span className="text-sm font-medium">Add documents</span>
        {!compact && (
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">
            — drop PDF, DOCX, PPTX or TXT, stored offline
          </span>
        )}
      </button>
    </div>
  );
}
