"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { helpInput, requestId, type HelpState } from "@/lib/help/validation";
async function actor() {
  if (!supabaseConfig()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : { supabase, user: data.user };
}
export async function requestHelp(_previous: HelpState, form: FormData): Promise<HelpState> {
  const parsed = helpInput.safeParse({ opportunity_id: form.get("opportunity_id"), blocker: form.get("blocker") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const context = await actor();
    if (!context) return { error: "Your session has expired. Sign in again to request help." };
    const { supabase } = context;
    // Starting first records durable participation and serializes with archival.
    // An archived task is accepted only for an existing participant.
    const { error: startError } = await supabase.rpc("start_opportunity", { wanted: parsed.data.opportunity_id });
    if (startError) return { error: "This task is unavailable. Refresh the task before requesting help." };
    // Ownership, status and assignment come from database defaults, never form fields.
    const { error } = await supabase.from("help_requests").insert(parsed.data);
    if (error) return { error: "Your request could not be saved. Your description is still here; try again." };
  } catch {
    return { error: "We could not reach the help service. Your description is still here; try again." };
  }
  revalidatePath("/help");
  revalidatePath(`/opportunities/${parsed.data.opportunity_id}`);
  redirect("/help?sent=1");
}
export async function cancelHelp(_previous: HelpState, form: FormData): Promise<HelpState> {
  const id = requestId.safeParse(form.get("request_id"));
  if (!id.success) return { error: "That request link is invalid. Refresh your requests." };
  try {
    const context = await actor();
    if (!context) return { error: "Your session has expired. Sign in again to cancel this request." };
    const { data, error } = await context.supabase.from("help_requests")
      .update({ status: "cancelled" }).eq("id", id.data).eq("participant_id", context.user.id)
      .in("status", ["open", "claimed"]).select("id");
    if (error || !data?.length) return { error: "This request could not be cancelled. Refresh to see its current status." };
  } catch {
    return { error: "We could not reach the help service. Try again." };
  }
  revalidatePath("/help");
  revalidatePath(`/help/${id.data}`);
  revalidatePath("/mentor/help");
  revalidatePath(`/mentor/help/${id.data}`);
  return { message: "Request cancelled." };
}
