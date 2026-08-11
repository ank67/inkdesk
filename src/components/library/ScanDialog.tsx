import { useRef, useState } from "react";
import { Camera, Loader2, ScanText } from "lucide-react";
import { toast } from "sonner";
import { addTextDocument } from "@/lib/db";
import { extractTextFromImage } from "@/lib/ai.functions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ScanDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("Scanned page");

  const run = async (file: File) => {
    setBusy(true);
    setText("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read that image."));
        reader.readAsDataURL(file);
      });
      setPreview(dataUrl);
      const { text: extracted } = await extractTextFromImage({ data: { dataUrl } });
      if (!extracted.trim()) {
        toast.error("No text found in that image.");
        return;
      }
      setText(extracted);
      setTitle(file.name.replace(/\.[^.]+$/, "") || "Scanned page");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    await addTextDocument(title, text);
    toast.success("Saved to your library as searchable text");
    setText("");
    setPreview("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanText className="size-4 text-accent" aria-hidden="true" /> Scan a page
          </DialogTitle>
          <DialogDescription>
            Snap a photo of a physical page — the text is extracted and saved as a searchable document.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void run(f);
          }}
        />

        {preview && (
          <img src={preview} alt="Scanned page preview" className="max-h-40 w-full animate-fade-in rounded-lg object-cover" />
        )}

        {text ? (
          <>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Document title"
              className="h-10 rounded-lg border border-border bg-card/60 px-3 text-sm outline-hidden focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Extracted text"
              rows={7}
              className="rounded-lg border border-border bg-card/60 p-3 text-xs leading-6 outline-hidden focus:border-primary"
            />
            <button
              onClick={() => void save()}
              className="min-h-11 rounded-lg bg-linear-to-r from-primary to-accent px-4 text-sm font-medium text-primary-foreground"
            >
              Save to library
            </button>
          </>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="size-5 animate-spin text-accent" aria-hidden="true" /> Extracting text…
              </>
            ) : (
              <>
                <Camera className="size-5 text-accent" aria-hidden="true" /> Take or choose a photo
              </>
            )}
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
