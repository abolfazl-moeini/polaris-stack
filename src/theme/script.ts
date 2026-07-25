import type { PolarisTheme, ResolvedPolarisTheme } from "./types";

const DEFAULT_STORAGE_KEY = "polaris-theme";
export const POLARIS_THEME_CHANGE = "polaris-themechange";

const STORED_THEMES: ReadonlySet<string> = new Set([
  "light",
  "dark",
  "system",
  "hc",
  "brand",
]);

export function getStoredPolarisTheme(
  storageKey = DEFAULT_STORAGE_KEY,
): PolarisTheme | null {
  try {
    const value = localStorage.getItem(storageKey);
    if (value != null && STORED_THEMES.has(value)) {
      return value as PolarisTheme;
    }
    return null;
  } catch {
    return null;
  }
}

export function resolvePolarisTheme(theme: PolarisTheme): ResolvedPolarisTheme {
  if (theme === "system") {
    if (typeof matchMedia !== "undefined") {
      return matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  }
  return theme;
}

function dispatchThemeChange(resolved: ResolvedPolarisTheme): void {
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent(POLARIS_THEME_CHANGE, { detail: { theme: resolved } }),
  );
}

export function setPolarisTheme(
  theme: PolarisTheme,
  storageKey = DEFAULT_STORAGE_KEY,
): void {
  if (typeof document === "undefined") return;
  const resolved = resolvePolarisTheme(theme);
  document.documentElement.dataset.theme = resolved;
  dispatchThemeChange(resolved);
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // Storage may be unavailable in private mode.
  }
}

export function subscribePolarisTheme(
  onChange: (resolved: ResolvedPolarisTheme) => void,
  options?: { storageKey?: string },
): () => void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {};
  }

  const storageKey = options?.storageKey ?? DEFAULT_STORAGE_KEY;

  const notify = () => {
    const stored = getStoredPolarisTheme(storageKey) ?? "system";
    onChange(resolvePolarisTheme(stored));
  };

  const onThemeChange = (event: Event) => {
    const detail = (event as CustomEvent<{ theme: ResolvedPolarisTheme }>)
      .detail;
    if (detail?.theme) {
      onChange(detail.theme);
      return;
    }
    notify();
  };

  const media =
    typeof matchMedia !== "undefined"
      ? matchMedia("(prefers-color-scheme: dark)")
      : null;

  document.addEventListener(POLARIS_THEME_CHANGE, onThemeChange);
  media?.addEventListener("change", notify);

  notify();

  return () => {
    document.removeEventListener(POLARIS_THEME_CHANGE, onThemeChange);
    media?.removeEventListener("change", notify);
  };
}

export function createPolarisThemeInitScript(options?: {
  storageKey?: string;
  defaultTheme?: PolarisTheme;
}): string {
  const storageKey = options?.storageKey ?? DEFAULT_STORAGE_KEY;
  const defaultTheme = options?.defaultTheme ?? "system";
  return `(function(){try{
var k=${JSON.stringify(storageKey)};
var d=${JSON.stringify(defaultTheme)};
var t=localStorage.getItem(k);
var m=matchMedia("(prefers-color-scheme: dark)").matches;
var s=function(v){return v==="system"?(m?"dark":"light"):v;};
var r=t?s(t):(d==="system"?(m?"dark":"light"):d);
document.documentElement.dataset.theme=r;
}catch(e){}})();`;
}
