import "server-only";
import { cookies } from "next/headers";

/**
 * One-shot messages ("Challenge archived", an error from the service) carried
 * to the next page load in a short-lived cookie, so they never end up in the
 * URL. Set from a server action right before it redirects; read by <Banners>,
 * whose client half clears the cookie once shown so a reload doesn't repeat it.
 */
export const FLASH_COOKIE = "ops_flash";

/** `id` tells two identical messages apart, so the same error twice still shows. */
export type Flash = { id: string; kind: "error" | "notice"; message: string };

export async function setFlash(kind: Flash["kind"], message: string): Promise<void> {
  const store = await cookies();
  const flash: Flash = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, kind, message };
  store.set(FLASH_COOKIE, JSON.stringify(flash), {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // Readable by the page's script, which deletes it after showing it.
    httpOnly: false,
    // A safety net in case the next page never loads.
    maxAge: 60,
  });
}

export async function readFlash(): Promise<Flash | null> {
  const raw = (await cookies()).get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    const flash = JSON.parse(raw) as Flash;
    return flash.id && flash.message ? flash : null;
  } catch {
    return null;
  }
}
