import { z } from "zod";
export const helpInput = z.object({
  opportunity_id: z.string().uuid(),
  blocker: z.string().trim().min(1, "Describe what is blocking you.").max(4000, "Use 4,000 characters or fewer."),
});
export const requestId = z.string().uuid();
export type HelpState = { error?: string; message?: string };
export const helpRequestSchema = z.object({
  id: requestId, opportunity_id: requestId, blocker: z.string(),
  status: z.enum(["open", "claimed", "resolved", "cancelled"]),
  created_at: z.string(), updated_at: z.string(),
  opportunities: z.object({ title: z.string() }).nullable(),
});
export type HelpRequest = z.infer<typeof helpRequestSchema>;
