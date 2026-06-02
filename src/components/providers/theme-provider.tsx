"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "shakh-theme";

/**
 * Persiste la scelta tema in localStorage + cookie (così il server può leggerlo).
 * Lo stato iniziale è già applicato su <html> dallo script anti-FOUC nel layout,
 * quindi qui leggiamo la classe corrente per restare in sincrono.
 */
function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light")
    ? "light"
    : "dark";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  localStorage.setItem(STORAGE_KEY, theme);
  // Cookie 1 anno — leggibile lato server in futuro.
  document.cookie = `${STORAGE_KEY}=${theme};path=/;max-age=31536000;samesite=lax`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    setThemeState(readInitialTheme());
  }, []);

  const setTheme = useCallback((t: Theme) => {
    applyTheme(t);
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(readInitialTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve essere usato dentro <ThemeProvider>");
  return ctx;
}

/**
 * Script inline anti-FOUC. Va inserito in <head> PRIMA del render.
 * Applica scuro di default, rispetta scelta salvata, poi prefers-color-scheme.
 */
export const themeInitScript = `(function(){try{var k='${STORAGE_KEY}';var s=localStorage.getItem(k);var t=s||(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.classList.remove('dark','light');document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('dark');}})();`;
