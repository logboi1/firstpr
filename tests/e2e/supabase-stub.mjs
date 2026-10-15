// Disposable contract stub. Never connects to Supabase or sends email.
import http from 'node:http';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
const directoryDb = new PGlite();
await directoryDb.exec(`
  create role anon nologin; create role authenticated nologin; create schema auth;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth,public to anon,authenticated;
`);
const migrations = new URL('../../supabase/migrations/', import.meta.url);
for (const name of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) {
  await directoryDb.exec(readFileSync(new URL(name,migrations),'utf8'));
}
await directoryDb.exec(`
  insert into public.opportunities(title,summary,skills,contribution_type,difficulty,repository_url,issue_url,setup_notes,status)
  select '[DEMO] Documentation task ' || n, 'Fictional setup guide for beginners', ARRAY['Markdown'],
    'documentation','beginner','https://example.invalid/docs','https://example.invalid/docs/issues/' || n,
    'Fictional instructions only','published' from generate_series(1,13) n;
  insert into public.opportunities(title,summary,skills,contribution_type,difficulty,repository_url,issue_url,setup_notes,status)
  values ('[DEMO] React keyboard testing','Fictional React accessibility review',ARRAY['React','Accessibility'],'testing','intermediate',
    'https://example.invalid/ui','https://example.invalid/ui/issues/1','Fictional setup','published'),
    ('[DEMO] Secret draft','Not public',ARRAY['DraftOnly'],'code','beginner','https://example.invalid/draft','https://example.invalid/draft/1','','draft'),
    ('[DEMO] Archived task','Not public',ARRAY['ArchivedOnly'],'code','beginner','https://example.invalid/archive','https://example.invalid/archive/1','Fictional setup','archived');
  insert into auth.users(id) values ('30000000-0000-4000-8000-000000000001'),('30000000-0000-4000-8000-000000000002'),('30000000-0000-4000-8000-000000000003'),('30000000-0000-4000-8000-000000000004'),('30000000-0000-4000-8000-000000000005');
  insert into public.user_roles(user_id,role) values ('30000000-0000-4000-8000-000000000003','curator');
  insert into public.user_roles(user_id,role) values ('30000000-0000-4000-8000-000000000004','mentor'),('30000000-0000-4000-8000-000000000005','mentor');
  update public.opportunities set prerequisites='Read the fictional contribution guide',setup_notes=E'Install dependencies\nRun the tests' where title='[DEMO] Documentation task 1';
  insert into public.checklist_steps(id,opportunity_id,label,position)
    select '20000000-0000-4000-8000-000000000011'::uuid,id,'Read the contribution guide',0 from public.opportunities where title='[DEMO] Documentation task 1';
  insert into public.checklist_steps(id,opportunity_id,label,position)
    select '20000000-0000-4000-8000-000000000012'::uuid,id,'Run the project tests',1 from public.opportunities where title='[DEMO] Documentation task 1';
  set role anon;
`);
let directoryMode = 'normal';
let helpMode='normal';
const id = '30000000-0000-4000-8000-000000000001';
const otherId = '30000000-0000-4000-8000-000000000002';
const curatorId='30000000-0000-4000-8000-000000000003';
const mentorId='30000000-0000-4000-8000-000000000004';
const secondMentorId='30000000-0000-4000-8000-000000000005';
const users = Object.fromEntries([[id,'ada@example.com'],[otherId,'bob@example.com'],[curatorId,'curator@example.com'],[mentorId,'mentor@example.com'],[secondMentorId,'mentor-two@example.com']].map(([id,email])=>[id,{id,aud:'authenticated',role:'authenticated',email,app_metadata:{},user_metadata:{},created_at:'2026-10-14T00:00:00Z'}]));
const defaultProfile = { display_name:'New contributor',skills:[],experience:'beginner',public_board_consent:false,onboarding_completed:false };
let profiles = Object.fromEntries(Object.keys(users).map(id=>[id,{...defaultProfile,id}]));
let refreshes=0;
const revoked=new Set();
const refreshSubjects=new Map();
let tokenNumber=0;
function session(subject=id) {
  const payload=Buffer.from(JSON.stringify({sub:subject,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
  const refresh_token=`refresh-${++tokenNumber}`;
  refreshSubjects.set(refresh_token,subject);
  return {access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test${tokenNumber}`,token_type:'bearer',expires_in:3600,refresh_token,user:users[subject]};
}
function tokenSubject(req) {
  const token=req.headers.authorization?.replace('Bearer ','');
  if(!token?.startsWith('eyJ')||revoked.has(token)) return null;
  try { const subject=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).sub; return users[subject] ? subject : null; } catch { return null; }
}
async function asActor(subject,query,args=[]) {
  return directoryDb.transaction(async tx=>{
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[subject||'']);
    await tx.exec(`set local role ${subject ? 'authenticated' : 'anon'}`);
    return tx.query(query,args);
  });
}
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:54329');
  let text = ''; for await (const part of req) text += part;
  const body = text ? JSON.parse(text) : {};
  const reply = (data, status=200) => {res.writeHead(status, {'content-type':'application/json'});res.end(JSON.stringify(data));};
  if(url.pathname==='/curator-control') {
    await directoryDb.transaction(async tx=>{await tx.exec('reset role');
      if(url.searchParams.get('enabled')==='false') await tx.query("delete from public.user_roles where user_id=$1 and role='curator'",[curatorId]);
      else await tx.query("insert into public.user_roles(user_id,role) values($1,'curator') on conflict do nothing",[curatorId]);
    });return reply({ok:true});
  }
  if(url.pathname==='/task-control') {
    const fixture=await directoryDb.transaction(async tx=>{
      await tx.exec('reset role');
      const {rows}=await tx.query("select id from public.opportunities where title='[DEMO] Documentation task 1'");
      const task=url.searchParams.get('fixture')==='2' ? (await tx.query("select id from public.opportunities where title='[DEMO] Documentation task 2'")).rows[0].id : rows[0].id;
      if(url.searchParams.get('archive')==='true') await tx.query("update public.opportunities set status='archived' where id=$1",[task]);
      return {task,steps:['20000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000012']};
    });
    return reply(fixture);
  }
  if(url.pathname==='/mentor-control') {
    const subject=url.searchParams.get('account')==='mentor-two' ? secondMentorId : url.searchParams.get('account')==='curator' ? curatorId : mentorId;
    await directoryDb.transaction(async tx=>{await tx.exec('reset role');
      if(url.searchParams.get('enabled')==='false') await tx.query("delete from public.user_roles where user_id=$1 and role='mentor'",[subject]);
      else await tx.query("insert into public.user_roles(user_id,role) values($1,'mentor') on conflict do nothing",[subject]);
    });return reply({ok:true});
  }
  if(url.pathname==='/help-control') {
    if(url.searchParams.has('mode')) helpMode=url.searchParams.get('mode');
    const status=url.searchParams.get('status');
    if(status) {
      await directoryDb.transaction(async tx=>{await tx.exec('reset role');await tx.query("insert into public.user_roles(user_id,role) values($1,'mentor') on conflict do nothing",[curatorId]);});
      const wanted=url.searchParams.get('id');
      if(status==='claimed'||status==='resolved') await asActor(curatorId,"update public.help_requests set status='claimed',assigned_mentor_id=auth.uid() where id=$1 and status='open'",[wanted]);
      if(status==='resolved') await asActor(curatorId,"update public.help_requests set status='resolved' where id=$1 and status='claimed'",[wanted]);
    }
    return reply({ok:true});
  }
  if(url.pathname==='/rest/v1/help_requests') {
    const actor=tokenSubject(req);
    if(!actor) return reply({message:'Unauthenticated'},401);
    if(helpMode==='error-once'||(helpMode==='mutation-error-once'&&req.method!=='GET')) {const status=helpMode==='error-once' ? 400 : 503;helpMode='normal';return reply({message:'Fictional help provider failure'},status);}
    try {
      if(req.method==='POST') {
        await asActor(actor,'insert into public.help_requests(opportunity_id,blocker) values($1,$2)',[body.opportunity_id,body.blocker]);
        return reply(null,201);
      }
      // Match the application's explicit participant scope, including for mentors.
      const owner=url.searchParams.get('participant_id')?.replace(/^eq\./,'');
      if(owner!==actor) return reply({message:'Missing own-participant filter'},403);
      if(req.method==='PATCH') {
        const wanted=url.searchParams.get('id')?.replace(/^eq\./,'');
        const {rows}=await asActor(actor,"update public.help_requests set status=$1 where id=$2 and participant_id=$3 and status in ('open','claimed') returning id",[body.status,wanted,owner]);
        return reply(rows);
      }
      const offset=Number(url.searchParams.get('offset')||0);
      const limit=Number(url.searchParams.get('limit')||20);
      const {rows}=await asActor(actor,`select h.id,h.opportunity_id,h.blocker,h.status,h.created_at,h.updated_at,
        case when o.id is null then null else jsonb_build_object('title',o.title) end as opportunities
        from public.help_requests h left join public.opportunities o on o.id=h.opportunity_id
        where h.participant_id=$1 order by h.created_at desc,h.id desc limit $2 offset $3`,[owner,limit,offset]);
      const total=(await asActor(actor,'select count(*)::int as total from public.help_requests where participant_id=$1',[owner])).rows[0].total;
      res.writeHead(200,{'content-type':'application/json','content-range':`${offset}-${offset+rows.length-1}/${total}`});return res.end(JSON.stringify(rows));
    } catch(error) {return reply({message:error.message,code:error.code},403);}
  }
  if(url.pathname.startsWith('/rest/v1/rpc/') && url.pathname!=='/rest/v1/rpc/browse_opportunities') {
    const actor=tokenSubject(req);
    const rpc=url.pathname.split('/').pop();
    if((helpMode==='mentor-error-once'&&rpc==='list_mentor_help')||(helpMode==='mentor-mutation-error-once'&&rpc==='mentor_help_action')) {helpMode='normal';return reply({message:'Fictional mentor provider failure'},400);}
    const operations={list_mentor_help:['select public.list_mentor_help($1,$2) as data',[body.page_number,body.queue_filter]],get_help_request:['select public.get_help_request($1,$2,$3) as data',[body.wanted,body.mentor_view,body.response_page]],mentor_help_action:['select public.mentor_help_action($1,$2,$3) as data',[body.wanted,body.action,body.response]],get_opportunity_detail:['select public.get_opportunity_detail($1) as data',[body.wanted]],start_opportunity:['select public.start_opportunity($1) as data',[body.wanted]],set_checklist_step:['select public.set_checklist_step($1,$2,$3) as data',[body.wanted,body.step,body.completed]],save_curator_opportunity:['select public.save_curator_opportunity($1,$2,$3::jsonb,$4) as data',[body.wanted,body.expected_updated_at,JSON.stringify(body.payload),body.publish]],archive_curator_opportunity:['select public.archive_curator_opportunity($1,$2) as data',[body.wanted,body.expected_updated_at]],get_curator_opportunity:['select public.get_curator_opportunity($1) as data',[body.wanted]],list_curator_opportunities:['select public.list_curator_opportunities($1,$2) as data',[body.page_number,body.status_filter]]};
    if(!operations[rpc]) return reply({message:'Unknown RPC'},404);
    try {const {rows}=await asActor(actor,...operations[rpc]);return reply(rows[0].data||null);}
    catch(error) {return reply({message:error.message,code:error.code},403);}
  }
  if (url.pathname === '/directory-control') { directoryMode = url.searchParams.get('mode') || 'normal'; return reply({ok:true}); }
  if (url.pathname === '/rest/v1/rpc/browse_opportunities') {
    if (directoryMode === 'error-once') {directoryMode='normal';return reply({message:'Fictional provider failure'},400);}
    if (directoryMode === 'empty') return reply({items:[],total:0,page:1,pages:1,skills:[]});
    if (directoryMode === 'slow') await new Promise(resolve => setTimeout(resolve,1800));
    const {rows} = await asActor(null,'select public.browse_opportunities($1,$2,$3,$4,$5) as data',[
      body.search_query,body.skill_filter,body.type_filter,body.difficulty_filter,body.page_number
    ]);
    return reply(rows[0].data);
  }
  if (url.pathname === '/health') return reply({ok:true});
  if (url.pathname === '/reset') {profiles=Object.fromEntries(Object.keys(users).map(id=>[id,{...defaultProfile,id}])); revoked.clear(); refreshes=0;return reply({ok:true});}
  if (url.pathname === '/stats') return reply({refreshes});
  if (url.pathname === '/auth/v1/authorize') {
    const redirectTo=url.searchParams.get('redirect_to');
    if(!redirectTo) return reply({message:'Missing redirect URL'},400);
    const account=req.headers.cookie?.match(/(?:^|; )firstpr-test-account=([^;]+)/)?.[1];
    const subject=account==='mentor' ? mentorId : account==='mentor-two' ? secondMentorId : account==='curator' ? curatorId : account==='bob' ? otherId : id;
    const destination=new URL(redirectTo);
    destination.searchParams.set('code',subject);
    res.writeHead(302,{location:destination.toString()});return res.end();
  }
  if (url.pathname === '/auth/v1/token') {
    if(url.searchParams.get('grant_type')==='pkce') {
      if(!users[body.auth_code]||!body.code_verifier) return reply({message:'Invalid OAuth code'},400);
      return reply(session(body.auth_code));
    }
    const subject=refreshSubjects.get(body.refresh_token);
    if(!subject) return reply({message:'Invalid refresh token'},400);
    refreshes++; return reply(session(subject));
  }
  const token = req.headers.authorization?.replace('Bearer ', '');
  const subject=tokenSubject(req);
  if (!subject) return reply({message:'Unauthenticated', msg:'Unauthenticated'},401);
  if (url.pathname === '/auth/v1/user') return reply(users[subject]);
  if (url.pathname === '/auth/v1/logout') {revoked.add(token);return reply({});}
  if (url.pathname === '/rest/v1/user_roles') {
    if(url.searchParams.get('user_id')!==`eq.${subject}`) return reply({message:'Wrong owner'},403);
    const role=url.searchParams.get('role')?.replace(/^eq\./,'');
    const {rows}=await asActor(subject,'select role from public.user_roles where user_id=$1 and role=$2',[subject,role]);return reply(rows);
  }
  if (url.pathname === '/rest/v1/profiles') {
    if (url.searchParams.get('id') !== `eq.${subject}`) return reply({message:'Wrong owner'},403);
    if (req.method === 'PATCH') profiles[subject]={...profiles[subject],...body};
    return reply(profiles[subject]);
  }
  reply({message:'Unexpected endpoint'},404);
}).listen(54329);
