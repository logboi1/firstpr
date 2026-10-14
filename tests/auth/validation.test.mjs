import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emailSchema, codeSchema, profileInput } from '../../src/lib/auth/validation.ts';
test('email and OTP reject malformed inputs', () => {
  assert.equal(emailSchema.parse('  ada@example.com  '), 'ada@example.com');
  for (const value of ['', 'ada', 'a'.repeat(255) + '@example.com']) assert.equal(emailSchema.safeParse(value).success, false);
  for (const value of ['123456', '12345678']) assert.equal(codeSchema.safeParse(value).success, true);
  for (const value of ['123', '12345x', '12345678901']) assert.equal(codeSchema.safeParse(value).success, false);
});
test('profile validation normalizes skills and ignores owner and role input', () => {
  const form = new FormData();
  form.set('display_name', '  Ada  ');
  form.set('skills', ' React, documentation, React, , design ');
  form.set('experience', 'beginner');
  form.set('id', 'another-user');
  form.set('role', 'curator');
  const result = profileInput(form);
  assert.equal(result.success, true);
  assert.deepEqual(result.data, { display_name: 'Ada', skills: ['React', 'documentation', 'design'], experience: 'beginner', public_board_consent: false });
  form.set('public_board_consent', 'on');
  assert.equal(profileInput(form).data.public_board_consent, true);
  for (const [field, value] of [['display_name', '  '], ['display_name', 'a'.repeat(81)], ['experience', 'curator'], ['skills', 'x'.repeat(61)], ['skills', Array.from({length:31}, (_,i)=>`skill${i}`).join(',')]]) {
    const invalid = new FormData();
    invalid.set('display_name', 'Ada'); invalid.set('experience', 'beginner'); invalid.set('skills', ''); invalid.set(field,value);
    assert.equal(profileInput(invalid).success, false);
  }
});
