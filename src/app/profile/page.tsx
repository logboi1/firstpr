export const dynamic = "force-dynamic";
import { requireProfile } from "@/lib/auth/session";
import { AccountShell } from "@/components/account-shell";
import { ProfileForm, SignOutButton } from "@/components/auth-forms";
export default async function EditProfile() {
  const { profile } = await requireProfile();
  return <AccountShell><section className="account-card"><p className="eyebrow">YOUR ACCOUNT</p><h1>Edit your profile.</h1><ProfileForm profile={profile}/><SignOutButton/></section></AccountShell>;
}
