import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicBoardSchema,consentInput} from '../../src/lib/progress/validation.ts';
const item={display_name:'Ada',pr_url:'https://github.com/demo/project/pull/1',status:'submitted',submitted_at:'2026-10-15T12:00:00Z'};
const board={items:[item],total:1,page:1,pages:1,counts:{submitted:1,merged:0,closed:0}};
test('public projection rejects extra private fields and inconsistent field types',()=>{
  assert.equal(publicBoardSchema.safeParse(board).success,true);
  for(const key of ['email','participant_id','blocker','mentor_id','skills'])assert.equal(publicBoardSchema.safeParse({...board,items:[{...item,[key]:'private'}]}).success,false);
  assert.equal(publicBoardSchema.safeParse({...board,private_total:99}).success,false);
  assert.equal(publicBoardSchema.safeParse({...board,counts:{submitted:-1,merged:0,closed:0}}).success,false);
  assert.equal(publicBoardSchema.safeParse({...board,items:[{...item,pr_url:'javascript:alert(1)'}]}).success,false);
});
test('consent uses an explicit desired value',()=>{
  assert.equal(consentInput.parse('true'),'true');assert.equal(consentInput.parse('false'),'false');
  for(const value of ['on','yes','',true,null])assert.equal(consentInput.safeParse(value).success,false);
});
