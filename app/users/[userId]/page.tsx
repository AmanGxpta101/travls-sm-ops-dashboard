import Link from "next/link";
import { getActor } from "@/lib/actor";
import { getUser, type UserProfile } from "@/lib/ops-api";
import { blockTaskAction, deductAction, invalidateAction, refreshShareAction, unblockTaskAction } from "../../actions";
import { Banners, OpsHeader, fmtDate, fmtNum } from "../../shell";

type Challenge = UserProfile["challenges"][number];
type HistoryRow = UserProfile["history"][number];

const input = "rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-900";

function Stat({ label, value, detail }: { label: string; value: string; detail?: React.ReactNode }) {
  return (
    <div className="rounded border border-zinc-200 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-zinc-500">{detail}</p>}
    </div>
  );
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        {aside && <p className="text-xs text-zinc-500">{aside}</p>}
      </div>
      {children}
    </section>
  );
}

const CHALLENGE_BADGE: Record<Challenge["status"], { label: string; cls: string }> = {
  completed: { label: "Completed", cls: "bg-green-100 text-green-800" },
  awaiting_post: { label: "Awaiting post link", cls: "bg-amber-100 text-amber-800" },
  not_started: { label: "Not started", cls: "bg-zinc-100 text-zinc-600" },
  blocked: { label: "Disabled for user", cls: "bg-zinc-200 text-zinc-800" },
  retired: { label: "Retired", cls: "bg-zinc-100 text-zinc-500" },
};

const POST_BADGE: Record<HistoryRow["postStatus"], { label: string; cls: string }> = {
  confirmed: { label: "Live", cls: "bg-green-100 text-green-800" },
  deleted: { label: "Deleted on X", cls: "bg-red-100 text-red-800" },
  invalidated: { label: "Invalidated", cls: "bg-red-100 text-red-800" },
  pending_confirmation: { label: "Awaiting post link", cls: "bg-amber-100 text-amber-800" },
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

function ChallengeRow({ c, userId, returnTo }: { c: Challenge; userId: string; returnTo: string }) {
  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-zinc-900">
          {c.title} <span className="text-xs font-semibold text-amber-800">{c.points} pts</span>
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {c.completedAt ? `Completed ${fmtDate(c.completedAt)}` : `${c.attempts} attempt${c.attempts === 1 ? "" : "s"}`}
          {c.invalidatedAttempts > 0 && ` · ${c.invalidatedAttempts} invalidated`}
        </p>
        {c.block && (
          <p className="mt-0.5 text-xs text-zinc-600">
            Disabled: “{c.block.reason}” — {c.block.by}, {fmtDate(c.block.at)}
          </p>
        )}
      </div>
      <Badge {...CHALLENGE_BADGE[c.status]} />
      <div>
        {c.block ? (
          <form action={unblockTaskAction}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="taskId" value={c.id} />
            <button type="submit" className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50">
              Re-enable
            </button>
          </form>
        ) : (
          <details>
            <summary className="inline-block cursor-pointer list-none rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50">
              Disable…
            </summary>
            <form action={blockTaskAction} className="mt-2 flex flex-col gap-1.5 sm:w-64">
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="userId" value={userId} />
              <input type="hidden" name="taskId" value={c.id} />
              <p className="text-xs text-zinc-500">
                They won&apos;t be able to do this challenge.
                {c.status === "completed" && " Their completed submission still counts — invalidate it below to remove the points."}
              </p>
              <input name="reason" placeholder="Reason (internal)" required maxLength={500} className={input} />
              <button type="submit" className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white">
                Disable challenge
              </button>
            </form>
          </details>
        )}
      </div>
    </li>
  );
}

function MetricCells({ m }: { m: HistoryRow["metrics"] }) {
  const keys = ["likes", "retweets", "replies", "quoteCount", "bookmarkCount", "impressionCount"] as const;
  return (
    <>
      {keys.map((k) => (
        <td key={k} className="px-3 py-2 text-right tabular-nums text-zinc-900">
          {m ? fmtNum(m[k]) : "—"}
        </td>
      ))}
    </>
  );
}

