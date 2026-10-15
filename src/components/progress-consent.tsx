"use client";
import {useActionState} from "react";
import {setPublicConsent} from "@/app/dashboard/actions";
import type {FormState} from "@/lib/auth/validation";
const initial:FormState={};
export function ProgressConsent({enabled}:{enabled:boolean}){
  const [state,action,pending]=useActionState(setPublicConsent,initial);
  return <form action={action} aria-busy={pending}><input type="hidden" name="enabled" value={String(!enabled)}/><p>{enabled?"Your contribution records are public.":"Your contribution records are private."} The public board shows your display name, PR links, recorded statuses and submission dates. Your profile details, checklist and help requests stay private. You can change this setting at any time.</p><button className="button secondary" disabled={pending}>{pending?"Saving…":enabled?"Make my progress private":"Join public progress"}</button><p className="form-error" role="alert">{state.error}</p><p role="status">{state.message}</p></form>;
}
