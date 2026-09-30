"use client";

import { useState } from "react";

/** Password input with a show/hide toggle. */
export function PasswordField() {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id="password"
        type={visible ? "text" : "password"}
        name="password"
        placeholder="Password"
        autoComplete="current-password"
        required
        className="field w-full py-3 pl-5 pr-12 text-base"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-1.5 my-auto grid size-9 place-items-center rounded-full text-ink-muted transition-colors hover:text-brand"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls="password"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path
        d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.9 3.8M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" strokeLinecap="round" />
    </svg>
  );
}
