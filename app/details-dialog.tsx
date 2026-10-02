"use client";

import { useId, useRef } from "react";

/**
 * A "Show details" button that opens its content in a modal over a dimmed
 * page. Native <dialog>: Esc closes it and focus stays inside while it's
 * open. Clicking the dimmed area closes it too. The content is rendered on
 * the server and passed in, so forms inside it are ordinary server actions.
 */
export function DetailsDialog({
  heading,
  label = "Show details",
  children,
}: {
  heading: React.ReactNode;
  label?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="text-xs font-medium text-brand-ink hover:text-brand-ink-hover"
      >
        {label}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={headingId}
        // The dialog box fills the element, so a click landing on the element
        // itself (not its content) is a click on the dimmed backdrop.
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="panel m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden p-0 text-ink backdrop:bg-black/70 backdrop:backdrop-blur-sm open:flex open:flex-col"
      >
        <header className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
          <div id={headingId} className="min-w-0">
            {heading}
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="grid size-8 shrink-0 place-items-center rounded-full text-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </dialog>
    </>
  );
}
