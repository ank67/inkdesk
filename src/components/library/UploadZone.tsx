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
      } ${compact ? "p-3" : "p-6"}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.pptx,.epub,.txt"
        className="sr-only"
        onChange={(e) => void handle(e.target.files)}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center gap-2 text-center"
      >
        <UploadCloud className="size-6 text-accent" aria-hidden="true" />
        <span className="text-sm font-medium">Add documents</span>
        {!compact && (
          <span className="text-xs text-muted-foreground">
            Drop PDF, DOCX, PPTX, EPUB or TXT — stored offline on this device
          </span>
        )}
      </button>
    </div>
  );
}
