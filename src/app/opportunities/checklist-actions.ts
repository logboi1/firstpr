"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { taskId, checklistInput, type ChecklistState } from "@/lib/opportunities/checklist-input";
export async function startTask(_previous:ChecklistState,form:FormData):Promise<ChecklistState> {
  const id=taskId.safeParse(form.get("opportunity_id"));
  if(!id.success) return {error:"That task link is invalid. Return to the directory."};
  if(!supabaseConfig()) return {error:"Sign in to start this task."};
  const supabase=await createClient();
  const {data,error:authError}=await supabase.auth.getUser();
  if(authError||!data.user) return {error:"Your session has expired. Sign in again."};
  const {error}=await supabase.rpc("start_opportunity",{wanted:id.data});
  if(error) return {error:"This task could not be started. It may have been archived. Refresh the page and try again."};
  revalidatePath(`/opportunities/${id.data}`);
  return {message:"Task started. Your checklist is ready."};
}
export async function setStep(_previous:ChecklistState,form:FormData):Promise<ChecklistState> {
  const parsed=checklistInput.safeParse({opportunity_id:form.get("opportunity_id"),step_id:form.get("step_id"),completed:form.get("completed")});
  if(!parsed.success) return {error:"That checklist step is invalid. Refresh the page."};
  if(!supabaseConfig()) return {error:"Sign in to save checklist progress."};
  const supabase=await createClient();
  const {data,error:authError}=await supabase.auth.getUser();
  if(authError||!data.user) return {error:"Your session has expired. Sign in again to save progress."};
  const {opportunity_id,step_id,completed}=parsed.data;
  // The database derives ownership from auth.uid(); submitted participant IDs are ignored.
  const {error}=await supabase.rpc("set_checklist_step",{wanted:opportunity_id,step:step_id,completed:completed==="true"});
  if(error) return {error:"Progress could not be saved. Refresh and try again; the task or step may no longer be available."};
  revalidatePath(`/opportunities/${opportunity_id}`);
  return {message:completed==="true" ? "Step completed." : "Step marked incomplete."};
}
