"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button, Field, Input, Notice, Spinner } from "@/components/ui";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/today";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);

    const supabase = supabaseBrowser();

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // When email confirmation is on, there is no session yet.
        if (!data.session) {
          setNotice("Check your email for a confirmation link, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-10">
          <div className="mb-7 flex gap-1.5" aria-hidden="true">
            <span className="h-9 w-4 rounded-sm bg-lime" />
            <span className="h-9 w-4 rounded-sm bg-lime" />
            <span className="h-9 w-4 rounded-sm bg-line" />
            <span className="h-9 w-4 rounded-sm bg-line" />
          </div>
          <h1 className="ex-tight text-4xl leading-[0.95] font-bold">Circuit Book</h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
            Your workouts and drills, set into routines by day, and worked through one station
            at a time.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              required
              placeholder="you@example.com"
            />
          </Field>

          <Field
            label="Password"
            hint={mode === "signup" ? "At least 6 characters." : undefined}
          >
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </Field>

          {error && <Notice>{error}</Notice>}
          {notice && (
            <p className="rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-muted">
              {notice}
            </p>
          )}

          <Button type="submit" size="lg" disabled={busy}>
            {busy && <Spinner />}
            {mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {mode === "signup" ? "Already set up?" : "First time here?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setError(null);
              setNotice(null);
            }}
            className="font-semibold text-lime underline underline-offset-4"
          >
            {mode === "signup" ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </main>
  );
}
