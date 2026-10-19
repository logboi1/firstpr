import { GitHubPrEvidence } from "./github-pr-evidence";
import { MergeSync } from "./merge-sync";
import Link from "next/link";
import Form from "next/form";
import { redirect } from "next/navigation";
import { contributions } from "@/lib/contributions/data";
import { contributionFilters } from "@/lib/contributions/validation";
import { ContributionForm,VerificationForm } from "./contribution-forms";
export async function ContributionList({params,curator=false}:{params:Record<string,string|string[]|undefined>;curator?:boolean}) {
  const {page,status}=contributionFilters(params);const {items,total,userId}=await contributions(page,status,curator);
  const pages=Math.max(1,Math.ceil(total/20));const base=curator?"/admin/contributions":"/contributions";
  const href=(page:number)=>`${base}?${new URLSearchParams({status,page:String(page)})}`;
  if(page>pages)redirect(href(pages));
  return <section>{!curator&&<MergeSync/>}<p className="eyebrow">{curator?"CURATOR REVIEW":"MY CONTRIBUTIONS"}</p><h1>{curator?"Review pull requests.":"My pull requests."}</h1><p>Public PR details are checked automatically against GitHub below. Matching merged PRs are automatically marked done. Other submissions can be reviewed by a curator. “Closed” means closed without merging.</p>{params.sent==="1"&&<p role="status" className="archive-note">Pull request submitted for review.</p>}
    <Link className="back-link" href={curator?"/admin/opportunities":"/opportunities"}>{curator?"Manage opportunities →":"Find a task to submit a PR →"}</Link>
    <Form action={base} className="curator-status-filter" key={status}><label htmlFor="contribution-filter">Submission status</label><select id="contribution-filter" name="status" defaultValue={status}><option value="">All statuses</option><option value="submitted">Submitted</option><option value="merged">Merged</option><option value="closed">Closed</option></select><button className="button secondary">Filter submissions</button></Form>
    <p role="status">{total} {total===1?"submission":"submissions"} · Page {page} of {pages}</p>
    {!items.length?<div className="directory-state"><h2>No submissions in this view.</h2><p>{curator?"Choose another status or check back later.":"Open a task and submit your GitHub pull-request URL when it is ready."}</p></div>:<ul className="help-list">{items.map(item=><li className="account-card help-request" key={item.id}><span className="help-status" data-status={item.status}>{item.status}</span><h2>{item.opportunities?.title??"Opportunity unavailable"}</h2><a className="back-link pr-link" href={item.pr_url} target="_blank" rel="noopener noreferrer">{item.pr_url} ↗</a><p className="field-hint">Submitted {new Date(item.created_at).toISOString().slice(0,10)} (UTC)</p>{item.status==="merged"&&<p className="field-hint">Done — this contribution has been merged.</p>}{item.verified_at&&<p className="verification-audit">{item.verification_source==="github"?"Automatically verified by GitHub":"Manually verified by a curator"} · <time dateTime={item.verified_at}>{new Date(item.verified_at).toISOString().replace("T"," ").slice(0,16)} UTC</time></p>}
      <GitHubPrEvidence url={item.pr_url}/>{curator?(item.participant_id===userId?<p>Your submission requires another curator to verify it.</p>:<VerificationForm item={item}/>):item.status==="submitted"?<ContributionForm opportunity={item.opportunity_id} item={item}/>:<p>This PR link is locked after verification. Ask a curator to return it to submitted if it needs correction.</p>}
    </li>)}</ul>}
    {pages>1&&<nav className="directory-pagination" aria-label="Submission pages">{page>1?<Link href={href(page-1)}>Previous page</Link>:<span/>}<span>Page {page} of {pages}</span>{page<pages?<Link href={href(page+1)}>Next page</Link>:<span/>}</nav>}
  </section>;
}
