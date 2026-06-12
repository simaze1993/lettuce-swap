import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";

type ThemeCtx = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
};

const Ctx = createContext<ThemeCtx>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

const LS_KEY = "sw-app:theme";

function readStored(): Theme {
  if (typeof window === "undefined") return "system";
  const v = localStorage.getItem(LS_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

function systemPref(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initial values MUST match SSR output to avoid hydration mismatch.
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolved] = useState<"light" | "dark">("light");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    setThemeState(readStored());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const apply = () => {
      const r = theme === "system" ? systemPref() : theme;
      setResolved(r);
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", r === "dark");
      }
    };
    apply();
    if (theme === "system" && typeof window !== "undefined") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
  }, [theme, hydrated]);

  const setTheme = (t: Theme) => {
    if (typeof window !== "undefined") localStorage.setItem(LS_KEY, t);
    setThemeState(t);
  };

  return <Ctx.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
