import Image from "next/image";
import Link from "next/link";
import { getActor } from "@/lib/actor";
import { getUser, type UserProfile } from "@/lib/ops-api";
import { blockTaskAction, deductAction, invalidateAction, refreshShareAction, unblockTaskAction } from "../../actions";
import {
  Banners,
  ErrorBanner,
  OpsHeader,
  PageShell,
  PointsChip,
  SectionHeading,
  Thumb,
  fmtDate,
  fmtNum,
} from "../../shell";

type Challenge = UserProfile["challenges"][number];
type HistoryRow = UserProfile["history"][number];

function Stat({ label, value, detail }: { label: string; value: string; detail?: React.ReactNode }) {
  return (
    <div className="panel rounded-card px-4 py-4 sm:px-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-serif text-3xl tabular-nums text-ink">{value}</p>
      {detail && <p className="mt-1 text-xs text-ink-muted">{detail}</p>}
    </div>
  );
}

const CHALLENGE_BADGE: Record<Challenge["status"], { label: string; cls: string }> = {
  completed: { label: "✓ Completed", cls: "tone-good" },
  awaiting_post: { label: "Awaiting post link", cls: "tone-brand" },
  not_started: { label: "Not started", cls: "tone-muted" },
  blocked: { label: "Disabled for user", cls: "tone-bad" },
  retired: { label: "Retired", cls: "tone-muted" },
};

const POST_BADGE: Record<HistoryRow["postStatus"], { label: string; cls: string }> = {
  confirmed: { label: "Live", cls: "tone-good" },
  deleted: { label: "Deleted on X", cls: "tone-bad" },
  invalidated: { label: "Invalidated", cls: "tone-bad" },
  pending_confirmation: { label: "Awaiting post link", cls: "tone-brand" },
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`badge ${cls}`}>{label}</span>;
}

function ChallengeRow({ c, userId, returnTo }: { c: Challenge; userId: string; returnTo: string }) {
  const dim = c.status === "blocked" || c.status === "retired";
  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-3 rounded-card border border-hairline bg-surface/60 p-2.5 sm:flex-nowrap sm:items-center">
      <Thumb challenge={c} className={`w-16 sm:w-24 ${dim ? "opacity-40 grayscale" : ""}`} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-ink">{c.title}</span>
          <PointsChip points={c.points} signed />
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          {c.completedAt ? `Completed ${fmtDate(c.completedAt)}` : `${c.attempts} attempt${c.attempts === 1 ? "" : "s"}`}
          {c.invalidatedAttempts > 0 && ` · ${c.invalidatedAttempts} invalidated`}
        </p>
        {c.block && (
          <p className="mt-1 text-xs text-destructive-ink">
            Disabled: “{c.block.reason}” — {c.block.by}, {fmtDate(c.block.at)}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-start gap-2 sm:items-center">
        <Badge {...CHALLENGE_BADGE[c.status]} />
        {c.block ? (
          <form action={unblockTaskAction}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="taskId" value={c.id} />
            <button type="submit" className="btn-chip">
              Re-enable
            </button>
          </form>
        ) : (
          <details className="relative">
            <summary className="btn-chip">Disable…</summary>
            <form
              action={blockTaskAction}
              className="absolute right-0 z-10 mt-2 flex w-64 flex-col gap-2 rounded-card border border-hairline-lit bg-surface p-3 shadow-[0_12px_40px_rgb(0_0_0/0.6)]"
            >
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="userId" value={userId} />
              <input type="hidden" name="taskId" value={c.id} />
              <p className="text-xs text-ink-muted">
                They won&apos;t be able to do this challenge.
                {c.status === "completed" &&
                  " Their completed submission still counts — invalidate it below to remove the points."}
              </p>
              <input name="reason" placeholder="Reason (internal)" required maxLength={500} className="field text-xs" />
              <button type="submit" className="btn-danger py-1.5 text-xs">
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
        <td key={k} className="text-right tabular-nums text-ink">
          {m ? fmtNum(m[k]) : <span className="text-ink-faint">—</span>}
        </td>
      ))}
    </>
  );
}

