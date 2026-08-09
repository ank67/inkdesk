import { useState } from "react";
import { Check, Moon, Palette, Sun, User } from "lucide-react";
import { THEMES, useTheme, type ThemeName } from "@/lib/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SWATCH: Record<ThemeName, string> = {
  slate: "bg-linear-to-br from-slate-600 to-cyan-400",
  sepia: "bg-linear-to-br from-amber-200 to-amber-700",
  oled: "bg-linear-to-br from-black to-indigo-500",
};

export function ThemeControls() {
  const { theme, mode, setTheme, toggleMode } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          aria-label="Change theme"
          className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Palette className="size-4.5" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          {THEMES.map((t) => (
            <DropdownMenuItem key={t.id} onClick={() => setTheme(t.id)}>
              <span className={`size-4 rounded-full ${SWATCH[t.id]}`} aria-hidden="true" />
              <span className="flex-1">
                {t.label}
                <span className="block text-xs text-muted-foreground">{t.hint}</span>
              </span>
              {theme === t.id && <Check className="size-4" aria-hidden="true" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleMode}>
            {mode === "dark" ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
            Switch to {mode === "dark" ? "light" : "dark"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        onClick={toggleMode}
        aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
        className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        {mode === "dark" ? <Sun className="size-4.5" aria-hidden="true" /> : <Moon className="size-4.5" aria-hidden="true" />}
      </button>

      <button
        aria-label="Profile"
        className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <span className="grid size-8 place-items-center rounded-full bg-secondary">
          <User className="size-4" aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}
