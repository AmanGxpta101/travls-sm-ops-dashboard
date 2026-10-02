import Link from "next/link";
import { getActor } from "@/lib/actor";
import { listUsers, type UserRow } from "@/lib/ops-api";
import { Banners, ErrorBanner, OpsHeader, PageShell, fmtDate, fmtNum } from "../shell";

/** Everyone who took part in the campaign — click through for their full history and moderation. */
export default async function UsersPage() {
  const actor = await getActor();

  let users: UserRow[] = [];
  let loadError: string | null = null;
  try {
    users = await listUsers();
  } catch (err) {
    loadError = (err as Error).message;
  }

  const totalPoints = users.reduce((sum, u) => sum + u.points.total, 0);

  return (
    <PageShell>
      <OpsHeader
        active="users"
        actor={actor}
        returnTo="/users"
        title="Users"
        subtitle={
          <>
            {users.length} participant{users.length === 1 ? "" : "s"} ·{" "}
            <span className="text-brand-ink">{fmtNum(totalPoints)}</span> points held in total
          </>
        }
      />
      <Banners />

      {loadError ? (
        <ErrorBanner>Can&apos;t reach the Social Mining Service: {loadError}</ErrorBanner>
      ) : users.length === 0 ? (
        <p className="panel px-5 py-8 text-center text-sm text-ink-muted">Nobody has connected X yet.</p>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th className="text-right!">Points</th>
                <th className="text-right!">Challenges</th>
                <th className="text-right!">Likes</th>
                <th className="text-right!">Retweets</th>
                <th className="text-right!">Replies</th>
                <th className="text-right!">Impressions</th>
                <th>Flags</th>
                <th>Last active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.userId}>
                  <td>
                    <Link href={`/users/${encodeURIComponent(u.userId)}`} className="group flex items-center gap-3">
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-full border bg-surface text-sm font-semibold uppercase ${
                          u.isKol ? "border-brand/60 text-brand-ink" : "border-hairline-lit text-ink"
                        }`}
                        aria-hidden
                      >
                        {(u.handle ?? u.userId).slice(0, 1)}
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium text-ink group-hover:text-brand-ink">
                          {u.handle ? `@${u.handle}` : "(no X account)"}
                        </span>
                        {u.isKol && <span className="badge tone-brand ml-2 px-1.5 py-0 text-[10px]">★ KOL</span>}
                        <span className="block font-mono text-[11px] text-ink-faint">{u.userId}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="text-right tabular-nums">
                    <span className="font-serif text-lg text-ink">{fmtNum(u.points.total)}</span>
                    {u.points.deducted > 0 && (
                      <span className="block text-xs text-gold">−{fmtNum(u.points.deducted)} taken</span>
                    )}
                  </td>
                  <td className="text-right tabular-nums text-ink">{u.challengesCompleted}</td>
                  <td className="text-right tabular-nums text-ink">{fmtNum(u.engagement.likes)}</td>
                  <td className="text-right tabular-nums text-ink">{fmtNum(u.engagement.retweets)}</td>
                  <td className="text-right tabular-nums text-ink">{fmtNum(u.engagement.replies)}</td>
                  <td className="text-right tabular-nums text-ink">{fmtNum(u.engagement.impressionCount)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {u.connected ? (
                        <span className="badge tone-good">connected</span>
                      ) : (
                        <span className="badge tone-muted">disconnected</span>
                      )}
                      {u.invalidated > 0 && <span className="badge tone-bad">{u.invalidated} invalidated</span>}
                      {u.blockedChallenges > 0 && (
                        <span className="badge tone-muted">{u.blockedChallenges} disabled</span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-ink-muted">{fmtDate(u.lastActiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
