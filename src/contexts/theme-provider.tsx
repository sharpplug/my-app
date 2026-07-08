
"use client";

import {
  createContext,
  useContext,
  useCallback,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { useToast } from "@/hooks/use-toast";

type Theme = {
  themeName: string;
  colorPalette: string[]; // HSL strings
};

type ThemeContextType = {
  applyTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Function to parse HSL string e.g. "hsl(204, 25%, 91%)" to "204 25% 91%"
function parseHsl(hsl: string): string | null {
  const regex = /hsl\(\s*(\d+(\.\d+)?)\s*,\s*(\d+(\.\d+)?)%\s*,\s*(\d+(\.\d+)?)%\s*\)/;
  const match = hsl.match(regex);
  if (match) {
    return `${match[1]} ${match[3]}% ${match[5]}%`;
  }
  return null;
}

// Function to calculate a contrasting foreground color
function getContrastingColor(l: number): string {
  return l > 50 ? "204 14% 16%" : "204 25% 91%";
}

export function DynamicThemeProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const applyTheme = useCallback(
    (theme: Theme) => {
      if (theme.colorPalette.length >= 3) {
        const root = document.documentElement;

        const backgroundHsl = theme.colorPalette[0];
        const primaryHsl = theme.colorPalette[1];
        const accentHsl = theme.colorPalette[2];

        const background = parseHsl(backgroundHsl);
        const primary = parseHsl(primaryHsl);
        const accent = parseHsl(accentHsl);

        const backgroundL = parseFloat(backgroundHsl.match(/, (\d+(\.\d+)?)%\)/)?.[1] || "0");
        const primaryL = parseFloat(primaryHsl.match(/, (\d+(\.\d+)?)%\)/)?.[1] || "0");
        const accentL = parseFloat(accentHsl.match(/, (\d+(\.\d+)?)%\)/)?.[1] || "0");

        if (background) {
            root.style.setProperty("--background", background);
            root.style.setProperty("--foreground", getContrastingColor(backgroundL));
            root.style.setProperty("--card", background);
            root.style.setProperty("--card-foreground", getContrastingColor(backgroundL));
            root.style.setProperty("--popover", background);
            root.style.setProperty("--popover-foreground", getContrastingColor(backgroundL));
        }
        if (primary) {
          root.style.setProperty("--primary", primary);
          root.style.setProperty("--primary-foreground", getContrastingColor(primaryL));
          root.style.setProperty("--ring", primary);
        }
        if (accent) {
          root.style.setProperty("--accent", accent);
           root.style.setProperty("--accent-foreground", getContrastingColor(accentL));
        }

        toast({
          title: "Theme Updated!",
          description: `Switched to "${theme.themeName}" theme.`,
        });
      }
    },
    [toast]
  );

  return (
    <ThemeContext.Provider value={{ applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useDynamicTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useDynamicTheme must be used within a DynamicThemeProvider");
  }
  return context;
}
