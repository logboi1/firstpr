import Link from "next/link";
import { CancelHelp } from "./help-forms";
import { MentorGuidance, MentorTransition } from "./mentor-forms";
import type { RequestDetail } from "@/lib/mentor/validation";
export function HelpRequestDetail({request,mentor=false}:{request:RequestDetail;mentor?:boolean}) {
  const base = mentor ? "/mentor/help" : "/help";
  const active = request.status === "open" || request.status === "claimed";
  return <article className="account-card help-request"><Link className="back-link" href={base}>← {mentor ? "Back to mentor queue" : "My help requests"}</Link><p className="eyebrow">PRIVATE HELP REQUEST</p><h1>{request.title ?? "Task help request"}</h1><p className="help-status" data-status={request.status}>{request.status}{request.status === "claimed" ? request.assigned_to_you ? " · Assigned to you" : " · Assigned to a mentor" : ""}</p>
    {request.title ? <Link className="back-link" href={`/opportunities/${request.opportunity_id}`}>View task instructions →</Link> : <p className="field-hint">Task instructions are restricted or unavailable. The blocker and guidance remain accessible here.</p>}
    <h2>Participant blocker</h2><p className="instruction-text">{request.blocker}</p>
    <p className="field-hint">Requested <time dateTime={request.created_at}>{new Date(request.created_at).toISOString().slice(0,10)}</time> (UTC)</p>
    {!mentor && active && <CancelHelp id={request.id}/>}
    {mentor && request.status === "open" && <MentorTransition id={request.id} action="claim"/>}
    {mentor && request.status === "claimed" && request.assigned_to_you && <><MentorGuidance id={request.id}/><p className="field-hint">Release this request if another mentor should take over. Sent guidance will be kept.</p><MentorTransition id={request.id} action="release"/></>}
    {mentor && request.status === "claimed" && !request.assigned_to_you && <p>Another mentor is handling this request. Only the assigned mentor can respond, release, or resolve it.</p>}
    <section aria-labelledby="guidance-title"><h2 id="guidance-title">Mentor guidance</h2><p>Refresh this page to see new guidance or status changes.</p>{!request.responses.length ? <p>No guidance has been sent yet.</p> : <><p>{request.response_total} {request.response_total === 1 ? "response" : "responses"} · Newest first</p><ol className="help-list">{request.responses.map(note=><li className="mentor-note" key={note.id}><p className="field-hint">{mentor && note.is_you ? "Your guidance" : "Mentor guidance"} · <time dateTime={note.created_at}>{new Date(note.created_at).toISOString().replace("T"," ").slice(0,16)} UTC</time></p><p className="instruction-text">{note.body}</p></li>)}</ol><nav className="actions" aria-label="Guidance pages">{request.response_page>1 && <Link className="button secondary" href={`${base}/${request.id}?page=${request.response_page-1}`}>Newer guidance</Link>}{request.response_page<request.response_pages && <Link className="button secondary" href={`${base}/${request.id}?page=${request.response_page+1}`}>Older guidance</Link>}</nav></>}</section>
  </article>;
}
