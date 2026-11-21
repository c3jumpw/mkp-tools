"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Couldn't sign in — check your email and password." };
  }

  redirect("/home");
}

export async function signup(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const code = String(formData.get("code") || "");

  if (code !== process.env.SIGNUP_CODE) {
    return { error: "That invite code isn't right." };
  }
  if (!email || password.length < 8) {
    return { error: "Enter an email and a password of at least 8 characters." };
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return {
      success:
        "Account created. Check your email to confirm it, then sign in.",
    };
  }

  redirect("/home");
}
