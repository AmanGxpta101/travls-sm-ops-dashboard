import type { ChallengeRow } from "@/lib/ops-api";
import { createChallengeAction, setChallengeActiveAction } from "./actions";

const input = "rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900";

/** Challenges every user sees. New ones go live for everyone immediately. */
export function ChallengesPanel({ challenges }: { challenges: ChallengeRow[] }) {
  const live = challenges.filter((c) => c.active).length;
  return (
    <section className="rounded border border-zinc-200 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900">
          Challenges ({live} live{challenges.length > live ? `, ${challenges.length - live} retired` : ""})
        </h2>
        <p className="text-xs text-zinc-500">Retiring hides a challenge from new users; completed ones keep counting.</p>
      </div>

      <ul className="mt-3 divide-y divide-zinc-100 rounded border border-zinc-100">
        {challenges.map((c) => (
          <li key={c.id} className={`flex items-start gap-3 px-3 py-2 text-sm ${c.active ? "" : "bg-zinc-50"}`}>
            <div className="min-w-0 flex-1">
              <p className={`font-medium ${c.active ? "text-zinc-900" : "text-zinc-500 line-through"}`}>
                {c.title}
                <span className="ml-2 font-mono text-xs font-normal text-zinc-400">{c.id}</span>
              </p>
              <p className="mt-0.5 truncate text-xs text-zinc-500" title={c.template}>
                {c.template}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
              {c.points} pts
            </span>
            <span className="w-24 shrink-0 text-right text-xs text-zinc-500">
              {c.completions} completed
            </span>
            <form action={setChallengeActiveAction} className="shrink-0">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="active" value={String(!c.active)} />
              <button type="submit" className="rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-50">
                {c.active ? "Retire" : "Re-activate"}
              </button>
            </form>
          </li>
        ))}
      </ul>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-zinc-900">+ New challenge</summary>
        <form action={createChallengeAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_8rem]">
          <input name="title" placeholder="Title, e.g. Share your first trip" required maxLength={80} className={input} />
          <input name="points" type="number" min="1" step="1" placeholder="Points" required className={input} />
          <input
            name="description"
            placeholder="One line telling users what to do"
            maxLength={200}
            className={`${input} sm:col-span-2`}
          />
          <textarea
            name="template"
            required
            rows={3}
            placeholder="Post text. Put {link} where the Travls link goes — e.g. Just booked my trip with Travls! {link}"
            className={`${input} sm:col-span-2`}
          />
          <p className="text-xs text-zinc-500 sm:col-span-2">
            <code>{"{link}"}</code> is required — it becomes each user&apos;s tracking link, which is how community posts get
            verified. The whole post must fit X&apos;s 280 characters (a link counts as 23). It goes live for every user
            as soon as you add it.
          </p>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded bg-black px-3 py-1.5 text-sm font-medium text-white">
              Add challenge
            </button>
          </div>
        </form>
      </details>
    </section>
  );
}
