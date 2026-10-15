import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { queueSchema, requestSchema, type QueueFilter } from "./validation";
export async function mentorContext() {
  if (!supabaseConfig()) return null;
  const supabase = await createClient();
  const {data,error} = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const {data:role,error:roleError} = await supabase.from("user_roles").select("role").eq("user_id",data.user.id).eq("role","mentor").maybeSingle();
  if (roleError) throw new Error("Mentor access could not be checked.");
  return {supabase,user:data.user,allowed:!!role};
}
export async function requireMentor() {
  const context = await mentorContext();
  if (!context) redirect("/sign-in");
  if (!context.allowed) notFound();
  return context;
}
export async function mentorQueue(page:number,filter:QueueFilter) {
  const {supabase} = await requireMentor();
  const {data,error} = await supabase.rpc("list_mentor_help",{page_number:page,queue_filter:filter});
  if (error) throw new Error("The mentor queue could not be loaded.");
  return queueSchema.parse(data);
}
export async function mentorRequest(id:string,page:number) {
  const {supabase} = await requireMentor();
  const {data,error} = await supabase.rpc("get_help_request",{wanted:id,mentor_view:true,response_page:page});
  if (error) throw new Error("The request could not be loaded.");
  if (!data) notFound();
  return requestSchema.parse(data);
}
