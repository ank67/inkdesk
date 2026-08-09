import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeName = "slate" | "sepia" | "oled";
export type Mode = "dark" | "light";

export const THEMES: { id: ThemeName; label: string; hint: string }[] = [
  { id: "slate", label: "Modern Slate", hint: "Slate & cyan" },
  { id: "sepia", label: "Sepia Warmth", hint: "Warm paper" },
  { id: "oled", label: "Midnight OLED", hint: "True black" },
];

type Ctx = {
  theme: ThemeName;
  mode: Mode;
  setTheme: (t: ThemeName) => void;
  setMode: (m: Mode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<Ctx | null>(null);

const KEY = "ebook-theme";

function apply(theme: ThemeName, mode: Mode) {
  const root = document.documentElement;
  root.classList.remove("t-slate", "t-sepia", "t-oled", "dark", "light");
  root.classList.add(`t-${theme}`, mode);
  root.style.colorScheme = mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("slate");
  const [mode, setModeState] = useState<Mode>("dark");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { theme?: ThemeName; mode?: Mode };
        if (saved.theme) setThemeState(saved.theme);
        if (saved.mode) setModeState(saved.mode);
        apply(saved.theme ?? "slate", saved.mode ?? "dark");
        return;
      }
    } catch {
      /* ignore */
    }
    apply("slate", "dark");
  }, []);

  const persist = (t: ThemeName, m: Mode) => {
    apply(t, m);
    try {
      localStorage.setItem(KEY, JSON.stringify({ theme: t, mode: m }));
    } catch {
      /* ignore */
    }
  };

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    persist(t, mode);
  };
  const setMode = (m: Mode) => {
    setModeState(m);
    persist(theme, m);
  };

  return (
    <ThemeContext.Provider
      value={{ theme, mode, setTheme, setMode, toggleMode: () => setMode(mode === "dark" ? "light" : "dark") }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
