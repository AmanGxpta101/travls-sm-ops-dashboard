"use client";

import { useSyncExternalStore } from "react";

/**
 * Light/dark switch. Until it's used the page follows the system appearance;
 * a click pins the other appearance in the `theme` cookie (read by the root
 * layout, so the server renders it with no flash) and applies it at once.
 */
const THEME_COOKIE = "theme";
const LIGHT_QUERY = "(prefers-color-scheme: light)";
const CHANGE_EVENT = "themechange";

type Theme = "light" | "dark";

function currentTheme(): Theme {
  const pinned = document.documentElement.dataset.theme;
  if (pinned === "light" || pinned === "dark") return pinned;
  return window.matchMedia(LIGHT_QUERY).matches ? "light" : "dark";
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(LIGHT_QUERY);
  media.addEventListener("change", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  // Null on the server: the system appearance is only known in the browser.
  const theme = useSyncExternalStore(subscribe, currentTheme, () => null);
  const next: Theme = theme === "light" ? "dark" : "light";

  function toggle() {
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={`grid size-9 shrink-0 place-items-center rounded-full border border-hairline-lit bg-canvas-warm text-ink-muted transition-colors hover:border-brand hover:text-ink ${className}`}
    >
      {theme === "light" ? <MoonIcon /> : theme === "dark" ? <SunIcon /> : <span className="size-4" />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="8" cy="8" r="3" />
      <path
        d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M13.5 9.6A5.5 5.5 0 0 1 6.4 2.5a5.5 5.5 0 1 0 7.1 7.1Z" strokeLinejoin="round" />
    </svg>
  );
}
