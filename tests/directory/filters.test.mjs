import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFilters, directoryHref, hasFilters } from '../../src/lib/opportunities/filters.ts';
test('filters normalize untrusted query parameters without evaluating search syntax', () => {
  assert.deepEqual(parseFilters({q:['  React  ','ignored'], skill:' C++ ', type:'documentation', difficulty:'beginner', page:'2'}), {q:'React',skill:'C++',type:'documentation',difficulty:'beginner',page:2});
  assert.deepEqual(parseFilters({type:'curator',difficulty:'invalid',page:'1e9'}), {q:'',skill:'',type:'',difficulty:'',page:1});
  assert.equal(parseFilters({page:'-1'}).page, 1);
  assert.equal(parseFilters({page:'9999999'}).page, 1000000);
  assert.equal(parseFilters({q:'a'.repeat(200)}).q.length, 120);
  assert.equal(parseFilters({q:"%_') OR true --"}).q, "%_') OR true --");
});
test('pagination URLs preserve combined filters and encode special characters', () => {
  const filters = parseFilters({q:'setup & test',skill:'C++',type:'code',difficulty:'beginner'});
  const url = new URL(directoryHref(filters,2),'https://firstpr.example');
  assert.equal(url.searchParams.get('q'),'setup & test');
  assert.equal(url.searchParams.get('skill'),'C++');
  assert.equal(url.searchParams.get('page'),'2');
  assert.equal(hasFilters(filters),true);
  assert.equal(directoryHref(parseFilters({})), '/opportunities');
  assert.equal(hasFilters(parseFilters({})),false);
});
