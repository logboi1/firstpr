import { Suspense } from "react";
import Link from "next/link";
import { getDirectory } from "@/lib/opportunities/data";
import { parseFilters, directoryHref, hasFilters, type DirectoryFilters, type SearchParams } from "@/lib/opportunities/filters";
import { DirectoryFiltersForm } from "@/components/directory-filters";
import { DirectoryLoading } from "@/components/directory-loading";
import { OpportunityCard } from "@/components/opportunity-card";
export const dynamic = "force-dynamic";
export const metadata = { title: "Contribution opportunities — FirstPR" };
async function Results({ filters }: { filters: DirectoryFilters }) {
  const directory = await getDirectory(filters);
  if (!directory) return <section className="directory-state" aria-labelledby="unavailable-heading"><h2 id="unavailable-heading">The directory is not available yet.</h2><p>The maintainer needs to connect the task directory before opportunities can be listed. Please check back soon.</p><Link className="button secondary" href="/">Back to FirstPR</Link></section>;
  const { items, total, page, pages, skills } = directory;
  return <><DirectoryFiltersForm filters={filters} skills={skills}/><div className="results-heading"><p role="status">{total} {total === 1 ? "opportunity" : "opportunities"}{hasFilters(filters) ? " matching your filters" : " available"}</p><p>Published tasks only · Source links open in a new tab</p></div>{items.length ? <div className="opportunity-grid">{items.map(opportunity => <OpportunityCard key={opportunity.id} opportunity={opportunity}/>)}</div> : <section className="directory-state" aria-labelledby="empty-heading"><span className="empty-icon" aria-hidden="true">⌕</span><h2 id="empty-heading">{hasFilters(filters) ? "No tasks match these filters." : "New opportunities are on the way."}</h2><p>{hasFilters(filters) ? "Try a broader search, choose a different skill, or clear your filters." : "There are no published tasks yet. Check back as the community adds opportunities."}</p>{hasFilters(filters) && <Link className="button secondary" href="/opportunities">Browse all opportunities</Link>}</section>}{pages > 1 && <nav className="directory-pagination" aria-label="Opportunity pages">{page > 1 ? <Link className="button secondary" href={directoryHref(filters, page - 1)} prefetch={false}>Previous page</Link> : <span/>}<span>Page {page} of {pages}</span>{page < pages ? <Link className="button secondary" href={directoryHref(filters, page + 1)} prefetch={false}>Next page</Link> : <span/>}</nav>}<p className="directory-footnote">Check each project’s contribution guidelines and current issue availability before starting. In-app task instructions and checklists are still being built.</p></>;
}
export default async function Opportunities({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseFilters(await searchParams);
  return <Suspense key={directoryHref(filters)} fallback={<DirectoryLoading/>}><Results filters={filters}/></Suspense>;
}
