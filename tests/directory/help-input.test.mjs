import { test } from 'node:test';
import assert from 'node:assert/strict';
import { helpInput, requestId } from '../../src/lib/help/validation.ts';
test('help input requires a bounded blocker and ignores forged workflow and ownership fields', () => {
  const opportunity_id='10000000-0000-4000-8000-000000000001';
  const parsed=helpInput.parse({opportunity_id,blocker:'  Tests fail after setup.  ',participant_id:'someone-else',status:'resolved',assigned_mentor_id:'mentor'});
  assert.deepEqual(parsed,{opportunity_id,blocker:'Tests fail after setup.'});
  for(const blocker of ['', ' \n ', 'x'.repeat(4001)]) assert.equal(helpInput.safeParse({opportunity_id,blocker}).success,false);
  assert.equal(helpInput.safeParse({opportunity_id,blocker:'x'.repeat(4000)}).success,true);
  assert.equal(requestId.safeParse('not-a-request').success,false);
});
