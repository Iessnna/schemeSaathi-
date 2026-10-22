import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import {
  DEFAULT_CATALOG,
  getStoredCustomSchemes,
  saveCustomSchemes,
  clearCustomSchemes,
  getLastSyncDate,
  isVerificationOutdated,
  isDemo,
} from '../data/index.js';
import {
  parseCSVToSchemes,
  validateSchemeBatch,
  exportSchemesToJSON,
  exportSchemesToCSV,
} from '../utils/importer.js';
import { formatDate } from '../utils/format.js';
import { BackLink } from '../components/SchemeParts.jsx';
import { DemoTag } from '../components/Chrome.jsx';
import { IconCheck, IconClose, IconDownload, IconLink } from '../components/Icons.jsx';

const SAMPLE_CSV = `id,name,description,level,governingState,applicableStates,minAge,maxAge,maxIncome,occupations,genders,domicileStates,domicileCertRequired,ownsLand,isStudent,hasDisabilityCertificate,documents,applicationUrl,sourceUrl,publisher,verificationStatus,lastVerified
pm-kisan-sample,PM Kisan Samman Nidhi Sample,Direct income support of Rs 6000 for landholder farmers,central,,ALL,18,,200000,farmer,,,,yes,,,doc.aadhaar;doc.landRecord,https://pmkisan.gov.in,https://pmkisan.gov.in,Ministry of Agriculture,verified,2026-10-01
bihar-student-credit,Bihar Student Credit Card,Education loan guarantee for 12th pass students,state,Bihar,ALL,18,25,,student,,Bihar,yes,,yes,,doc.aadhaar;doc.studentId,https://7nischay-yuvaupmission.bihar.gov.in,https://bihar.gov.in,Govt of Bihar,verified,2026-09-15`;

const SAMPLE_JSON = JSON.stringify([
  {
    "id": "sample-solar-pump",
    "name": {
      "en": "PM Kusum Solar Agriculture Pump",
      "hi": "पीएम कुसुम सौर कृषि पंप योजना",
      "ur": "پی ایم کسم سولر زرعی پمپ اسکیم"
    },
    "description": {
      "en": "Subsidies up to 60% for farmers to install solar agriculture water pumps.",
      "hi": "किसानों को सौर कृषि जल पंप स्थापित करने के लिए 60% तक की सब्सिडी।",
      "ur": "کسانوں کے لیے سولر زرعی واٹر پمپ لگانے کے لیے 60 فیصد تک سبسڈی۔"
    },
    "level": "central",
    "governingState": null,
    "applicableStates": ["ALL"],
    "eligibility": {
      "age": { "min": 18, "max": null },
      "income": null,
      "occupations": ["farmer"],
      "genders": [],
      "domicile": null,
      "requires": [{ "field": "ownsLand", "equals": "yes" }]
    },
    "documents": ["doc.aadhaar", "doc.landRecord", "doc.bankPassbook"],
    "steps": ["step.gather", "step.form", "step.submit", "step.track"],
    "applicationUrl": "https://pmkusum.mnre.gov.in/",
    "sourceUrl": "https://mnre.gov.in/",
    "publisher": "Ministry of New and Renewable Energy",
    "retrievalDate": "2026-10-01",
    "lastVerified": "2026-09-20",
    "verificationStatus": "verified"
  }
], null, 2);

