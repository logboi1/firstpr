import Link from "next/link";
import {notFound} from "next/navigation";
import {requireProfile} from "@/lib/auth/session";
import {getDetail} from "@/lib/opportunities/detail";
import {requestId} from "@/lib/help/validation";
import {ContributionForm} from "@/components/contribution-forms";
export const dynamic="force-dynamic";
export const metadata={title:"Submit a pull request — FirstPR"};
export default async function Page({searchParams}:{searchParams:Promise<{opportunity?:string}>}) {
  await requireProfile();const {opportunity}=await searchParams;if(!requestId.safeParse(opportunity).success)notFound();
  const {detail}=await getDetail(opportunity!);if(!detail)notFound();
  return <section className="account-card"><Link className="back-link" href={`/opportunities/${detail.id}`}>← Back to task</Link><h1>Submit your pull request.</h1><h2>{detail.title}</h2>{detail.status==="archived"&&<p className="archive-note">This task is archived. Existing participants can still submit their work.</p>}<ContributionForm opportunity={detail.id}/><Link className="back-link" href="/contributions">My pull requests →</Link></section>;
}
