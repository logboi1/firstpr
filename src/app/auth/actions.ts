"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { codeSchema, emailSchema, profileInput, type FormState } from "@/lib/auth/validation";
export async function sendCode(_previous: FormState, form: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  if (!supabaseConfig()) return { error: "Sign-in is not configured yet. Contact the maintainer." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email: email.data });
  if (error) return { error: "We could not send a code. Wait a minute and try again." };
  return { email: email.data, message: "Check your email for a sign-in code. It can take a minute to arrive." };
}
export async function verifyCode(_previous: FormState, form: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(form.get("email"));
  const token = codeSchema.safeParse(form.get("code"));
  if (!email.success || !token.success) return { error: "Enter your email and the code from your inbox." };
  if (!supabaseConfig()) return { error: "Sign-in is not configured yet." };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.data, token: token.data, type: "email" });
  if (error) return { error: "That code is invalid or expired. Check it or request a new code." };
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
export async function saveProfile(_previous: FormState, form: FormData): Promise<FormState> {
  if (!supabaseConfig()) return { error: "Sign-in is required to save a profile." };
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) return { error: "Your session has expired. Sign in again to save your profile." };
  const parsed = profileInput(form);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  // Never take an owner ID or elevated role from the submitted form.
  const { data: updated, error } = await supabase.from("profiles")
    .update({ ...parsed.data, onboarding_completed: true }).eq("id", data.user.id).select("id").single();
  if (error || !updated) return { error: "Your profile could not be saved. Try again; contact the maintainer if this continues." };
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
export async function signOut(): Promise<FormState> {
  if (!supabaseConfig()) return { error: "Sign-in is not configured yet." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) return { error: "We could not sign you out. Please try again." };
  revalidatePath("/", "layout");
  redirect("/sign-in");
}
