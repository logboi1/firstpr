import {requireCurator} from '@/lib/curator/data';
import {CuratorEditor} from '@/components/curator-editor';
export const dynamic='force-dynamic';
export default async function NewOpportunity() {
  await requireCurator();return <section className="curator-main"><p className="eyebrow">CURATOR WORKSPACE</p><h1>Create an opportunity.</h1><p>Start with a title and summary. Publishing also needs skills, valid links, setup instructions, and a checklist.</p><CuratorEditor/></section>;
}
