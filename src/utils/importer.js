// Scheme dataset parser, validator, deduplicator and normalizer.
import { STATES } from '../data/states.js';
import { OCCUPATIONS, GENDERS, REQUIRABLE_FIELDS } from '../eligibility/index.js';

export const VALID_VERIFICATION_STATUSES = ['demo', 'verified', 'unverified'];

/**
 * Validates a single scheme object according to SchemeSaathi schema.
 * Returns { valid: boolean, errors: string[], warnings: string[], normalized: object | null }
 */
export function validateSchemeRecord(raw = {}, existingIds = new Set(), existingTitles = new Set()) {
  const errors = [];
  const warnings = [];

  // ID validation
  let id = typeof raw.id === 'string' ? raw.id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-') : '';
  if (!id && raw.name) {
    const title = typeof raw.name === 'object' ? raw.name.en || Object.values(raw.name)[0] : String(raw.name);
    id = title.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').slice(0, 50);
  }
  if (!id) errors.push('Scheme ID is required');

  // Name validation
  let name = raw.name;
  if (!name) {
    errors.push('Scheme name is required');
  } else if (typeof name === 'string') {
    name = { en: name.trim(), hi: name.trim(), ur: name.trim() };
  } else if (typeof name === 'object') {
    if (!name.en && !name.hi && !name.ur) {
      errors.push('Scheme name must have at least one language translation');
    } else {
      const fallback = name.en || name.hi || name.ur;
      name = {
        en: (name.en || fallback).trim(),
        hi: (name.hi || fallback).trim(),
        ur: (name.ur || fallback).trim(),
      };
    }
  } else {
    errors.push('Invalid name format');
  }

  // Description validation
  let description = raw.description;
  if (!description) {
    errors.push('Scheme description is required');
  } else if (typeof description === 'string') {
    description = { en: description.trim(), hi: description.trim(), ur: description.trim() };
  } else if (typeof description === 'object') {
    const fallback = description.en || description.hi || description.ur || '';
    description = {
      en: (description.en || fallback).trim(),
      hi: (description.hi || fallback).trim(),
      ur: (description.ur || fallback).trim(),
    };
  }

  // Level validation
  const level = raw.level === 'state' ? 'state' : 'central';
  let governingState = null;
  if (level === 'state') {
    if (!raw.governingState) {
      errors.push('State-level scheme must specify governingState');
    } else if (!STATES.includes(raw.governingState)) {
      errors.push(`Invalid governingState: "${raw.governingState}". Must be a recognized State/UT.`);
    } else {
      governingState = raw.governingState;
    }
  }

  // Applicable states
  let applicableStates = ['ALL'];
  if (Array.isArray(raw.applicableStates) && raw.applicableStates.length) {
    const invalid = raw.applicableStates.filter((s) => s !== 'ALL' && !STATES.includes(s));
    if (invalid.length) {
      errors.push(`Invalid applicable states: ${invalid.join(', ')}`);
    } else {
      applicableStates = raw.applicableStates;
    }
  }

  // Eligibility block validation
  const rawE = raw.eligibility || {};
  const eligibility = {
    age: { min: null, max: null },
    income: null,
    occupations: [],
    genders: [],
    domicile: null,
    requires: [],
  };

  // Age limits
  if (rawE.age) {
    const min = rawE.age.min != null && !isNaN(Number(rawE.age.min)) ? Number(rawE.age.min) : null;
    const max = rawE.age.max != null && !isNaN(Number(rawE.age.max)) ? Number(rawE.age.max) : null;
    if (min !== null && (min < 0 || min > 120)) errors.push('Age min out of range (0-120)');
    if (max !== null && (max < 0 || max > 120)) errors.push('Age max out of range (0-120)');
    if (min !== null && max !== null && min > max) errors.push('Age min cannot be greater than max');
    eligibility.age = { min, max };
  }

  // Income cap
  if (rawE.income && rawE.income.max != null) {
    const inc = typeof rawE.income.max === 'string'
      ? Number(rawE.income.max.replace(/[,₹\s]/g, ''))
      : Number(rawE.income.max);
    if (isNaN(inc) || inc < 0) errors.push('Income max must be a positive number');
    else eligibility.income = { max: inc };
  }

  // Occupations
  if (Array.isArray(rawE.occupations)) {
    const invalidOccs = rawE.occupations.filter((o) => !OCCUPATIONS.includes(o));
    if (invalidOccs.length) warnings.push(`Unrecognized occupations ignored: ${invalidOccs.join(', ')}`);
    eligibility.occupations = rawE.occupations.filter((o) => OCCUPATIONS.includes(o));
  }

  // Genders
  if (Array.isArray(rawE.genders)) {
    const invalidG = rawE.genders.filter((g) => !GENDERS.includes(g));
    if (invalidG.length) warnings.push(`Unrecognized genders ignored: ${invalidG.join(', ')}`);
    eligibility.genders = rawE.genders.filter((g) => GENDERS.includes(g));
  }

  // Domicile
  if (rawE.domicile && Array.isArray(rawE.domicile.states) && rawE.domicile.states.length) {
    const invalidD = rawE.domicile.states.filter((s) => !STATES.includes(s));
    if (invalidD.length) errors.push(`Invalid domicile states: ${invalidD.join(', ')}`);
    else {
      eligibility.domicile = {
        states: rawE.domicile.states,
        certificateRequired: Boolean(rawE.domicile.certificateRequired),
      };
    }
  }

  // Requires
  if (Array.isArray(rawE.requires)) {
    for (const req of rawE.requires) {
      if (!req || !REQUIRABLE_FIELDS.includes(req.field)) {
        errors.push(`Requirement field "${req?.field}" is not in supported fields: ${REQUIRABLE_FIELDS.join(', ')}`);
      } else {
        eligibility.requires.push({ field: req.field, equals: req.equals || 'yes' });
      }
    }
  }

  // Documents
  const documents = Array.isArray(raw.documents) && raw.documents.length
    ? raw.documents
    : ['doc.aadhaar'];

  // Steps
  const steps = Array.isArray(raw.steps) && raw.steps.length
    ? raw.steps
    : ['step.gather', 'step.form', 'step.submit', 'step.track'];

  // URLs
  const cleanUrl = (u) => {
    if (!u || typeof u !== 'string') return null;
    const trimmed = u.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'N/A') return null;
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? trimmed : null;
    } catch {
      warnings.push(`Invalid URL format: "${trimmed}"`);
      return null;
    }
  };

  const applicationUrl = cleanUrl(raw.applicationUrl);
  const sourceUrl = cleanUrl(raw.sourceUrl);

  // Verification status & publisher info
  let verificationStatus = raw.verificationStatus;
  if (!VALID_VERIFICATION_STATUSES.includes(verificationStatus)) {
    verificationStatus = raw.isDemo || raw.demo ? 'demo' : 'unverified';
  }

  const publisher = typeof raw.publisher === 'string' ? raw.publisher.trim() : null;
  const retrievalDate = typeof raw.retrievalDate === 'string' ? raw.retrievalDate.trim() : new Date().toISOString().split('T')[0];
  const lastVerified = typeof raw.lastVerified === 'string' && raw.lastVerified.trim() ? raw.lastVerified.trim() : null;

  // Duplicate checks
  let isDuplicate = false;
  let duplicateReason = null;
  if (existingIds.has(id)) {
    isDuplicate = true;
    duplicateReason = `Duplicate scheme ID: "${id}"`;
  } else if (name?.en && existingTitles.has(name.en.toLowerCase())) {
    isDuplicate = true;
    duplicateReason = `Scheme with title "${name.en}" already exists`;
  }

  const valid = errors.length === 0;

  const normalized = valid
    ? {
        id,
        name,
        description,
        level,
        governingState,
        applicableStates,
        eligibility,
        documents,
        steps,
        applicationUrl,
        sourceUrl,
        publisher,
        retrievalDate,
        lastVerified,
        verificationStatus,
        lifeSituations: Array.isArray(raw.lifeSituations) ? raw.lifeSituations : [],
      }
    : null;

  return {
    valid,
    isDuplicate,
    duplicateReason,
    errors,
    warnings,
    normalized,
  };
}

