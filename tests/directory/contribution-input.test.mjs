import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prUrl,contributionInput,reviewInput,contributionFilters,contributionView,closureInput} from '../../src/lib/contributions/validation.ts';
const opportunity_id='10000000-0000-4000-8000-000000000001';
test('PR links normalize case and reject unsafe or noncanonical paths',()=>{
  assert.equal(prUrl.parse(' HTTPS://GitHub.com/Example/Repo/pull/12 '),'https://github.com/example/repo/pull/12');
  for(const url of ['https://github.com/owner/repo/issues/1','http://github.com/o/r/pull/1','https://github.com@evil.invalid/o/r/pull/1','https://github.com/o/r/pull/1?x=1','https://github.com/o/r/pull/1#diff','https://github.com/o/r/pull/0','https://github.com/o/r/pull/01','https://github.com/o/../pull/1','https://github.com/-o/r/pull/1','https://github.com/o/r/pull/1/'])assert.equal(prUrl.safeParse(url).success,false,url);
});
test('submission and review inputs discard forged workflow/audit fields and require explicit review',()=>{
  assert.deepEqual(contributionInput.parse({opportunity_id,pr_url:'https://github.com/o/r/pull/1',status:'merged',participant_id:'other',verifier_id:'fake'}),{opportunity_id,pr_url:'https://github.com/o/r/pull/1'});
  assert.equal(contributionInput.safeParse({opportunity_id,contribution_id:opportunity_id,pr_url:'https://github.com/o/r/pull/1'}).success,false);
  const review={contribution_id:opportunity_id,expected_updated_at:'2026-10-15T12:00:00+00:00',status:'merged'};
  assert.equal(reviewInput.safeParse(review).success,false);assert.equal(reviewInput.safeParse({...review,checked:'on'}).success,true);
  assert.deepEqual(contributionFilters({status:['merged','closed'],page:'-1'}),{status:'',page:1});
});


test('closure validates record/version/desired state and view ignores unrecognized parameters',()=>{
  const input={contribution_id:opportunity_id,expected_updated_at:'2026-10-19T00:00:00Z',closed:'true',scope:'participant'};
  assert.deepEqual(closureInput.parse({...input,closed_by:'forged',status:'closed'}),input);
  assert.equal(closureInput.safeParse({...input,closed:'yes'}).success,false);
  assert.equal(closureInput.safeParse({...input,expected_updated_at:''}).success,false);
  assert.equal(closureInput.safeParse({...input,scope:'admin'}).success,false);
  assert.equal(contributionView({}), 'active');assert.equal(contributionView({view:'closed'}), 'closed');
  assert.equal(contributionView({view:'all'}), 'all');assert.equal(contributionView({view:['closed']}), 'active');
});
