import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSchemeRecord,
  validateSchemeBatch,
  parseCSVToSchemes,
  exportSchemesToJSON,
  exportSchemesToCSV,
} from './importer.js';

test('validates a complete valid scheme record', () => {
  const sample = {
    id: 'test-kisan',
    name: { en: 'Test Kisan Aid', hi: 'परीक्षण किसान सहायता', ur: 'ٹیسٹ کسان امداد' },
    description: { en: 'Direct support for farmers', hi: 'किसानों के लिए प्रत्यक्ष सहायता', ur: 'کسانوں کے لیے براہ راست امداد' },
    level: 'central',
    applicableStates: ['ALL'],
    eligibility: {
      age: { min: 18, max: 65 },
      income: { max: 150000 },
      occupations: ['farmer'],
      genders: [],
      domicile: null,
      requires: [{ field: 'ownsLand', equals: 'yes' }],
    },
    documents: ['doc.aadhaar'],
    applicationUrl: 'https://example.gov.in/apply',
    sourceUrl: 'https://example.gov.in/notice',
    publisher: 'Department of Agriculture',
    lastVerified: '2026-09-01',
    verificationStatus: 'verified',
  };

  const res = validateSchemeRecord(sample);
  assert.equal(res.valid, true);
  assert.equal(res.errors.length, 0);
  assert.equal(res.normalized.id, 'test-kisan');
  assert.equal(res.normalized.verificationStatus, 'verified');
  assert.equal(res.normalized.publisher, 'Department of Agriculture');
});

test('detects missing required fields and invalid state', () => {
  const invalid = {
    name: '',
    level: 'state',
    governingState: 'InvalidStateName',
    eligibility: {
      age: { min: 50, max: 20 }, // min > max
    },
  };

  const res = validateSchemeRecord(invalid);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes('name is required')));
  assert.ok(res.errors.some((e) => e.includes('Invalid governingState')));
  assert.ok(res.errors.some((e) => e.includes('min cannot be greater than max')));
});

test('detects duplicates by id or title', () => {
  const existingIds = new Set(['pm-kisan']);
  const existingTitles = new Set(['pradhan mantri kisan samman nidhi']);

  const dupeId = validateSchemeRecord({ id: 'pm-kisan', name: 'Other Scheme', level: 'central' }, existingIds, existingTitles);
  assert.equal(dupeId.isDuplicate, true);

  const dupeTitle = validateSchemeRecord({ id: 'new-id', name: 'Pradhan Mantri Kisan Samman Nidhi', level: 'central' }, existingIds, existingTitles);
  assert.equal(dupeTitle.isDuplicate, true);
});

test('parses CSV data with headers into valid scheme structure', () => {
  const csv = `id,name,description,level,governingState,applicablestates,minage,maxage,maxincome,occupations,ownsland,applicationurl,sourceurl,publisher,verificationstatus
bihar-seed,Bihar Seed Grant,Subsidized seeds for farmers,state,Bihar,Bihar,18,60,200000,farmer,yes,https://bihar.gov.in,https://bihar.gov.in,Dept of Agriculture,verified`;

  const parsed = parseCSVToSchemes(csv);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, 'bihar-seed');
  assert.equal(parsed[0].level, 'state');
  assert.equal(parsed[0].governingState, 'Bihar');
  assert.equal(parsed[0].eligibility.age.min, 18);
  assert.equal(parsed[0].eligibility.requires[0].field, 'ownsLand');
  assert.equal(parsed[0].publisher, 'Dept of Agriculture');

  const batch = validateSchemeBatch(parsed);
  assert.equal(batch.validCount, 1);
  assert.equal(batch.invalidCount, 0);
});

test('exports schemes to JSON and CSV cleanly', () => {
  const schemes = [
    {
      id: 'demo-1',
      name: { en: 'Scheme 1' },
      description: { en: 'Desc 1' },
      level: 'central',
      verificationStatus: 'verified',
    },
  ];

  const jsonStr = exportSchemesToJSON(schemes);
  const parsedBack = JSON.parse(jsonStr);
  assert.equal(parsedBack.count, 1);
  assert.equal(parsedBack.schemes[0].id, 'demo-1');

  const csvStr = exportSchemesToCSV(schemes);
  assert.ok(csvStr.includes('Scheme 1'));
  assert.ok(csvStr.includes('demo-1'));
});
