"use client";

import { useEffect, useState } from "react";
import type { Flash } from "@/lib/flash";

// Must match FLASH_COOKIE in lib/flash.ts (server-only, so not imported here).
const FLASH_COOKIE = "ops_flash";

/**
 * Shows the latest one-shot error or notice with a × to dismiss it. Keeps
 * showing it after the server stops sending it: Next re-renders the page
 * once more after a server action, by which point the cookie is cleared.
 */
export function FlashBanner({ flash }: { flash: Flash | null }) {
  const [shown, setShown] = useState(flash);
  const [dismissed, setDismissed] = useState<string | null>(null);
  // A new message replaces the one on screen (state adjusted during render).
  if (flash && flash.id !== shown?.id) setShown(flash);

  useEffect(() => {
    // Shown once; don't show it again on reload.
    if (flash) document.cookie = `${FLASH_COOKIE}=; Max-Age=0; path=/`;
  }, [flash]);

  if (!shown || shown.id === dismissed) return null;
  const error = shown.kind === "error";
  return (
    <div
      role={error ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-card border py-3 pl-4 pr-2 text-sm ${
        error ? "border-destructive/40 bg-destructive/10 text-destructive-ink" : "border-success/30 bg-success/10 text-success"
      }`}
    >
      <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${error ? "bg-destructive" : "bg-success"}`} aria-hidden />
      <span className="min-w-0 flex-1">{shown.message}</span>
      <button
        type="button"
        onClick={() => setDismissed(shown.id)}
        className="-my-1 grid size-7 shrink-0 place-items-center rounded-full text-base opacity-70 transition-opacity hover:opacity-100"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
