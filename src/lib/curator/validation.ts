import {z} from 'zod';
import {contributionTypes,difficulties} from '../opportunities/filters.ts';
export const standardHttps = z.string().trim().max(2000).refine(value=>{
  if(!value) return true;
  try {const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&/^[a-z0-9][a-z0-9.-]*$/i.test(url.hostname)&&!value.includes('\\')&&!/\s/.test(value);}catch{return false;}
},'Use a standard HTTPS URL without credentials or custom ports.').transform(value=>value ? new URL(value).href : '');
export const opportunityFields=z.object({
  title:z.string().trim().min(1,'Enter a title.').max(160),summary:z.string().trim().min(1,'Enter a summary.').max(2000),
  skills:z.array(z.string().trim().min(1).max(60)).max(30),contribution_type:z.enum(contributionTypes),difficulty:z.enum(difficulties),
  repository_url:standardHttps,issue_url:standardHttps,prerequisites:z.string().trim().max(5000),setup_notes:z.string().trim().max(10000),
  steps:z.array(z.string().trim().min(1).max(500)).max(50).nullable(),
});
export const curatorTaskSchema=opportunityFields.extend({id:z.string().uuid(),status:z.enum(['draft','published','archived']),updated_at:z.string(),steps:z.array(z.string())});
export type CuratorTask=z.infer<typeof curatorTaskSchema>;
export type CuratorState={error?:string;fields?:Record<string,string>};
export function parseOpportunityForm(form:FormData) {
  return opportunityFields.safeParse({title:form.get('title'),summary:form.get('summary'),skills:[...new Set(String(form.get('skills')??'').split(',').map(s=>s.trim()).filter(Boolean))],contribution_type:form.get('contribution_type'),difficulty:form.get('difficulty'),repository_url:form.get('repository_url')??'',issue_url:form.get('issue_url')??'',prerequisites:form.get('prerequisites')??'',setup_notes:form.get('setup_notes')??'',steps:form.has('steps') ? String(form.get('steps')).split(/\r?\n/).map(s=>s.trim()).filter(Boolean) : null});
}
export function publicationErrors(value:z.infer<typeof opportunityFields>) {
  const errors:Record<string,string>={};
  if(!value.repository_url) errors.repository_url='Add a repository link before publishing.';
  if(!value.issue_url) errors.issue_url='Add an issue link before publishing.';
  if(!value.setup_notes) errors.setup_notes='Add setup instructions before publishing.';
  if(!value.skills.length) errors.skills='Add at least one skill before publishing.';
  if(value.steps!==null&&!value.steps.length) errors.steps='Add at least one checklist step before publishing.';
  return errors;
}
