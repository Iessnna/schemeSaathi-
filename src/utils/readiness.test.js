import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReadinessScore } from './readiness.js';

test('calculates readiness score for sample profile', () => {
  const profile = {
    age: 45,
    state: 'Bihar',
    domicile: 'Bihar',
    occupation: 'farmer',
    annualIncome: 80000,
    domicileCertificate: 'yes',
    gender: 'male',
    isStudent: 'no',
    ownsLand: 'yes',
    hasDisabilityCertificate: 'no',
  };

  const results = [
    { schemeId: 's1', status: 'eligible', documents: ['doc.aadhaar', 'doc.landRecord'] },
    { schemeId: 's2', status: 'not_eligible', documents: [] },
  ];

  const collectedDocs = ['doc.aadhaar'];

  const score = calculateReadinessScore({ profile, results, collectedDocs });
  assert.ok(score.score >= 50, `Score was ${score.score}`);
  assert.equal(score.breakdown.profile, 100);
  assert.equal(score.breakdown.eligibility, 100);
  assert.equal(score.breakdown.documents, 50); // 1 out of 2 docs
  assert.ok(score.disclaimer.includes('NOT a government approval probability'));
});

test('handles empty profile gracefully with zero score', () => {
  const score = calculateReadinessScore({ profile: null, results: [], collectedDocs: [] });
  assert.equal(score.score, 0);
  assert.equal(score.tier, 'getting_started');
});
