import 'server-only';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '../supabase/server';
import {supabaseConfig} from '../supabase/config';
import {curatorTaskSchema} from './validation';
import {z} from 'zod';
export async function curatorContext() {
  if(!supabaseConfig()) return null;
  const supabase=await createClient();
  const {data,error}=await supabase.auth.getUser();
  if(error||!data.user) return null;
  const {data:role,error:roleError}=await supabase.from('user_roles').select('role').eq('user_id',data.user.id).eq('role','curator').maybeSingle();
  if(roleError) throw new Error('Curator access could not be checked. Try again.');
  return {supabase,user:data.user,allowed:!!role};
}
export async function requireCurator() {
  const context=await curatorContext();
  if(!context) redirect('/sign-in');
  if(!context.allowed) notFound();
  return context;
}
export async function getCuratorTask(id:string) {
  const {supabase}=await requireCurator();
  const {data,error}=await supabase.rpc('get_curator_opportunity',{wanted:id});
  if(error) throw new Error('The task could not be loaded.');
  if(!data) notFound();
  return curatorTaskSchema.parse(data);
}
const listSchema=z.object({items:z.array(z.object({id:z.string().uuid(),title:z.string(),summary:z.string(),status:z.enum(['draft','published','archived']),updated_at:z.string()})).max(20),total:z.number(),page:z.number(),pages:z.number()});
export async function listCuratorTasks(page:number,status:string) {
  const {supabase}=await requireCurator();
  const {data,error}=await supabase.rpc('list_curator_opportunities',{page_number:page,status_filter:status});
  if(error) throw new Error('Opportunities could not be loaded.');
  return listSchema.parse(data);
}