export default function DataManagement() {
  const ctx = useI18n();
  const { t, tx, lang } = ctx;
  const { schemesCatalog, reloadSchemes } = useProfile();

  const [activeTab, setActiveTab] = useState('import');
  const [rawText, setRawText] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [importedNotice, setImportedNotice] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  useEffect(() => {
    fetch('/api/data-gov/status')
      .then((r) => r.json())
      .then((data) => setApiStatus(data))
      .catch(() => setApiStatus({ configured: false, fallbackAvailable: true }));
  }, []);

  const handleValidate = () => {
    if (!rawText.trim()) return;

    let records = [];
    const trimmed = rawText.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        records = Array.isArray(parsed) ? parsed : parsed.schemes || [];
      } catch (err) {
        setValidationResult({
          total: 0,
          parseError: 'Invalid JSON format: ' + err.message,
          results: [],
        });
        return;
      }
    } else {
      records = parseCSVToSchemes(trimmed);
      if (records.length === 0) {
        setValidationResult({
          total: 0,
          parseError: 'Could not parse CSV. Please verify column headers.',
          results: [],
        });
        return;
      }
    }

    const batch = validateSchemeBatch(records, schemesCatalog);
    setValidationResult(batch);
  };

  const handleApplyImport = () => {
    if (!validationResult || !validationResult.validSchemes.length) return;

    const existing = getStoredCustomSchemes();
    const map = new Map(existing.map((s) => [s.id, s]));
    for (const s of validationResult.validSchemes) {
      map.set(s.id, s);
    }

    const combined = Array.from(map.values());
    saveCustomSchemes(combined);
    reloadSchemes();

    setImportedNotice(`Successfully imported ${validationResult.validSchemes.length} schemes into SchemeSaathi!`);
    setValidationResult(null);
    setRawText('');
    setTimeout(() => setImportedNotice(null), 5000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      setRawText(evt.target?.result || '');
    };
    reader.readAsText(file);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(exportSchemesToJSON(schemesCatalog));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `schemesaathi-schemes-${new Date().toISOString().split('T')[0]}.json`);
    dl.click();
  };

  const handleExportCSV = () => {
    const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(exportSchemesToCSV(schemesCatalog));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `schemesaathi-schemes-${new Date().toISOString().split('T')[0]}.csv`);
    dl.click();
  };

  const handleResetCatalog = () => {
    clearCustomSchemes();
    reloadSchemes();
    setShowConfirmReset(false);
    setImportedNotice('Catalog reset to standard verified and demo schemes.');
    setTimeout(() => setImportedNotice(null), 4000);
  };

  const syncDate = getLastSyncDate();

  return (
    <main id="main" className="wrap page data-mgmt-page">
      <BackLink to="/results">{t('btn.back')}</BackLink>

      <header className="data-mgmt-head">
        <h1>{t('manage.title')}</h1>
        <p className="lede-sm">{t('manage.desc')}</p>
        {syncDate && (
          <p className="sync-timestamp">
            🕒 {t('manage.sync', { date: formatDate(new Date(syncDate), lang) })}
          </p>
        )}
      </header>

      {importedNotice && (
        <div className="note note-success" role="status">
          <IconCheck /> {importedNotice}
        </div>
      )}

      {/* Tabs */}
      <div className="mgmt-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'import'}
          className={`mgmt-tab-btn ${activeTab === 'import' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          📥 {t('manage.importTab')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'catalog'}
          className={`mgmt-tab-btn ${activeTab === 'catalog' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          📚 {t('manage.catalogTab')} ({schemesCatalog.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'api'}
          className={`mgmt-tab-btn ${activeTab === 'api' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('api')}
        >
          🏛️ {t('manage.apiTab')}
        </button>
      </div>

      {/* Tab 1: Import */}
      {activeTab === 'import' && (
        <section className="mgmt-tab-panel">
          <div className="import-box-card">
            <h2>{t('manage.importTab')}</h2>
            <p className="import-hint">
              Upload an official scheme dataset or paste CSV / JSON records. All records will be validated, normalized, and checked for duplicates.
            </p>

            <div className="import-controls-row">
              <label className="btn btn-ghost btn-sm file-upload-label">
                📂 {t('manage.upload')}
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setRawText(SAMPLE_CSV)}
              >
                Load Sample CSV
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setRawText(SAMPLE_JSON)}
              >
                Load Sample JSON
              </button>
            </div>

            <textarea
              className="import-textarea"
              rows={8}
              placeholder={t('manage.paste')}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setValidationResult(null);
              }}
            />

            <div className="import-actions">
              <button
                type="button"
                className="btn btn-solid"
                onClick={handleValidate}
                disabled={!rawText.trim()}
              >
                {t('manage.validateBtn')}
              </button>
            </div>
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className="validation-report-card">
              <h3>Validation Summary</h3>
              {validationResult.parseError ? (
                <p className="note note-error" role="alert">{validationResult.parseError}</p>
              ) : (
                <>
                  <ul className="tally">
                    <li className="tally-eligible">
                      <strong>{validationResult.validCount}</strong> Valid
                    </li>
                    <li className="tally-maybe">
                      <strong>{validationResult.duplicateCount}</strong> Duplicates
                    </li>
                    <li className="tally-not">
                      <strong>{validationResult.invalidCount}</strong> Invalid
                    </li>
                  </ul>

                  <div className="validation-table-wrap">
                    <table className="validation-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>ID / Title</th>
                          <th>Status</th>
                          <th>Notes / Errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.results.map((r) => (
                          <tr key={r.index} className={`row-status-${r.valid ? (r.isDuplicate ? 'dupe' : 'valid') : 'invalid'}`}>
                            <td>#{r.index}</td>
                            <td>
                              <strong>{r.rawTitle}</strong>
                              <br />
                              <small className="text-muted">{r.id}</small>
                            </td>
                            <td>
                              {r.valid ? (
                                r.isDuplicate ? (
                                  <span className="badge-warning">Duplicate</span>
                                ) : (
                                  <span className="badge-success">Valid</span>
                                )
                              ) : (
                                <span className="badge-danger">Invalid</span>
                              )}
                            </td>
                            <td>
                              {r.errors.length > 0 && (
                                <ul className="error-list">
                                  {r.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                </ul>
                              )}
                              {r.isDuplicate && (
                                <span className="warning-text">{r.duplicateReason}</span>
                              )}
                              {r.warnings.length > 0 && (
                                <ul className="warning-list">
                                  {r.warnings.map((w, i) => (
                                    <li key={i}>{w}</li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {validationResult.validSchemes.length > 0 && (
                    <div className="apply-import-box">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleApplyImport}
                      >
                        {t('manage.importAction', { n: validationResult.validSchemes.length })}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Catalog & Freshness */}
      {activeTab === 'catalog' && (
        <section className="mgmt-tab-panel">
          <div className="catalog-tools-bar">
            <div className="export-btns">
              <button type="button" className="btn btn-solid btn-sm" onClick={handleExportJSON}>
                <IconDownload /> {t('manage.exportJson')}
              </button>
              <button type="button" className="btn btn-solid btn-sm" onClick={handleExportCSV}>
                <IconDownload /> {t('manage.exportCsv')}
              </button>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-danger-text"
              onClick={() => setShowConfirmReset(true)}
            >
              {t('manage.reset')}
            </button>
          </div>

          {showConfirmReset && (
            <div className="confirm-modal-box" role="alertdialog">
              <p>Are you sure you want to reset the schemes catalog to standard defaults? Custom imported schemes will be removed.</p>
              <div className="confirm-btns">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowConfirmReset(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-solid btn-sm" onClick={handleResetCatalog}>
                  Yes, Reset Catalog
                </button>
              </div>
            </div>
          )}

          <div className="catalog-table-wrap">
            <table className="catalog-table">
              <thead>
                <tr>
                  <th>Scheme</th>
                  <th>Level / State</th>
                  <th>Verification</th>
                  <th>Last Checked</th>
                  <th>Links</th>
                </tr>
              </thead>
              <tbody>
                {schemesCatalog.map((s) => {
                  const outdated = isVerificationOutdated(s);
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{tx(s.name)}</strong>
                        {isDemo(s) && <DemoTag compact />}
                        <br />
                        <small className="text-muted">{s.id}</small>
                      </td>
                      <td>
                        {s.level === 'central' ? 'Central' : `State: ${s.governingState || ''}`}
                      </td>
                      <td>
                        <span className={`status-pill pill-${s.verificationStatus}`}>
                          {s.verificationStatus === 'verified' ? 'Verified' : s.verificationStatus === 'demo' ? 'Demo' : 'Unverified'}
                        </span>
                        {outdated && (
                          <span className="badge-outdated" title="Verified > 180 days ago">
                            ⚠️ Outdated Notice
                          </span>
                        )}
                      </td>
                      <td>
                        {s.lastVerified || '—'}
                      </td>
                      <td>
                        {s.applicationUrl ? (
                          <a href={s.applicationUrl} target="_blank" rel="noopener noreferrer" className="link-table">
                            <IconLink size={14} /> Official Portal
                          </a>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab 3: Government APIs */}
      {activeTab === 'api' && (
        <section className="mgmt-tab-panel">
          <div className="api-info-card">
            <h2>Government Open Data APIs (data.gov.in & myscheme.gov.in)</h2>
            <p>
              SchemeSaathi is designed to integrate with official Government of India open data APIs and legitimate downloadable datasets without scraping or bypassing access controls.
            </p>

            <div className="api-status-box">
              <h3>Connection Status</h3>
              <p>
                <strong>Status: </strong>
                {apiStatus?.configured ? (
                  <span className="text-success">✅ DATA_GOV_IN_API_KEY Configured</span>
                ) : (
                  <span className="text-muted">ℹ️ Offline / Local Verified Catalog Active</span>
                )}
              </p>
              <p className="api-note">{apiStatus?.message}</p>
            </div>

            <div className="api-guidance-box">
              <h3>How to Connect data.gov.in APIs</h3>
              <ol className="api-steps">
                <li>Register for an official API key on <a href="https://data.gov.in/" target="_blank" rel="noopener noreferrer">data.gov.in</a>.</li>
                <li>Add your key to your environment variables: <code>DATA_GOV_IN_API_KEY=your_key_here</code>.</li>
                <li>Or download official CSV/JSON datasets from <a href="https://data.gov.in/" target="_blank" rel="noopener noreferrer">data.gov.in</a> or <a href="https://www.myscheme.gov.in/" target="_blank" rel="noopener noreferrer">myscheme.gov.in</a> and import them directly using the <strong>Import Schemes</strong> tab.</li>
              </ol>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
