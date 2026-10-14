import {notFound} from 'next/navigation';
import {taskId} from '@/lib/opportunities/checklist-input';
import {getCuratorTask,requireCurator} from '@/lib/curator/data';
import {CuratorEditor} from '@/components/curator-editor';
import {label} from '@/lib/opportunities/filters';
export const dynamic='force-dynamic';
export default async function EditOpportunity({params}:{params:Promise<{id:string}>}) {
  await requireCurator();const {id}=await params;if(!taskId.safeParse(id).success) notFound();
  const task=await getCuratorTask(id);
  return <section className="curator-main"><p className="eyebrow">CURATOR WORKSPACE · {label(task.status)}</p><h1>{task.status==='archived' ? 'Archived opportunity.' : 'Edit opportunity.'}</h1>{task.status==='archived'&&<p className="archive-note">This opportunity is archived and read-only. Existing participants retain their progress.</p>}<CuratorEditor key={task.updated_at} task={task}/></section>;
}
