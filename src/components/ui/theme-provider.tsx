import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem("theme") as Theme) || "light";
    }
    return "light";
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("highContrast") === "true";
    }
    return false;
  });

  // Sync with Supabase user metadata
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.user_metadata?.theme) {
        const userTheme = session.user.user_metadata.theme as Theme;
        // Only update if different to avoid potential loops/flickers, 
        // though typically local storage should match if it was set by this user previously.
        // We prioritize the server-stored preference on login.
        if (['light', 'dark', 'system'].includes(userTheme)) {
          setThemeState(userTheme);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);

    // Update Supabase user metadata if logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.auth.updateUser({
          data: { theme: t }
        });
      }
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem("theme", theme);
    localStorage.setItem("highContrast", highContrast.toString());

    const isDark = theme === "dark" || (theme === "system" && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Set data-theme attribute for custom CSS variables
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Set high contrast class
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    // Set dark class for Tailwind dark mode
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, highContrast]);

  const value = useMemo(() => ({ theme, setTheme, highContrast, setHighContrast }), [theme, highContrast]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};


