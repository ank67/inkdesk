import { useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { askDocument } from "@/lib/ai.functions";

type Msg = { role: "user" | "assistant"; content: string };

export function DocChat({
  title,
  context,
  open,
  onClose,
}: {
  title: string;
  context: string;
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = async () => {
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    const history = messages.slice(-8);
    setMessages((m) => [...m, { role: "user", content: question }]);
    setBusy(true);
    try {
      const { answer } = await askDocument({ data: { title, context, history, question } });
      setMessages((m) => [...m, { role: "assistant", content: answer || "I couldn't find that in this document." }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The assistant is unavailable right now.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 flex max-h-[70vh] animate-slide-in-right flex-col rounded-t-2xl border border-border bg-card/95 backdrop-blur-xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[22rem] md:rounded-none md:rounded-l-2xl">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Sparkles className="size-4 shrink-0 text-accent" aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">Ask about this document</p>
        <button
          onClick={onClose}
          aria-label="Close document chat"
          className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-4 text-center">
            <MessageSquare className="mx-auto size-5 text-accent" aria-hidden="true" />
            <p className="mt-2 text-xs text-muted-foreground">
              Ask anything — “what are the key points?”, “summarise section 3”.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <p
            key={i}
            className={`max-w-[92%] animate-fade-in whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-6 ${
              m.role === "user"
                ? "ml-auto bg-linear-to-r from-primary to-accent text-primary-foreground"
                : "bg-secondary text-foreground"
            }`}
          >
            {m.content}
          </p>
        ))}
        {busy && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Thinking…
          </p>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-border p-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send()}
          placeholder="Ask a question…"
          aria-label="Question about this document"
          className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-hidden focus:border-primary focus:ring-2 focus:ring-ring/40"
        />
        <button
          onClick={() => void send()}
          disabled={busy || !input.trim()}
          aria-label="Send question"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-linear-to-r from-primary to-accent text-primary-foreground disabled:opacity-50"
        >
          <Send className="size-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
