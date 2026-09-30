import { PageShell } from "./shell";

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-card border border-hairline bg-surface/60 ${className}`} />;
}

/**
 * Shown the instant a route is requested, while the server waits on the
 * Social Mining Service — so navigating (or signing in) responds right away
 * instead of sitting on the old page until every fetch is back.
 */
export default function Loading() {
  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4" aria-hidden>
        <Block className="h-9 w-64 rounded-pill" />
        <Block className="h-9 w-48 rounded-pill" />
      </div>
      <Block className="h-56 rounded-panel" />
      <Block className="h-72 rounded-panel" />
      <p className="sr-only" role="status">
        Loading…
      </p>
    </PageShell>
  );
}
