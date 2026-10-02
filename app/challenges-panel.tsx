import Image from "next/image";
import type { ChallengeRow } from "@/lib/ops-api";
import {
  createChallengeAction,
  removeChallengeDeadlineAction,
  removeChallengeImageAction,
  setChallengeActiveAction,
  setChallengeDeadlineAction,
  setChallengeImageAction,
} from "./actions";
import { DetailsDialog } from "./details-dialog";
import { PointsChip, SectionHeading, Thumb, fmtDate, fmtNum } from "./shell";

const IMAGE_TYPES = "image/png,image/jpeg,image/webp";

/** Actions land back on the Challenges page (they'd default to Activity). */
function ReturnHere() {
  return <input type="hidden" name="returnTo" value="/challenges" />;
}

// Deadlines are whole days in India time (the service closes them at 23:59 IST).
const IST = "Asia/Kolkata";

function fmtDeadline(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: IST });
}

/** YYYY-MM-DD in IST — what a date input holds. */
function isoDay(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: IST });
}

function StatusChip({ c }: { c: ChallengeRow }) {
  if (!c.active) return <span className="badge tone-muted">Archived</span>;
  if (c.ended) return <span className="badge tone-bad">Ended {fmtDeadline(c.deadline!)}</span>;
  if (c.deadline) return <span className="badge tone-brand">Ends {fmtDeadline(c.deadline)}</span>;
  return null;
}

/** One labelled fact in the details panel. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="eyebrow">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}

/** Set, move or remove the deadline. Moving it later (or removing it) reopens an ended challenge. */
function DeadlineControls({ c, today }: { c: ChallengeRow; today: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={setChallengeDeadlineAction} className="flex flex-wrap items-center gap-2">
        <ReturnHere />
        <input type="hidden" name="id" value={c.id} />
        <input
          name="deadline"
          type="date"
          min={today}
          required
          defaultValue={c.deadline && !c.ended ? isoDay(new Date(c.deadline)) : undefined}
          className="field py-1 text-xs"
        />
        <button type="submit" className="btn-chip">
          {c.deadline ? "Change" : "Set deadline"}
        </button>
      </form>
      {c.deadline && (
        <form action={removeChallengeDeadlineAction}>
          <ReturnHere />
          <input type="hidden" name="id" value={c.id} />
          <button type="submit" className="btn-chip">
            Remove deadline
          </button>
        </form>
      )}
    </div>
  );
}

/** Add, replace or remove the image posted with a challenge. Only affects posts made from now on. */
function ImageControls({ c }: { c: ChallengeRow }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={setChallengeImageAction} className="flex flex-wrap items-center gap-2">
        <ReturnHere />
        <input type="hidden" name="id" value={c.id} />
        <input name="image" type="file" accept={IMAGE_TYPES} required className="field max-w-60 py-1 text-xs" />
        <button type="submit" className="btn-chip">
          {c.imageUrl ? "Replace" : "Upload"}
        </button>
      </form>
      {c.imageUrl && (
        <form action={removeChallengeImageAction}>
          <ReturnHere />
          <input type="hidden" name="id" value={c.id} />
          <button type="submit" className="btn-chip hover:text-destructive-ink">
            Remove image
          </button>
        </form>
      )}
    </div>
  );
}

/** Everything about a challenge, plus the controls for its image and deadline, in a modal. */
function ChallengeDetails({ c, today }: { c: ChallengeRow; today: string }) {
  return (
    <DetailsDialog
      heading={
        <>
          <p className="eyebrow">Challenge</p>
          <h3 className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-bold tracking-tight">
            {c.title}
            <PointsChip points={c.points} signed />
            <StatusChip c={c} />
          </h3>
        </>
      }
    >
      <dl className="grid gap-5 sm:grid-cols-2">
        <Fact label="Description">{c.description || <span className="text-ink-faint">—</span>}</Fact>
        <Fact label="Points">{fmtNum(c.points)} pts</Fact>
        <div className="sm:col-span-2">
          <Fact label="Post text">
            <span className="block whitespace-pre-wrap rounded-card border border-hairline bg-canvas/60 px-3 py-2 font-mono text-xs leading-relaxed">
              {c.template}
            </span>
          </Fact>
        </div>
        <div className="sm:col-span-2">
          <Fact label="Image">
            <span className="flex flex-col gap-2">
              {c.imageUrl ? (
                <a href={c.imageUrl} target="_blank" rel="noreferrer" className="w-fit">
                  <Image
                    src={c.imageUrl}
                    alt={`Image posted with “${c.title}”`}
                    width={480}
                    height={320}
                    sizes="320px"
                    className="h-auto w-80 max-w-full rounded-card border border-hairline"
                  />
                </a>
              ) : (
                <span className="text-ink-muted">None — KOL posts carry the default promo image.</span>
              )}
              {c.active && <ImageControls c={c} />}
            </span>
          </Fact>
        </div>
        <div className="sm:col-span-2">
          <Fact label="Deadline">
            <span className="flex flex-col gap-2">
              <span>
                {c.deadline ? (
                  <>
                    {c.ended ? "Ended" : "Runs until the end of"} {fmtDeadline(c.deadline)} (IST)
                    {c.ended && (
                      <span className="text-ink-muted"> — users who hadn&apos;t completed it see it as missed.</span>
                    )}
                  </>
                ) : (
                  <span className="text-ink-muted">None — runs until you archive it.</span>
                )}
              </span>
              {c.active && <DeadlineControls c={c} today={today} />}
            </span>
          </Fact>
        </div>
        <Fact label="Completed by">
          {fmtNum(c.completions)} user{c.completions === 1 ? "" : "s"}
        </Fact>
        <Fact label="Created">
          {fmtDate(c.createdAt)} · {c.createdBy}
        </Fact>
        <Fact label="ID">
          <span className="font-mono text-xs">{c.id}</span>
        </Fact>
      </dl>
    </DetailsDialog>
  );
}

