import {z} from "zod";
const count=z.number().int().nonnegative();
const contributionCounts=z.object({submitted:count,merged:count,closed:count}).strict();
const paging={total:count,page:count,pages:count};
export const dashboardSchema=z.object({
  ...paging,steps_total:count,steps_completed:count,
  help:z.object({open:count,claimed:count,resolved:count,cancelled:count}).strict(),contributions:contributionCounts,
  items:z.array(z.object({id:z.string().uuid(),title:z.string(),status:z.enum(["published","archived"]),started_at:z.string(),steps_total:count,steps_completed:count,active_help:count,submitted:count,merged:count,closed:count}).strict()).max(12),
}).strict();
// Strict parsing makes accidental public fields a failure, rather than silently hiding them.
export const publicBoardSchema=z.object({
  ...paging,counts:contributionCounts,
  items:z.array(z.object({display_name:z.string(),pr_url:z.string().regex(/^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+\/pull\/[1-9][0-9]*$/),status:z.enum(["submitted","merged","closed"]),submitted_at:z.string()}).strict()).max(20),
}).strict();
export const consentInput=z.enum(["true","false"]);
