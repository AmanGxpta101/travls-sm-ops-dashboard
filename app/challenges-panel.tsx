import type { ChallengeRow } from "@/lib/ops-api";
import { createChallengeAction, setChallengeActiveAction } from "./actions";
import { PointsChip, SectionHeading, Thumb, fmtNum } from "./shell";

/** Challenges every user sees. New ones go live for everyone immediately. */
export function ChallengesPanel({ challenges }: { challenges: ChallengeRow[] }) {
  const live = challenges.filter((c) => c.active).length;
  return (
    <section className="panel flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <SectionHeading
        title="Challenges"
        count={`${live} live${challenges.length > live ? ` · ${challenges.length - live} retired` : ""}`}
        aside="Retiring hides a challenge from new users; completed ones keep counting."
      />

      <ul className="flex flex-col gap-2">
        {challenges.map((c) => (
          <li
            key={c.id}
            className={`flex items-center gap-3 rounded-card border border-hairline p-2.5 sm:gap-4 ${
              c.active ? "bg-surface/60" : "bg-transparent"
            }`}
          >
            <Thumb challenge={c} className={`w-16 sm:w-24 ${c.active ? "" : "opacity-40 grayscale"}`} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`font-semibold ${c.active ? "text-ink" : "text-ink-muted line-through"}`}>
                  {c.title}
                </span>
                <PointsChip points={c.points} signed />
              </p>
              <p className="mt-1 truncate text-xs text-ink-muted" title={c.template}>
                {c.template}
              </p>
              <p className="mt-1 font-mono text-[11px] text-ink-faint">{c.id}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="text-right text-xs text-ink-muted">
                <span className="font-serif text-lg tabular-nums text-ink">{fmtNum(c.completions)}</span> done
              </span>
              <form action={setChallengeActiveAction}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="active" value={String(!c.active)} />
                <button type="submit" className="btn-chip">
                  {c.active ? "Retire" : "Re-activate"}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <details className="group rounded-card border border-dashed border-hairline-lit open:border-solid open:bg-surface/40">
        <summary className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-ink hover:text-brand">
          <span className="grid size-5 place-items-center rounded-full bg-brand text-canvas transition-transform group-open:rotate-45">
            +
          </span>
          New challenge
        </summary>
        <form action={createChallengeAction} className="grid gap-2 px-4 pb-4 sm:grid-cols-[1fr_8rem]">
          <input name="title" placeholder="Title, e.g. Share your first trip" required maxLength={80} className="field" />
          <input name="points" type="number" min="1" step="1" placeholder="Points" required className="field" />
          <input
            name="description"
            placeholder="One line telling users what to do"
            maxLength={200}
            className="field sm:col-span-2"
          />
          <textarea
            name="template"
            required
            rows={3}
            placeholder="Post text. Optionally put {link} where the Travls link goes — e.g. Just booked my trip with Travls! {link}"
            className="field-box sm:col-span-2"
          />
          <p className="text-xs text-ink-muted sm:col-span-2">
            <code className="rounded bg-surface px-1 py-px font-mono text-brand">{"{link}"}</code> is optional — it
            becomes each user&apos;s tracking link. Without it, community posts are checked by their text instead, so
            users must post it as written. The whole post must fit X&apos;s 280 characters (a link counts as 23). It
            goes live for every user as soon as you add it.
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
