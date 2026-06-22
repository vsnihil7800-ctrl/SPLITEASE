import { createContext, useEffect, useState } from "react";

// eslint-disable-next-line react-refresh/only-export-components -- standard context+provider pattern
export const ThemeContext = createContext(null);

const THEME_KEY = "splitease_theme";

// Applies/removes the `dark` class on <html> and keeps the mobile browser
// chrome color (address bar / task switcher) in sync with the theme. The
// values here match index.css's html.dark token overrides exactly.
function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? "#1a1611" : "#f7f5ef");
  }
}

export function ThemeProvider({ children }) {
  // The blocking inline script in index.html already applied the right
  // class to <html> before first paint (to avoid a flash of the wrong
  // theme), so on mount we just read that back rather than re-deciding —
  // re-deciding here could disagree with what the script already chose.
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const value = { theme, toggleTheme };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
