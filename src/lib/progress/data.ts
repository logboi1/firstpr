import "server-only";
import {createClient} from "@/lib/supabase/server";
import {supabaseConfig} from "@/lib/supabase/config";
import {dashboardSchema,publicBoardSchema} from "./validation";
export async function dashboardData(supabase:Awaited<ReturnType<typeof createClient>>,page:number){
  const {data,error}=await supabase.rpc("get_participant_dashboard",{page_number:page});
  if(error)throw new Error("Your progress could not be loaded.");
  return dashboardSchema.parse(data);
}
export async function publicBoard(page:number,status:string){
  if(!supabaseConfig())return null;
  const supabase=await createClient();
  const {data,error}=await supabase.rpc("get_public_progress_board",{page_number:page,status_filter:status});
  if(error)throw new Error("Public progress could not be loaded.");
  return publicBoardSchema.parse(data);
}
