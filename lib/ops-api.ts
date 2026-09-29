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

async function opsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "x-ops-key": opsApiKey(),
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Social Mining Service returned ${res.status} for ${path}: ${await res.text()}`);
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
  userId: string;
  handle: string | null;
  addedBy: string;
  addedAt: string;
}

export function listKols(): Promise<KolRow[]> {
  return opsFetch<KolRow[]>("/v1/ops/kols");
}

/** Pass a userId or an X handle (resolved server-side via the user's connected account). */
export function addKol(params: { userId?: string; handle?: string; addedBy: string }) {
  return opsFetch("/v1/ops/kols", { method: "POST", body: JSON.stringify(params) });
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
}) {
  return opsFetch("/v1/ops/tasks", { method: "POST", body: JSON.stringify(params) });
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
    status: "completed" | "awaiting_post" | "not_started" | "blocked" | "retired";
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
