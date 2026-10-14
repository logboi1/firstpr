"use client";
import { useActionState, useRef } from "react";
import { startTask, setStep } from "@/app/opportunities/checklist-actions";
import type { Detail } from "@/lib/opportunities/detail";
import type { ChecklistState } from "@/lib/opportunities/checklist-input";
const initial:ChecklistState={};
function Feedback({state}:{state:ChecklistState}) { return <><p role="alert" className="form-error">{state.error}</p><p role="status" className="step-feedback">{state.message}</p></>; }
export function StartTask({id}:{id:string}) {
  const [state,action,pending]=useActionState(startTask,initial);
  return <form action={action}><input type="hidden" name="opportunity_id" value={id}/><button className="button primary" disabled={pending}>{pending ? "Starting…" : "Start this task"}</button><Feedback state={state}/></form>;
}
function ChecklistStep({task,step}:{task:string;step:Detail["steps"][number]}) {
  const [state,action,pending]=useActionState(setStep,initial);
  const form=useRef<HTMLFormElement>(null);
  return <li className={`checklist-step ${step.completed ? "is-complete" : ""}`}><form action={action} ref={form} aria-busy={pending}><input type="hidden" name="opportunity_id" value={task}/><input type="hidden" name="step_id" value={step.id}/><input type="hidden" name="completed" value={String(!step.completed)}/><label><input type="checkbox" checked={step.completed} disabled={pending} onChange={()=>form.current?.requestSubmit()}/><span>{step.label}</span></label><span className="step-save">{pending ? "Saving…" : step.completed ? "Completed" : "Not completed"}</span><Feedback state={state}/></form></li>;
}
export function TaskChecklist({detail}:{detail:Detail}) {
  const completed=detail.steps.filter(step=>step.completed).length;
  return <><p className="checklist-count">{completed} of {detail.steps.length} steps completed</p><progress aria-label="Checklist completion" value={completed} max={detail.steps.length||1}/><ol className="task-checklist">{detail.steps.map(step=><ChecklistStep key={`${step.id}-${step.completed}`} task={detail.id} step={step}/>)}</ol><p className="field-hint">Progress saves when you change a checkbox. Completing steps does not submit or verify a pull request.</p></>;
}