/**
 * Parses and validates an array of JSON objects or a parsed JSON payload.
 */
export function validateSchemeBatch(records, existingSchemes = []) {
  const existingIds = new Set(existingSchemes.map((s) => s.id));
  const existingTitles = new Set(
    existingSchemes.map((s) => (typeof s.name === 'object' ? s.name.en : s.name).toLowerCase())
  );

  const results = [];
  const validSchemes = [];
  const duplicates = [];
  const invalid = [];

  for (let idx = 0; idx < records.length; idx++) {
    const raw = records[idx];
    const validation = validateSchemeRecord(raw, existingIds, existingTitles);

    const entry = {
      index: idx + 1,
      id: raw.id || validation.normalized?.id || `row-${idx + 1}`,
      rawTitle: typeof raw.name === 'object' ? raw.name.en : String(raw.name || 'Untitled'),
      ...validation,
    };

    results.push(entry);

    if (validation.valid) {
      if (validation.isDuplicate) {
        duplicates.push(entry);
      } else {
        validSchemes.push(validation.normalized);
        existingIds.add(validation.normalized.id);
        existingTitles.add(validation.normalized.name.en.toLowerCase());
      }
    } else {
      invalid.push(entry);
    }
  }

  return {
    total: records.length,
    validCount: validSchemes.length,
    duplicateCount: duplicates.length,
    invalidCount: invalid.length,
    validSchemes,
    duplicates,
    invalid,
    results,
  };
}

