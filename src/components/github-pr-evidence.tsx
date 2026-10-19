import "server-only";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { readPullRequest } from "@/lib/github/pull-request";

// Cache only sanitized public evidence (including failures), never participant data
// or raw GitHub responses. Consent/ownership are checked before rendering this component.
const cachedEvidence = unstable_cache(
  (url: string, token?: string) => readPullRequest(url, fetch, token),
  ["public-github-pr-evidence-v1"],
  { revalidate: 300 },
);

const unavailable = {
  "not-public": "This PR could not be found publicly. It may be private, removed, or unavailable.",
  "rate-limit": "GitHub’s request limit has been reached. Check the PR on GitHub and try again later.",
  network: "GitHub could not be reached. Your saved submission is unchanged; try again later.",
  invalid: "GitHub evidence could not be matched to this PR link. Check the link before relying on it.",
};
const states = { open: "Open", draft: "Draft", merged: "Merged", closed: "Closed without merging" };

async function Evidence({ url }: { url: string }) {
  const evidence = await cachedEvidence(url, process.env.GITHUB_PUBLIC_READ_TOKEN);
  if (evidence.kind === "unavailable") return <div className="github-evidence github-unavailable" data-github-evidence="unavailable"><p className="eyebrow">GITHUB CHECK UNAVAILABLE</p><p>{unavailable[evidence.reason]}</p></div>;
  return <div className="github-evidence" data-github-evidence={evidence.state}>
    <div className="help-heading"><p className="eyebrow">PUBLIC PR FOUND ON GITHUB</p><span className="github-state" data-state={evidence.state}>{states[evidence.state]}</span></div>
    <p className="github-pr-title"><strong>{evidence.title}</strong></p>
    <dl className="github-facts"><div><dt>GitHub author</dt><dd><a href={`https://github.com/${evidence.author}`} target="_blank" rel="noopener noreferrer">@{evidence.author} ↗</a></dd></div><div><dt>Target repository</dt><dd>{evidence.repository}</dd></div><div><dt>Discussion comments</dt><dd>{evidence.comments}</dd></div><div><dt>Code review comments</dt><dd>{evidence.reviewComments}</dd></div></dl>
    <p className="field-hint">GitHub updated <time dateTime={evidence.updatedAt}>{evidence.updatedAt.replace("T", " ").slice(0, 16)} UTC</time>. GitHub snapshot <time dateTime={evidence.checkedAt}>{evidence.checkedAt.replace("T", " ").slice(0, 16)} UTC</time>; refreshes on visits with a 5-minute cache.</p>
    <p className="field-hint">Comments show activity, not approval. This check does not establish submitter ownership or task relevance. Curator decisions and board counts are recorded separately.</p>
  </div>;
}

export function GitHubPrEvidence({ url }: { url: string }) {
  return <Suspense key={url} fallback={<p className="field-hint" role="status">Checking public PR details on GitHub…</p>}><Evidence url={url}/></Suspense>;
}
