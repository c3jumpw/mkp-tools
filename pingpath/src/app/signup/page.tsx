"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "../login/actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, undefined);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-2xl">Create your account</span>
          <p className="text-muted text-sm mt-2">
            Your account is your own private board: your contacts, blasts and
            dates aren&apos;t shared with anyone else&apos;s.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm text-muted mb-1.5">
              Invite code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              className="w-full rounded-lg bg-surface border border-line px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
          </div>
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
              className="w-full rounded-lg bg-surface border border-line px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
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
              autoComplete="new-password"
              minLength={8}
              className="w-full rounded-lg bg-surface border border-line px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
            <p className="text-xs text-muted mt-1">At least 8 characters.</p>
          </div>

          {state?.error && (
            <p className="text-sm text-rust bg-rust/10 border border-rust/30 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}
          {state?.success && (
            <p className="text-sm text-moss bg-moss/10 border border-moss/30 rounded-lg px-3 py-2">
              {state.success}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-accent text-bg font-medium py-2.5 hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Already set up?{" "}
          <Link href="/login" className="text-accent hover:text-accent-hover">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
