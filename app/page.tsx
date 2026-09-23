import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth";
import { issueCredit, listShares, refreshEngagement, type OpsShareRow } from "@/lib/ops-api";

async function logoutAction() {
  "use server";
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

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

function StatusBadge({ row }: { row: OpsShareRow }) {
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
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  let shares: OpsShareRow[] = [];
  let loadError: string | null = null;
  try {
    shares = await listShares();
  } catch (err) {
    loadError = (err as Error).message;
  }

  const eligibleUncredited = shares.filter((s) => s.eligible && !s.credited).length;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Social Mining — Ops</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {shares.length} share{shares.length === 1 ? "" : "s"} tracked · {eligibleUncredited} awaiting credit
          </p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-zinc-500 underline">
            Log out
          </button>
        </form>
      </div>

      {params.error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {decodeURIComponent(params.error)}
        </p>
      )}

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
                    {row.handle ? `@${row.handle}` : "—"}
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
