import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTOR_COOKIE } from "@/lib/actor";
import { SESSION_COOKIE, checkLogin, normalizeEmail, sessionSecret } from "@/lib/auth";
import { PasswordField } from "./password-field";

async function loginAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // One message for either mistake, so the form doesn't reveal which emails exist.
  if (!checkLogin(email, password)) {
    redirect("/login?error=1");
  }

  const store = await cookies();
  const cookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
  store.set(SESSION_COOKIE, sessionSecret(), cookie);
  store.set(ACTOR_COOKIE, normalizeEmail(email), cookie);
  redirect("/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card-gold relative w-full max-w-md overflow-hidden rounded-panel">
        <div className="relative h-40 sm:h-48">
          <Image
            src="/assets/photography/globe-flight.webp"
            alt=""
            fill
            priority
            sizes="448px"
            className="object-cover object-[80%_40%]"
            style={{ maskImage: "linear-gradient(to bottom, black 45%, transparent)" }}
          />
          <div className="absolute left-6 top-6 flex items-center gap-2.5 sm:left-8 sm:top-8">
            <Image src="/assets/brand/travls-logo.webp" alt="Travls" width={290} height={60} priority className="h-6 w-auto" />
            <span className="rounded-pill border border-hairline-lit bg-canvas/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted backdrop-blur-sm">
              Ops
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-6 pb-6 sm:px-8 sm:pb-8">
          <div>
            <h1 className="text-section text-ink">Social Mining Ops</h1>
            <p className="mt-2 text-sm text-ink-muted">Sign in with your Travls ops account.</p>
          </div>

          {params.error && (
            <p role="alert" className="rounded-card border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-ink">
              Wrong email or password.
            </p>
          )}

          <form action={loginAction} className="flex flex-col gap-3">
            <input
              type="email"
              name="email"
              placeholder="Email"
              autoComplete="username"
              autoFocus
              required
              className="field px-5 py-3 text-base"
            />
            <PasswordField />
            <button type="submit" className="btn-brand py-3 text-base">
              Sign in
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
