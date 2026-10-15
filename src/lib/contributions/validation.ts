import { z } from "zod";
const uuid = z.string().uuid();
export const prUrl = z.string().trim().max(2000).regex(/^https:\/\/github\.com\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\/[a-z0-9_.-]+\/pull\/[1-9][0-9]*$/i,"Use a GitHub PR link: https://github.com/owner/repository/pull/123").refine(value=>![".",".."].includes(value.split("/")[4]),"Use a repository pull-request URL.").transform(value=>value.toLowerCase());
export const contributionInput = z.object({
  opportunity_id:uuid, pr_url:prUrl,
  contribution_id:uuid.optional(), expected_updated_at:z.string().datetime({offset:true}).optional(),
}).superRefine((value,context)=>{if(value.contribution_id&&!value.expected_updated_at)context.addIssue({code:"custom",message:"Refresh this submission before editing.",path:["expected_updated_at"]});});
export const reviewInput = z.object({
  contribution_id:uuid, expected_updated_at:z.string().datetime({offset:true}),
  status:z.enum(["submitted","merged","closed"]), checked:z.literal("on",{error:"Confirm that you checked the pull request on GitHub."}),
});
export const contributionSchema = z.object({
  id:uuid, opportunity_id:uuid, participant_id:uuid, pr_url:prUrl,
  status:z.enum(["submitted","merged","closed"]), verifier_id:uuid.nullable(),verified_at:z.string().nullable(),
  created_at:z.string(),updated_at:z.string(),opportunities:z.object({title:z.string()}).nullable(),
});
export type Contribution = z.infer<typeof contributionSchema>;
export type ContributionState = {error?:string;fieldError?:string;message?:string};
export function contributionFilters(params:Record<string,string|string[]|undefined>) {
  return {page:typeof params.page==="string"&&/^\d{1,6}$/.test(params.page)?Math.max(1,Number(params.page)):1,
    status:typeof params.status==="string"&&["submitted","merged","closed"].includes(params.status)?params.status:""};
}
