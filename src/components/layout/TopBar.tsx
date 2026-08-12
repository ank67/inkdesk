import { BookOpen } from "lucide-react";
import { AppMenu } from "@/components/layout/AppMenu";
import { AuthButton } from "@/components/layout/AuthButton";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2">
        <AppMenu />

        <div className="flex min-w-0 items-center justify-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-linear-to-br from-primary to-accent">
            <BookOpen className="size-4 text-primary-foreground" aria-hidden="true" />
          </span>
          <h1 className="truncate text-base font-semibold tracking-tight">E-Book</h1>
        </div>

        <div className="flex items-center justify-end gap-0.5">
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
