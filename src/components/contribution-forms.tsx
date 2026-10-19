"use client";
import { useActionState,useState } from "react";
import { saveContribution,verifyContribution,setContributionClosure } from "@/app/contributions/actions";
import type { Contribution,ContributionState } from "@/lib/contributions/validation";
const initial:ContributionState={};
export function ContributionClosureForm({item,curator=false}:{item:Contribution;curator?:boolean}) {
  const [state,action,pending]=useActionState(setContributionClosure,initial);
  const closed=!!item.closed_at;
  return <form action={action} className="account-form contribution-closure" aria-busy={pending}>
    <input type="hidden" name="contribution_id" value={item.id}/>
    <input type="hidden" name="expected_updated_at" value={item.updated_at}/>
    <input type="hidden" name="closed" value={String(!closed)}/>
    <input type="hidden" name="scope" value={curator?"curator":"participant"}/>
    <p className="field-hint">{closed?"Reopen to put this contribution back in the active list.":"Finished here? Close this contribution to move it out of your active list."} It keeps its merged status and completed count.</p>
    <button className="button secondary" disabled={pending}>{pending?"Saving…":closed?"Reopen contribution":"Close contribution"}</button>
    <p className="form-error" role="alert">{state.error}</p>
  </form>;
}
export function ContributionForm({opportunity,item}:{opportunity:string;item?:Contribution}) {
  const [state,action,pending]=useActionState(saveContribution,initial);
  const [url,setUrl]=useState(item?.pr_url??"");const id=`pr-url-${item?.id??"new"}`;
  return <form action={action} className="account-form" aria-busy={pending}>
    <input type="hidden" name="opportunity_id" value={opportunity}/>{item&&<><input type="hidden" name="contribution_id" value={item.id}/><input type="hidden" name="expected_updated_at" value={item.updated_at}/></>}
    <label htmlFor={id}>GitHub pull-request URL</label><input id={id} name="pr_url" type="url" value={url} onChange={event=>setUrl(event.target.value)} required maxLength={2000} placeholder="https://github.com/owner/repository/pull/123" aria-invalid={!!state.fieldError} aria-describedby={`${id}-hint ${id}-error`}/>
    <p id={`${id}-hint`} className="field-hint">Paste the pull-request link, without query parameters or a fragment. After saving, FirstPR automatically checks public GitHub details, including PR state, author and comment counts. A merged PR is marked done automatically when its author and target repository match your linked account and task. A curator can review other cases. Private or unavailable PRs remain unverified.</p>
    <p id={`${id}-error`} role="alert" className="form-error">{state.fieldError}</p><button className="button primary" disabled={pending}>{pending?"Saving…":item?"Save PR link":"Submit pull request"}</button><p className="form-error" role="alert">{state.error}</p><p role="status">{state.message}</p>
  </form>;
}
export function VerificationForm({item}:{item:Contribution}) {
  const [state,action,pending]=useActionState(verifyContribution,initial);
  return <form action={action} className="account-form" aria-busy={pending}>
    <input type="hidden" name="contribution_id" value={item.id}/><input type="hidden" name="expected_updated_at" value={item.updated_at}/>
    <label htmlFor={`decision-${item.id}`}>Manual verification decision</label><select id={`decision-${item.id}`} name="status" required defaultValue=""><option value="" disabled>Choose a decision</option>{item.status!=="merged"&&<option value="merged">Merged on GitHub</option>}{item.status!=="closed"&&<option value="closed">Closed without merging</option>}{item.status!=="submitted"&&<option value="submitted">Return to submitted (correct verification)</option>}</select>
    <label className="checkbox-label"><input type="checkbox" name="checked" required/> I checked this PR on GitHub, including its author, target repository and current status.</label>
    <button className="button secondary" disabled={pending}>{pending?"Saving…":"Record manual decision"}</button><p className="form-error" role="alert">{state.error}</p><p role="status">{state.message}</p>
  </form>;
}
