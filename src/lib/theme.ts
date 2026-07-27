export type Theme = "light" | "dark";

const THEME_KEY = "toolshare_theme";

export const getStoredTheme = (): Theme | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
};

export const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
};

/**
 * Inlined into <head> so the correct theme applies before first paint —
 * defaults to dark (this app's original look) rather than the OS preference.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark");}catch(e){}})();`;
