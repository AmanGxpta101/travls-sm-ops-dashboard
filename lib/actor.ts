import { cookies } from "next/headers";
import { opsAccountName } from "./auth";

/**
 * Who is acting: the ops account that signed in. Login stores its email
 * here; every moderation action is recorded under that account's name.
 */
export const ACTOR_COOKIE = "ops_actor";

export async function getActor(): Promise<string> {
  const store = await cookies();
  const email = store.get(ACTOR_COOKIE)?.value;
  return (email && opsAccountName(email)) || "";
}
