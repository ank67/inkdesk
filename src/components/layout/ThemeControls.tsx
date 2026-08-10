import { Check, Moon, Palette, Sun } from "lucide-react";
import { THEMES, useTheme, type ThemeName } from "@/lib/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

const SWATCH: Record<ThemeName, string> = {
  slate: "bg-linear-to-br from-slate-600 to-cyan-400",
  sepia: "bg-linear-to-br from-amber-200 to-amber-700",
  oled: "bg-linear-to-br from-black to-indigo-500",
};

export function ThemeControls() {
  const { theme, mode, setTheme, setMode } = useTheme();

  return (
    <div className="flex shrink-0 items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Change theme"
          className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Palette className="size-4.5" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Visual theme</DropdownMenuLabel>
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
        </DropdownMenuContent>
      </DropdownMenu>

      <label className="flex min-h-11 items-center gap-1.5 rounded-lg px-1.5 text-muted-foreground">
        <span className="sr-only">Dark mode</span>
        {mode === "dark" ? (
          <Moon className="size-4" aria-hidden="true" />
        ) : (
          <Sun className="size-4" aria-hidden="true" />
        )}
        <Switch
          checked={mode === "dark"}
          onCheckedChange={(v) => setMode(v ? "dark" : "light")}
          aria-label="Toggle dark mode"
        />
      </label>
    </div>
  );
}
