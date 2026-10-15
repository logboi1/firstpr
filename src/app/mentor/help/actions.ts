"use server";
import { revalidatePath } from "next/cache";
import { mentorContext } from "@/lib/mentor/data";
import { mentorInput, type MentorState } from "@/lib/mentor/validation";
export async function mentorAction(previous:MentorState,form:FormData):Promise<MentorState> {
  const fail = (error:string):MentorState => ({error,saved:previous.saved});
  const parsed = mentorInput.safeParse({request_id:form.get("request_id"),action:form.get("action"),response:form.get("response") ?? ""});
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  try {
    const context = await mentorContext();
    if (!context) return fail("Your session has expired. Sign in again.");
    if (!context.allowed) return fail("Mentor access is required. Your text is still here.");
    const {request_id,action,response} = parsed.data;
    // The RPC derives the assignee from auth.uid() and checks the live role.
    const {error} = await context.supabase.rpc("mentor_help_action",{wanted:request_id,action,response});
    if (error) return fail(error.code === "40001" ? "This request changed or was claimed by another mentor. Refresh to see its current status." : "Your change could not be saved. Refresh and check your mentor access before retrying.");
    revalidatePath("/mentor/help");
    revalidatePath(`/mentor/help/${request_id}`);
    revalidatePath("/help");
    revalidatePath(`/help/${request_id}`);
    const messages = {claim:"Request claimed.",release:"Request released to the open queue.",respond:"Guidance sent.",resolve:"Guidance sent and request resolved."};
    return {message:messages[action],saved:(previous.saved ?? 0)+1};
  } catch {
    return fail("We could not reach the help service. Your text is still here; try again.");
  }
}
