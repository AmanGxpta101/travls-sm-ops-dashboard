"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth";
import { setFlash } from "@/lib/flash";
import { ACTOR_COOKIE, getActor } from "@/lib/actor";
import {
  blockTask,
  refreshEngagement,
  createChallenge,
  deductPoints,
  invalidateShare,
  refreshAllShares,
  setChallengeActive,
  setChallengeDeadline,
  setChallengeImage,
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

/** The form's file input, or undefined when none was picked (browsers send an empty file). */
function imageFile(formData: FormData): File | undefined {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? file : undefined;
}

// Messages ride in a flash cookie, not the URL (see lib/flash.ts).
async function fail(message: string, formData?: FormData): Promise<never> {
  await setFlash("error", message);
  redirect(returnPath(formData));
}

async function done(formData: FormData | undefined, notice?: string): Promise<never> {
  if (notice) await setFlash("notice", notice);
  redirect(returnPath(formData));
}

async function requireActor(formData: FormData): Promise<string> {
  const actor = await getActor();
  if (!actor) return fail("Your session has no ops account — log out and sign in again.", formData);
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
  if (message) return fail(message, formData);
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
  await done(formData, summary);
}

export async function invalidateAction(formData: FormData) {
  const by = await requireActor(formData);
  const reason = text(formData, "reason");
  if (!reason) return fail("Give a reason — the user sees it.", formData);
  await attempt(formData, () => invalidateShare(text(formData, "shareId"), { reason, by }));
  await done(formData, "Submission invalidated — the user can redo the challenge.");
}

export async function deductAction(formData: FormData) {
  const by = await requireActor(formData);
  const points = Number(text(formData, "points"));
  const reason = text(formData, "reason");
  if (!Number.isInteger(points) || points <= 0) return fail("Points to take away must be a positive whole number.", formData);
  if (!reason) return fail("Give a reason — the user sees it.", formData);
  const shareId = text(formData, "shareId") || undefined;
  await attempt(formData, () => deductPoints(text(formData, "userId"), { points, reason, by, shareId }));
  await done(formData, `Took away ${points} points.`);
}

export async function blockTaskAction(formData: FormData) {
  const by = await requireActor(formData);
  const reason = text(formData, "reason");
  if (!reason) return fail("Give a reason for disabling this challenge.", formData);
  await attempt(formData, () => blockTask({ userId: text(formData, "userId"), taskId: text(formData, "taskId"), reason, by }));
  await done(formData, "Challenge disabled for that user.");
}

export async function unblockTaskAction(formData: FormData) {
  await requireActor(formData);
  await attempt(formData, () => unblockTask(text(formData, "userId"), text(formData, "taskId")));
  await done(formData, "Challenge re-enabled for that user.");
}

export async function createChallengeAction(formData: FormData) {
  const by = await requireActor(formData);
  const points = Number(text(formData, "points"));
  if (!Number.isInteger(points) || points <= 0) return fail("Points must be a positive whole number.", formData);
  const title = text(formData, "title");
  // The toggle decides; a date left in the hidden picker with it off is ignored.
  const deadline = formData.get("hasDeadline") ? text(formData, "deadline") : "";
  if (formData.get("hasDeadline") && !deadline) return fail("Pick the last day the challenge runs, or turn the deadline off.", formData);
  await attempt(formData, () =>
    createChallenge({
      title,
      description: text(formData, "description"),
      template: text(formData, "template"),
      points,
      by,
      image: imageFile(formData),
      deadline: deadline || undefined,
    }),
  );
  await done(formData, `Challenge "${title}" is live for all users.`);
}

export async function setChallengeActiveAction(formData: FormData) {
  await requireActor(formData);
  const active = text(formData, "active") === "true";
  await attempt(formData, () => setChallengeActive(text(formData, "id"), active));
  await done(formData, active ? "Challenge unarchived — it's live again." : "Challenge archived — completed submissions still count.");
}

export async function setChallengeImageAction(formData: FormData) {
  await requireActor(formData);
  const image = imageFile(formData);
  if (!image) return fail("Pick an image to upload.", formData);
  await attempt(formData, () => setChallengeImage(text(formData, "id"), image));
  await done(formData, "Challenge image updated — new posts will use it.");
}

export async function setChallengeDeadlineAction(formData: FormData) {
  await requireActor(formData);
  const deadline = text(formData, "deadline");
  if (!deadline) return fail("Pick the last day the challenge runs.", formData);
  await attempt(formData, () => setChallengeDeadline(text(formData, "id"), deadline));
  await done(formData, "Deadline set.");
}

export async function removeChallengeDeadlineAction(formData: FormData) {
  await requireActor(formData);
  await attempt(formData, () => setChallengeDeadline(text(formData, "id"), null));
  await done(formData, "Deadline removed — the challenge runs until you archive it.");
}

export async function removeChallengeImageAction(formData: FormData) {
  await requireActor(formData);
  await attempt(formData, () => setChallengeImage(text(formData, "id"), null));
  await done(formData, "Challenge image removed.");
}

export async function refreshShareAction(formData: FormData) {
  await attempt(formData, () => refreshEngagement(text(formData, "shareId")));
  await done(formData);
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(ACTOR_COOKIE);
  redirect("/login");
}
