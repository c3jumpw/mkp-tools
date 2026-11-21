"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <svg width="28" height="28" viewBox="0 0 128 128">
              <rect width="128" height="128" rx="24" fill="#1b2c25" />
              <circle cx="40" cy="64" r="11" fill="#cb9a45" />
              <circle cx="64" cy="64" r="11" fill="#cb9a45" />
              <circle cx="88" cy="64" r="11" fill="none" stroke="#4f9c8c" strokeWidth="4" />
            </svg>
            <span className="font-display text-2xl">PingPath</span>
          </div>
          <p className="text-muted text-sm">Sign in to your outreach board.</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-muted mb-1.5">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg bg-surface border border-line px-3.5 py-2.5 text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/60"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-muted mb-1.5">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg bg-surface border border-line px-3.5 py-2.5 text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/60"
              placeholder="••••••••"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-rust bg-rust/10 border border-rust/30 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-accent text-bg font-medium py-2.5 hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          First time here?{" "}
          <Link href="/signup" className="text-accent hover:text-accent-hover">
            Create your account
          </Link>
        </p>
      </div>
    </main>
  );
}
