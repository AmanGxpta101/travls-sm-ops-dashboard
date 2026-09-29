import Link from "next/link";
import { logoutAction, refreshAllAction, setActorAction } from "./actions";

/** Header shared by every ops page: nav, refresh-all, who's acting, log out. */
export function OpsHeader({
  active,
  actor,
  returnTo,
  subtitle,
}: {
  active: "activity" | "users";
  actor: string;
  /** Path actions on this page redirect back to. */
  returnTo: string;
  subtitle?: React.ReactNode;
}) {
  const tab = (key: typeof active, href: string, label: string) => (
    <Link
      href={href}
      className={`rounded px-2.5 py-1 text-sm ${
        active === key ? "bg-zinc-900 font-medium text-white" : "text-zinc-600 hover:bg-zinc-100"
      }`}
      aria-current={active === key ? "page" : undefined}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Social Mining — Ops</h1>
        <nav className="mt-2 flex gap-1" aria-label="Sections">
          {tab("activity", "/", "Activity")}
          {tab("users", "/users", "Users")}
        </nav>
        {subtitle && <p className="mt-2 text-sm text-zinc-600">{subtitle}</p>}
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-3">
          <form action={refreshAllAction}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <button
              type="submit"
              className="rounded border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
              title="Re-check every live post on X now (~$0.005 each)"
            >
              Refresh all
            </button>
          </form>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-zinc-500 underline">
              Log out
            </button>
          </form>
        </div>
        <form action={setActorAction} className="flex items-center gap-1.5 text-xs text-zinc-500">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label htmlFor="actor">Acting as</label>
          <input
            id="actor"
            name="actor"
            defaultValue={actor}
            placeholder="your name"
            className={`w-28 rounded border px-2 py-1 text-xs text-zinc-900 ${actor ? "border-zinc-300" : "border-amber-400"}`}
          />
          <button type="submit" className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50">
            Save
          </button>
        </form>
      </div>
    </div>
  );
}

export function Banners({ error, notice }: { error?: string; notice?: string }) {
  return (
    <>
      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{decodeURIComponent(error)}</p>
      )}
      {notice && (
        <p className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          {decodeURIComponent(notice)}
        </p>
      )}
    </>
  );
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function fmtNum(n: number) {
  return n.toLocaleString("en-IN");
}
