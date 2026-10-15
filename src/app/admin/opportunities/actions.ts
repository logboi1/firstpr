'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {curatorContext} from '@/lib/curator/data';
import {parseOpportunityForm,publicationErrors,type CuratorState} from '@/lib/curator/validation';
const idSchema=z.string().uuid();
const versionSchema=z.iso.datetime({offset:true});
function refreshTask(id:string) {
  revalidatePath('/opportunities');revalidatePath(`/opportunities/${id}`);revalidatePath('/admin/opportunities');revalidatePath(`/admin/opportunities/${id}`);
}
export async function saveOpportunity(_previous:CuratorState,form:FormData):Promise<CuratorState> {
  const context=await curatorContext();
  if(!context?.allowed) return {error:'Curator access is required. Sign in with an authorized account.'};
  const rawId=String(form.get('id')??'');const rawVersion=String(form.get('updated_at')??'');
  if(rawId&&(!idSchema.safeParse(rawId).success||!versionSchema.safeParse(rawVersion).success)) return {error:'This edit link is invalid. Reload the task.'};
  const parsed=parseOpportunityForm(form);
  if(!parsed.success) return {error:'Check the highlighted fields.',fields:Object.fromEntries(parsed.error.issues.map(issue=>[String(issue.path[0]),issue.message]))};
  const publish=form.get('intent')==='publish';
  if(publish) {const fields=publicationErrors(parsed.data);if(Object.keys(fields).length) return {error:'Complete the required fields before publishing.',fields};}
  const {data,error}=await context.supabase.rpc('save_curator_opportunity',{wanted:rawId||null,expected_updated_at:rawId ? rawVersion : null,payload:parsed.data,publish});
  if(error) return {error:error.code==='40001' ? 'Another curator changed this task. Your entries are preserved; open a fresh copy before saving again.' : 'The task could not be saved. Check its links and checklist, or reload if its status changed.'};
  const id=idSchema.safeParse(data);
  if(!id.success) return {error:'The save response was invalid. Check the opportunity list before creating another task.'};
  refreshTask(id.data);redirect(`/admin/opportunities/${id.data}`);
}
export async function archiveOpportunity(_previous:CuratorState,form:FormData):Promise<CuratorState> {
  const context=await curatorContext();
  if(!context?.allowed) return {error:'Curator access is required. Sign in with an authorized account.'};
  const id=idSchema.safeParse(form.get('id'));const version=versionSchema.safeParse(form.get('updated_at'));
  if(!id.success||!version.success) return {error:'This edit link is invalid. Reload the task.'};
  if(form.get('confirm')!=='on') return {error:'Confirm that you want to archive this opportunity.'};
  const {error}=await context.supabase.rpc('archive_curator_opportunity',{wanted:id.data,expected_updated_at:version.data});
  if(error) return {error:error.code==='40001' ? 'Another curator changed this task. Reload before archiving.' : 'The task could not be archived. Reload and try again.'};
  refreshTask(id.data);redirect(`/admin/opportunities/${id.data}`);
}
