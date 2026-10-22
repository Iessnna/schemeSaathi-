// Application Readiness Score calculator
// Evaluates administrative preparation based on:
// 1. Profile completeness
// 2. Eligibility decisiveness (confirmed vs missing answers)
// 3. Document checklist progress

export function calculateReadinessScore({ profile = {}, results = [], collectedDocs = [] }) {
  if (!profile) {
    return {
      score: 0,
      tier: 'getting_started',
      breakdown: { profile: 0, eligibility: 0, documents: 0 },
      counts: { answered: 0, totalFields: 10, collectedDocs: 0, totalDocs: 0 },
      disclaimer: 'This readiness score measures administrative and paperwork preparedness only. It does not represent probability of government approval.',
    };
  }

  // 1. Profile completeness (10 fields total)
  const coreFields = ['age', 'state', 'domicile', 'occupation', 'annualIncome'];
  const situationFields = ['domicileCertificate', 'gender', 'isStudent', 'ownsLand', 'hasDisabilityCertificate'];

  let answeredCore = 0;
  for (const f of coreFields) {
    if (profile[f] !== undefined && profile[f] !== null && profile[f] !== '' && profile[f] !== 'unsure') {
      answeredCore++;
    }
  }

  let answeredSit = 0;
  for (const f of situationFields) {
    if (profile[f] !== undefined && profile[f] !== null && profile[f] !== '' && profile[f] !== 'unsure') {
      answeredSit++;
    }
  }

  const answeredFields = answeredCore + answeredSit;
  const totalFields = coreFields.length + situationFields.length;
  // Core fields carry 70% weight, situation fields 30%
  const profilePct = Math.round((answeredCore / coreFields.length) * 70 + (answeredSit / situationFields.length) * 30);

  // 2. Eligibility decisiveness
  let eligibilityPct = 50;
  if (results && results.length > 0) {
    const decisive = results.filter((r) => r.status === 'eligible' || r.status === 'not_eligible').length;
    eligibilityPct = Math.round((decisive / results.length) * 100);
  }

  // 3. Document checklist progress
  // Extract all required documents across eligible and maybe schemes
  const activeResults = (results || []).filter((r) => r.status === 'eligible' || r.status === 'maybe');
  const requiredDocKeys = new Set();
  // Note: documents are tracked by doc keys
  for (const r of activeResults) {
    // If scheme is passed or checked
    if (Array.isArray(r.documents)) {
      for (const d of r.documents) requiredDocKeys.add(d);
    }
  }

  const totalRequiredDocs = requiredDocKeys.size;
  const collectedSet = new Set(collectedDocs || []);
  let collectedMatchCount = 0;
  for (const d of requiredDocKeys) {
    if (collectedSet.has(d)) collectedMatchCount++;
  }

  let documentsPct = 100;
  if (totalRequiredDocs > 0) {
    documentsPct = Math.round((collectedMatchCount / totalRequiredDocs) * 100);
  } else if (collectedDocs && collectedDocs.length > 0) {
    documentsPct = 100;
  } else {
    // If no schemes have been checked or required docs not yet known
    documentsPct = collectedDocs && collectedDocs.length ? 50 : 0;
  }

  // Weighted overall score:
  // 40% Profile completion, 30% Eligibility decisiveness, 30% Document preparedness
  const overall = Math.min(100, Math.round(profilePct * 0.4 + eligibilityPct * 0.3 + documentsPct * 0.3));

  let tier = 'getting_started';
  if (overall >= 80) tier = 'high_readiness';
  else if (overall >= 50) tier = 'moderate_readiness';

  return {
    score: overall,
    tier,
    breakdown: {
      profile: profilePct,
      eligibility: eligibilityPct,
      documents: documentsPct,
    },
    counts: {
      answered: answeredFields,
      totalFields,
      collectedDocs: collectedMatchCount,
      totalDocs: totalRequiredDocs,
    },
    disclaimer: 'This administrative readiness score reflects your document and profile completion. It is NOT a government approval probability.',
  };
}
