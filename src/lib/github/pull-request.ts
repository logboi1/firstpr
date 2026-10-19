import { z } from "zod";
import { prUrl } from "../contributions/validation.ts";

const githubPr = z.object({
  html_url: prUrl,
  title: z.string().min(1).max(1000),
  state: z.enum(["open", "closed"]),
  draft: z.boolean(),
  merged: z.boolean(),
  user: z.object({ login: z.string().regex(/^[a-z0-9][a-z0-9-]*$/i) }),
  base: z.object({ repo: z.object({ private: z.literal(false), full_name: z.string() }) }),
  comments: z.number().int().nonnegative(),
  review_comments: z.number().int().nonnegative(),
  updated_at: z.string().datetime(),
});

export type PullRequestEvidence =
  | { kind: "found"; title: string; author: string; repository: string;
      state: "open" | "draft" | "merged" | "closed";
      comments: number; reviewComments: number; updatedAt: string; checkedAt: string }
  | { kind: "unavailable"; reason: "not-public" | "rate-limit" | "network" | "invalid" };

// Only canonical github.com URLs are accepted; never follow a submitted URL or API redirect.
// Injecting fetch keeps network/failure tests independent of live GitHub.
export async function readPullRequest(
  url: string,
  fetcher: typeof fetch = fetch,
  token?: string,
): Promise<PullRequestEvidence> {
  const parsed = prUrl.safeParse(url);
  if (!parsed.success) return { kind: "unavailable", reason: "invalid" };
  const [, , , owner, repo, , number] = parsed.data.split("/");
  try {
    const response = await fetcher(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "FirstPR-public-contributions",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      redirect: "error",
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (response.status === 403 || response.status === 429) return { kind: "unavailable", reason: "rate-limit" };
    if (response.status === 404 || response.status === 410) return { kind: "unavailable", reason: "not-public" };
    if (!response.ok) return { kind: "unavailable", reason: "network" };
    const result = githubPr.safeParse(await response.json());
    // A credential with broader access must never expose private repository metadata.
    if (!result.success) return { kind: "unavailable", reason: "not-public" };
    const pr = result.data;
    if (pr.html_url !== parsed.data || pr.base.repo.full_name.toLowerCase() !== `${owner}/${repo}`) {
      return { kind: "unavailable", reason: "invalid" };
    }
    return {
      kind: "found", title: pr.title, author: pr.user.login, repository: pr.base.repo.full_name,
      state: pr.merged ? "merged" : pr.state === "closed" ? "closed" : pr.draft ? "draft" : "open",
      comments: pr.comments, reviewComments: pr.review_comments,
      updatedAt: pr.updated_at, checkedAt: Number.isNaN(Date.parse(response.headers.get("date") ?? ""))
        ? new Date().toISOString() : new Date(response.headers.get("date")!).toISOString(),
    };
  } catch {
    return { kind: "unavailable", reason: "network" };
  }
}
