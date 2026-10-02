import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTOR_COOKIE } from "@/lib/actor";
import { SESSION_COOKIE, checkLogin, normalizeEmail, sessionSecret } from "@/lib/auth";
import { setFlash } from "@/lib/flash";
import { Banners } from "../shell";
import { ThemeToggle } from "../theme-toggle";
import { PasswordField } from "./password-field";

async function loginAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // One message for either mistake, so the form doesn't reveal which emails exist.
  if (!checkLogin(email, password)) {
    await setFlash("error", "Wrong email or password.");
    redirect("/login");
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

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <ThemeToggle className="absolute right-4 top-4 sm:right-6 sm:top-6" />
      <div className="card-gold stay-dark relative w-full max-w-md overflow-hidden rounded-panel">
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

          <Banners />

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
