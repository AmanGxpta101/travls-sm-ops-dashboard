import Link from "next/link";
import { getActor } from "@/lib/actor";
import { listUsers, type UserRow } from "@/lib/ops-api";
import { Banners, OpsHeader, fmtDate, fmtNum } from "../shell";

/** Everyone who took part in the campaign — click through for their full history and moderation. */
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
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
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <OpsHeader
        active="users"
        actor={actor}
        returnTo="/users"
        subtitle={`${users.length} participant${users.length === 1 ? "" : "s"} · ${fmtNum(totalPoints)} points held in total`}
      />
      <Banners error={params.error} notice={params.notice} />

      {loadError ? (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          Can&apos;t reach the Social Mining Service: {loadError}
        </p>
      ) : users.length === 0 ? (
        <p className="text-sm text-zinc-500">Nobody has connected X yet.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2 text-right">Points</th>
                <th className="px-4 py-2 text-right">Challenges</th>
                <th className="px-4 py-2 text-right">Likes</th>
                <th className="px-4 py-2 text-right">Retweets</th>
                <th className="px-4 py-2 text-right">Replies</th>
                <th className="px-4 py-2 text-right">Impressions</th>
                <th className="px-4 py-2">Flags</th>
                <th className="px-4 py-2">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((u) => (
                <tr key={u.userId} className="hover:bg-zinc-50">
                  <td className="px-4 py-2">
                    <Link href={`/users/${encodeURIComponent(u.userId)}`} className="group block">
                      <span className="font-medium text-zinc-900 group-hover:underline">
                        {u.handle ? `@${u.handle}` : "(no X account)"}
                      </span>
                      {u.isKol && <span className="ml-1.5 text-xs font-semibold text-violet-700">★ KOL</span>}
                      <span className="block font-mono text-xs text-zinc-400">{u.userId}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    <span className="font-semibold text-zinc-900">{fmtNum(u.points.total)}</span>
                    {u.points.deducted > 0 && (
                      <span className="block text-xs text-amber-800">−{fmtNum(u.points.deducted)} taken</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-900">{u.challengesCompleted}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-900">{fmtNum(u.engagement.likes)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-900">{fmtNum(u.engagement.retweets)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-900">{fmtNum(u.engagement.replies)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-900">
                    {fmtNum(u.engagement.impressionCount)}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {!u.connected && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">disconnected</span>
                      )}
                      {u.invalidated > 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800">{u.invalidated} invalidated</span>
                      )}
                      {u.blockedChallenges > 0 && (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-zinc-700">
                          {u.blockedChallenges} disabled
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-zinc-600">{fmtDate(u.lastActiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
