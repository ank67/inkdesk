import { useState } from "react";
import { Menu, Settings } from "lucide-react";
import { StorageMeter } from "@/components/library/StorageMeter";
import { UploadZone } from "@/components/library/UploadZone";
import { THEMES, useTheme } from "@/lib/theme";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

export function AppMenu() {
  const [open, setOpen] = useState(false);
  const { theme, mode, setTheme, setMode } = useTheme();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[19rem] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Device & settings</SheetTitle>
          <SheetDescription>Local storage usage and app preferences.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-8">
          <StorageMeter />
          <UploadZone compact />

          <section className="rounded-xl border border-border bg-card/60 p-4">
            <header className="flex items-center gap-2 text-sm font-medium">
              <Settings className="size-4 text-accent" aria-hidden="true" /> Settings
            </header>

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Dark mode</span>
              <Switch
                checked={mode === "dark"}
                onCheckedChange={(v) => setMode(v ? "dark" : "light")}
                aria-label="Toggle dark mode"
              />
            </div>

            <fieldset className="mt-4">
              <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Theme</legend>
              <div className="mt-2 flex flex-col gap-1">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    aria-pressed={theme === t.id}
                    className={`min-h-9 rounded-lg px-3 text-left text-sm transition-colors ${
                      theme === t.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
