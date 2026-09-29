import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/actor";
import {
  addKol,
  issueCredit,
  listChallenges,
  listKols,
  listShares,
  refreshEngagement,
  removeKol,
  type ChallengeRow,
  type KolRow,
  type OpsShareRow,
} from "@/lib/ops-api";
import { ChallengesPanel } from "./challenges-panel";
import { Banners, OpsHeader } from "./shell";

async function issueCreditAction(formData: FormData) {
  "use server";
  const shareId = String(formData.get("shareId"));
  const amount = Number(formData.get("amount"));
  const issuedBy = String(formData.get("issuedBy") ?? "").trim();

  if (!issuedBy) {
    redirect(`/?error=${encodeURIComponent("Enter your name in \"Issued by\" before crediting.")}`);
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    redirect(`/?error=${encodeURIComponent("Credit amount must be a positive number.")}`);
  }

  await issueCredit({ shareId, amount, issuedBy });
  redirect("/");
}

/**
 * Engagement is on-demand only (plan §7.3) — nothing polls X in the
 * background, and the numbers in the table are whatever was last fetched,
 * which for most shares is "right after posting" (i.e. zero). This is the
 * ops-triggered fetch that actually goes and checks X now, bypassing the
 * 5-day cache window entirely since ops asking for a live number should
 * always get one.
 */
async function refreshEngagementAction(formData: FormData) {
  "use server";
  const shareId = String(formData.get("shareId"));
  let errorMessage: string | null = null;
  try {
    await refreshEngagement(shareId);
  } catch (err) {
    errorMessage = (err as Error).message;
  }
  if (errorMessage) {
    redirect(`/?error=${encodeURIComponent(errorMessage)}`);
  }
  redirect("/");
}

/**
 * KOLs get the direct API post ($0.20/post); everyone else posts the template
 * themselves and pastes the link back ($0.005 to verify). This list is the
 * only thing deciding which flow a user gets on their next share.
 */
async function addKolAction(formData: FormData) {
  "use server";
  const who = String(formData.get("who") ?? "").trim();
  const addedBy = String(formData.get("addedBy") ?? "").trim();
  if (!who || !addedBy) {
    redirect(`/?error=${encodeURIComponent("Enter a handle or user ID, and your name, to add a KOL.")}`);
  }
  let errorMessage: string | null = null;
  try {
    // A leading "@" means an X handle; anything else is taken as a Travls user ID.
    await addKol(who.startsWith("@") ? { handle: who, addedBy } : { userId: who, addedBy });
  } catch (err) {
    errorMessage = (err as Error).message;
  }
  if (errorMessage) {
    redirect(`/?error=${encodeURIComponent(errorMessage)}`);
  }
  redirect("/");
}

async function removeKolAction(formData: FormData) {
  "use server";
  await removeKol(String(formData.get("userId")));
  redirect("/");
}

function TierBadge({ tier }: { tier: OpsShareRow["tier"] }) {
  return tier === "kol" ? (
    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">KOL · direct</span>
  ) : (
    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">Community · pasted</span>
  );
}

