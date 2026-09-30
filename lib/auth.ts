const SESSION_COOKIE = "ops_session";

/**
 * The cookie holds the session secret, never the password itself — so a
 * leaked cookie doesn't hand over the actual shared password.
 */
function sessionSecret(): string {
  const secret = process.env.OPS_DASHBOARD_SESSION_SECRET;
  if (!secret) throw new Error("OPS_DASHBOARD_SESSION_SECRET is not configured");
  return secret;
}

/**
 * Who may sign in, and the name that goes on the audit trail for their
 * actions. They all share OPS_DASHBOARD_PASSWORD for now; the email decides
 * whose name moderation is recorded under.
 */
const OPS_ACCOUNTS: Record<string, string> = {
  "aman@travls.io": "Aman Gupta",
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** The account's display name, or null if the email isn't allowed in. */
export function opsAccountName(email: string): string | null {
  return OPS_ACCOUNTS[normalizeEmail(email)] ?? null;
}

/** True when the email is an ops account and the password is right. */
export function checkLogin(email: string, password: string): boolean {
  const expected = process.env.OPS_DASHBOARD_PASSWORD;
  if (!expected) throw new Error("OPS_DASHBOARD_PASSWORD is not configured");
  return opsAccountName(email) !== null && password === expected;
}

export { SESSION_COOKIE, normalizeEmail, sessionSecret };
