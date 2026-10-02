import "server-only";

function apiBaseUrl(): string {
  const url = process.env.SOCIAL_MINING_API_URL;
  if (!url) throw new Error("SOCIAL_MINING_API_URL is not configured");
  return url.replace(/\/$/, "");
}

function opsApiKey(): string {
  const key = process.env.SOCIAL_MINING_OPS_API_KEY;
  if (!key) throw new Error("SOCIAL_MINING_OPS_API_KEY is not configured");
  return key;
}

/**
 * The readable part of a service error: Nest puts it in `message` (an array
 * for validation errors). Falls back to the status and raw body.
 */
async function errorMessage(res: Response, path: string): Promise<string> {
  const body = await res.text();
  try {
    const message = (JSON.parse(body) as { message?: string | string[] }).message;
    if (message) return Array.isArray(message) ? message.join("; ") : message;
  } catch {
    // Not JSON — fall through.
  }
  return `Social Mining Service returned ${res.status} for ${path}${body ? `: ${body}` : ""}`;
}

async function opsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "x-ops-key": opsApiKey(),
      // A FormData body sets its own multipart content type.
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, path));
  }
  return res.json() as Promise<T>;
}

export interface OpsShareRow {
  shareId: string;
  userId: string;
  /** The X handle that posted this share, recorded at post/verify time. */
  handle: string | null;
  /** True when the author wasn't recorded and `handle` is the user's current account instead. */
  handleIsCurrentAccount: boolean;
  postUrl: string | null;
  postStatus: string;
  /** kol = direct API post; community = user posted the template and pasted the link back. */
  tier: "kol" | "community";
  copyVariant: string;
  /** The challenge this share was for; null for pre-challenge shares. */
  task: { id: string; title: string; points: number } | null;
  invalidated: { reason: string | null; by: string | null; at: string } | null;
  deductions: { points: number; reason: string; by: string; at: string }[];
  /** Set when ops has disabled this share's challenge for this user. */
  taskBlock: { reason: string; by: string; at: string } | null;
  sharedAt: string;
  metrics: {
    likes: number;
    retweets: number;
    quoteCount: number;
    replies: number;
    bookmarkCount: number;
    impressionCount: number;
  } | null;
  fetchedAt: string | null;
  eligible: boolean;
  thresholdsMet: string[];
  credited: boolean;
  creditAmount: string | null;
  issuedBy: string | null;
  issuedAt: string | null;
}

export function listShares(): Promise<OpsShareRow[]> {
  return opsFetch<OpsShareRow[]>("/v1/ops/shares");
}