/**
 * Parses a CSV string into scheme objects.
 */
export function parseCSVToSchemes(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const parseRow = (line) => {
    const cells = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (c === ',' && !inQuote) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    cells.push(cur.trim());
    return cells;
  };

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseRow(lines[i]);
    if (!cells.some((c) => c !== '')) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] || '';
    });

    // Map common CSV columns to scheme structure
    const id = row.id || row.schemeid || row.code;
    const name = row.name || row.schemename || row.title;
    const description = row.description || row.details || row.desc;
    const level = row.level || (row.state ? 'state' : 'central');
    const governingState = row.governingstate || row.state || null;
    const applicableStates = row.applicablestates
      ? row.applicablestates.split(';').map((s) => s.trim()).filter(Boolean)
      : ['ALL'];

    const minAge = row.minage || row.agemin ? Number(row.minage || row.agemin) : null;
    const maxAge = row.maxage || row.agemax ? Number(row.maxage || row.agemax) : null;
    const maxIncome = row.maxincome || row.income ? Number(row.maxincome || row.income) : null;
    const occupations = row.occupations
      ? row.occupations.split(';').map((s) => s.trim()).filter(Boolean)
      : [];
    const genders = row.genders
      ? row.genders.split(';').map((s) => s.trim()).filter(Boolean)
      : [];
    const domicileStates = row.domicilestates
      ? row.domicilestates.split(';').map((s) => s.trim()).filter(Boolean)
      : [];
    const certReq = row.domicilecertrequired === 'true' || row.domicilecertrequired === 'yes';

    const requires = [];
    if (row.ownsland === 'yes') requires.push({ field: 'ownsLand', equals: 'yes' });
    if (row.isstudent === 'yes') requires.push({ field: 'isStudent', equals: 'yes' });
    if (row.hasdisabilitycertificate === 'yes') requires.push({ field: 'hasDisabilityCertificate', equals: 'yes' });

    const documents = row.documents
      ? row.documents.split(';').map((d) => d.trim()).filter(Boolean)
      : ['doc.aadhaar'];

    const applicationUrl = row.applicationurl || row.applyurl || null;
    const sourceUrl = row.sourceurl || row.portalurl || null;
    const publisher = row.publisher || row.department || row.ministry || null;
    const verificationStatus = row.verificationstatus || 'verified';
    const lastVerified = row.lastverified || new Date().toISOString().split('T')[0];

    records.push({
      id,
      name,
      description,
      level,
      governingState: level === 'state' ? governingState : null,
      applicableStates,
      eligibility: {
        age: { min: minAge, max: maxAge },
        income: maxIncome != null ? { max: maxIncome } : null,
        occupations,
        genders,
        domicile: domicileStates.length ? { states: domicileStates, certificateRequired: certReq } : null,
        requires,
      },
      documents,
      steps: ['step.gather', 'step.form', 'step.submit', 'step.track'],
      applicationUrl,
      sourceUrl,
      publisher,
      retrievalDate: new Date().toISOString().split('T')[0],
      lastVerified,
      verificationStatus,
    });
  }

  return records;
}

/**
 * Exports schemes array to formatted JSON string.
 */
export function exportSchemesToJSON(schemes) {
  return JSON.stringify({ schemes, exportedAt: new Date().toISOString(), count: schemes.length }, null, 2);
}

/**
 * Exports schemes array to CSV string.
 */
export function exportSchemesToCSV(schemes) {
  const headers = [
    'id',
    'name',
    'description',
    'level',
    'governingState',
    'applicableStates',
    'minAge',
    'maxAge',
    'maxIncome',
    'occupations',
    'genders',
    'domicileStates',
    'domicileCertRequired',
    'documents',
    'applicationUrl',
    'sourceUrl',
    'publisher',
    'lastVerified',
    'verificationStatus',
  ];

  const escapeCell = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = schemes.map((s) => {
    const title = typeof s.name === 'object' ? s.name.en : s.name;
    const desc = typeof s.description === 'object' ? s.description.en : s.description;
    const e = s.eligibility || {};
    return [
      escapeCell(s.id),
      escapeCell(title),
      escapeCell(desc),
      escapeCell(s.level),
      escapeCell(s.governingState),
      escapeCell((s.applicableStates || []).join(';')),
      escapeCell(e.age?.min),
      escapeCell(e.age?.max),
      escapeCell(e.income?.max),
      escapeCell((e.occupations || []).join(';')),
      escapeCell((e.genders || []).join(';')),
      escapeCell((e.domicile?.states || []).join(';')),
      escapeCell(e.domicile?.certificateRequired ? 'yes' : 'no'),
      escapeCell((s.documents || []).join(';')),
      escapeCell(s.applicationUrl),
      escapeCell(s.sourceUrl),
      escapeCell(s.publisher),
      escapeCell(s.lastVerified),
      escapeCell(s.verificationStatus),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
