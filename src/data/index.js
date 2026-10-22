// The scheme "database" and active catalog manager.
// Supports:
// - Default demo schemes (schemes.json)
// - Verified official Indian government schemes (verifiedSchemes.json)
// - Custom imported datasets from CSV / JSON cached in localStorage
import demoRaw from './schemes.json';
import verifiedRaw from './verifiedSchemes.json';

export const DEMO_SCHEMES = demoRaw.schemes;
export const VERIFIED_SCHEMES = verifiedRaw.schemes;

// Combined baseline catalog: verified official schemes first, followed by illustrative demo schemes
export const DEFAULT_CATALOG = [...VERIFIED_SCHEMES, ...DEMO_SCHEMES];

const STORAGE_KEY = 'schemesaathi-custom-schemes';
const SYNC_KEY = 'schemesaathi-last-sync';

export function getStoredCustomSchemes() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load custom schemes from localStorage:', err);
    return [];
  }
}

export function saveCustomSchemes(schemes) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes));
    localStorage.setItem(SYNC_KEY, new Date().toISOString());
  } catch (err) {
    console.error('Failed to save custom schemes:', err);
  }
}

export function getLastSyncDate() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SYNC_KEY) || '2026-10-01T12:00:00.000Z';
}

export function clearCustomSchemes() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(SYNC_KEY, new Date().toISOString());
}

export function getActiveSchemes() {
  const custom = getStoredCustomSchemes();
  if (!custom || !custom.length) {
    return DEFAULT_CATALOG;
  }
  // Merge custom schemes by ID, custom overrides baseline
  const map = new Map();
  for (const s of DEFAULT_CATALOG) map.set(s.id, s);
  for (const s of custom) map.set(s.id, s);
  return Array.from(map.values());
}

// Global active exported SCHEMES array for backward compatibility
export const SCHEMES = DEFAULT_CATALOG;

export const getScheme = (id, customCatalog = null) => {
  const list = customCatalog || getActiveSchemes();
  return list.find((s) => s.id === id) || DEFAULT_CATALOG.find((s) => s.id === id);
};

export const isDemo = (scheme) => !scheme || scheme.verificationStatus === 'demo';
export const isVerified = (scheme) => scheme?.verificationStatus === 'verified';

export function isVerificationOutdated(scheme, maxDays = 180) {
  if (!scheme || !scheme.lastVerified) return false;
  try {
    const verifiedTime = new Date(scheme.lastVerified).getTime();
    const now = Date.now();
    const diffDays = (now - verifiedTime) / (1000 * 60 * 60 * 24);
    return diffDays > maxDays;
  } catch {
    return false;
  }
}
