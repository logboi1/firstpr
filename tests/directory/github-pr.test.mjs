import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPullRequest } from '../../src/lib/github/pull-request.ts';

const url = 'https://github.com/example/project/pull/42';
const payload = {
  html_url: url, title: '<script>plain text</script>', state: 'open', draft: false, merged: false,
  user: {login: 'contributor'}, base: {repo: {private: false, full_name: 'example/project'}},
  comments: 3, review_comments: 2, updated_at: '2026-10-18T21:00:00Z', body: 'NOT RETURNED',
};
const reply = (data = payload, status = 200) => async () => new Response(JSON.stringify(data), {
  status, headers: {date: 'Sun, 18 Oct 2026 22:00:00 GMT'},
});

test('read public PR from a fixed API host, strip content and expose separate GitHub evidence', async () => {
  let called = false;
  const result = await readPullRequest(url.toUpperCase(), async (input, init) => {
    called = true;
    assert.equal(input, 'https://api.github.com/repos/example/project/pulls/42');
    assert.equal(init.redirect, 'error');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.headers.Authorization, 'Bearer server-secret');
    assert.ok(init.signal instanceof AbortSignal);
    return reply()();
  }, 'server-secret');
  assert.equal(called, true);
  assert.deepEqual(result, {kind:'found', title:payload.title, author:'contributor', repository:'example/project', state:'open', comments:3, reviewComments:2, updatedAt:payload.updated_at, checkedAt:'2026-10-18T22:00:00.000Z'});
  assert.equal(JSON.stringify(result).includes('server-secret'), false);
  assert.equal(JSON.stringify(result).includes('NOT RETURNED'), false);
});

test('correctly distinguish open, draft, closed without merging and merged PRs', async () => {
  for (const [changes, state] of [[{},'open'],[{draft:true},'draft'],[{state:'closed',draft:true},'closed'],[{state:'closed',merged:true},'merged']]) {
    const result = await readPullRequest(url, reply({...payload, ...changes}));
    assert.equal(result.kind, 'found'); assert.equal(result.state, state);
  }
  const result = await readPullRequest(url, reply({...payload,comments:0,review_comments:0}));
  assert.equal(result.comments, 0); assert.equal(result.reviewComments, 0);
});

test('unsafe and noncanonical links never cause network requests', async () => {
  const fail = async () => assert.fail('must not fetch');
  for (const link of ['http://github.com/a/b/pull/1','https://evil.invalid/a/b/pull/1','https://github.com@127.0.0.1/a/b/pull/1','https://github.com/a/../pull/1','https://github.com/a/b/pull/1?x=1','https://github.com/a/b/issues/1']) {
    assert.deepEqual(await readPullRequest(link,fail), {kind:'unavailable', reason:'invalid'});
  }
});

test('private, mismatched, incomplete and malformed responses never become public evidence', async () => {
  for (const body of [{...payload,base:{repo:{private:true,full_name:'example/project'}}},{...payload,base:{repo:{full_name:'example/project'}}},{...payload, comments:-1},{...payload,user:null},{}]) {
    assert.deepEqual(await readPullRequest(url,reply(body)), {kind:'unavailable', reason:'not-public'});
  }
  for (const body of [{...payload,html_url:'https://github.com/example/project/pull/99'},{...payload,base:{repo:{private:false,full_name:'another/project'}}}]) {
    assert.deepEqual(await readPullRequest(url,reply(body)), {kind:'unavailable', reason:'invalid'});
  }
  assert.deepEqual(await readPullRequest(url,async()=>new Response('bad json')), {kind:'unavailable',reason:'network'});
});

test('outage, missing PR and rate-limit responses produce recoverable states without throwing', async () => {
  for (const [status, reason] of [[404,'not-public'],[410,'not-public'],[403,'rate-limit'],[429,'rate-limit'],[500,'network'],[502,'network']]) {
    assert.deepEqual(await readPullRequest(url,reply({},status)), {kind:'unavailable',reason});
  }
  assert.deepEqual(await readPullRequest(url,async()=>{throw new DOMException('timed out','TimeoutError');}),{kind:'unavailable',reason:'network'});
});
