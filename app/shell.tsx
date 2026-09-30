import Image from "next/image";
import Link from "next/link";
import { logoutAction, refreshAllAction } from "./actions";

/** Page frame shared by every signed-in ops page. */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-5 sm:px-6 sm:pt-6">
      {children}
    </div>
  );
}

/** Header shared by every ops page: brand, nav, who's signed in, refresh-all, log out. */
export function OpsHeader({
  active,
  actor,
  returnTo,
  title,
  subtitle,
}: {
  active: "activity" | "users";
  actor: string;
  /** Path actions on this page redirect back to. */
  returnTo: string;
  title?: string;
  subtitle?: React.ReactNode;
}) {
  const tab = (key: typeof active, href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-pill px-4 py-1.5 text-sm font-medium transition-colors ${
        active === key ? "bg-brand text-canvas" : "text-ink-muted hover:text-ink"
      }`}
      aria-current={active === key ? "page" : undefined}
    >
      {label}
    </Link>
  );

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex items-center gap-3 sm:gap-5">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Travls ops — activity">
            <Image
              src="/assets/brand/travls-logo.webp"
              alt="Travls"
              width={290}
              height={60}
              priority
              className="h-5 w-auto shrink-0 sm:h-6"
            />
            <span className="rounded-pill border border-hairline-lit px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Ops
            </span>
          </Link>
          <nav
            className="flex gap-1 rounded-pill border border-hairline bg-canvas-warm p-1"
            aria-label="Sections"
          >
            {tab("activity", "/", "Activity")}
            {tab("users", "/users", "Users")}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="flex items-center gap-2 rounded-pill border border-hairline-lit bg-canvas-warm py-1 pl-1 pr-3.5 text-sm"
            title="Moderation actions are recorded under this name"
          >
            <span
              className="grid size-7 place-items-center rounded-full bg-brand text-[11px] font-bold uppercase text-canvas"
              aria-hidden
            >
              {initials(actor) || "?"}
            </span>
            {actor ? (
              <span className="font-medium text-ink">{actor}</span>
            ) : (
              <span className="text-ink-muted">No account — sign in again</span>
            )}
          </span>
          <form action={refreshAllAction}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <button
              type="submit"
              className="btn-ghost bg-canvas-warm px-3 py-2 sm:px-3.5"
              title="Re-check every live post on X now (~$0.005 each)"
              aria-label="Refresh all"
            >
              <RefreshIcon />
              <span className="hidden sm:inline">Refresh all</span>
            </button>
          </form>
          <form action={logoutAction}>
            <button type="submit" className="btn-ghost bg-canvas-warm px-3 py-2 text-ink-muted hover:text-ink sm:px-3.5">
              Log out
            </button>
          </form>
        </div>
      </header>

      {title && (
        <div className="-mb-2">
          <h1 className="text-section text-ink">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink-muted sm:text-base">{subtitle}</p>}
        </div>
      )}
    </>
  );
}

export function Banners({ error, notice }: { error?: string; notice?: string }) {
  return (
    <>
      {error && <ErrorBanner>{decodeURIComponent(error)}</ErrorBanner>}
      {notice && (
        <p className="flex items-start gap-2.5 rounded-card border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" aria-hidden />
          {decodeURIComponent(notice)}
        </p>
      )}
    </>
  );
}

export function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 rounded-card border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-ink">
      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Heading for a block of the page, with an optional count and note. */
export function SectionHeading({
  title,
  count,
  aside,
  children,
}: {
  title: string;
  count?: number | string;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">
          {title}
          {count !== undefined && <span className="ml-2 text-base font-medium text-ink-muted">{count}</span>}
        </h2>
        {aside && <p className="mt-1 text-sm text-ink-muted">{aside}</p>}
      </div>
      {children}
    </div>
  );
}

export function PointsChip({ points, signed = false }: { points: number; signed?: boolean }) {
  return (
    <span className="badge tone-brand font-semibold tabular-nums">
      {signed ? "+" : ""}
      {fmtNum(points)} pts
    </span>
  );
}

/*
 * Challenge thumbnails — the same picture the user sees for a challenge in
 * the app (test-connection/app/task-board.tsx picks it the same way), so ops
 * and users recognise the same card.
 */
const THUMBS: [RegExp, string][] = [
  [/card|wallet|spend/i, "card-watch-wallet"],
  [/setup|essential|pack|gear|bag/i, "card-airport"],
  [/dream|destination|bucket|list|place/i, "travel-experiences"],
  [/why|story|mean/i, "travel-flights"],
  [/lounge|airport/i, "card-lounge-access"],
  [/hotel|stay/i, "travel-hotels"],
  [/coffee|pay/i, "card-coffeeshop"],
  [/beach|pool|summer|holiday/i, "card-poolside"],
];
const FALLBACK_THUMBS = ["card-poolside", "card-lounge-access", "travel-hotels", "card-coffeeshop"];

function thumbFor(challenge: { id: string; title: string }) {
  const match = THUMBS.find(([re]) => re.test(challenge.title));
  const name =
    match?.[1] ??
    FALLBACK_THUMBS[[...challenge.id].reduce((h, c) => h + c.charCodeAt(0), 0) % FALLBACK_THUMBS.length];
  return `/assets/photography/tasks/${name}.webp`;
}

export function Thumb({ challenge, className }: { challenge: { id: string; title: string }; className?: string }) {
  return (
    <Image
      src={thumbFor(challenge)}
      alt=""
      width={480}
      height={320}
      sizes="128px"
      className={`aspect-[3/2] shrink-0 rounded-[10px] border border-hairline object-cover ${className ?? ""}`}
    />
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

export function fmtNum(n: number) {
  return n.toLocaleString("en-IN");
}
