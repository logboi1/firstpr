import "server-only";
import { requireProfile } from "@/lib/auth/session";
import { requireCurator } from "@/lib/curator/data";
import { contributionSchema } from "./validation";
export async function contributions(page:number,status:string,curator=false,view:"active"|"closed"|"all"="active") {
  const {supabase,user}=curator ? await requireCurator() : await requireProfile();
  let query=supabase.from("contributions").select("id,opportunity_id,participant_id,pr_url,status,verifier_id,verified_at,verification_source,github_merged_at,closed_at,created_at,updated_at,opportunities(title)",{count:"exact"});
  // Curators have broad RLS reads, but their participant screen is still own-only.
  if(!curator) query=query.eq("participant_id",user.id);
  if(status) query=query.eq("status",status);
  if(view==="active")query=query.is("closed_at",null);
  if(view==="closed")query=query.not("closed_at","is",null);
  const {data,error,count}=await query.order("created_at",{ascending:false}).order("id",{ascending:false}).range((page-1)*20,page*20-1);
  if(error)throw new Error("Pull-request submissions could not be loaded.");
  return {items:contributionSchema.array().parse(data),total:count??0,userId:user.id};
}
