import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { getDetail } from "@/lib/opportunities/detail";
import { requestId } from "@/lib/help/validation";
import { HelpForm } from "@/components/help-forms";
export const dynamic = "force-dynamic";
export const metadata = { title: "Request help — FirstPR" };
export default async function NewHelp({ searchParams }: { searchParams: Promise<{ opportunity?: string }> }) {
  await requireProfile();
  const { opportunity } = await searchParams;
  if (!requestId.safeParse(opportunity).success) notFound();
  const { detail } = await getDetail(opportunity!);
  if (!detail) notFound();
  return <section className="account-card"><Link className="back-link" href={`/opportunities/${detail.id}`}>← Back to task</Link><p className="eyebrow">ASK FOR A HAND</p><h1>Request help.</h1><h2>{detail.title}</h2><p>Share a specific blocker. Your request is private to you and authorized mentors. You can cancel it while it is open or claimed.</p>{detail.status === "archived" && <p className="archive-note">This task is archived. Existing participants can still request help.</p>}<HelpForm opportunity={detail.id}/><Link href="/help">View my help requests</Link></section>;
}
