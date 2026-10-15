"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { curatorContext } from "@/lib/curator/data";
import { contributionInput,reviewInput,type ContributionState } from "@/lib/contributions/validation";
function refresh() {revalidatePath("/contributions");revalidatePath("/admin/contributions");revalidatePath("/dashboard");revalidatePath("/progress");}
export async function saveContribution(_previous:ContributionState,form:FormData):Promise<ContributionState> {
  const parsed=contributionInput.safeParse({opportunity_id:form.get("opportunity_id"),pr_url:form.get("pr_url"),contribution_id:form.get("contribution_id")||undefined,expected_updated_at:form.get("expected_updated_at")||undefined});
  if(!parsed.success){const issue=parsed.error.issues[0];return issue.path[0]==="pr_url"?{fieldError:issue.message}:{error:issue.message};}
  const {opportunity_id,pr_url,contribution_id,expected_updated_at}=parsed.data;
  try {
    if(!supabaseConfig())return {error:"Sign in to submit a pull request."};
    const supabase=await createClient();const {data:auth,error:authError}=await supabase.auth.getUser();
    if(authError||!auth.user)return {error:"Your session has expired. Sign in again."};
    if(contribution_id){
      const {data,error}=await supabase.from("contributions").update({pr_url}).eq("id",contribution_id).eq("participant_id",auth.user.id).eq("opportunity_id",opportunity_id).eq("status","submitted").eq("updated_at",expected_updated_at!).select("id");
      if(error?.code==="23505")return {fieldError:"You already submitted this pull request."};
      if(error||!data?.length)return {error:"This submission changed or is no longer editable. Refresh before trying again."};
    } else {
      const {error:startError}=await supabase.rpc("start_opportunity",{wanted:opportunity_id});
      if(startError)return {error:"This task is unavailable. Refresh the task before submitting."};
      // Ownership and submitted status come only from database defaults.
      const {error}=await supabase.from("contributions").insert({opportunity_id,pr_url});
      if(error?.code==="23505")return {fieldError:"You already submitted this pull request."};
      if(error)return {error:"Your PR could not be saved. Your link is still here; try again."};
    }
  } catch {return {error:"We could not reach the submission service. Your link is still here; try again."};}
  refresh();revalidatePath(`/opportunities/${opportunity_id}`);
  if(!contribution_id)redirect("/contributions?sent=1");
  return {message:"PR link saved."};
}
export async function verifyContribution(_previous:ContributionState,form:FormData):Promise<ContributionState> {
  const parsed=reviewInput.safeParse({contribution_id:form.get("contribution_id"),expected_updated_at:form.get("expected_updated_at"),status:form.get("status"),checked:form.get("checked")});
  if(!parsed.success)return {error:parsed.error.issues[0].message};
  try {
    const context=await curatorContext();
    if(!context)return {error:"Your session has expired. Sign in again."};
    if(!context.allowed)return {error:"Curator access is required."};
    const {contribution_id,expected_updated_at,status}=parsed.data;
    // Guard against self-verification, a changed PR link, and another curator's decision.
    const {data,error}=await context.supabase.from("contributions").update({status}).eq("id",contribution_id)
      .neq("participant_id",context.user.id).eq("updated_at",expected_updated_at).neq("status",status).select("id");
    if(error||!data?.length)return {error:"This submission changed, is your own, or is unavailable. Refresh and check the PR again."};
  } catch {return {error:"The verification could not be saved. Try again."};}
  refresh();return {message:parsed.data.status==="submitted"?"Returned to submitted; verification audit cleared.":"Manual verification recorded."};
}
