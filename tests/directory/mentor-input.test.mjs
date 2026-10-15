import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mentorInput,parseQueue} from '../../src/lib/mentor/validation.ts';
const request_id='10000000-0000-4000-8000-000000000001';
test('mentor actions bound guidance and discard forged assignment/ownership',()=>{
  assert.deepEqual(mentorInput.parse({request_id,action:'resolve',response:'  Read the guide.  ',assigned_mentor_id:'another-mentor',participant_id:'other'}),{request_id,action:'resolve',response:'Read the guide.'});
  for(const action of ['respond','resolve'])for(const response of ['', ' ', 'x'.repeat(4001)])assert.equal(mentorInput.safeParse({request_id,action,response}).success,false);
  assert.equal(mentorInput.safeParse({request_id,action:'claim'}).success,true);
  assert.equal(mentorInput.safeParse({request_id:'bad',action:'claim'}).success,false);
  assert.equal(mentorInput.safeParse({request_id,action:'promote'}).success,false);
});
test('queue filters and pagination normalize untrusted URL input',()=>{
  assert.deepEqual(parseQueue({view:['mine','all'],page:'-1'}),{filter:'open',page:1});
  assert.deepEqual(parseQueue({view:'mine',page:'2'}),{filter:'mine',page:2});
  assert.deepEqual(parseQueue({view:'all',page:'999999999999999999'}),{filter:'all',page:1});
});
