import { cookies } from "next/headers";

/**
 * The dashboard signs in with one shared password, so it has no idea who is
 * acting. Moderation needs a name on every action (it's shown in the audit
 * trail), so ops sets it once here instead of typing it into every form.
 */
export const ACTOR_COOKIE = "ops_actor";

export async function getActor(): Promise<string> {
  const store = await cookies();
  return store.get(ACTOR_COOKIE)?.value ?? "";
}