export function issueCredit(params: { shareId: string; amount: number; issuedBy: string }) {
  return opsFetch("/v1/ops/credits", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function refreshEngagement(shareId: string) {
  return opsFetch(`/v1/ops/shares/${shareId}/refresh`, { method: "POST" });
}

export interface KolRow {
  /** Null while pending: added by handle, and that X account hasn't connected yet. */
  userId: string | null;
  handle: string | null;
  /** Becomes a KOL automatically when this handle connects X. */
  pending: boolean;
  addedBy: string;
  addedAt: string;
}

export function listKols(): Promise<KolRow[]> {
  return opsFetch<KolRow[]>("/v1/ops/kols");
}

/** Pass a userId or an X handle (resolved server-side via the user's connected account). */
export function addKol(params: { userId?: string; handle?: string; addedBy: string }) {
  return opsFetch<{ userId: string | null; pending: boolean }>("/v1/ops/kols", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/** Withdraws a KOL handle that hasn't connected X yet. */
export function removeKolInvite(handle: string) {
  return opsFetch(`/v1/ops/kols/pending/${encodeURIComponent(handle)}`, { method: "DELETE" });
}

export function removeKol(userId: string) {
  return opsFetch(`/v1/ops/kols/${encodeURIComponent(userId)}`, { method: "DELETE" });
}

export function refreshAllShares() {
  return opsFetch<{ checked: number; refreshed: number; nowDeleted: number; failed: { shareId: string; error: string }[] }>(
    "/v1/ops/shares/refresh-all",
    { method: "POST" },
  );
}

export function invalidateShare(shareId: string, params: { reason: string; by: string }) {
  return opsFetch(`/v1/ops/shares/${shareId}/invalidate`, { method: "POST", body: JSON.stringify(params) });
}

/** Takes points away from a user, optionally tied to one of their posts (`shareId`). */
export function deductPoints(userId: string, params: { points: number; reason: string; by: string; shareId?: string }) {
  return opsFetch(`/v1/ops/users/${encodeURIComponent(userId)}/deductions`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function blockTask(params: { userId: string; taskId: string; reason: string; by: string }) {
  return opsFetch("/v1/ops/task-blocks", { method: "POST", body: JSON.stringify(params) });
}

export function unblockTask(userId: string, taskId: string) {
  return opsFetch(`/v1/ops/task-blocks/${encodeURIComponent(userId)}/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
  });
}

export interface ChallengeRow {
  id: string;
  title: string;
  description: string;
  template: string;
  points: number;
  /** Public URL of the image posted with it, or null. */
  imageUrl: string | null;
  /** ISO end of the deadline day (IST), or null if it runs until archived. */
  deadline: string | null;
  /** Deadline has passed: no new starts or submissions. */
  ended: boolean;
  active: boolean;
  createdBy: string;
  createdAt: string;
  completions: number;
}

export function listChallenges(): Promise<ChallengeRow[]> {
  return opsFetch<ChallengeRow[]>("/v1/ops/tasks");
}

export function createChallenge(params: {
  title: string;
  description: string;
  template: string;
  points: number;
  by: string;
  image?: File;
  /** YYYY-MM-DD; omit for no deadline. */
  deadline?: string;
}) {
  const { image, ...fields } = params;
  if (!image) return opsFetch("/v1/ops/tasks", { method: "POST", body: JSON.stringify(fields) });
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) form.set(key, String(value));
  form.set("image", image);
  return opsFetch("/v1/ops/tasks", { method: "POST", body: form });
}

/** Adds or replaces a challenge's image; null removes it. Affects posts made from now on. */
export function setChallengeImage(id: string, image: File | null) {
  const path = `/v1/ops/tasks/${encodeURIComponent(id)}/image`;
  if (!image) return opsFetch(path, { method: "DELETE" });
  const form = new FormData();
  form.set("image", image);
  return opsFetch(path, { method: "PUT", body: form });
}

/** Sets (YYYY-MM-DD) or removes (null) a challenge's deadline. */
export function setChallengeDeadline(id: string, deadline: string | null) {
  return opsFetch(`/v1/ops/tasks/${encodeURIComponent(id)}/deadline`, {
    method: "PUT",
    body: JSON.stringify({ deadline }),
  });
}

export function setChallengeActive(id: string, active: boolean) {
  return opsFetch(`/v1/ops/tasks/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ active }) });
}

export interface EngagementTotals {
  /** Posts that count (invalidated ones are excluded). */
  posts: number;
  likes: number;
  retweets: number;
  replies: number;
  quoteCount: number;
  bookmarkCount: number;
  impressionCount: number;
}

export interface PointsTotals {
  earned: number;
  deducted: number;
  total: number;
}

export interface UserRow {
  userId: string;
  handle: string | null;
  connected: boolean;
  isKol: boolean;
  challengesCompleted: number;
  submissions: number;
  invalidated: number;
  blockedChallenges: number;
  points: PointsTotals;
  engagement: EngagementTotals;
  lastActiveAt: string;
}

export function listUsers(): Promise<UserRow[]> {
  return opsFetch<UserRow[]>("/v1/ops/users");
}

type Metrics = Omit<EngagementTotals, "posts">;

export interface UserProfile {
  userId: string;
  account: { handle: string; connected: boolean; tokenStatus: string; connectedAt: string } | null;
  isKol: boolean;
  points: PointsTotals & {
    deductions: {
      id: string;
      points: number;
      reason: string;
      by: string;
      at: string;
      shareId: string | null;
      challenge: { id: string; title: string; points: number } | null;
    }[];
  };
  engagement: EngagementTotals;
  challenges: {
    id: string;
    title: string;
    points: number;
    active: boolean;
    status: "completed" | "awaiting_post" | "not_started" | "blocked" | "archived" | "missed" | "ended";
    deadline: string | null;
    completedAt: string | null;
    completedShareId: string | null;
    attempts: number;
    invalidatedAttempts: number;
    block: { reason: string; by: string; at: string } | null;
  }[];
  history: {
    shareId: string;
    challenge: { id: string; title: string; points: number } | null;
    copyVariant: string;
    tier: "kol" | "community";
    postStatus: "pending_confirmation" | "confirmed" | "deleted" | "invalidated";
    /** This submission is the one completing its challenge. */
    counts: boolean;
    postUrl: string | null;
    postedAs: string | null;
    sharedAt: string;
    metrics: Metrics | null;
    fetchedAt: string | null;
    invalidated: { reason: string | null; by: string | null; at: string } | null;
    credits: { amount: string; by: string; at: string }[];
  }[];
}

export function getUser(userId: string): Promise<UserProfile> {
  return opsFetch<UserProfile>(`/v1/ops/users/${encodeURIComponent(userId)}`);
}
