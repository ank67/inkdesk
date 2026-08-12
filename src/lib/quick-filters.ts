import { useSyncExternalStore } from "react";

export type QuickFilterId = "recent" | "starred" | "large";

let active: QuickFilterId[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function toggleQuickFilter(id: QuickFilterId) {
  active = active.includes(id) ? active.filter((x) => x !== id) : [...active, id];
  emit();
}

export function clearQuickFilters() {
  active = [];
  emit();
}

/** Shared so the library grid and the side menu stay in sync. */
export function useQuickFilters() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => active,
    () => active,
  );
}
