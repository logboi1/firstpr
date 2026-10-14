export const contributionTypes = ["code", "documentation", "design", "testing"] as const;
export const difficulties = ["beginner", "intermediate", "advanced"] as const;
export type DirectoryFilters = { q: string; skill: string; type: string; difficulty: string; page: number };
export type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
export function parseFilters(params: SearchParams): DirectoryFilters {
  const type = first(params.type);
  const difficulty = first(params.difficulty);
  const page = first(params.page);
  return {
    q: first(params.q).trim().slice(0, 120), skill: first(params.skill).trim().slice(0, 120),
    type: contributionTypes.some(value => value === type) ? type : "",
    difficulty: difficulties.some(value => value === difficulty) ? difficulty : "",
    page: /^\d{1,7}$/.test(page) ? Math.max(1, Math.min(1000000, Number(page))) : 1,
  };
}
export function directoryHref(filters: DirectoryFilters, page = filters.page) {
  const params = new URLSearchParams();
  for (const field of ["q", "skill", "type", "difficulty"] as const) if (filters[field]) params.set(field, filters[field]);
  if (page > 1) params.set("page", String(page));
  return `/opportunities${params.size ? `?${params}` : ""}`;
}
export function hasFilters(filters: DirectoryFilters) {
  return !!(filters.q || filters.skill || filters.type || filters.difficulty);
}
export function label(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