function HistoryTable({ history, returnTo }: { history: HistoryRow[]; returnTo: string }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Challenge</th>
            <th>Status</th>
            <th>Post</th>
            <th>Moderate</th>
            <th className="text-right!">Likes</th>
            <th className="text-right!">RTs</th>
            <th className="text-right!">Replies</th>
            <th className="text-right!">Quotes</th>
            <th className="text-right!">Bookm.</th>
            <th className="text-right!">Impr.</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => {
            const canInvalidate = h.postStatus === "confirmed" || h.postStatus === "deleted";
            return (
              <tr key={h.shareId} className={`align-top ${h.postStatus === "invalidated" ? "bg-destructive/[0.04]" : ""}`}>
                <td className="whitespace-nowrap text-ink-muted">{fmtDate(h.sharedAt)}</td>
                <td>
                  {h.challenge ? (
                    <p
                      className={`whitespace-nowrap text-ink ${
                        h.postStatus === "invalidated" ? "text-ink-muted line-through" : ""
                      }`}
                    >
                      {h.challenge.title}{" "}
                      {h.counts && <span className="text-xs font-semibold text-brand">+{h.challenge.points}</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-ink-faint">(before challenges)</p>
                  )}
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {h.tier === "kol" ? "KOL · posted for them" : "Community · pasted"}
                  </p>
                  {h.invalidated && (
                    <p className="mt-1 max-w-xs text-xs text-destructive-ink">
                      “{h.invalidated.reason}” — {h.invalidated.by}, {fmtDate(h.invalidated.at)}
                    </p>
                  )}
                  {h.credits.map((c) => (
                    <p key={c.at} className="mt-1 text-xs text-success">
                      Credited ₹{c.amount} — {c.by}
                    </p>
                  ))}
                </td>
                <td>
                  <Badge {...POST_BADGE[h.postStatus]} />
                </td>
                <td className="whitespace-nowrap">
                  {h.postUrl ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={h.postUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-brand hover:text-brand-hover"
                      >
                        View ↗
                      </a>
                      {h.postStatus === "confirmed" && (
                        <form action={refreshShareAction}>
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <input type="hidden" name="shareId" value={h.shareId} />
                          <button
                            type="submit"
                            className="btn-chip px-2.5 py-0.5"
                            title="Fetch current numbers from X now"
                          >
                            Refresh
                          </button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                  {h.postedAs && <p className="mt-1 text-xs text-ink-muted">as @{h.postedAs}</p>}
                  <p className="text-xs text-ink-faint">
                    {h.fetchedAt ? `checked ${fmtDate(h.fetchedAt)}` : h.postUrl ? "never checked" : ""}
                  </p>
                </td>
                <td>
                  {canInvalidate ? (
                    <details>
                      <summary className="btn-chip">Invalidate…</summary>
                      <form action={invalidateAction} className="mt-2 flex w-60 flex-col gap-2">
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <input type="hidden" name="shareId" value={h.shareId} />
                        <p className="whitespace-normal text-xs text-ink-muted">
                          Stops counting{h.counts && h.challenge ? ` (−${h.challenge.points} pts)` : ""}; they can redo
                          the challenge with a new post.
                        </p>
                        <input
                          name="reason"
                          placeholder="Reason (shown to the user)"
                          required
                          maxLength={500}
                          className="field text-xs"
                        />
                        <button type="submit" className="btn-danger py-1.5 text-xs">
                          Invalidate submission
                        </button>
                      </form>
                    </details>
                  ) : (
                    <span className="text-xs text-ink-faint">—</span>
                  )}
                </td>
                <MetricCells m={h.metrics} />
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
    <div className="grid items-start gap-4 md:grid-cols-[1fr_22rem]">
      <div className="panel overflow-hidden">
        <p className="eyebrow border-b border-hairline px-5 py-3.5">Points taken away</p>
        {profile.points.deductions.length === 0 ? (
          <p className="px-5 py-4 text-sm text-ink-muted">None.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {profile.points.deductions.map((d) => (
              <li key={d.id} className="flex gap-4 px-5 py-3 text-sm">
                <span className="w-16 shrink-0 font-serif text-lg tabular-nums text-gold">−{fmtNum(d.points)}</span>
                <div className="min-w-0">
                  <p className="text-ink">{d.reason}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {d.by} · {fmtDate(d.at)}
                    {d.challenge && ` · re: ${d.challenge.title}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={deductAction} className="panel flex flex-col gap-2.5 p-5">
        <p className="font-semibold text-ink">Take away points</p>
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="userId" value={profile.userId} />
        <input name="points" type="number" min="1" step="1" placeholder="Points" required className="field" />
        <select name="shareId" defaultValue="" className="field-box" aria-label="Related post (optional)">
          <option value="">Not about a specific post</option>
          {posts.map((h) => (
            <option key={h.shareId} value={h.shareId}>
              {(h.challenge?.title ?? "Pre-challenge post") + " · " + fmtDate(h.sharedAt)}
            </option>
          ))}
        </select>
        <input name="reason" placeholder="Reason (shown to the user)" required maxLength={500} className="field" />
        <button type="submit" className="btn-danger">
          Take away points
        </button>
        <p className="text-xs text-ink-muted">A penalty — their completed challenges stay completed.</p>
      </form>
    </div>
  );
}

/** Who they are and what they hold, in the gold banner users see their own points in. */
function ProfileBanner({ profile }: { profile: UserProfile }) {
  const handle = profile.account?.handle;
  return (
    <section className="card-gold relative overflow-hidden rounded-panel p-5 sm:p-8">
      <Image
        src="/assets/photography/globe-flight.webp"
        alt=""
        width={1200}
        height={512}
        priority
        sizes="(min-width: 1024px) 760px, 80vw"
        className="pointer-events-none absolute inset-y-0 right-0 h-full w-[80%] object-cover object-[80%_40%] sm:w-[60%]"
        style={{ maskImage: "linear-gradient(to right, transparent, rgb(0 0 0 / 0.3) 35%, black 70%)" }}
      />
      <div className="relative flex flex-col gap-6 drop-shadow-[0_2px_12px_rgb(0_0_0/0.6)]">
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className={`grid size-12 shrink-0 place-items-center rounded-full border-2 bg-surface text-lg font-semibold uppercase sm:size-14 ${
              profile.isKol ? "border-brand text-brand" : "border-hairline-lit text-ink"
            }`}
            aria-hidden
          >
            {(handle ?? profile.userId).slice(0, 1)}
          </div>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-ink sm:text-2xl">
              {handle ? `@${handle}` : "(no X account)"}
              {profile.isKol && <span className="badge tone-brand text-[11px]">★ KOL</span>}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
              <span className="font-mono">{profile.userId}</span>
              {profile.account && (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`size-1.5 rounded-full ${
                        profile.account.connected ? "bg-success shadow-[0_0_6px_var(--color-success)]" : "bg-ink-faint"
                      }`}
                      aria-hidden
                    />
                    {profile.account.connected ? "connected" : `X ${profile.account.tokenStatus}`} since{" "}
                    {fmtDate(profile.account.connectedAt)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink">Social mining points</p>
          <p className="mt-3 font-serif text-[clamp(3rem,6vw+1rem,4.5rem)] leading-none tracking-tight tabular-nums text-ink">
            {fmtNum(profile.points.total)}
          </p>
          <p className="mt-3 text-sm text-ink-muted sm:text-base">
            <span className="font-medium text-brand">+{fmtNum(profile.points.earned)}</span> earned
            {profile.points.deducted > 0 && (
              <>
                {" "}
                · <span className="text-gold">−{fmtNum(profile.points.deducted)}</span> taken away
              </>
            )}
          </p>
        </div>
      </div>
    </section>
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
    <PageShell>
      <OpsHeader active="users" actor={actor} returnTo={returnTo} />
      <Banners error={query.error} notice={query.notice} />

      <Link href="/users" className="-mb-4 inline-flex w-fit items-center gap-1.5 text-sm text-ink-muted hover:text-brand">
        ← All users
      </Link>

      {loadError || !profile ? (
        <ErrorBanner>Couldn&apos;t load this user: {loadError}</ErrorBanner>
      ) : (
        <>
          <ProfileBanner profile={profile} />

          <div className="grid gap-3 sm:grid-cols-3">
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

          <section className="flex flex-col gap-4">
            <SectionHeading
              title="Challenges"
              count={profile.challenges.length}
              aside="Disabling stops future attempts; it doesn't remove points already earned."
            />
            <ul className="flex flex-col gap-2">
              {profile.challenges.map((c) => (
                <ChallengeRow key={c.id} c={c} userId={profile.userId} returnTo={returnTo} />
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <SectionHeading
              title="History"
              count={profile.history.length}
              aside="Engagement is each post's latest check. Totals above exclude invalidated posts."
            />
            {profile.history.length === 0 ? (
              <p className="panel px-5 py-8 text-center text-sm text-ink-muted">No submissions yet.</p>
            ) : (
              <HistoryTable history={profile.history} returnTo={returnTo} />
            )}
          </section>

          <section className="flex flex-col gap-4">
            <SectionHeading title="Points" />
            <PointsPanel profile={profile} returnTo={returnTo} />
          </section>
        </>
      )}
    </PageShell>
  );
}
