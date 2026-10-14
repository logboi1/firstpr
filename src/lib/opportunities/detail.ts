import "server-only";
import { z } from "zod";
import { createClient } from "../supabase/server";
import { supabaseConfig } from "../supabase/config";
import { contributionTypes, difficulties } from "./filters";
const url = z.string().url().refine(value => new URL(value).protocol === "https:");
const detailSchema = z.object({
  id:z.string().uuid(),title:z.string(),summary:z.string(),skills:z.array(z.string()),
  contribution_type:z.enum(contributionTypes),difficulty:z.enum(difficulties),repository_url:url,issue_url:url,
  prerequisites:z.string(),setup_notes:z.string(),status:z.enum(["published","archived"]),started:z.boolean(),
  steps:z.array(z.object({id:z.string().uuid(),label:z.string(),position:z.number().int(),completed:z.boolean()})),
});
export type Detail = z.infer<typeof detailSchema>;
export async function getDetail(id:string) {
  if (!supabaseConfig()) return { configured:false as const, detail:null, signedIn:false };
  const supabase=await createClient();
  const {data:auth}=await supabase.auth.getUser();
  const {data,error}=await supabase.rpc("get_opportunity_detail",{wanted:id});
  if(error) throw new Error("Task could not be loaded.");
  return {configured:true as const, detail:data ? detailSchema.parse(data) : null, signedIn:!!auth.user};
}