function HistoryTable({ history, returnTo }: { history: HistoryRow[]; returnTo: string }) {
  return (
    <div className="overflow-x-auto rounded border border-zinc-200">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2">Challenge</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Post</th>
            <th className="px-3 py-2 text-right">Likes</th>
            <th className="px-3 py-2 text-right">RTs</th>
            <th className="px-3 py-2 text-right">Replies</th>
            <th className="px-3 py-2 text-right">Quotes</th>
            <th className="px-3 py-2 text-right">Bookm.</th>
            <th className="px-3 py-2 text-right">Impr.</th>
            <th className="px-3 py-2">Moderate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {history.map((h) => {
            const canInvalidate = h.postStatus === "confirmed" || h.postStatus === "deleted";
            return (
              <tr key={h.shareId} className={`align-top ${h.postStatus === "invalidated" ? "bg-red-50/40" : ""}`}>
                <td className="px-3 py-2 whitespace-nowrap text-zinc-600">{fmtDate(h.sharedAt)}</td>
                <td className="px-3 py-2">
                  {h.challenge ? (
                    <p className={`whitespace-nowrap text-zinc-900 ${h.postStatus === "invalidated" ? "line-through" : ""}`}>
                      {h.challenge.title}{" "}
                      {h.counts && <span className="text-xs font-semibold text-amber-800">+{h.challenge.points}</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400">(before challenges)</p>
                  )}
                  <p className="text-xs text-zinc-500">{h.tier === "kol" ? "KOL · posted for them" : "Community · pasted"}</p>
                  {h.invalidated && (
                    <p className="mt-0.5 max-w-xs text-xs text-red-700">
                      “{h.invalidated.reason}” — {h.invalidated.by}, {fmtDate(h.invalidated.at)}
                    </p>
                  )}
                  {h.credits.map((c) => (
                    <p key={c.at} className="text-xs text-zinc-600">
                      Credited ₹{c.amount} — {c.by}
                    </p>
                  ))}
                </td>
                <td className="px-3 py-2">
                  <Badge {...POST_BADGE[h.postStatus]} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {h.postUrl ? (
                    <div className="flex items-center gap-2">
                      <a href={h.postUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                        view
                      </a>
                      {h.postStatus === "confirmed" && (
                        <form action={refreshShareAction}>
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <input type="hidden" name="shareId" value={h.shareId} />
                          <button
                            type="submit"
                            className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs text-zinc-600 hover:bg-zinc-50"
                            title="Fetch current numbers from X now"
                          >
                            Refresh
                          </button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                  {h.postedAs && <p className="text-xs text-zinc-500">as @{h.postedAs}</p>}
                  <p className="text-xs text-zinc-400">
                    {h.fetchedAt ? `checked ${fmtDate(h.fetchedAt)}` : h.postUrl ? "never checked" : ""}
                  </p>
                </td>
                <MetricCells m={h.metrics} />
                <td className="px-3 py-2">
                  {canInvalidate ? (
                    <details>
                      <summary className="inline-block cursor-pointer list-none rounded border border-zinc-300 px-2 py-0.5 text-center text-xs text-zinc-700 hover:bg-zinc-50">
                        Invalidate…
                      </summary>
                      <form action={invalidateAction} className="mt-2 flex w-56 flex-col gap-1.5">
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <input type="hidden" name="shareId" value={h.shareId} />
                        <p className="text-xs text-zinc-500">
                          Stops counting{h.counts && h.challenge ? ` (−${h.challenge.points} pts)` : ""}; they can redo the
                          challenge with a new post.
                        </p>
                        <input name="reason" placeholder="Reason (shown to the user)" required maxLength={500} className={input} />
                        <button type="submit" className="rounded bg-red-700 px-2 py-1 text-xs font-medium text-white">
                          Invalidate submission
                        </button>
                      </form>
                    </details>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PointsPanel({ profile, returnTo }: { profile: UserProfile; returnTo: string }) {
  const posts = profile.history.filter((h) => h.postUrl);
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
      <div className="rounded border border-zinc-200">
        <p className="border-b border-zinc-100 px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Points taken away
        </p>
        {profile.points.deductions.length === 0 ? (
          <p className="px-4 py-3 text-sm text-zinc-500">None.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {profile.points.deductions.map((d) => (
              <li key={d.id} className="flex gap-3 px-4 py-2 text-sm">
                <span className="w-16 shrink-0 font-semibold tabular-nums text-amber-800">−{fmtNum(d.points)}</span>
                <div className="min-w-0">
                  <p className="text-zinc-900">{d.reason}</p>
                  <p className="text-xs text-zinc-500">
                    {d.by} · {fmtDate(d.at)}
                    {d.challenge && ` · re: ${d.challenge.title}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={deductAction} className="flex flex-col gap-2 rounded border border-zinc-200 p-4">
        <p className="text-sm font-semibold text-zinc-900">Take away points</p>
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="userId" value={profile.userId} />
        <input name="points" type="number" min="1" step="1" placeholder="Points" required className={input} />
        <select name="shareId" defaultValue="" className={input} aria-label="Related post (optional)">
          <option value="">Not about a specific post</option>
          {posts.map((h) => (
            <option key={h.shareId} value={h.shareId}>
              {(h.challenge?.title ?? "Pre-challenge post") + " · " + fmtDate(h.sharedAt)}
            </option>
          ))}
        </select>
        <input name="reason" placeholder="Reason (shown to the user)" required maxLength={500} className={input} />
        <button type="submit" className="rounded bg-amber-700 px-2 py-1.5 text-xs font-medium text-white">
          Take away points
        </button>
        <p className="text-xs text-zinc-500">A penalty — their completed challenges stay completed.</p>
      </form>
    </div>
  );
}

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { userId: rawId } = await params;
  const userId = decodeURIComponent(rawId);
  const query = await searchParams;
  const actor = await getActor();
  const returnTo = `/users/${encodeURIComponent(userId)}`;

  let profile: UserProfile | null = null;
  let loadError: string | null = null;
  try {
    profile = await getUser(userId);
  } catch (err) {
    loadError = (err as Error).message;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <OpsHeader active="users" actor={actor} returnTo={returnTo} />
      <Banners error={query.error} notice={query.notice} />

      <Link href="/users" className="-mb-4 text-sm text-zinc-500 hover:text-zinc-900">
        ← All users
      </Link>

      {loadError || !profile ? (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          Couldn&apos;t load this user: {loadError}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex size-12 items-center justify-center rounded-full bg-zinc-900 text-lg font-semibold uppercase text-white"
              aria-hidden
            >
              {(profile.account?.handle ?? profile.userId).slice(0, 1)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">
                {profile.account ? `@${profile.account.handle}` : "(no X account)"}
                {profile.isKol && <span className="ml-2 text-sm font-semibold text-violet-700">★ KOL</span>}
              </h2>
              <p className="text-xs text-zinc-500">
                <span className="font-mono">{profile.userId}</span>
                {profile.account &&
                  ` · ${profile.account.connected ? "connected" : `X ${profile.account.tokenStatus}`} since ${fmtDate(
                    profile.account.connectedAt,
                  )}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              label="Points"
              value={fmtNum(profile.points.total)}
              detail={
                <>
                  {fmtNum(profile.points.earned)} earned
                  {profile.points.deducted > 0 && <> · −{fmtNum(profile.points.deducted)} taken</>}
                </>
              }
            />
            <Stat
              label="Challenges"
              value={`${profile.challenges.filter((c) => c.status === "completed").length} / ${
                profile.challenges.filter((c) => c.active).length
              }`}
              detail="completed / live"
            />
            <Stat
              label="Likes · RTs"
              value={`${fmtNum(profile.engagement.likes)} · ${fmtNum(profile.engagement.retweets)}`}
              detail={`${fmtNum(profile.engagement.replies)} replies · ${fmtNum(profile.engagement.quoteCount)} quotes`}
            />
            <Stat
              label="Impressions"
              value={fmtNum(profile.engagement.impressionCount)}
              detail={`across ${profile.engagement.posts} post${profile.engagement.posts === 1 ? "" : "s"} · ${fmtNum(
                profile.engagement.bookmarkCount,
              )} bookmarks`}
            />
          </div>

          <Section title="Challenges" aside="Disabling stops future attempts; it doesn't remove points already earned.">
            <ul className="divide-y divide-zinc-100 rounded border border-zinc-200">
              {profile.challenges.map((c) => (
                <ChallengeRow key={c.id} c={c} userId={profile.userId} returnTo={returnTo} />
              ))}
            </ul>
          </Section>

          <Section
            title={`History (${profile.history.length})`}
            aside="Engagement is each post's latest check. Totals above exclude invalidated posts."
          >
            {profile.history.length === 0 ? (
              <p className="text-sm text-zinc-500">No submissions yet.</p>
            ) : (
              <HistoryTable history={profile.history} returnTo={returnTo} />
            )}
          </Section>

          <Section title="Points">
            <PointsPanel profile={profile} returnTo={returnTo} />
          </Section>
        </>
      )}
    </div>
  );
}
