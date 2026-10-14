"use client";

import { useSyncExternalStore } from "react";
import { dict, type Locale } from "../i18n";
import { THEME_KEY } from "./head-scripts";

type Theme = "light" | "dark" | "auto";
const KEY = THEME_KEY;

const EVENT = "themechange";

/** Applies a theme to <html>. "auto" removes the override so the OS setting wins. */
function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "auto") delete root.dataset.theme;
  else root.dataset.theme = theme;
  window.dispatchEvent(new Event(EVENT));
}

// <html data-theme> is the source of truth (set before paint by themeScript), so read it directly.
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};
const current = (): Theme => {
  const v = document.documentElement.dataset.theme;
  return v === "light" || v === "dark" ? v : "auto";
};

/** Light / Dark / Auto switch. The choice is remembered on this device. */
export default function ThemeToggle({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const theme = useSyncExternalStore(subscribe, current, () => "auto" as Theme);

  function choose(next: Theme) {
    apply(next);
    try {
      if (next === "auto") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* storage blocked: the choice lasts for this page only */
    }
  }

  const options: { id: Theme; label: string; icon: React.ReactNode }[] = [
    { id: "light", label: t.themeLight, icon: <SunIcon /> },
    { id: "dark", label: t.themeDark, icon: <MoonIcon /> },
    { id: "auto", label: t.themeAuto, icon: <AutoIcon /> },
  ];

  return (
    <div className="seg" role="group" aria-label={t.theme}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={theme === o.id} onClick={() => choose(o.id)} title={o.label} aria-label={o.label}>
          {o.icon}
        </button>
      ))}
    </div>
  );
}

const icon = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, "aria-hidden": true };
function SunIcon() {
  return (
    <svg {...icon}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg {...icon}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
    </svg>
  );
}
function AutoIcon() {
  return (
    <svg {...icon}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" stroke="none" />
    </svg>
  );
}