function StatusBadge({ row }: { row: OpsShareRow }) {
  if (row.postStatus === "invalidated") {
    return (
      <span
        className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
        title={row.invalidated ? `“${row.invalidated.reason}” — ${row.invalidated.by}` : undefined}
      >
        Invalidated
      </span>
    );
  }
  if (row.postStatus === "deleted" && !row.credited) {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
        Post deleted
      </span>
    );
  }
  if (row.credited) {
    return (
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
        Credited (₹{row.creditAmount} by {row.issuedBy})
      </span>
    );
  }
  if (row.postStatus === "pending_confirmation") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        Awaiting post link
      </span>
    );
  }
  if (row.eligible) {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        Eligible — {row.thresholdsMet.join(", ")}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
      Not yet eligible
    </span>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const actor = await getActor();

  let shares: OpsShareRow[] = [];
  let kols: KolRow[] = [];
  let challenges: ChallengeRow[] = [];
  let loadError: string | null = null;
  try {
    [shares, kols, challenges] = await Promise.all([listShares(), listKols(), listChallenges()]);
  } catch (err) {
    loadError = (err as Error).message;
  }
  const kolUserIds = new Set(kols.map((k) => k.userId));

  const eligibleUncredited = shares.filter((s) => s.eligible && !s.credited).length;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <OpsHeader
        active="activity"
        actor={actor}
        returnTo="/"
        subtitle={`${shares.length} share${shares.length === 1 ? "" : "s"} tracked · ${eligibleUncredited} awaiting credit · moderate from a user's profile`}
      />
      <Banners error={params.error} notice={params.notice} />

      {!loadError && (
        <section className="rounded border border-zinc-200 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">KOLs ({kols.length})</h2>
            <p className="text-xs text-zinc-500">
              KOLs&apos; shares are posted for them via the X API. Everyone else posts the template and pastes the link back.
            </p>
          </div>
          <form action={addKolAction} className="mt-3 flex flex-wrap items-center gap-1.5">
            <input
              type="text"
              name="who"
              placeholder="@handle or user ID"
              required
              className="w-48 rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-900"
            />
            <input
              type="text"
              name="addedBy"
              defaultValue={actor}
              placeholder="Your name"
              required
              className="w-28 rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-900"
            />
            <button type="submit" className="rounded bg-black px-2 py-1 text-xs font-medium text-white">
              Add KOL
            </button>
          </form>
          {kols.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {kols.map((k) => (
                <li
                  key={k.userId}
                  className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 py-0.5 pl-2.5 pr-1 text-xs text-violet-900"
                  title={`${k.userId} · added by ${k.addedBy} ${new Date(k.addedAt).toLocaleDateString()}`}
                >
                  {k.handle ? `@${k.handle}` : k.userId}
                  <form action={removeKolAction}>
                    <input type="hidden" name="userId" value={k.userId} />
                    <button
                      type="submit"
                      className="rounded-full px-1.5 text-violet-500 hover:bg-violet-100 hover:text-violet-900"
                      aria-label={`Remove ${k.handle ?? k.userId} from KOLs`}
                    >
                      ×
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!loadError && <ChallengesPanel challenges={challenges} />}

      {loadError ? (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          Can&apos;t reach the Social Mining Service: {loadError}
        </p>
      ) : shares.length === 0 ? (
        <p className="text-sm text-zinc-500">No shares recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">Handle</th>
                <th className="px-4 py-2">Flow</th>
                <th className="px-4 py-2">Challenge</th>
                <th className="px-4 py-2">Post</th>
                <th className="px-4 py-2">Likes</th>
                <th className="px-4 py-2">Retweets</th>
                <th className="px-4 py-2">Replies</th>
                <th className="px-4 py-2">Quotes</th>
                <th className="px-4 py-2">Bookmarks</th>
                <th className="px-4 py-2">Impressions</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Shared</th>
                <th className="px-4 py-2">Issue credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shares.map((row) => (
                <tr key={row.shareId}>
                  <td className="px-4 py-2 font-medium text-zinc-900">
                    <Link
                      href={`/users/${encodeURIComponent(row.userId)}`}
                      className="hover:underline"
                      title="Open this user's profile — history, points, moderation"
                    >
                    {row.handle ? (
                      row.handleIsCurrentAccount ? (
                        <span
                          className="font-normal italic text-zinc-400"
                          title="Author wasn't recorded for this share (posted before author capture, and the post is gone from X). Showing the user's current X account."
                        >
                          @{row.handle}?
                        </span>
                      ) : (
                        `@${row.handle}`
                      )
                    ) : (
                      row.userId
                    )}
                    </Link>
                    {kolUserIds.has(row.userId) && (
                      <span className="ml-1 text-xs font-normal text-violet-700" title="On the KOL list">
                        ★
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <TierBadge tier={row.tier} />
                  </td>
                  <td className="px-4 py-2 align-top">
                    {row.task ? (
                      <>
                        <p className={`whitespace-nowrap text-zinc-900 ${row.postStatus === "invalidated" ? "line-through" : ""}`}>
                          {row.task.title}{" "}
                          <span className="text-xs font-semibold text-amber-800">{row.task.points} pts</span>
                        </p>
                        {row.invalidated && (
                          <p className="text-xs text-red-700">
                            Invalidated: “{row.invalidated.reason}” — {row.invalidated.by}
                          </p>
                        )}
                        {row.deductions.map((d) => (
                          <p key={d.at} className="text-xs text-amber-800">
                            −{d.points} pts: “{d.reason}” — {d.by}
                          </p>
                        ))}
                        {row.taskBlock && (
                          <p className="text-xs text-zinc-500">Challenge disabled for user: “{row.taskBlock.reason}”</p>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-zinc-400" title={`copy variant: ${row.copyVariant}`}>
                        (before challenges)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {row.postUrl ? (
                        <a
                          href={row.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 underline"
                        >
                          view
                        </a>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                      {row.postUrl && (
                        <form action={refreshEngagementAction}>
                          <input type="hidden" name="shareId" value={row.shareId} />
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
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {row.fetchedAt
                        ? `checked ${new Date(row.fetchedAt).toLocaleString()}`
                        : "never checked"}
                    </p>
                  </td>
                  <td className="px-4 py-2 text-zinc-900">{row.metrics?.likes ?? "—"}</td>
                  <td className="px-4 py-2 text-zinc-900">{row.metrics?.retweets ?? "—"}</td>
                  <td className="px-4 py-2 text-zinc-900">{row.metrics?.replies ?? "—"}</td>
                  <td className="px-4 py-2 text-zinc-900">{row.metrics?.quoteCount ?? "—"}</td>
                  <td className="px-4 py-2 text-zinc-900">{row.metrics?.bookmarkCount ?? "—"}</td>
                  <td className="px-4 py-2 text-zinc-900">{row.metrics?.impressionCount ?? "—"}</td>
                  <td className="px-4 py-2">
                    <StatusBadge row={row} />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-zinc-600">
                    {new Date(row.sharedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    {row.eligible && !row.credited ? (
                      <form action={issueCreditAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="shareId" value={row.shareId} />
                        <input
                          type="number"
                          name="amount"
                          placeholder="Amt"
                          min="0"
                          step="0.01"
                          required
                          className="w-20 rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-900"
                        />
                        <input
                          type="text"
                          name="issuedBy"
                          defaultValue={actor}
                          placeholder="Your name"
                          required
                          className="w-24 rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-900"
                        />
                        <button
                          type="submit"
                          className="rounded bg-black px-2 py-1 text-xs font-medium text-white"
                        >
                          Credit
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
