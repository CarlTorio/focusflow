import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, db } from "@/lib/supabase";

interface ThemeContextType {
  mode: "system" | "light" | "dark";
  setMode: (mode: "system" | "light" | "dark") => void;
  themeColor: string;
  setThemeColor: (color: string) => void;
  intensity: number;
  setIntensity: (v: number) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Color palette: 6 rows x 5 cols of HSL hues
export const THEME_COLORS = [
  // Purples
  { label: "Lavender", hsl: "262 100% 65%" },
  { label: "Amethyst", hsl: "270 70% 55%" },
  { label: "Violet", hsl: "280 65% 50%" },
  { label: "Plum", hsl: "290 50% 45%" },
  { label: "Grape", hsl: "275 80% 40%" },
  // Blues
  { label: "Sky", hsl: "210 100% 60%" },
  { label: "Azure", hsl: "220 85% 55%" },
  { label: "Cobalt", hsl: "225 75% 50%" },
  { label: "Royal", hsl: "230 70% 45%" },
  { label: "Navy", hsl: "235 65% 38%" },
  // Teals
  { label: "Aqua", hsl: "175 70% 45%" },
  { label: "Teal", hsl: "180 65% 40%" },
  { label: "Cyan", hsl: "185 75% 42%" },
  { label: "Lagoon", hsl: "190 60% 38%" },
  { label: "Deep Teal", hsl: "195 55% 32%" },
  // Greens
  { label: "Mint", hsl: "150 60% 50%" },
  { label: "Emerald", hsl: "155 70% 42%" },
  { label: "Forest", hsl: "160 65% 38%" },
  { label: "Sage", hsl: "145 40% 45%" },
  { label: "Pine", hsl: "165 55% 30%" },
  // Oranges
  { label: "Peach", hsl: "25 90% 58%" },
  { label: "Tangerine", hsl: "30 95% 52%" },
  { label: "Amber", hsl: "38 92% 50%" },
  { label: "Rust", hsl: "18 75% 45%" },
  { label: "Burnt", hsl: "12 70% 40%" },
  // Reds/Pinks
  { label: "Rose", hsl: "340 75% 55%" },
  { label: "Coral", hsl: "350 80% 52%" },
  { label: "Crimson", hsl: "0 80% 48%" },
  { label: "Ruby", hsl: "345 70% 42%" },
  { label: "Berry", hsl: "330 65% 40%" },
];

function parseHSL(hslStr: string): [number, number, number] {
  const parts = hslStr.split(" ").map(s => parseFloat(s));
  return [parts[0], parts[1], parts[2]];
}

function applyIntensity(hsl: string, intensity: number): string {
  const [h, s, l] = parseHSL(hsl);
  const factor = 0.3 + (intensity / 100) * 0.7; // 30-100% of original saturation
  return `${h} ${Math.round(s * factor)}% ${l}%`;
}

function generateVariants(hsl: string, intensity: number, isDark: boolean) {
  const base = applyIntensity(hsl, intensity);
  const [h, s, l] = parseHSL(base);

  if (isDark) {
    return {
      primary: `${h} ${s}% ${Math.min(l + 5, 70)}%`,
      primaryLight: `${h} ${Math.round(s * 0.3)}% 15%`,
      primaryMedium: `${h} ${Math.round(s * 0.5)}% 35%`,
      primaryDark: `${h} ${Math.round(s * 0.8)}% 72%`,
    };
  }
  return {
    primary: `${h} ${s}% ${l}%`,
    primaryLight: `${h} 100% 95%`,
    primaryMedium: `${h} ${Math.round(s * 0.6)}% 73%`,
    primaryDark: `${h} ${Math.round(s * 0.7)}% 45%`,
  };
}

function applyThemeToDOM(hsl: string, intensity: number, isDark: boolean) {
  const vars = generateVariants(hsl, intensity, isDark);
  const root = document.documentElement;
  root.style.setProperty("--primary", vars.primary);
  root.style.setProperty("--primary-light", vars.primaryLight);
  root.style.setProperty("--primary-medium", vars.primaryMedium);
  root.style.setProperty("--primary-dark", vars.primaryDark);
  root.style.setProperty("--ring", vars.primary);
  root.style.setProperty("--sidebar-primary", vars.primary);
  root.style.setProperty("--sidebar-accent", vars.primaryLight);
  root.style.setProperty("--sidebar-accent-foreground", vars.primaryDark);
  root.style.setProperty("--sidebar-ring", vars.primary);

  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [mode, setModeState] = useState<"system" | "light" | "dark">(
    ((profile as any)?.theme_mode as any) || "light"
  );
  const [themeColor, setThemeColorState] = useState(
    (profile as any)?.theme_color || "262 100% 65%"
  );
  const [intensity, setIntensityState] = useState(
    (profile as any)?.theme_intensity ?? 100
  );

  const systemDark = typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;

  const isDark = mode === "dark" || (mode === "system" && systemDark);

  // Apply theme on change
  useEffect(() => {
    applyThemeToDOM(themeColor, intensity, isDark);
  }, [themeColor, intensity, isDark]);

  // Listen for system preference changes
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyThemeToDOM(themeColor, intensity, mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, themeColor, intensity]);

  // Sync from profile
  useEffect(() => {
    if (profile) {
      const p = profile as any;
      if (p.theme_mode) setModeState(p.theme_mode);
      if (p.theme_color) setThemeColorState(p.theme_color);
      if (p.theme_intensity != null) setIntensityState(p.theme_intensity);
    }
  }, [profile]);

  const persist = useCallback(async (updates: Record<string, any>) => {
    if (!profile) return;
    await db.from("profiles").update(updates).eq("id", profile.id);
  }, [profile]);

  const setMode = (m: "system" | "light" | "dark") => {
    setModeState(m);
    persist({ theme_mode: m });
  };
  const setThemeColor = (c: string) => {
    setThemeColorState(c);
    persist({ theme_color: c });
  };
  const setIntensity = (v: number) => {
    setIntensityState(v);
    persist({ theme_intensity: v });
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode, themeColor, setThemeColor, intensity, setIntensity, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
