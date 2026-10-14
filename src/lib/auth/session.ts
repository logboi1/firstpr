import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { supabaseConfig } from "../supabase/config";
import type { Profile } from "./validation";
export async function requireUser() {
  if (!supabaseConfig()) redirect("/sign-in");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/sign-in");
  return { supabase, user: data.user };
}
export async function requireProfile(completed = true) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("profiles")
    .select("display_name,skills,experience,public_board_consent,onboarding_completed")
    .eq("id", user.id).single();
  if (error || !data) throw new Error("Your profile could not be loaded. Try again or contact the maintainer.");
  const profile = data as Profile;
  if (completed && !profile.onboarding_completed) redirect("/onboarding");
  return { supabase, user, profile };
}
