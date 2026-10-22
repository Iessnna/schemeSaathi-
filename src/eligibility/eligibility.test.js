// Run with:  npm test      (uses Node's built-in test runner; no extra packages)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STATUS, CHECK, validateProfile, evaluateScheme, matchSchemes, ProfileValidationError,
} from './index.js';

const { schemes } = JSON.parse(readFileSync(new URL('../data/schemes.json', import.meta.url)));
const byId = (id) => schemes.find((s) => s.id === id);

// The sample profile from the brief, plus explicit answers for the optional fields.
const base = {
  age: 45, state: 'Bihar', domicile: 'Bihar', occupation: 'farmer', annualIncome: 80000,
  gender: 'male', domicileCertificate: 'yes', ownsLand: 'yes', isStudent: 'no', hasDisabilityCertificate: 'no',
};
const clean = (over = {}) => {
  const r = validateProfile({ ...base, ...over });
  assert.ok(r.valid, JSON.stringify(r.errors));
  return r.profile;
};
const run = (id, over) => evaluateScheme(clean(over), byId(id));

// ---- Positive matches ------------------------------------------------------
test('farmer with land and low income is eligible for the farmer scheme', () => {
  const r = run('demo-farmer-support');
  assert.equal(r.status, STATUS.ELIGIBLE);
  assert.equal(r.missing.length, 0);
});

test('Bihar domicile + certificate is eligible for the Bihar scheme', () => {
  assert.equal(run('demo-bihar-crop-aid').status, STATUS.ELIGIBLE);
});

// ---- Failed criteria ---------------------------------------------------------
test('income above the limit fails with an income check', () => {
  const r = run('demo-farmer-support', { annualIncome: 900000 });
  assert.equal(r.status, STATUS.NOT_ELIGIBLE);
  assert.equal(r.checks.find((c) => c.type === 'income').status, CHECK.FAIL);
});

test('age below the minimum fails', () => {
  assert.equal(run('demo-senior-support', { age: 45 }).status, STATUS.NOT_ELIGIBLE);
  assert.equal(run('demo-senior-support', { age: 60, annualIncome: 100000 }).status, STATUS.ELIGIBLE);
});

test('occupation mismatch fails', () => {
  assert.equal(run('demo-farmer-support', { occupation: 'employed' }).status, STATUS.NOT_ELIGIBLE);
});

test('explicit "no" to a required yes/no condition fails', () => {
  assert.equal(run('demo-farmer-support', { ownsLand: 'no' }).status, STATUS.NOT_ELIGIBLE);
});

// ---- Missing information -> Maybe, never Not eligible -------------------------
test('unsure income gives Maybe and lists the missing field', () => {
  const r = run('demo-farmer-support', { annualIncome: 'unsure' });
  assert.equal(r.status, STATUS.MAYBE);
  assert.deepEqual(r.missing, ['annualIncome']);
});

test('unanswered land question gives Maybe', () => {
  const r = run('demo-farmer-support', { ownsLand: '' });
  assert.equal(r.status, STATUS.MAYBE);
  assert.deepEqual(r.missing, ['ownsLand']);
});

test('gender "prefer not to say" gives Maybe on a gender-restricted scheme', () => {
  const r = run('demo-women-seed-fund', { age: 30, occupation: 'selfEmployed', gender: 'preferNot' });
  assert.equal(r.status, STATUS.MAYBE);
});

test('a hard failure wins over missing information', () => {
  const r = run('demo-farmer-support', { annualIncome: 'unsure', occupation: 'employed' });
  assert.equal(r.status, STATUS.NOT_ELIGIBLE);
});

// ---- Domicile ----------------------------------------------------------------
test('domicile mismatch makes a domicile-restricted scheme Not eligible', () => {
  const r = run('demo-bihar-crop-aid', { domicile: 'Uttar Pradesh' });
  assert.equal(r.status, STATUS.NOT_ELIGIBLE);
  assert.equal(r.checks.find((c) => c.type === 'domicile').status, CHECK.FAIL);
});

test('unsure domicile gives Maybe, not a rejection', () => {
  const r = run('demo-bihar-crop-aid', { domicile: 'unsure' });
  assert.equal(r.status, STATUS.MAYBE);
  assert.ok(r.missing.includes('domicile'));
});

test('domicile is separate from current state', () => {
  // Lives in Delhi, domiciled in Bihar: still eligible for the Bihar-domicile scheme.
  assert.equal(run('demo-bihar-crop-aid', { state: 'Delhi', domicile: 'Bihar' }).status, STATUS.ELIGIBLE);
  // Lives in Bihar, domiciled in Delhi: NOT eligible for it, even though they live in Bihar.
  assert.equal(run('demo-bihar-crop-aid', { state: 'Bihar', domicile: 'Delhi' }).status, STATUS.NOT_ELIGIBLE);
});

