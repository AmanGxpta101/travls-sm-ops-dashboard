"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth";
import { ACTOR_COOKIE, getActor } from "@/lib/actor";
import {
  blockTask,
  refreshEngagement,
  createChallenge,
  deductPoints,
  invalidateShare,
  refreshAllShares,
  setChallengeActive,
  unblockTask,
} from "@/lib/ops-api";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Where to land after an action: the page the form was on (hidden
 * `returnTo` field), so moderating on a user profile stays on that profile.
 * Only same-site paths are accepted.
 */
function returnPath(formData?: FormData): string {
  const to = formData ? text(formData, "returnTo") : "";
  return to.startsWith("/") && !to.startsWith("//") ? to.split("?")[0] : "/";
}

function fail(message: string, formData?: FormData): never {
  redirect(`${returnPath(formData)}?error=${encodeURIComponent(message)}`);
}

function done(formData: FormData | undefined, notice?: string): never {
  const path = returnPath(formData);
  redirect(notice ? `${path}?notice=${encodeURIComponent(notice)}` : path);
}

async function requireActor(formData: FormData): Promise<string> {
  const actor = await getActor();
  if (!actor) fail("Your session has no ops account — log out and sign in again.", formData);
  return actor;
}

/** Runs a service call, turning its error into the page's error banner. */
async function attempt(formData: FormData | undefined, fn: () => Promise<unknown>): Promise<void> {
  let message: string | null = null;
  try {
    await fn();
  } catch (err) {
    message = (err as Error).message;
  }
  if (message) fail(message, formData);
}

export async function refreshAllAction(formData: FormData) {
  let summary = "";
  await attempt(formData, async () => {
    const r = await refreshAllShares();
    summary =
      `Checked ${r.checked} live post${r.checked === 1 ? "" : "s"}` +
      (r.nowDeleted ? ` — ${r.nowDeleted} now deleted on X` : "") +
      (r.failed.length ? ` — ${r.failed.length} failed` : "");
  });
  done(formData, summary);
}

export async function invalidateAction(formData: FormData) {
  const by = await requireActor(formData);
  const reason = text(formData, "reason");
  if (!reason) fail("Give a reason — the user sees it.", formData);
  await attempt(formData, () => invalidateShare(text(formData, "shareId"), { reason, by }));
  done(formData, "Submission invalidated — the user can redo the challenge.");
}

export async function deductAction(formData: FormData) {
  const by = await requireActor(formData);
  const points = Number(text(formData, "points"));
  const reason = text(formData, "reason");
  if (!Number.isInteger(points) || points <= 0) fail("Points to take away must be a positive whole number.", formData);
  if (!reason) fail("Give a reason — the user sees it.", formData);
  const shareId = text(formData, "shareId") || undefined;
  await attempt(formData, () => deductPoints(text(formData, "userId"), { points, reason, by, shareId }));
  done(formData, `Took away ${points} points.`);
}

export async function blockTaskAction(formData: FormData) {
  const by = await requireActor(formData);
  const reason = text(formData, "reason");
  if (!reason) fail("Give a reason for disabling this challenge.", formData);
  await attempt(formData, () => blockTask({ userId: text(formData, "userId"), taskId: text(formData, "taskId"), reason, by }));
  done(formData, "Challenge disabled for that user.");
}

export async function unblockTaskAction(formData: FormData) {
  await requireActor(formData);
  await attempt(formData, () => unblockTask(text(formData, "userId"), text(formData, "taskId")));
  done(formData, "Challenge re-enabled for that user.");
}

export async function createChallengeAction(formData: FormData) {
  const by = await requireActor(formData);
  const points = Number(text(formData, "points"));
  if (!Number.isInteger(points) || points <= 0) fail("Points must be a positive whole number.", formData);
  const title = text(formData, "title");
  await attempt(formData, () =>
    createChallenge({
      title,
      description: text(formData, "description"),
      template: text(formData, "template"),
      points,
      by,
    }),
  );
  done(formData, `Challenge "${title}" is live for all users.`);
}

export async function setChallengeActiveAction(formData: FormData) {
  await requireActor(formData);
  const active = text(formData, "active") === "true";
  await attempt(formData, () => setChallengeActive(text(formData, "id"), active));
  done(formData, active ? "Challenge re-activated." : "Challenge retired — completed submissions still count.");
}

export async function refreshShareAction(formData: FormData) {
  await attempt(formData, () => refreshEngagement(text(formData, "shareId")));
  done(formData);
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(ACTOR_COOKIE);
  redirect("/login");
}
