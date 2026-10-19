import "server-only";
import type { createClient } from "@/lib/supabase/server";

export async function syncUserMerges(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.functions.invoke("sync-github-merges", { body: {} });
  if (error || !Number.isInteger(data?.completed) || data.completed < 0) return { completed: 0, unavailable: true };
  return { completed: data.completed as number, unavailable: false };
}
