import { Moon, Sun } from "lucide-react";
import { useEffect, useLayoutEffect, useState } from "react";

type Theme = "light" | "dark";

const storageKey = "ai-helpdesk-theme";
const themeChangeEvent = "ai-helpdesk-theme-change";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(storageKey);

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getPreferredTheme());

  useLayoutEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(storageKey, theme);
  }, [theme]);

  useEffect(() => {
    function handleThemeChange(event: Event) {
      const nextTheme = (event as CustomEvent<Theme>).detail;

      if (nextTheme === "light" || nextTheme === "dark") {
        setTheme(nextTheme);
      }
    }

    window.addEventListener(themeChangeEvent, handleThemeChange);

    return () => window.removeEventListener(themeChangeEvent, handleThemeChange);
  }, []);

  return {
    theme,
    toggleTheme: () =>
      setTheme((currentTheme) => {
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        window.dispatchEvent(new CustomEvent(themeChangeEvent, { detail: nextTheme }));
        return nextTheme;
      })
  };
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={[
        "theme-toggle inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors",
        "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        className
      ].join(" ")}
      onClick={toggleTheme}
      type="button"
    >
      {isDark ? (
        <Sun aria-hidden="true" className="h-4 w-4" />
      ) : (
        <Moon aria-hidden="true" className="h-4 w-4" />
      )}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
