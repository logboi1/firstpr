import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseOpportunityForm,publicationErrors,standardHttps} from '../../src/lib/curator/validation.ts';
test('curator inputs permit incomplete drafts but require publication readiness',()=>{
  const form=new FormData();
  for(const [key,value] of Object.entries({title:'  Docs task ',summary:' Clearer instructions ',contribution_type:'documentation',difficulty:'beginner',steps:'',skills:''})) form.set(key,value);
  const result=parseOpportunityForm(form);assert.equal(result.success,true);
  assert.equal(result.data.title,'Docs task');assert.equal(Object.keys(publicationErrors(result.data)).length,5);
  for(const [key,value] of Object.entries({repository_url:'https://github.com/logboi1/firstpr',issue_url:'https://github.com/logboi1/firstpr/issues/1',skills:'Markdown, Markdown, React',setup_notes:'Install dependencies',steps:'Read guidelines\r\n\nRun tests'})) form.set(key,value);
  const ready=parseOpportunityForm(form);assert.equal(ready.success,true);
  assert.deepEqual(ready.data.steps,['Read guidelines','Run tests']);assert.deepEqual(ready.data.skills,['Markdown','React']);assert.deepEqual(publicationErrors(ready.data),{});
  form.set('steps','a'.repeat(501));assert.equal(parseOpportunityForm(form).success,false);
});
test('external links reject unsafe protocols, credentials, whitespace, backslashes and custom ports',()=>{
  for(const value of ['javascript:alert(1)','http://github.com','https://user:pass@github.com/x','https://github.com:444/x','https://github.com/white space','https://github.com\\path']) assert.equal(standardHttps.safeParse(value).success,false,value);
  assert.equal(standardHttps.parse(' https://GITHUB.com '),'https://github.com/');
  assert.equal(standardHttps.parse(''),'');
});
