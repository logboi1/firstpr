import { createMergeHandler } from "../_shared/merge-sync.mjs";

// Supabase injects its own server credentials. None enter the Next.js client.
Deno.serve(createMergeHandler({
  SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
  SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  GITHUB_PUBLIC_READ_TOKEN: Deno.env.get("GITHUB_PUBLIC_READ_TOKEN"),
}));
