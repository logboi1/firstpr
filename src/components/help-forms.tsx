"use client";
import { useActionState, useState } from "react";
import { requestHelp, cancelHelp } from "@/app/help/actions";
import type { HelpState } from "@/lib/help/validation";
const initial: HelpState = {};
export function HelpForm({ opportunity }: { opportunity: string }) {
  const [state, action, pending] = useActionState(requestHelp, initial);
  const [blocker, setBlocker] = useState("");
  return <form action={action} className="account-form" aria-busy={pending}>
    <input type="hidden" name="opportunity_id" value={opportunity}/>
    <label htmlFor="blocker">What is blocking you?</label>
    <p id="blocker-hint" className="field-hint">Describe what you tried, what you expected, and any error message. Do not include passwords, access tokens, or other secrets.</p>
    <textarea id="blocker" name="blocker" rows={8} required maxLength={4000} value={blocker} onChange={event => setBlocker(event.target.value)} aria-describedby="blocker-hint blocker-count"/>
    <p id="blocker-count" className="field-hint">{blocker.length.toLocaleString()} / 4,000 characters</p>
    <button className="button primary" disabled={pending}>{pending ? "Sending…" : "Send help request"}</button>
    <p className="form-error" role="alert">{state.error}</p>
  </form>;
}
export function CancelHelp({ id }: { id: string }) {
  const [state, action, pending] = useActionState(cancelHelp, initial);
  return <form action={action} aria-busy={pending}><input type="hidden" name="request_id" value={id}/><button className="button secondary" disabled={pending}>{pending ? "Cancelling…" : "Cancel request"}</button><p className="form-error" role="alert">{state.error}</p><p role="status">{state.message}</p></form>;
}
