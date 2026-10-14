import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseConfig } from "../supabase/config";
import { contributionTypes, difficulties, type DirectoryFilters } from "./filters";
const externalUrl = z.string().url().refine(value => new URL(value).protocol === "https:");
const opportunitySchema = z.object({
  id: z.string().uuid(), title: z.string(), summary: z.string(), skills: z.array(z.string()),
  contribution_type: z.enum(contributionTypes), difficulty: z.enum(difficulties),
  repository_url: externalUrl, issue_url: externalUrl,
});
const directorySchema = z.object({
  items: z.array(opportunitySchema).max(12), total: z.number().int().nonnegative(),
  page: z.number().int().positive(), pages: z.number().int().positive(), skills: z.array(z.string()),
});
export type Opportunity = z.infer<typeof opportunitySchema>;
export async function getDirectory(filters: DirectoryFilters) {
  const config = supabaseConfig();
  if (!config) return null;
  // The public directory deliberately uses an anonymous client, independent of
  // account cookies. Never use a service-role key or curator session here.
  const supabase = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  const { data, error } = await supabase.rpc("browse_opportunities", {
    search_query: filters.q, skill_filter: filters.skill, type_filter: filters.type,
    difficulty_filter: filters.difficulty, page_number: filters.page,
  });
  if (error) throw new Error("Opportunity directory could not be loaded.");
  return directorySchema.parse(data);
}
