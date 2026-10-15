import assert from 'node:assert/strict';
import {test} from 'node:test';
import {checklistInput} from '../../src/lib/opportunities/checklist-input.ts';
test('checklist mutation validates IDs and explicit desired state and discards ownership input',()=>{
  const value={opportunity_id:'10000000-0000-4000-8000-000000000001',step_id:'20000000-0000-4000-8000-000000000001',completed:'true',participant_id:'another-user'};
  const parsed=checklistInput.parse(value);
  assert.equal('participant_id' in parsed,false);
  for(const invalid of [{...value,completed:'on'},{...value,opportunity_id:'invalid'},{...value,step_id:null}]) assert.equal(checklistInput.safeParse(invalid).success,false);
});
