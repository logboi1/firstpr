import Link from "next/link";
import Form from "next/form";
import { mentorQueue } from "@/lib/mentor/data";
import { parseQueue, queueFilters } from "@/lib/mentor/validation";
import { MentorTransition } from "@/components/mentor-forms";
export const dynamic="force-dynamic";
export const metadata={title:"Mentor help queue — FirstPR"};
const labels={open:"Open requests",mine:"Assigned to me",claimed:"All claimed",resolved:"Resolved",cancelled:"Cancelled",all:"All requests"};
export default async function Queue({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {page,filter}=parseQueue(await searchParams);
  const data=await mentorQueue(page,filter);
  const href=(page:number)=>`/mentor/help?${new URLSearchParams({view:filter,page:String(page)})}`;
  return <section><p className="eyebrow">MENTOR WORKSPACE</p><h1>Help someone move forward.</h1><p>Claim an open request, share useful guidance, and resolve it when the blocker is addressed. Blockers and responses stay private to the participant and authorized mentors.</p><Link className="back-link" href="/help">My participant requests →</Link>
    <Form action="/mentor/help" className="curator-status-filter" key={filter}><label htmlFor="queue-filter">Queue view</label><select id="queue-filter" name="view" defaultValue={filter}>{queueFilters.map(value=><option key={value} value={value}>{labels[value]}</option>)}</select><button className="button secondary">Filter requests</button></Form>
    <p role="status">{data.total} {data.total===1 ? "request" : "requests"} · Page {data.page} of {data.pages}</p>
    {!data.items.length ? <div className="directory-state"><h2>No requests in this view.</h2><p>Choose another view or check back later.</p></div> : <ul className="help-list">{data.items.map(item=><li className="account-card help-request" key={item.id}><span className="help-status">{item.status}{item.assigned_to_you ? " · Assigned to you" : ""}</span><h2>{item.title ?? "Task help request"}</h2><p className="instruction-text">{item.blocker}</p><p className="field-hint">Requested {new Date(item.created_at).toISOString().slice(0,10)} (UTC)</p><Link className="back-link" href={`/mentor/help/${item.id}`} prefetch={false}>Open request and guidance →</Link>{item.status==="open"&&<MentorTransition id={item.id} action="claim"/>}</li>)}</ul>}
    {data.pages>1 && <nav className="directory-pagination" aria-label="Mentor queue pages">{data.page>1 ? <Link href={href(data.page-1)}>Previous page</Link> : <span/>}<span>Page {data.page} of {data.pages}</span>{data.page<data.pages ? <Link href={href(data.page+1)}>Next page</Link> : <span/>}</nav>}
  </section>;
}
