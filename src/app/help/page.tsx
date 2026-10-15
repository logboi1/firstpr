import Link from "next/link";
import { redirect } from "next/navigation";
import { ownRequests } from "@/lib/help/data";
import { CancelHelp } from "@/components/help-forms";
export const dynamic = "force-dynamic";
export const metadata = { title: "My help requests — FirstPR" };
const descriptions = { open: "Waiting for a mentor to claim this request.", claimed: "A mentor has claimed this request.", resolved: "A mentor marked this request resolved.", cancelled: "You cancelled this request." };
export default async function HelpPage({ searchParams }: { searchParams: Promise<{ page?: string; sent?: string }> }) {
  const params = await searchParams;
  const page = /^\d{1,6}$/.test(params.page ?? "") ? Math.max(1, Number(params.page)) : 1;
  const { items, total } = await ownRequests(page);
  const pages = Math.max(1, Math.ceil(total / 20));
  if (page > pages) redirect(`/help?page=${pages}`);
  return <section><p className="eyebrow">PARTICIPANT SUPPORT</p><h1>My help requests.</h1>
    <p>Your blockers are visible to you and authorized mentors. They never appear on the public progress board. Open a request to read mentor guidance. Refresh to check for updates; a response is not guaranteed.</p>
    {params.sent === "1" && <p className="archive-note" role="status">Your help request was saved.</p>}
    <Link className="button primary" href="/opportunities">Find a task to request help</Link>
    {!items.length ? <div className="directory-state"><h2>No help requests yet.</h2><p>Open an opportunity and choose “Request help” to describe a blocker.</p></div> : <><p role="status">{total} {total === 1 ? "request" : "requests"} · Page {page} of {pages}</p><ul className="help-list">{items.map(item => <li className="account-card help-request" key={item.id}>
      <div className="help-heading"><h2><Link href={`/opportunities/${item.opportunity_id}`}>{item.opportunities?.title ?? "Opportunity unavailable"}</Link></h2><span className="help-status" data-status={item.status}>{item.status}</span></div>
      <p className="field-hint">Requested <time dateTime={item.created_at}>{new Date(item.created_at).toISOString().slice(0, 10)}</time> · Updated <time dateTime={item.updated_at}>{new Date(item.updated_at).toISOString().slice(0, 10)}</time> (UTC)</p>
      <p className="instruction-text">{item.blocker}</p><p>{descriptions[item.status]}</p><Link className="back-link" href={`/help/${item.id}`}>View request and mentor guidance →</Link>
      {(item.status === "open" || item.status === "claimed") && <CancelHelp id={item.id}/>}
    </li>)}</ul><nav className="actions" aria-label="Help request pages">{page > 1 && <Link className="button secondary" href={`/help?page=${page - 1}`}>Previous</Link>}{page < pages && <Link className="button secondary" href={`/help?page=${page + 1}`}>Next</Link>}</nav></>}
  </section>;
}
