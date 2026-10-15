import { z } from "zod";
export const queueFilters = ["open", "mine", "claimed", "resolved", "cancelled", "all"] as const;
export type QueueFilter = typeof queueFilters[number];
export function parseQueue(params: Record<string, string | string[] | undefined>) {
  const filter = queueFilters.includes(params.view as QueueFilter) ? params.view as QueueFilter : "open";
  const page = typeof params.page === "string" && /^\d{1,6}$/.test(params.page) ? Math.max(1, Number(params.page)) : 1;
  return { filter, page };
}
const request = z.object({
  id: z.string().uuid(), opportunity_id: z.string().uuid(), title: z.string().nullable(), blocker: z.string(),
  status: z.enum(["open", "claimed", "resolved", "cancelled"]), assigned_to_you: z.boolean(),
  created_at: z.string(), updated_at: z.string(),
});
export const queueSchema = z.object({items: request.array().max(20), total:z.number().int(), page:z.number().int(), pages:z.number().int()});
export const requestSchema = request.extend({
  responses: z.array(z.object({id:z.string().uuid(),body:z.string(),created_at:z.string(),is_you:z.boolean()})).max(20),
  response_total:z.number().int(),response_page:z.number().int(),response_pages:z.number().int(),
});
export type RequestDetail = z.infer<typeof requestSchema>;
export const mentorInput = z.object({
  request_id: z.string().uuid(), action: z.enum(["claim", "release", "respond", "resolve"]),
  response: z.string().trim().max(4000, "Use 4,000 characters or fewer.").default(""),
}).superRefine((value,context)=>{
  if ((value.action === "respond" || value.action === "resolve") && !value.response) context.addIssue({code:"custom",path:["response"],message:"Write guidance before sending or resolving this request."});
});
export type MentorState = {error?:string; message?:string; saved?:number};
