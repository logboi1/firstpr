import Link from 'next/link';
import Form from 'next/form';
import {listCuratorTasks} from '@/lib/curator/data';
import {label,parseFilters,type SearchParams} from '@/lib/opportunities/filters';
export const dynamic='force-dynamic';
export const metadata={title:'Curator opportunities — FirstPR'};
export default async function CuratorList({searchParams}:{searchParams:Promise<SearchParams>}) {
  const params=await searchParams;const page=parseFilters(params).page;
  const status=typeof params.status==='string'&&['draft','published','archived'].includes(params.status) ? params.status : '';
  const data=await listCuratorTasks(page,status);
  const href=(page:number)=>`/admin/opportunities?${new URLSearchParams({status,page:String(page)})}`;
  return <section className="curator-main"><p className="eyebrow">CURATOR WORKSPACE</p><h1>Manage opportunities.</h1><p>Prepare useful tasks, review their instructions, and publish when they’re ready.</p><Link className="button primary" href="/admin/opportunities/new">Create opportunity</Link><Link className="button secondary" href="/admin/contributions">Review pull requests</Link><div key={status}><Form action="/admin/opportunities" className="curator-status-filter"><label htmlFor="status-filter">Publication status</label><select id="status-filter" name="status" defaultValue={status}><option value="">All statuses</option>{['draft','published','archived'].map(value=><option key={value} value={value}>{label(value)}</option>)}</select><button className="button secondary">Filter opportunities</button></Form></div><p role="status">{data.total} {data.total===1 ? 'opportunity' : 'opportunities'}</p><div className="curator-list">{data.items.map(task=><article key={task.id}><span className="difficulty">{label(task.status)}</span><h2><Link href={`/admin/opportunities/${task.id}`} prefetch={false}>{task.title}</Link></h2><p>{task.summary}</p><Link className="back-link" href={`/admin/opportunities/${task.id}`} prefetch={false}>{task.status==='archived' ? 'View archived task' : 'Edit opportunity'}</Link></article>)}</div>{!data.items.length&&<p className="directory-state">No opportunities in this view. Create a draft or choose another status.</p>}{data.pages>1&&<nav className="directory-pagination" aria-label="Curator opportunity pages">{data.page>1 ? <Link href={href(data.page-1)}>Previous page</Link> : <span/>}<span>Page {data.page} of {data.pages}</span>{data.page<data.pages ? <Link href={href(data.page+1)}>Next page</Link> : <span/>}</nav>}</section>;
}
