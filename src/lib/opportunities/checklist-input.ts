import { z } from "zod";
export const taskId = z.string().uuid();
export const checklistInput = z.object({ opportunity_id: taskId, step_id: taskId, completed: z.enum(["true", "false"]) });
export type ChecklistState = { error?: string; message?: string };
