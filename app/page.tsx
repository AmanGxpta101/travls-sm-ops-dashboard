import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/actor";
import { setFlash } from "@/lib/flash";
import {
  addKol,
  listChallenges,
  listKols,
  listShares,
  refreshEngagement,
  removeKol,
  removeKolInvite,
  type ChallengeRow,
  type KolRow,
  type OpsShareRow,
} from "@/lib/ops-api";
import { Banners, ErrorBanner, OpsHeader, PageShell, SectionHeading, Thumb, fmtDate, fmtDay, fmtNum } from "./shell";

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
  if (errorMessage) await setFlash("error", errorMessage);
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
  const addedBy = await getActor();
  if (!who || !addedBy) {
    await setFlash("error", "Enter a handle or user ID to add a KOL.");
    redirect("/");
  }
  // X handles are 1–15 letters, digits or underscores; user IDs never fit that
  // (usr_<uuid>), so a bare "aman_Travls" is read as a handle, not an ID.
  const isHandle = who.startsWith("@") || /^[A-Za-z0-9_]{1,15}$/.test(who);
  let errorMessage: string | null = null;
  let notice = "";
  try {
    const added = await addKol(isHandle ? { handle: who, addedBy } : { userId: who, addedBy });
    const name = isHandle ? `@${who.replace(/^@/, "")}` : who;
    notice = added.pending
      ? `${name} hasn't connected X yet — they'll become a KOL as soon as they do.`
      : `${name} is now a KOL.`;
  } catch (err) {
    errorMessage = (err as Error).message;
  }
  await setFlash(errorMessage ? "error" : "notice", errorMessage ?? notice);
  redirect("/");
}

async function removeKolAction(formData: FormData) {
  "use server";
  const userId = String(formData.get("userId") ?? "");
  const handle = String(formData.get("handle") ?? "");
  // A pending entry has no user yet, only the handle ops typed.
  await (userId ? removeKol(userId) : removeKolInvite(handle));
  redirect("/");
}

function TierBadge({ tier }: { tier: OpsShareRow["tier"] }) {
  return tier === "kol" ? (
    <span className="badge tone-brand">KOL · direct</span>
  ) : (
    <span className="badge tone-muted">Community · pasted</span>
  );
}

function StatusBadge({ row }: { row: OpsShareRow }) {
  if (row.postStatus === "invalidated") {
    return (
      <span
        className="badge tone-bad"
        title={row.invalidated ? `“${row.invalidated.reason}” — ${row.invalidated.by}` : undefined}
      >
        Invalidated
      </span>
    );
  }
  if (row.postStatus === "deleted" && !row.credited) {
    return <span className="badge tone-bad">Post deleted</span>;
  }
  if (row.credited) {
    return (
      <span className="badge tone-muted">
        Credited ₹{row.creditAmount} · {row.issuedBy}
      </span>
    );
  }
  if (row.postStatus === "pending_confirmation") {
    return <span className="badge tone-brand">Awaiting post link</span>;
  }
  if (row.eligible) {
    return <span className="badge tone-good">Eligible — {row.thresholdsMet.join(", ")}</span>;
  }
  return <span className="badge tone-muted">Not yet eligible</span>;
}

function Avatar({ label }: { label: string }) {
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-full border border-hairline-lit bg-surface text-xs font-semibold uppercase text-ink"
      aria-hidden
    >
      {label.slice(0, 1)}
    </span>
  );
}

