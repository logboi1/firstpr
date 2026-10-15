export const dynamic = "force-dynamic";
import Link from "next/link";
import { requireProfile } from "@/lib/auth/session";
import { AccountShell } from "@/components/account-shell";
import { SignOutButton } from "@/components/auth-forms";
export default async function Dashboard() {
  const { profile } = await requireProfile();
  return <AccountShell><section className="account-card"><p className="eyebrow">READY FOR YOUR FIRST CONTRIBUTION</p><h1>Welcome, {profile.display_name}.</h1><p>Your profile is ready. Browse published opportunities to find your starting point. Open a task to save checklist progress. The mentor queue is still being built.</p><dl className="profile-summary"><dt>Experience</dt><dd>{profile.experience}</dd><dt>Skills and interests</dt><dd>{profile.skills.join(", ") || "No skills added yet"}</dd><dt>Public progress board</dt><dd>{profile.public_board_consent ? "Opted in" : "Private"}</dd></dl><div className="actions"><Link className="button primary" href="/opportunities">Browse opportunities</Link><Link className="button secondary" href="/profile">Edit profile</Link><SignOutButton/></div></section></AccountShell>;
}