test('missing domicile certificate needs action but is not a rejection', () => {
  const r = run('demo-bihar-crop-aid', { domicileCertificate: 'no' });
  assert.equal(r.status, STATUS.MAYBE);
  assert.ok(r.missing.includes('domicileCertificate'));
});

test('changing domicile only changes schemes that have a domicile rule', () => {
  const a = clean({ domicile: 'Bihar' });
  const b = clean({ domicile: 'Kerala' });
  for (const s of schemes) {
    const ra = evaluateScheme(a, s);
    const rb = evaluateScheme(b, s);
    const hasRule = Boolean(s.eligibility.domicile && s.eligibility.domicile.states.length);
    if (hasRule) continue;
    assert.deepEqual(ra, rb, `${s.id} has no domicile rule but its result changed`);
  }
  // ...and the Bihar scheme DOES change.
  assert.notEqual(evaluateScheme(a, byId('demo-bihar-crop-aid')).status,
    evaluateScheme(b, byId('demo-bihar-crop-aid')).status);
});

// ---- Residence rule (uses a small fixture because demo data has none) -----------
test('applicable-states rule checks where the person lives', () => {
  const fixture = { id: 'fx', applicableStates: ['Kerala'], eligibility: {} };
  assert.equal(evaluateScheme(clean({ state: 'Kerala' }), fixture).status, STATUS.ELIGIBLE);
  assert.equal(evaluateScheme(clean({ state: 'Bihar' }), fixture).status, STATUS.NOT_ELIGIBLE);
});

// ---- Invalid inputs -------------------------------------------------------------
test('validation rejects bad or missing values', () => {
  assert.equal(validateProfile({ ...base, age: -1 }).errors.age, 'outOfRange');
  assert.equal(validateProfile({ ...base, age: 121 }).errors.age, 'outOfRange');
  assert.equal(validateProfile({ ...base, age: 'abc' }).errors.age, 'invalidNumber');
  assert.equal(validateProfile({ ...base, age: 40.5 }).errors.age, 'invalidNumber');
  assert.equal(validateProfile({ ...base, age: '' }).errors.age, 'required');
  assert.equal(validateProfile({ ...base, annualIncome: -5 }).errors.annualIncome, 'outOfRange');
  assert.equal(validateProfile({ ...base, annualIncome: '' }).errors.annualIncome, 'required');
  assert.equal(validateProfile({ ...base, state: 'Atlantis' }).errors.state, 'invalidOption');
  assert.equal(validateProfile({ ...base, domicile: '' }).errors.domicile, 'required');
  assert.equal(validateProfile({ ...base, occupation: 'wizard' }).errors.occupation, 'invalidOption');
});

test('domicile is never copied from state', () => {
  const r = validateProfile({ ...base, domicile: '' });
  assert.equal(r.valid, false);
  assert.equal(r.errors.domicile, 'required');
});

test('matchSchemes throws on an invalid profile', () => {
  assert.throws(() => matchSchemes({ ...base, age: -3 }, schemes), ProfileValidationError);
});

test('validateProfile is idempotent on a clean profile', () => {
  const once = validateProfile({ ...base, annualIncome: 'unsure', ownsLand: '' });
  const twice = validateProfile(once.profile);
  assert.deepEqual(twice.profile, once.profile);
});

test('a scheme that requires an unknown field is reported as a data error', () => {
  const bad = { id: 'bad', eligibility: { requires: [{ field: 'shoeSize', equals: 'yes' }] } };
  assert.throws(() => evaluateScheme(clean(), bad), /unknown profile field/);
});

// ---- Ranking and data hygiene ----------------------------------------------------
test('results are ranked Eligible, then Maybe, then Not eligible', () => {
  const { results, summary } = matchSchemes(base, schemes);
  const order = results.map((r) => r.status);
  const rank = { eligible: 0, maybe: 1, not_eligible: 2 };
  assert.deepEqual(order, [...order].sort((a, b) => rank[a] - rank[b]));
  assert.equal(summary.checked, schemes.length);
  assert.equal(summary.eligible + summary.maybe + summary.notEligible, schemes.length);
});

test('every bundled scheme is marked as demo data and has no invented links', () => {
  for (const s of schemes) {
    assert.equal(s.verificationStatus, 'demo', s.id);
    assert.equal(s.applicationUrl, null, s.id);
    assert.equal(s.sourceUrl, null, s.id);
  }
});

test('every check explains itself with a type, field and status', () => {
  for (const s of schemes) {
    for (const c of evaluateScheme(clean({ annualIncome: 'unsure' }), s).checks) {
      assert.ok(c.type && c.field && Object.values(CHECK).includes(c.status));
    }
  }
});
