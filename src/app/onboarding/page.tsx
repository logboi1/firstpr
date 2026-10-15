export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { AccountShell } from "@/components/account-shell";
import { ProfileForm } from "@/components/auth-forms";
export default async function Onboarding() {
  const { profile } = await requireProfile(false);
  if (profile.onboarding_completed) redirect("/dashboard");
  return <AccountShell publicNavigation><section className="account-card"><p className="eyebrow">LET’S GET YOU STARTED</p><h1>Make yourself at home.</h1><p>Tell us what you know and what you’re curious about.</p><ProfileForm profile={profile}/></section></AccountShell>;
}
