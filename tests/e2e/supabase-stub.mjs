// Disposable contract stub. Never connects to Supabase or sends email.
import http from 'node:http';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
const directoryDb = new PGlite();
await directoryDb.exec(`
  create role anon nologin; create role authenticated nologin; create schema auth;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
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
  set role anon;
`);
let directoryMode = 'normal';
const id = '30000000-0000-4000-8000-000000000001';
const user = { id, aud: 'authenticated', role: 'authenticated', email: 'ada@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-10-14T00:00:00Z' };
let profile = { id, display_name: 'New contributor', skills: [], experience: 'beginner', public_board_consent: false, onboarding_completed: false };
let refreshes = 0;
const revoked = new Set();
let tokenNumber = 0;
function session() {
  const payload = Buffer.from(JSON.stringify({sub:id, exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
  return { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.test${++tokenNumber}`, token_type: 'bearer', expires_in: 3600, refresh_token: `refresh-${tokenNumber}`, user };
}
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:54329');
  let text = ''; for await (const part of req) text += part;
  const body = text ? JSON.parse(text) : {};
  const reply = (data, status=200) => {res.writeHead(status, {'content-type':'application/json'});res.end(JSON.stringify(data));};
  if (url.pathname === '/directory-control') { directoryMode = url.searchParams.get('mode') || 'normal'; return reply({ok:true}); }
  if (url.pathname === '/rest/v1/rpc/browse_opportunities') {
    if (directoryMode === 'error-once') {directoryMode='normal';return reply({message:'Fictional provider failure'},400);}
    if (directoryMode === 'empty') return reply({items:[],total:0,page:1,pages:1,skills:[]});
    if (directoryMode === 'slow') await new Promise(resolve => setTimeout(resolve,1800));
    const {rows} = await directoryDb.query('select public.browse_opportunities($1,$2,$3,$4,$5) as data',[
      body.search_query,body.skill_filter,body.type_filter,body.difficulty_filter,body.page_number
    ]);
    return reply(rows[0].data);
  }
  if (url.pathname === '/health') return reply({ok:true});
  if (url.pathname === '/reset') {profile = {...profile, display_name:'New contributor', skills:[], onboarding_completed:false, public_board_consent:false}; revoked.clear(); refreshes=0;return reply({ok:true});}
  if (url.pathname === '/stats') return reply({refreshes});
  if (url.pathname === '/auth/v1/otp') return reply({});
  if (url.pathname === '/auth/v1/verify') {
    if (body.token !== '12345678') return reply({msg:'Invalid code', error_code:'otp_expired'},403);
    return reply(session());
  }
  if (url.pathname === '/auth/v1/token') { refreshes++; return reply(session()); }
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token?.startsWith('eyJ') || revoked.has(token)) return reply({message:'Unauthenticated', msg:'Unauthenticated'},401);
  if (url.pathname === '/auth/v1/user') return reply(user);
  if (url.pathname === '/auth/v1/logout') {revoked.add(token);return reply({});}
  if (url.pathname === '/rest/v1/profiles') {
    if (url.searchParams.get('id') !== `eq.${id}`) return reply({message:'Wrong owner'},403);
    if (req.method === 'PATCH') profile = {...profile, ...body};
    return reply(profile);
  }
  reply({message:'Unexpected endpoint'},404);
}).listen(54329, '127.0.0.1');
