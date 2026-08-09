import { X } from "lucide-react";
import type { TocItem } from "@/lib/db";

export function TocDrawer({
  items,
  open,
  loading,
  activePage,
  onSelect,
  onClose,
}: {
  items: TocItem[];
  open: boolean;
  loading: boolean;
  activePage?: number;
  onSelect: (item: TocItem) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contents</p>
        <button
          onClick={onClose}
          aria-label="Close table of contents"
          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {loading ? (
        <p className="mt-3 text-xs text-muted-foreground">Reading document structure…</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">No headings detected</p>
      ) : (
        <ul className="mt-3 space-y-0.5 text-sm">
          {items.map((item, i) => {
            const active = item.page !== undefined && item.page === activePage;
            return (
              <li key={`${item.label}-${i}`}>
                <button
                  onClick={() => onSelect(item)}
                  className={`flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
                  style={{ paddingLeft: `${0.5 + item.level * 0.75}rem` }}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.page !== undefined && (
                    <span className="shrink-0 text-xs tabular-nums opacity-70">{item.page}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-border bg-sidebar p-4 md:block">
        {body}
      </aside>
      <div className="fixed inset-0 z-30 md:hidden">
        <button aria-label="Close" className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
        <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] overflow-y-auto border-r border-border bg-sidebar p-4">
          {body}
        </aside>
      </div>
    </>
  );
}
