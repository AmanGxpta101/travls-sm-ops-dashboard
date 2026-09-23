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
  handle: string | null;
  postUrl: string | null;
  postStatus: string;
  copyVariant: string;
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
