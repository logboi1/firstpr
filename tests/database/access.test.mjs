import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
import pg from "pg";

// This URL must point to a fresh, disposable test database; bootstrap creates roles and auth stubs.
const nativeDatabaseUrl = process.env.FIRSTPR_TEST_DATABASE_URL;
async function openDatabase() {
  if (!nativeDatabaseUrl) return new PGlite();
  const client = new pg.Client({ connectionString: nativeDatabaseUrl });
  await client.connect();
  return {
    exec: (sql) => client.query(sql),
    query: (sql, parameters) => client.query(sql, parameters),
    close: () => client.end(),
  };
}

const ids = {
  alice: "30000000-0000-4000-8000-000000000001",
  bob: "30000000-0000-4000-8000-000000000002",
  mentor: "30000000-0000-4000-8000-000000000003",
  otherMentor: "30000000-0000-4000-8000-000000000004",
  curator: "30000000-0000-4000-8000-000000000005",
};
const opportunity = "10000000-0000-4000-8000-000000000001";
const draft = "10000000-0000-4000-8000-000000000003";
const step = "20000000-0000-4000-8000-000000000001";
const draftStep = "20000000-0000-4000-8000-000000000003";

test("FirstPR migration and database access boundaries", async (suite) => {
  const db = await openDatabase();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  `);
  const migrations = new URL("../../supabase/migrations/", import.meta.url);
  for (const name of readdirSync(migrations).filter(name => name.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(new URL(name, migrations), "utf8"));
  }
  await db.exec(readFileSync(new URL("../../supabase/seed.sql", import.meta.url), "utf8"));

  async function actor(name) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [name ? ids[name] : ""]);
    await db.exec(`set role ${name ? "authenticated" : "anon"}`);
  }
  async function admin() {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
  async function rows(sql, args = []) { return (await db.query(sql, args)).rows; }
  async function denied(sql, args = [], code = "42501") {
    await assert.rejects(() => db.query(sql, args), (error) => error.code === code);
  }

  try {
    await suite.test("migration enables RLS on every app table", async () => {
      const tables = await rows("select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'");
      assert.equal(tables.length, 8);
      assert.ok(tables.every((table) => table.relrowsecurity));
    });
    await suite.test("signup creates a private profile without trusting metadata roles or consent", async () => {
      for (const id of Object.values(ids)) {
        await db.query("insert into auth.users(id, raw_user_meta_data) values ($1, '{\"role\":\"curator\",\"public_board_consent\":true}')", [id]);
      }
      assert.equal((await rows("select * from public.profiles")).length, 5);
      assert.equal((await rows("select * from public.user_roles")).length, 0);
      assert.ok((await rows("select public_board_consent from public.profiles")).every((row) => !row.public_board_consent));
      await db.query("insert into public.user_roles(user_id, role) values ($1,'mentor'),($2,'mentor'),($3,'curator')", [ids.mentor, ids.otherMentor, ids.curator]);
    });
    await suite.test("visitors see published opportunities and their steps, never drafts", async () => {
      await actor();
      assert.equal((await rows("select id from public.opportunities")).length, 2);
      assert.equal((await rows("select id from public.opportunities where id=$1", [draft])).length, 0);
      assert.equal((await rows("select id from public.checklist_steps where id=$1", [draftStep])).length, 0);
    });
    await suite.test("visitors cannot read any private table or write public opportunities", async () => {
      await actor();
      for (const table of ["profiles", "user_roles", "opportunity_participations", "checklist_progress", "help_requests", "contributions"]) {
        await denied(`select * from public.${table}`);
      }
      await denied("update public.opportunities set title='tampered'");
    });
    await suite.test("participants read and edit only their own profile", async () => {
      await actor("alice");
      assert.deepEqual((await rows("select id from public.profiles")).map((row) => row.id), [ids.alice]);
      assert.equal((await rows("update public.profiles set display_name='Alice Demo' where id=$1 returning id", [ids.alice])).length, 1);
      assert.equal((await rows("update public.profiles set display_name='tampered' where id=$1 returning id", [ids.bob])).length, 0);
      assert.equal((await rows("select onboarding_completed from public.profiles"))[0].onboarding_completed, false);
      assert.equal((await rows("update public.profiles set skills=ARRAY['React'], experience='intermediate', onboarding_completed=true where id=$1 returning id", [ids.alice])).length, 1);
      assert.equal((await rows("update public.profiles set onboarding_completed=true where id=$1 returning id", [ids.bob])).length, 0);
      await denied("update public.profiles set id=$1 where id=$2", [ids.bob, ids.alice]);
      await denied("update public.profiles set created_at=now() where id=$1", [ids.alice]);
    });
    await suite.test("participants cannot self-promote or change any role assignment", async () => {
      await actor("alice");
      await denied("insert into public.user_roles(user_id,role) values ($1,'curator')", [ids.alice]);
      await denied("update public.user_roles set role='curator'");
      await denied("delete from public.user_roles");
      assert.equal((await rows("select * from public.user_roles")).length, 0);
      await denied("select private.create_profile()");
    });
    await suite.test("directory combines literal search and filters and hides nonpublic tasks for every role", async () => {
      for (const name of [undefined, "alice", "mentor", "curator"]) {
        await actor(name);
        const browse = async (args = ["", "", "", "", 1]) => (await rows("select public.browse_opportunities($1,$2,$3,$4,$5) as result", args))[0].result;
        const all = await browse();
        assert.equal(all.total, 2);
        assert.deepEqual(all.skills, ["Accessibility", "Markdown"]);
        assert.ok(all.items.every(item => !item.title.includes("draft")));
        assert.equal((await browse(["SETUP", "markdown", "documentation", "beginner", 1])).total, 1);
        assert.equal((await browse(["setup", "Markdown", "testing", "beginner", 1])).total, 0);
        for (const search of ["Unreviewed", "%", "_", "') OR true --"]) {
          assert.equal((await browse([search, "", "", "", 1])).total, 0);
        }
        assert.equal((await browse(["", "TypeScript", "", "", 1])).total, 0);
        assert.equal((await browse(["", "", "", "", -1])).page, 1);
        assert.ok(!("created_by" in all.items[0]));
      }
      await admin();
    });
    await suite.test("directory pagination is bounded, stable, and never includes archived tasks", async () => {
      await admin();
      await db.exec(`insert into public.opportunities(title,summary,skills,contribution_type,repository_url,issue_url,setup_notes,status)
        select '[PAGE TEST] Task ' || n, 'Pagination fixture', ARRAY['C++'], 'code',
          'https://example.invalid/page', 'https://example.invalid/page/issues/' || n,
          'Fictional setup instructions', case when n=15 then 'archived'::public.opportunity_status else 'published'::public.opportunity_status end
        from generate_series(1,15) n;`);
      await actor();
      const browse = async page => (await rows("select public.browse_opportunities('[PAGE TEST]','C++','code','beginner',$1) as result", [page]))[0].result;
      const first = await browse(1), second = await browse(2);
      assert.equal(first.total, 14); assert.equal(first.pages, 2); assert.equal(first.items.length, 12);
      assert.equal(second.items.length, 2);
      assert.equal(new Set([...first.items, ...second.items].map(item => item.id)).size, 14);
      assert.deepEqual((await browse(1)).items, first.items);
      assert.deepEqual((await browse(999999)).items, second.items);
      await admin();
      await db.exec("delete from public.opportunities where title like '[PAGE TEST]%'");
    });
    await suite.test("participants and mentors cannot edit opportunities", async () => {
      for (const name of ["alice", "mentor"]) {
        await actor(name);
        assert.equal((await rows("update public.opportunities set title='tampered' where id=$1 returning id", [opportunity])).length, 0);
        await denied("insert into public.opportunities(title,summary,contribution_type,repository_url,issue_url) values ('x','x','code','https://example.invalid/x','https://example.invalid/x/1')");
      }
    });
    await suite.test("curators can read drafts and create and edit opportunities", async () => {
      await actor("curator");
      assert.equal((await rows("select id from public.opportunities where id=$1", [draft])).length, 1);
      assert.equal((await rows("update public.opportunities set title='[DEMO] Reviewed draft' where id=$1 returning id", [draft])).length, 1);
      const created = await rows("insert into public.opportunities(title,summary,contribution_type,repository_url,issue_url) values ('[DEMO] New draft','Local fixture','code','https://example.invalid/new','https://example.invalid/new/1') returning created_by");
      assert.equal(created[0].created_by, ids.curator);
      await denied("update public.opportunities set status='published' where id=$1", [draft], "23514");
      await denied("delete from public.opportunities where id=$1", [draft]);
    });
    await suite.test("checklist progress is private, unique, and cannot be forged for another user or draft", async () => {
      await actor("alice");
      await db.query("insert into public.checklist_progress(checklist_step_id) values ($1)", [step]);
      await denied("insert into public.checklist_progress(checklist_step_id) values ($1)", [step], "23505");
      await denied("insert into public.checklist_progress(participant_id,checklist_step_id) values ($1,$2)", [ids.bob, step]);
      await denied("insert into public.checklist_progress(checklist_step_id) values ($1)", [draftStep]);
      await actor("bob");
      assert.equal((await rows("select * from public.checklist_progress")).length, 0);
      assert.equal((await rows("update public.checklist_progress set completed_at=now() returning participant_id")).length, 0);
      assert.equal((await rows("delete from public.checklist_progress returning participant_id")).length, 0);
    });

    let helpId;
    await suite.test("participants create open help requests; other participants cannot read them", async () => {
      await actor("alice");
      helpId = (await rows("insert into public.help_requests(opportunity_id,blocker) values ($1,'Fictional setup blocker') returning id", [opportunity]))[0].id;
      await denied("insert into public.help_requests(opportunity_id,blocker,status) values ($1,'x','resolved')", [opportunity]);
      await denied("insert into public.help_requests(opportunity_id,blocker) values ($1,'x')", [draft]);
      await denied("insert into public.help_requests(opportunity_id,blocker) values ($1,' ')", [opportunity], "23514");
      await actor("bob");
      assert.equal((await rows("select * from public.help_requests")).length, 0);
      assert.equal((await rows("update public.help_requests set status='cancelled' where id=$1 returning id", [helpId])).length, 0);
    });
    await suite.test("participants cannot claim or resolve their own request", async () => {
      await actor("alice");
      await denied("update public.help_requests set status='claimed', assigned_mentor_id=$1 where id=$2", [ids.alice, helpId]);
      await denied("update public.help_requests set status='resolved', assigned_mentor_id=$1 where id=$2", [ids.mentor, helpId]);
    });
    await suite.test("native PostgreSQL serializes simultaneous mentor claims", { skip: !nativeDatabaseUrl }, async () => {
      await actor("alice");
      const id = (await rows("insert into public.help_requests(opportunity_id,blocker) values ($1,'Concurrent claim fixture') returning id", [opportunity]))[0].id;
      const first = new pg.Client({ connectionString: nativeDatabaseUrl, query_timeout: 10000 });
      const second = new pg.Client({ connectionString: nativeDatabaseUrl, query_timeout: 10000 });
      await first.connect();
      await second.connect();
      let pending;
      try {
        for (const [client, userId] of [[first, ids.mentor], [second, ids.otherMentor]]) {
          await client.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
          await client.query("set role authenticated");
          await client.query("begin");
        }
        const claim = "update public.help_requests set status='claimed',assigned_mentor_id=auth.uid() where id=$1 and status='open' returning id";
        assert.equal((await first.query(claim, [id])).rows.length, 1);
        pending = second.query(claim, [id]);
        // Confirm a real lock wait before releasing the first transaction.
        await admin();
        let blocked = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          const activity = await rows("select wait_event_type from pg_stat_activity where pid=$1", [second.processID]);
          if (activity[0]?.wait_event_type === "Lock") { blocked = true; break; }
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        assert.ok(blocked, "second claim should wait on the first transaction's row lock");
        await first.query("commit");
        assert.equal((await pending).rows.length, 0);
        await second.query("commit");
        assert.equal((await rows("select assigned_mentor_id from public.help_requests where id=$1", [id]))[0].assigned_mentor_id, ids.mentor);
      } finally {
        await first.query("rollback");
        await second.query("rollback");
        if (pending) await pending.catch(() => {});
        await first.end();
        await second.end();
      }
    });
    await suite.test("mentor sees queue, cannot assign another mentor, and can claim the request", async () => {
      await actor("mentor");
      assert.equal((await rows("select id from public.help_requests where id=$1", [helpId])).length, 1);
      await denied("update public.help_requests set status='claimed',assigned_mentor_id=$1 where id=$2", [ids.otherMentor, helpId]);
      assert.equal((await rows("update public.help_requests set status='claimed',assigned_mentor_id=auth.uid() where id=$1 and status='open' returning id", [helpId])).length, 1);
    });
    await suite.test("second mentor loses the claim and cannot resolve or alter another mentor's request", async () => {
      await actor("otherMentor");
      assert.equal((await rows("update public.help_requests set status='claimed',assigned_mentor_id=auth.uid() where id=$1 and status='open' returning id", [helpId])).length, 0);
      assert.equal((await rows("update public.help_requests set status='resolved' where id=$1 returning id", [helpId])).length, 0);
      assert.equal((await rows("update public.help_requests set blocker='tampered' where id=$1 returning id", [helpId])).length, 0);
    });
    await suite.test("assigned mentor can release, reclaim, and resolve but cannot rewrite blocker or reopen resolved requests", async () => {
      await actor("mentor");
      await denied("update public.help_requests set blocker='tampered' where id=$1", [helpId]);
      await db.query("update public.help_requests set status='open',assigned_mentor_id=null where id=$1", [helpId]);
      await db.query("update public.help_requests set status='claimed',assigned_mentor_id=auth.uid() where id=$1 and status='open'", [helpId]);
      await db.query("update public.help_requests set status='resolved' where id=$1", [helpId]);
      assert.equal((await rows("select status from public.help_requests where id=$1", [helpId]))[0].status, "resolved");
      assert.equal((await rows("update public.help_requests set status='open',assigned_mentor_id=null where id=$1 returning id", [helpId])).length, 0);
    });
    await suite.test("curator role does not expose private help queue or other profiles", async () => {
      await actor("curator");
      assert.equal((await rows("select id from public.help_requests")).length, 0);
      assert.equal((await rows("select id from public.profiles")).length, 1);
    });
    await suite.test("participants can cancel their own open requests", async () => {
      await actor("alice");
      const id = (await rows("insert into public.help_requests(opportunity_id,blocker) values ($1,'Another fictional blocker') returning id", [opportunity]))[0].id;
      await db.query("update public.help_requests set status='cancelled' where id=$1", [id]);
      assert.equal((await rows("select status from public.help_requests where id=$1", [id]))[0].status, "cancelled");
    });

    await suite.test("participant cancellation covers claimed requests; terminal requests cannot be claimed or reopened", async () => {
      await actor("alice");
      const id=(await rows("insert into public.help_requests(opportunity_id,blocker) values($1,'Claimed cancellation fixture') returning id",[opportunity]))[0].id;
      await actor("mentor");
      await db.query("update public.help_requests set status='claimed',assigned_mentor_id=auth.uid() where id=$1 and status='open'",[id]);
      // A participant screen must still use this filter when the actor is a mentor.
      assert.equal((await rows("select id from public.help_requests where participant_id=auth.uid() and id=$1",[id])).length,0);
      await actor("bob");
      assert.equal((await rows("update public.help_requests set status='cancelled' where id=$1 returning id",[id])).length,0);
      await actor("alice");
      assert.equal((await rows("update public.help_requests set status='cancelled' where id=$1 and participant_id=auth.uid() and status in ('open','claimed') returning id",[id])).length,1);
      assert.equal((await rows("update public.help_requests set status='open' where id=$1 returning id",[id])).length,0);
      await actor("mentor");
      assert.equal((await rows("update public.help_requests set status='claimed',assigned_mentor_id=auth.uid() where id=$1 and status='open' returning id",[id])).length,0);
      assert.equal((await rows("update public.help_requests set status='claimed',assigned_mentor_id=auth.uid() where id=$1 returning id",[id])).length,0);
      assert.equal((await rows("update public.help_requests set status='claimed',assigned_mentor_id=auth.uid() where id=$1 and status='open' returning id",[helpId])).length,0);
    });

    let contributionId;
    await suite.test("participants submit valid PRs; duplicates and invalid URLs are rejected", async () => {
      await actor("alice");
      contributionId = (await rows("insert into public.contributions(opportunity_id,pr_url) values ($1,'https://github.com/firstpr-demo/docs/pull/1') returning id", [opportunity]))[0].id;
      await denied("insert into public.contributions(opportunity_id,pr_url) values ($1,'https://github.com/firstpr-demo/docs/pull/1')", [opportunity], "23505");
      await denied("insert into public.contributions(opportunity_id,pr_url) values ($1,'https://evil.invalid/pull/1')", [opportunity], "23514");
      await denied("insert into public.contributions(opportunity_id,pr_url,status) values ($1,'https://github.com/firstpr-demo/docs/pull/2','merged')", [opportunity]);
      await denied("update public.contributions set status='merged' where id=$1", [contributionId]);
      await denied("update public.contributions set verifier_id=$1 where id=$2", [ids.curator, contributionId]);
    });
    await suite.test("other participants and mentors cannot read or verify contributions", async () => {
      for (const name of ["bob", "mentor"]) {
        await actor(name);
        assert.equal((await rows("select * from public.contributions")).length, 0);
        assert.equal((await rows("update public.contributions set status='merged' where id=$1 returning id", [contributionId])).length, 0);
      }
    });
    await suite.test("curator verification automatically records actor and time; participant cannot replace a verified PR", async () => {
      await actor("curator");
      await db.query("update public.contributions set status='merged' where id=$1", [contributionId]);
      const verified = (await rows("select * from public.contributions where id=$1", [contributionId]))[0];
      assert.equal(verified.verifier_id, ids.curator);
      assert.ok(verified.verified_at);
      await actor("alice");
      assert.equal((await rows("update public.contributions set pr_url='https://github.com/firstpr-demo/docs/pull/3' where id=$1 returning id", [contributionId])).length, 0);
    });
    await suite.test("curators cannot self-verify", async () => {
      await actor("curator");
      const ownId = (await rows("insert into public.contributions(opportunity_id,pr_url) values ($1,'https://github.com/firstpr-demo/docs/pull/4') returning id", [opportunity]))[0].id;
      await denied("update public.contributions set status='merged' where id=$1", [ownId]);
    });
    await suite.test("public progress is opt-in and exposes only the deliberate projection", async () => {
      await actor();
      assert.equal((await rows("select * from public.get_public_progress()")).length, 0);
      await actor("alice");
      await db.query("update public.profiles set public_board_consent=true where id=auth.uid()");
      await actor();
      const board = await rows("select * from public.get_public_progress(100000)");
      assert.equal(board.length, 1);
      assert.deepEqual(Object.keys(board[0]).sort(), ["display_name", "pr_url", "status", "submitted_at"].sort());
      assert.equal(board[0].status, "merged");
      await actor("alice");
      await db.query("update public.profiles set public_board_consent=false where id=auth.uid()");
      await actor();
      assert.equal((await rows("select * from public.get_public_progress()")).length, 0);
    });
    await suite.test("archiving preserves instructions for existing participants and blocks new participants", async () => {
      await actor("curator");
      await db.query("update public.opportunities set status='archived' where id=$1", [opportunity]);
      assert.equal((await rows("update public.opportunities set setup_notes='changed' where id=$1 returning id", [opportunity])).length, 0);
      await denied("update public.checklist_steps set label='changed' where id=$1", [step]);
      await actor();
      assert.equal((await rows("select id from public.opportunities where id=$1", [opportunity])).length, 0);
      await actor("bob");
      assert.equal((await rows("select id from public.opportunities where id=$1", [opportunity])).length, 0);
      await denied("insert into public.help_requests(opportunity_id,blocker) values ($1,'new participant')", [opportunity]);
      await denied("insert into public.checklist_progress(checklist_step_id) values ($1)", [step]);
      await actor("alice");
      assert.equal((await rows("select id from public.opportunities where id=$1", [opportunity])).length, 1);
      assert.equal((await rows("select id from public.checklist_steps where id=$1", [step])).length, 1);
      await db.query("insert into public.help_requests(opportunity_id,blocker) values ($1,'Existing participant continues')", [opportunity]);
    });
    await suite.test("published checklist steps cannot be deleted, even by curators", async () => {
      await actor("curator");
      await denied("delete from public.checklist_steps where id=$1", [step]);
      // Draft checklist edits remain available.
      assert.equal((await rows("update public.checklist_steps set label='Reviewed instructions' where id=$1 returning id", [draftStep])).length, 1);
    });
    await suite.test("native PostgreSQL blocks a new start behind archival then rejects it", {skip:!nativeDatabaseUrl}, async()=>{
      await admin();
      const task=(await rows("insert into public.opportunities(title,summary,contribution_type,repository_url,issue_url,setup_notes,status) values ('Archive race','Fixture','code','https://example.invalid/race','https://example.invalid/race/1','Setup','published') returning id"))[0].id;
      const archiver=new pg.Client({connectionString:nativeDatabaseUrl,query_timeout:10000});
      const starter=new pg.Client({connectionString:nativeDatabaseUrl,query_timeout:10000});
      await archiver.connect(); await starter.connect();
      let pending;
      try {
        await archiver.query('begin');
        await archiver.query("update public.opportunities set status='archived' where id=$1",[task]);
        await starter.query("select set_config('request.jwt.claim.sub',$1,false)",[ids.bob]);
        await starter.query('set role authenticated');
        pending=starter.query('select public.start_opportunity($1)',[task]).then(result=>({result}),error=>({error}));
        let blocked=false;
        for(let attempt=0;attempt<100;attempt++) {
          const activity=await rows('select wait_event_type from pg_stat_activity where pid=$1',[starter.processID]);
          if(activity[0]?.wait_event_type==='Lock'){blocked=true;break;}
          await new Promise(resolve=>setTimeout(resolve,20));
        }
        assert.ok(blocked,'start must wait for archival transaction');
        await archiver.query('commit');
        assert.equal((await pending).error?.code,'42501');
        assert.equal((await rows('select * from public.opportunity_participations where opportunity_id=$1',[task])).length,0);
      } finally {
        await archiver.query('rollback');
        if(pending) await pending;
        await archiver.end(); await starter.end();
      }
    });
    await suite.test("task details and checklist RPCs isolate owners and preserve archived starts after all steps are unchecked", async () => {
      await admin();
      const task=(await rows("insert into public.opportunities(title,summary,contribution_type,repository_url,issue_url,setup_notes,prerequisites,status) values ('Checklist test','Fixture','code','https://example.invalid/checklist','https://example.invalid/checklist/1','Install then test','Read the guide','published') returning id"))[0].id;
      const late=(await rows("insert into public.checklist_steps(opportunity_id,label,position) values ($1,'Second step',2) returning id",[task]))[0].id;
      const early=(await rows("insert into public.checklist_steps(opportunity_id,label,position) values ($1,'First step',1) returning id",[task]))[0].id;
      const detail=async()=> (await rows("select public.get_opportunity_detail($1) as data",[task]))[0].data;
      await actor();
      assert.deepEqual((await detail()).steps.map(s=>s.label),['First step','Second step']);
      assert.equal((await detail()).started,false);
      await denied("select public.start_opportunity($1)",[task]);
      await denied("select public.set_checklist_step($1,$2,true)",[task,early]);
      for(const name of ['alice','curator']) {
        await actor(name);
        assert.equal((await rows("select public.get_opportunity_detail($1) as data",[draft]))[0].data,null);
        await denied("select public.start_opportunity($1)",[draft]);
      }
      await actor('alice');
      await db.query("select public.start_opportunity($1)",[task]);
      await db.query("select public.start_opportunity($1)",[task]);
      assert.equal((await rows("select * from public.opportunity_participations where opportunity_id=$1",[task])).length,1);
      await denied("insert into public.opportunity_participations(participant_id,opportunity_id) values ($1,$2)",[ids.bob,task]);
      await denied("delete from public.opportunity_participations");
      await db.query("select public.set_checklist_step($1,$2,true)",[task,early]);
      await db.query("select public.set_checklist_step($1,$2,true)",[task,early]);
      assert.deepEqual((await detail()).steps.map(s=>s.completed),[true,false]);
      await denied("select public.set_checklist_step($1,$2,true)",[task,step]);
      await actor('bob');
      assert.equal((await detail()).started,false);
      assert.ok((await detail()).steps.every(s=>!s.completed));
      assert.equal((await rows("select * from public.opportunity_participations where opportunity_id=$1",[task])).length,0);
      await db.query("select public.set_checklist_step($1,$2,true)",[task,late]);
      await db.query("select public.set_checklist_step($1,$2,false)",[task,early]);
      await actor('alice');
      assert.equal((await detail()).steps[0].completed,true);
      await admin();
      await db.query("update public.opportunities set status='archived' where id=$1",[task]);
      await actor('otherMentor');
      assert.equal(await detail(),null);
      await denied("select public.start_opportunity($1)",[task]);
      await denied("select public.set_checklist_step($1,$2,true)",[task,early]);
      await actor('alice');
      await db.query("select public.set_checklist_step($1,$2,false)",[task,early]);
      assert.equal((await detail()).started,true);
      assert.ok((await detail()).steps.every(s=>!s.completed));
      await db.query("select public.set_checklist_step($1,$2,true)",[task,late]);
      assert.equal((await detail()).steps[1].completed,true);
      await db.query("select set_config('request.jwt.claim.sub','',false)");
      await denied("select public.start_opportunity($1)",[task]);
      await denied("select public.set_checklist_step($1,$2,true)",[task,late]);
      await admin();
    });
    await suite.test("curator lifecycle RPCs reject noncurators, validate publication, preserve history, and detect stale saves",async()=>{
      const payload={title:'Curator fixture',summary:'A reviewed task',skills:[],contribution_type:'documentation',difficulty:'beginner',repository_url:'',issue_url:'',prerequisites:'',setup_notes:'',steps:[],created_by:ids.bob,status:'published'};
      await actor();await denied('select public.save_curator_opportunity(null,null,$1::jsonb,false)',[JSON.stringify(payload)]);
      for(const name of ['alice','mentor']) {
        await actor(name);await denied('select public.save_curator_opportunity(null,null,$1::jsonb,false)',[JSON.stringify(payload)]);
        await denied("select public.list_curator_opportunities()");
        await denied('select public.get_curator_opportunity($1)',[opportunity]);
        await denied('select public.archive_curator_opportunity($1,now())',[opportunity]);
      }
      await actor('curator');
      const task=(await rows('select public.save_curator_opportunity(null,null,$1::jsonb,false) as id',[JSON.stringify(payload)]))[0].id;
      const snapshot=async()=> (await rows('select public.get_curator_opportunity($1) as data',[task]))[0].data;
      assert.equal((await snapshot()).status,'draft');
      assert.equal((await rows('select created_by from public.opportunities where id=$1',[task]))[0].created_by,ids.curator);
      const version=(await snapshot()).updated_at;
      await denied('select public.save_curator_opportunity($1,$2,$3::jsonb,true)',[task,version,JSON.stringify({...payload,title:'Should roll back'})],'23514');
      assert.equal((await snapshot()).title,payload.title);
      await denied('select public.save_curator_opportunity($1,$2,$3::jsonb,false)',[task,version,JSON.stringify({...payload,repository_url:'javascript:alert(1)'})],'23514');
      await denied('select public.save_curator_opportunity($1,$2,$3::jsonb,false)',[task,version,JSON.stringify({...payload,title:'Invalid steps',steps:['a'.repeat(501)]})],'23514');
      assert.deepEqual((await snapshot()).steps,[]);
      const ready={...payload,skills:['Markdown'],repository_url:'https://example.invalid/curated',issue_url:'https://example.invalid/curated/issues/1',setup_notes:'Install and test',steps:['Read guidelines','Run tests']};
      await rows('select public.save_curator_opportunity($1,$2,$3::jsonb,true)',[task,version,JSON.stringify(ready)]);
      assert.equal((await snapshot()).status,'published');
      assert.deepEqual((await snapshot()).steps,ready.steps);
      const stepRows=await rows('select id,label from public.checklist_steps where opportunity_id=$1 order by position',[task]);
      const publishedVersion=(await snapshot()).updated_at;
      await denied('select public.save_curator_opportunity($1,$2,$3::jsonb,false)',[task,'2000-01-01T00:00:00Z',JSON.stringify({...ready,steps:null,title:'Stale edit'})],'40001');
      await denied('select public.save_curator_opportunity($1,$2,$3::jsonb,false)',[task,publishedVersion,JSON.stringify({...ready,steps:['Replacement']})]);
      await denied("update public.opportunities set status='draft' where id=$1",[task]);
      await denied("delete from public.checklist_steps where opportunity_id=$1",[task]);
      await denied("update public.checklist_steps set label='Changed' where id=$1",[stepRows[0].id]);
      await denied("insert into public.checklist_steps(opportunity_id,label,position) values($1,'Added',2)",[task]);
      await rows('select public.save_curator_opportunity($1,$2,$3::jsonb,false)',[task,publishedVersion,JSON.stringify({...ready,title:'Updated task information',steps:null})]);
      assert.deepEqual(await rows('select id,label from public.checklist_steps where opportunity_id=$1 order by position',[task]),stepRows);
      await actor('alice');await rows('select public.start_opportunity($1)',[task]);
      await actor('curator');
      await denied('select public.archive_curator_opportunity($1,$2)',[task,'2000-01-01T00:00:00Z'],'40001');
      await rows('select public.archive_curator_opportunity($1,$2)',[task,(await snapshot()).updated_at]);
      assert.equal((await snapshot()).status,'archived');
      await denied('select public.save_curator_opportunity($1,$2,$3::jsonb,false)',[task,(await snapshot()).updated_at,JSON.stringify({...ready,steps:null})]);
      await actor();assert.equal((await rows('select public.get_opportunity_detail($1) as data',[task]))[0].data,null);
      const directory=(await rows("select public.browse_opportunities('Updated task information') as data"))[0].data;assert.equal(directory.total,0);
      await actor('alice');assert.equal((await rows('select public.get_opportunity_detail($1) as data',[task]))[0].data.status,'archived');
      await actor('curator');
      const incomplete=(await rows('select public.save_curator_opportunity(null,null,$1::jsonb,false) as id',[JSON.stringify(payload)]))[0].id;
      const incompleteVersion=(await rows('select public.get_curator_opportunity($1) as data',[incomplete]))[0].data.updated_at;
      await rows('select public.archive_curator_opportunity($1,$2)',[incomplete,incompleteVersion]);
      assert.equal((await rows('select status from public.opportunities where id=$1',[incomplete]))[0].status,'archived');
      await admin();
    });
    await suite.test("private helpers have fixed search paths and trigger functions are not client-callable", async () => {
      await admin();
      const functions = await rows("select proname, proconfig from pg_proc where pronamespace='private'::regnamespace");
      assert.ok(functions.every((fn) => fn.proconfig?.some((config) => config.startsWith("search_path="))));
      const permission = await rows("select has_function_privilege('authenticated','private.guard_contribution_update()','EXECUTE') allowed");
      assert.equal(permission[0].allowed, false);
    });
  } finally {
    await db.close();
  }
});
