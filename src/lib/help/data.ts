import "server-only";
import { requireProfile } from "@/lib/auth/session";
import { helpRequestSchema } from "./validation";
export async function ownRequests(page: number) {
  const { supabase, user } = await requireProfile();
  // Mentors are participants too: explicitly scope this screen to the actor,
  // even though mentor RLS allows a broader queue elsewhere.
  const { data, error, count } = await supabase.from("help_requests")
    .select("id,opportunity_id,blocker,status,created_at,updated_at,opportunities(title)", { count: "exact" })
    .eq("participant_id", user.id).order("created_at", { ascending: false })
    .order("id", { ascending: false }).range((page - 1) * 20, page * 20 - 1);
  if (error) throw new Error("Help requests could not be loaded.");
  return { items: helpRequestSchema.array().parse(data), total: count ?? 0 };
}