/** The campaign at a glance, in the same gold banner users see their points in. */
function Summary({
  shares,
  kols,
  challenges,
}: {
  shares: OpsShareRow[];
  kols: KolRow[];
  challenges: ChallengeRow[];
}) {
  const counted = shares.filter((s) => s.postStatus !== "invalidated");
  const awaitingCredit = shares.filter((s) => s.eligible && !s.credited).length;
  const awaitingLink = shares.filter((s) => s.postStatus === "pending_confirmation").length;
  const impressions = counted.reduce((sum, s) => sum + (s.metrics?.impressionCount ?? 0), 0);
  const likes = counted.reduce((sum, s) => sum + (s.metrics?.likes ?? 0), 0);
  const people = new Set(shares.map((s) => s.userId)).size;

  const stats = [
    { label: "Awaiting credit", value: awaitingCredit, lit: awaitingCredit > 0 },
    { label: "Awaiting link", value: awaitingLink },
    { label: "Likes", value: likes },
    { label: "Impressions", value: impressions },
  ];

  return (
    <section aria-labelledby="summary-heading" className="card-gold stay-dark relative overflow-hidden rounded-panel p-5 sm:p-8">
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

      <div className="relative flex flex-col gap-6">
        <h2 id="summary-heading" className="font-mono text-xs uppercase tracking-[0.3em] text-ink">
          Social mining campaign
        </h2>

        <div className="drop-shadow-[0_2px_12px_rgb(0_0_0/0.6)]">
          <p className="font-serif text-[clamp(3rem,6vw+1rem,4.5rem)] leading-none tracking-tight tabular-nums text-ink">
            {fmtNum(shares.length)}
          </p>
          <p className="mt-3 text-sm text-ink-muted sm:text-base">
            share{shares.length === 1 ? "" : "s"} tracked from <span className="text-ink">{fmtNum(people)}</span>{" "}
            {people === 1 ? "person" : "people"} ·{" "}
            <Link href="/challenges" className="underline decoration-hairline-lit underline-offset-4 hover:text-ink">
              <span className="text-brand-ink">{challenges.filter((c) => c.active && !c.ended).length}</span> live challenges
            </Link>{" "}
            ·{" "}
            <span className="text-brand-ink">{kols.length}</span> KOL{kols.length === 1 ? "" : "s"}
          </p>
        </div>

        <dl className="grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`rounded-card border px-3.5 py-3 backdrop-blur-md ${
                s.lit ? "border-brand/50 bg-brand/10" : "border-hairline-lit bg-canvas/60"
              }`}
            >
              <dt className="eyebrow">{s.label}</dt>
              <dd className={`mt-1 font-serif text-2xl tabular-nums ${s.lit ? "text-brand-ink" : "text-ink"}`}>
                {fmtNum(s.value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function KolPanel({ kols }: { kols: KolRow[] }) {
  return (
    <section className="panel flex flex-col gap-4 p-4 sm:p-6">
      <SectionHeading
        title="KOLs"
        count={kols.length}
        aside="KOLs' shares are posted for them via the X API. Everyone else posts the template and pastes the link back."
      />
      <form action={addKolAction} className="flex max-w-md gap-2">
        <input type="text" name="who" placeholder="@handle or user ID" required className="field min-w-0 flex-1" />
        <button type="submit" className="btn-brand">
          Add KOL
        </button>
      </form>
      {kols.length > 0 ? (
        <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {kols.map((k) => {
            const name = k.handle ? `@${k.handle}` : k.userId!;
            return (
              <li
                key={k.userId ?? `pending:${k.handle}`}
                className={`flex items-center gap-3 rounded-card border py-2 pl-2 pr-1.5 ${
                  k.pending ? "border-dashed border-hairline-lit" : "border-hairline bg-surface/60"
                }`}
                title={`${k.userId ?? "not connected yet"} · added by ${k.addedBy} ${new Date(k.addedAt).toLocaleDateString()}`}
              >
                <Avatar label={k.handle ?? k.userId ?? "?"} />
                <div className="min-w-0 flex-1">
                  {k.userId ? (
                    <Link
                      href={`/users/${encodeURIComponent(k.userId)}`}
                      className="block truncate text-sm font-medium text-ink hover:text-brand-ink"
                    >
                      {name}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-medium text-ink">{name}</p>
                  )}
                  <p className="truncate text-xs text-ink-muted">
                    {k.pending ? (
                      <span className="text-gold">Waiting to connect X</span>
                    ) : (
                      <>added by {k.addedBy}</>
                    )}
                  </p>
                </div>
                <form action={removeKolAction}>
                  <input type="hidden" name="userId" value={k.userId ?? ""} />
                  <input type="hidden" name="handle" value={k.handle ?? ""} />
                  <button
                    type="submit"
                    className="grid size-7 place-items-center rounded-full text-ink-muted transition-colors hover:bg-destructive/15 hover:text-destructive-ink"
                    aria-label={`Remove ${name} from KOLs`}
                  >
                    ×
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-card border border-dashed border-hairline-lit px-4 py-3 text-sm text-ink-muted">
          No KOLs yet — everyone is on the paste-the-link flow.
        </p>
      )}
    </section>
  );
}

function SharesTable({ shares, kolUserIds }: { shares: OpsShareRow[]; kolUserIds: Set<string> }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Handle</th>
            <th>Flow</th>
            <th>Challenge</th>
            <th>Post</th>
            <th>Status</th>
            <th>Shared</th>
            <th className="text-right!">Likes</th>
            <th className="text-right!">RTs</th>
            <th className="text-right!">Replies</th>
            <th className="text-right!">Quotes</th>
            <th className="text-right!">Bookm.</th>
            <th className="text-right!">Impr.</th>
          </tr>
        </thead>
        <tbody>
          {shares.map((row) => (
            <tr key={row.shareId} className="align-top">
              <td>
                <div className="flex items-center gap-2.5">
                  <Avatar label={row.handle ?? row.userId} />
                  <Link
                    href={`/users/${encodeURIComponent(row.userId)}`}
                    className="whitespace-nowrap font-medium text-ink hover:text-brand-ink"
                    title="Open this user's profile — history, points, moderation"
                  >
                    {row.handle ? (
                      row.handleIsCurrentAccount ? (
                        <span
                          className="font-normal italic text-ink-muted"
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
                    <span className="text-xs text-brand-ink" title="On the KOL list">
                      ★
                    </span>
                  )}
                </div>
              </td>
              <td>
                <TierBadge tier={row.tier} />
              </td>
              <td>
                {row.task ? (
                  <div className="flex items-start gap-3">
                    <Thumb challenge={row.task} className="hidden w-14 sm:block" />
                    <div>
                      <p
                        className={`whitespace-nowrap text-ink ${
                          row.postStatus === "invalidated" ? "text-ink-muted line-through" : ""
                        }`}
                      >
                        {row.task.title}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-brand-ink">{row.task.points} pts</p>
                      {row.invalidated && (
                        <p className="mt-1 text-xs text-destructive-ink">
                          Invalidated: “{row.invalidated.reason}” — {row.invalidated.by}
                        </p>
                      )}
                      {row.deductions.map((d) => (
                        <p key={d.at} className="mt-1 text-xs text-gold">
                          −{d.points} pts: “{d.reason}” — {d.by}
                        </p>
                      ))}
                      {row.taskBlock && (
                        <p className="mt-1 text-xs text-ink-muted">
                          Challenge disabled for user: “{row.taskBlock.reason}”
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-ink-faint" title={`copy variant: ${row.copyVariant}`}>
                    (before challenges)
                  </span>
                )}
              </td>
              <td>
                <div className="flex items-center gap-2">
                  {row.postUrl ? (
                    <a
                      href={row.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="whitespace-nowrap font-medium text-brand-ink hover:text-brand-ink-hover"
                    >
                      View ↗
                    </a>
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                  {row.postUrl && (
                    <form action={refreshEngagementAction}>
                      <input type="hidden" name="shareId" value={row.shareId} />
                      <button type="submit" className="btn-chip px-2.5 py-0.5" title="Fetch current numbers from X now">
                        Refresh
                      </button>
                    </form>
                  )}
                </div>
                <p className="mt-1 whitespace-nowrap text-xs text-ink-faint">
                  {row.fetchedAt ? `checked ${fmtDate(row.fetchedAt)}` : "never checked"}
                </p>
              </td>
              <td>
                <StatusBadge row={row} />
              </td>
              <td className="whitespace-nowrap text-ink-muted">{fmtDay(row.sharedAt)}</td>
              {(["likes", "retweets", "replies", "quoteCount", "bookmarkCount", "impressionCount"] as const).map((k) => (
                <td key={k} className="text-right tabular-nums text-ink">
                  {row.metrics ? fmtNum(row.metrics[k]) : <span className="text-ink-faint">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function Dashboard() {
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
  const kolUserIds = new Set(kols.flatMap((k) => (k.userId ? [k.userId] : [])));

  return (
    <PageShell>
      <OpsHeader active="activity" actor={actor} returnTo="/" />
      <Banners />

      {loadError ? (
        <ErrorBanner>Can&apos;t reach the Social Mining Service: {loadError}</ErrorBanner>
      ) : (
        <>
          <Summary shares={shares} kols={kols} challenges={challenges} />

          <KolPanel kols={kols} />

          <section className="flex flex-col gap-4">
            <SectionHeading
              title="Shares"
              count={shares.length}
              aside="Engagement is each post's latest check — nothing polls X in the background. Moderate from a user's profile."
            />
            {shares.length === 0 ? (
              <p className="panel px-5 py-8 text-center text-sm text-ink-muted">No shares recorded yet.</p>
            ) : (
              <SharesTable shares={shares} kolUserIds={kolUserIds} />
            )}
          </section>
        </>
      )}
    </PageShell>
  );
}
