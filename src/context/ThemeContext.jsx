import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components -- hook needs to live alongside its provider
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored) {
        return stored === "dark";
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }

    // Sync mobile browser UI theme color:
    // Light theme: Blue (#1D4ED8)
    // Dark theme: Dark Navy (#070D1F)
    if (typeof window !== "undefined") {
      const isMobile =
        window.innerWidth < 768 ||
        /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent);
      const metas = document.querySelectorAll('meta[name="theme-color"]');
      const activeColor = isMobile ? (isDark ? "#070D1F" : "#1D4ED8") : (isDark ? "#070D1F" : "#F5F8FF");
      metas.forEach((m) => m.setAttribute("content", activeColor));
    }
  }, [isDark]);

  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.add("disable-theme-transitions");
    setIsDark(prev => !prev);
    setTimeout(() => {
      root.classList.remove("disable-theme-transitions");
    }, 50);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
