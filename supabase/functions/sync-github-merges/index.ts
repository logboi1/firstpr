import { createMergeHandler } from "../_shared/merge-sync.mjs";

// The handler validates the caller with Auth before any privileged RPC.
// This supports asymmetric signing keys without the legacy gateway JWT check.
function key(current: string, legacy: string) {
  try { return JSON.parse(Deno.env.get(current) ?? "{}").default ?? Deno.env.get(legacy); }
  catch { return Deno.env.get(legacy); }
}
Deno.serve(createMergeHandler({
  SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
  SUPABASE_ANON_KEY: key("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: key("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY"),
  GITHUB_PUBLIC_READ_TOKEN: Deno.env.get("GITHUB_PUBLIC_READ_TOKEN"),
}));
