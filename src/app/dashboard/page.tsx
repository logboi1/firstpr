import {mentorContext} from "@/lib/mentor/data";
import {curatorContext} from "@/lib/curator/data";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { requireProfile } from "@/lib/auth/session";
import { AccountShell } from "@/components/account-shell";
import { SignOutButton } from "@/components/auth-forms";
export default async function Dashboard() {
  const { profile } = await requireProfile();
  const [curator,mentor]=await Promise.all([curatorContext(),mentorContext()]);
  return <AccountShell><section className="account-card"><p className="eyebrow">READY FOR YOUR FIRST CONTRIBUTION</p><h1>Welcome, {profile.display_name}.</h1><p>Your profile is ready. Browse published opportunities to find your starting point. Open a task to save checklist progress. You can also describe blockers and track your private help requests.</p><dl className="profile-summary"><dt>Experience</dt><dd>{profile.experience}</dd><dt>Skills and interests</dt><dd>{profile.skills.join(", ") || "No skills added yet"}</dd><dt>Public progress board</dt><dd>{profile.public_board_consent ? "Opted in" : "Private"}</dd></dl><div className="actions"><Link className="button primary" href="/opportunities">Browse opportunities</Link><Link className="button secondary" href="/profile">Edit profile</Link>{curator?.allowed&&<Link className="button secondary" href="/admin/opportunities">Curator workspace</Link>}{mentor?.allowed&&<Link className="button secondary" href="/mentor/help">Mentor queue</Link>}<Link className="button secondary" href="/help">My help requests</Link><SignOutButton/></div></section></AccountShell>;
}
