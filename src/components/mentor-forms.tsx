"use client";
import { useActionState, useState } from "react";
import { mentorAction } from "@/app/mentor/help/actions";
import type { MentorState } from "@/lib/mentor/validation";
const initial:MentorState = {};
function Feedback({state}:{state:MentorState}) {return <><p className="form-error" role="alert">{state.error}</p><p role="status">{state.message}</p></>;}
export function MentorTransition({id,action}:{id:string;action:"claim"|"release"}) {
  const [state,submit,pending] = useActionState(mentorAction,initial);
  return <form action={submit} aria-busy={pending}><input type="hidden" name="request_id" value={id}/><input type="hidden" name="action" value={action}/><button className="button secondary" disabled={pending}>{pending ? "Saving…" : action === "claim" ? "Claim request" : "Release request"}</button><Feedback state={state}/></form>;
}
function GuidanceEditor({submit,pending}:{submit:(form:FormData)=>void;pending:boolean}) {
  const [response,setResponse] = useState("");
  return <form action={submit} className="account-form" aria-busy={pending}>
    <label htmlFor="mentor-response">Guidance for the participant</label><p id="response-hint" className="field-hint">Explain the next step or how the blocker was resolved. Sent guidance stays in the private request history, including after release. Do not include credentials or other secrets.</p>
    <textarea id="mentor-response" name="response" rows={7} value={response} onChange={event=>setResponse(event.target.value)} required maxLength={4000} aria-describedby="response-hint response-count"/>
    <p id="response-count" className="field-hint">{response.length.toLocaleString()} / 4,000 characters</p>
    <div className="actions"><button className="button primary" name="action" value="respond" disabled={pending}>{pending ? "Saving…" : "Send guidance"}</button><button className="button secondary" name="action" value="resolve" disabled={pending}>Send guidance and resolve</button></div>
  </form>;
}
export function MentorGuidance({id}:{id:string}) {
  const [state,submit,pending] = useActionState(mentorAction,initial);
  const action = (form:FormData)=>{form.set("request_id",id);submit(form);};
  // Clear only after confirmed success; failed actions preserve the controlled text.
  return <section><GuidanceEditor key={state.saved ?? 0} submit={action} pending={pending}/><Feedback state={state}/></section>;
}
