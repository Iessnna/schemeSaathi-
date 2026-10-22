// Holds the form answers, active schemes catalog, document collection state,
// scheme comparison tray, and application readiness score.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { matchSchemes, validateProfile } from '../eligibility/index.js';
import { getActiveSchemes } from '../data/index.js';
import { calculateReadinessScore } from '../utils/readiness.js';
import { useI18n } from '../i18n/index.jsx';

// SAMPLE values from the brief. They are labelled as sample in the UI and are never used silently.
export const SAMPLE_FORM = {
  age: '45', state: 'Bihar', domicile: 'Bihar', domicileCertificate: '', occupation: 'farmer',
  income: '80000', incomeUnsure: false, gender: 'male', isStudent: '', ownsLand: '', hasDisabilityCertificate: '',
};

export const BLANK_FORM = {
  age: '', state: '', domicile: '', domicileCertificate: '', occupation: '',
  income: '', incomeUnsure: false, gender: '', isStudent: '', ownsLand: '', hasDisabilityCertificate: '',
};

// Convert form answers into the shape the engine expects.
export function toRaw(form, language) {
  if (!form) return null;
  return {
    language,
    age: form.age,
    state: form.state,
    domicile: form.domicile,
    domicileCertificate: form.domicileCertificate,
    occupation: form.occupation,
    annualIncome: form.incomeUnsure ? 'unsure' : form.income,
    gender: form.gender,
    isStudent: form.isStudent,
    ownsLand: form.ownsLand,
    hasDisabilityCertificate: form.hasDisabilityCertificate,
  };
}

const Ctx = createContext(null);
const KEY = 'ss-session';
const DOCS_KEY = 'ss-collected-docs';
const COMPARE_KEY = 'ss-compare-ids';

function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch { return null; }
}

function loadCollectedDocs() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(DOCS_KEY)) || []; } catch { return []; }
}

function loadCompareList() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(COMPARE_KEY)) || []; } catch { return []; }
}

export function ProfileProvider({ children }) {
  const { lang } = useI18n();
  const saved = useMemo(loadSession, []);
  const [form, setForm] = useState(saved?.form || SAMPLE_FORM);
  const [isSample, setIsSample] = useState(saved ? saved.isSample : true);
  const [submitted, setSubmitted] = useState(saved?.submitted || null);
  const [fromText, setFromText] = useState([]); // field names filled from user's sentence

  // Catalog of schemes (includes default, verified and imported schemes)
  const [schemesCatalog, setSchemesCatalog] = useState(() => getActiveSchemes());

  // Life situation filter
  const [lifeSituation, setLifeSituation] = useState('all');

  // Smart document collection tracking
  const [collectedDocs, setCollectedDocs] = useState(loadCollectedDocs);

  // Scheme comparison list (max 3 schemes)
  const [compareList, setCompareList] = useState(loadCompareList);

  const persistSession = (next) => {
    try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const reloadSchemes = useCallback(() => {
    setSchemesCatalog(getActiveSchemes());
  }, []);

  const setField = useCallback((name, value) => {
    setForm((f) => {
      const next = { ...f, [name]: value };
      persistSession({ form: next, isSample, submitted });
      return next;
    });
    setFromText((list) => list.filter((n) => n !== name));
  }, [isSample, submitted]);

  const clearSample = useCallback(() => {
    setForm(BLANK_FORM);
    setIsSample(false);
    setSubmitted(null);
    setFromText([]);
    persistSession({ form: BLANK_FORM, isSample: false, submitted: null });
  }, []);

  const applyExtracted = useCallback((fields) => {
    const next = { ...BLANK_FORM };
    const used = [];
    for (const [k, v] of Object.entries(fields)) {
      if (k === 'annualIncome') { next.income = String(v); used.push('income'); }
      else if (k in next) { next[k] = String(v); used.push(k); }
    }
    setForm(next);
    setIsSample(false);
    setSubmitted(null);
    setFromText(used);
    persistSession({ form: next, isSample: false, submitted: null });
  }, []);

  const validate = useCallback(() => validateProfile(toRaw(form, lang)), [form, lang]);

  const submit = useCallback(() => {
    const check = validateProfile(toRaw(form, lang));
    if (!check.valid) return { ok: false, errors: check.errors };
    setSubmitted(form);
    persistSession({ form, isSample, submitted: form });
    return { ok: true };
  }, [form, lang, isSample]);

  // Update gaps directly from "What Am I Missing?"
  const updateGaps = useCallback((answers) => {
    setForm((f) => {
      const next = { ...f, ...answers };
      // Also update submitted so results refresh immediately
      const nextRaw = toRaw(next, lang);
      const check = validateProfile(nextRaw);
      if (check.valid) {
        setSubmitted(next);
        persistSession({ form: next, isSample: false, submitted: next });
      } else {
        persistSession({ form: next, isSample, submitted });
      }
      return next;
    });
  }, [lang, isSample, submitted]);

  // Document checklist toggle
  const toggleCollectedDoc = useCallback((docKey) => {
    setCollectedDocs((prev) => {
      const next = prev.includes(docKey) ? prev.filter((d) => d !== docKey) : [...prev, docKey];
      try { localStorage.setItem(DOCS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Comparison list toggle
  const toggleCompare = useCallback((schemeId) => {
    setCompareList((prev) => {
      let next;
      if (prev.includes(schemeId)) {
        next = prev.filter((id) => id !== schemeId);
      } else {
        if (prev.length >= 3) {
          next = [prev[1], prev[2], schemeId]; // Keep max 3
        } else {
          next = [...prev, schemeId];
        }
      }
      try { localStorage.setItem(COMPARE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]);
    try { localStorage.removeItem(COMPARE_KEY); } catch { /* ignore */ }
  }, []);

  // Results are recomputed from the submitted answers whenever needed against current catalog
  const analysis = useMemo(() => {
    if (!submitted) return null;
    try {
      const raw = toRaw(submitted, lang);
      return matchSchemes(raw, schemesCatalog);
    } catch {
      return null;
    }
  }, [submitted, lang, schemesCatalog]);

  // Application readiness score computation
  const readiness = useMemo(() => {
    return calculateReadinessScore({
      profile: submitted ? toRaw(submitted, lang) : null,
      results: analysis?.results || [],
      collectedDocs,
    });
  }, [submitted, lang, analysis, collectedDocs]);

  const value = {
    form,
    setField,
    isSample,
    clearSample,
    applyExtracted,
    fromText,
    validate,
    submit,
    updateGaps,
    analysis,
    schemesCatalog,
    reloadSchemes,
    lifeSituation,
    setLifeSituation,
    collectedDocs,
    toggleCollectedDoc,
    compareList,
    toggleCompare,
    clearCompare,
    readiness,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useProfile = () => useContext(Ctx);
