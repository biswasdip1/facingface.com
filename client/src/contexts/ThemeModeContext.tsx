import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "white" | "lightblue" | "beige" | "lightdark";

const ALL_THEMES: ThemeMode[] = ["white", "lightblue", "beige", "lightdark"];

interface ThemeModeContextValue {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  themeMode: "white",
  setThemeMode: () => {},
});

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem("facingface-theme") as ThemeMode | null;
    return stored && ALL_THEMES.includes(stored) ? stored : "white";
  });

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem("facingface-theme", mode);
  };

  useEffect(() => {
    const root = document.documentElement;
    ALL_THEMES.forEach((t) => root.classList.remove(`theme-${t}`));
    // Also remove old themes that may be stored in localStorage
    ["black", "brown"].forEach((t) => root.classList.remove(`theme-${t}`));
    root.classList.add(`theme-${themeMode}`);
  }, [themeMode]);

  return (
    <ThemeModeContext.Provider value={{ themeMode, setThemeMode }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
