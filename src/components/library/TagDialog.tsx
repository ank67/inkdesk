import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Plus } from "lucide-react";
import { db, setDocTags, TAG_COLORS, tagColorClass, type DocRecord } from "@/lib/db";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function TagDialog({
  doc,
  open,
  onOpenChange,
}: {
  doc: DocRecord;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const tags = useLiveQuery(() => db.tags.toArray(), [], []);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(TAG_COLORS[0].id);

  const toggle = async (tagName: string) => {
    const next = doc.tags.includes(tagName) ? doc.tags.filter((t) => t !== tagName) : [...doc.tags, tagName];
    if (doc.id) await setDocTags(doc.id, next);
  };

  const create = async () => {
    const clean = name.trim().replace(/^#/, "");
    if (!clean) return;
    await db.tags.put({ name: clean, color });
    if (doc.id) await setDocTags(doc.id, Array.from(new Set([...doc.tags, clean])));
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tags & collections</DialogTitle>
          <DialogDescription className="truncate">{doc.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {(tags ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">No tags yet — create your first one below.</p>
          )}
          {(tags ?? []).map((t) => {
            const on = doc.tags.includes(t.name);
            return (
              <button
                key={t.id}
                onClick={() => void toggle(t.name)}
                aria-pressed={on}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all hover:scale-105 ${
                  on ? tagColorClass(t.color) : "border-border text-muted-foreground"
                }`}
              >
                {on && <Check className="size-3" aria-hidden="true" />}#{t.name}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <div className="flex gap-1.5">
            {TAG_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                aria-label={`${c.label} tag colour`}
                aria-pressed={color === c.id}
                className={`size-7 rounded-full border-2 transition-transform ${c.cls} ${
                  color === c.id ? "scale-110 ring-2 ring-ring/50" : ""
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void create()}
              placeholder="Work, Study, Finance…"
              aria-label="New tag name"
              className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-card/60 px-3 text-sm outline-hidden focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
            <button
              onClick={() => void create()}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-linear-to-r from-primary to-accent px-3 text-sm font-medium text-primary-foreground"
            >
              <Plus className="size-4" aria-hidden="true" /> Add
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