/** Challenges every user sees. New ones go live for everyone immediately. */
export function ChallengesPanel({ challenges }: { challenges: ChallengeRow[] }) {
  const live = challenges.filter((c) => c.active && !c.ended).length;
  const ended = challenges.filter((c) => c.active && c.ended).length;
  const archived = challenges.filter((c) => !c.active).length;
  const today = isoDay(new Date());

  return (
    <section className="panel flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <SectionHeading
        title="Challenges"
        count={[`${live} live`, ended && `${ended} ended`, archived && `${archived} archived`].filter(Boolean).join(" · ")}
        aside="Archiving hides a challenge from users who haven't completed it; completed ones keep counting. After a deadline, users who missed it see it under Missed challenges."
      />

      <ul className="flex flex-col gap-2">
        {challenges.map((c) => {
          const dim = !c.active || c.ended;
          return (
            <li
              key={c.id}
              className={`rounded-card border border-hairline ${c.active ? "bg-surface/60" : "bg-transparent"}`}
            >
              <div className="flex items-center gap-3 p-2.5 sm:gap-4">
                <Thumb challenge={c} className={`w-16 sm:w-24 ${dim ? "opacity-40 grayscale" : ""}`} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`font-semibold ${c.active ? "text-ink" : "text-ink-muted line-through"}`}>
                      {c.title}
                    </span>
                    <PointsChip points={c.points} signed />
                    <StatusChip c={c} />
                  </p>
                  <p className="mt-1 truncate text-xs text-ink-muted" title={c.template}>
                    {c.template}
                  </p>
                  <div className="mt-1.5">
                    <ChallengeDetails c={c} today={today} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <span className="text-right text-xs text-ink-muted">
                    <span className="font-serif text-lg tabular-nums text-ink">{fmtNum(c.completions)}</span> done
                  </span>
                  <form action={setChallengeActiveAction}>
                    <ReturnHere />
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={String(!c.active)} />
                    <button type="submit" className="btn-chip">
                      {c.active ? "Archive" : "Unarchive"}
                    </button>
                  </form>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <details className="group rounded-card border border-dashed border-hairline-lit open:border-solid open:bg-surface/40">
        <summary className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-ink hover:text-brand-ink">
          <span className="grid size-5 place-items-center rounded-full bg-brand text-on-brand transition-transform group-open:rotate-45">
            +
          </span>
          New challenge
        </summary>
        <form action={createChallengeAction} className="grid gap-2 px-4 pb-4 sm:grid-cols-[1fr_8rem]">
          <ReturnHere />
          <input name="title" placeholder="Title, e.g. Share your first trip" required maxLength={80} className="field" />
          <input name="points" type="number" min="1" step="1" placeholder="Points" required className="field" />
          <input
            name="description"
            placeholder="One line telling users what to do"
            maxLength={200}
            className="field sm:col-span-2"
          />
          <label className="flex flex-col gap-1 text-xs text-ink-muted sm:col-span-2">
            Image (optional) — PNG, JPEG or WebP, up to 5 MB. Posted with every share of this challenge.
            <input name="image" type="file" accept={IMAGE_TYPES} className="field text-xs" />
          </label>

          {/* Deadline toggle: the date picker only shows (and only counts) while it's on. */}
          <div className="group/deadline flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-hairline px-3 py-2.5 sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
              <input type="checkbox" name="hasDeadline" className="peer sr-only" />
              <span
                className="relative h-5 w-9 shrink-0 rounded-full bg-hairline-lit transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/60"
                aria-hidden
              >
                <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-ink transition-transform group-has-[:checked]/deadline:translate-x-4 group-has-[:checked]/deadline:bg-canvas" />
              </span>
              Set a deadline
            </label>
            <input
              name="deadline"
              type="date"
              min={today}
              aria-label="Last day the challenge runs"
              className="field hidden py-1 text-xs group-has-[:checked]/deadline:block"
            />
            <span className="text-xs text-ink-muted group-has-[:checked]/deadline:hidden">
              Off — runs until you archive it.
            </span>
            <span className="hidden text-xs text-ink-muted group-has-[:checked]/deadline:inline">
              Runs until the end of that day (IST). Users who don&apos;t complete it by then see it under Missed
              challenges.
            </span>
          </div>

          <textarea
            name="template"
            required
            rows={3}
            placeholder="Post text. Optionally put {link} where the Travls link goes — e.g. Just booked my trip with Travls! {link}"
            className="field-box sm:col-span-2"
          />
          <p className="text-xs text-ink-muted sm:col-span-2">
            <code className="rounded bg-surface px-1 py-px font-mono text-brand-ink">{"{link}"}</code> is optional — it
            becomes each user&apos;s tracking link. Without it, community posts are checked by their text instead, so
            users must post it as written. With an image, community posts must have it attached (the app hands it to
            them — X&apos;s compose link can&apos;t carry media). The whole post must fit X&apos;s 280 characters (a
            link counts as 23). It goes live for every user as soon as you add it.
          </p>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-brand">
              Add challenge
            </button>
          </div>
        </form>
      </details>
    </section>
  );
}
