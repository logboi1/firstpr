import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMergeHandler} from '../../supabase/functions/_shared/merge-sync.mjs';
const actor='30000000-0000-4000-8000-000000000001';
const item={id:'40000000-0000-4000-8000-000000000001',pr_url:'https://github.com/example/project/pull/42',updated_at:'2026-10-19T00:00:00Z',repository_url:'https://github.com/example/project'};
const pr={id:888,html_url:item.pr_url,title:'Improve docs',state:'closed',merged:true,draft:false,merged_at:'2026-10-18T21:00:00Z',user:{id:777,login:'author'},base:{repo:{private:false,full_name:'example/project'}},comments:0,review_comments:0,updated_at:'2026-10-18T21:00:00Z'};
const env={SUPABASE_URL:'https://project.supabase.co',SUPABASE_ANON_KEY:'public-key',SUPABASE_SERVICE_ROLE_KEY:'secret-service'};
const request=()=>new Request('https://worker.invalid',{method:'POST',headers:{authorization:'Bearer participant-session'},body:JSON.stringify({actor:'forged-other-user',status:'merged'})});
const response=(body,status=200)=>new Response(JSON.stringify(body),{status});

test('worker validates session, scopes candidates to actual actor and only writes fresh GitHub proof',async()=>{
 let saved=0;
 const handler=createMergeHandler(env,async(url,init)=>{
  if(url.endsWith('/auth/v1/user')){assert.equal(init.headers.Authorization,'Bearer participant-session');return response({id:actor});}
  if(url.endsWith('/note_github_merge_check'))return new Response(null,{status:204});
  if(url.endsWith('/github_merge_candidates')){assert.equal(init.headers.Authorization,'Bearer secret-service');assert.deepEqual(JSON.parse(init.body),{actor});return response([item]);}
  if(url.startsWith('https://api.github.com/')){assert.equal(init.headers.Authorization,undefined);assert.equal(init.cache,'no-store');return response(pr);}
  assert.ok(url.endsWith('/complete_github_merge'));saved++;
  assert.deepEqual(JSON.parse(init.body),{wanted:item.id,expected_url:item.pr_url,expected_version:item.updated_at,author_id:'777',repository:'example/project',pr_id:'888',merged_at:pr.merged_at});
  return response(true);
 });
 const result=await handler(request());assert.equal(result.status,200);assert.deepEqual(await result.json(),{checked:1,completed:1});assert.equal(saved,1);
});

test('worker never completes open, unproven, private, mismatched, missing or rate-limited PRs',async()=>{
 for(const sample of [{...pr,merged:false,state:'open'},{...pr,merged_at:null},{...pr,user:{login:'author'}},{...pr,base:{repo:{private:true,full_name:'example/project'}}},404,429,'wrong-repository']){
  let writes=0;
  const handler=createMergeHandler(env,async(url)=>{
   if(url.endsWith('/auth/v1/user'))return response({id:actor});
   if(url.endsWith('/note_github_merge_check'))return new Response(null,{status:204});
  if(url.endsWith('/github_merge_candidates'))return response([{...item,...(sample==='wrong-repository'?{repository_url:'https://github.com/other/repo'}:{})}]);
   if(url.startsWith('https://api.github.com/'))return typeof sample==='number'?response({},sample):response(sample==='wrong-repository'?pr:sample);
   writes++;return response(true);
  });
  const result=await handler(request());assert.equal(result.status,200);assert.equal((await result.json()).completed,0);assert.equal(writes,0);
 }
});

test('worker rejects unauthenticated and non-POST requests without invoking privileged RPCs',async()=>{
 const handler=createMergeHandler(env,async(url)=>{assert.ok(url.endsWith('/auth/v1/user'));return response({},401);});
 assert.equal((await handler(new Request('https://worker.invalid'))).status,405);
 assert.equal((await handler(new Request('https://worker.invalid',{method:'POST'}))).status,401);
 assert.equal((await handler(request())).status,401);
});

test('failed storage writes and concurrent false results never report completion',async()=>{
 for(const status of [200,503]){
  const handler=createMergeHandler(env,async(url)=>{
   if(url.endsWith('/auth/v1/user'))return response({id:actor});
   if(url.endsWith('/note_github_merge_check'))return new Response(null,{status:204});
  if(url.endsWith('/github_merge_candidates'))return response([item]);
   if(url.startsWith('https://api.github.com/'))return response(pr);
   return response(false,status);
  });
  const result=await handler(request());assert.equal(result.status,status);if(status===200)assert.equal((await result.json()).completed,0);
 }
});

test('modern secret keys stay on apikey headers while the participant JWT is validated by Auth',async()=>{
 const modern={...env,SUPABASE_ANON_KEY:'sb_publishable_fixture',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_fixture'};
 let privileged=0;
 const handler=createMergeHandler(modern,async(url,init)=>{
  if(url.endsWith('/auth/v1/user')){assert.equal(init.headers.apikey,'sb_publishable_fixture');assert.equal(init.headers.Authorization,'Bearer participant-session');return response({id:actor});}
  privileged++;assert.equal(init.headers.apikey,'sb_secret_fixture');assert.equal(init.headers.Authorization,undefined);
  return response([]);
 });
 assert.equal((await handler(request())).status,200);assert.equal(privileged,1);
});
