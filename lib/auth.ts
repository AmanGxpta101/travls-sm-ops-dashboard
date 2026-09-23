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

export function checkPassword(candidate: string): boolean {
  const expected = process.env.OPS_DASHBOARD_PASSWORD;
  if (!expected) throw new Error("OPS_DASHBOARD_PASSWORD is not configured");
  return candidate === expected;
}

export { SESSION_COOKIE, sessionSecret };
