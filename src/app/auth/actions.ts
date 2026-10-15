"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { profileInput, type FormState } from "@/lib/auth/validation";
export async function startGitHubSignIn(): Promise<void> {
  if (!supabaseConfig()) redirect("/sign-in");
  const origin = (await headers()).get("origin");
  if (!origin) redirect("/sign-in?error=oauth");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: new URL(
        "/auth/callback?next=%2Fdashboard",
        origin,
      ).toString(),
    },
  });
  if (error || !data.url) redirect("/sign-in?error=oauth");
  redirect(data.url);
}
export async function saveProfile(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  if (!supabaseConfig())
    return { error: "Sign-in is required to save a profile." };
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user)
    return {
      error: "Your session has expired. Sign in again to save your profile.",
    };
  const parsed = profileInput(form);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  // Never take an owner ID or elevated role from the submitted form.
  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ ...parsed.data, onboarding_completed: true })
    .eq("id", data.user.id)
    .select("id")
    .single();
  if (error || !updated)
    return {
      error:
        "Your profile could not be saved. Try again; contact the maintainer if this continues.",
    };
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
