import { useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { downloadChecklist } from '../services/pdf.js';
import { IconCheck, IconDownload } from './Icons.jsx';

export default function SmartDocumentChecklist({ schemes = [], results = [] }) {
  const ctx = useI18n();
  const { t, tx } = ctx;
  const { profile, isSample, collectedDocs, toggleCollectedDoc } = useProfile();
  const [downloading, setDownloading] = useState(false);

  // Collect unique documents required across eligible/maybe schemes
  const eligibleSchemeIds = new Set(
    results.filter((r) => r.status === 'eligible' || r.status === 'maybe').map((r) => r.schemeId)
  );

  const relevantSchemes = schemes.filter((s) => eligibleSchemeIds.has(s.id));
  const docToSchemes = new Map();

  for (const s of relevantSchemes) {
    for (const d of s.documents || []) {
      if (!docToSchemes.has(d)) docToSchemes.set(d, []);
      docToSchemes.get(d).push(s);
    }
  }

  const allDocs = Array.from(docToSchemes.keys());
  if (allDocs.length === 0) return null;

  const collectedCount = allDocs.filter((d) => collectedDocs.includes(d)).length;
  const percent = Math.round((collectedCount / allDocs.length) * 100);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const items = relevantSchemes.map((s) => ({
        scheme: s,
        result: results.find((r) => r.schemeId === s.id) || null,
      }));
      await downloadChecklist({
        items,
        profile,
        isSample,
        ctx,
        collectedDocs,
      });
    } catch (err) {
      console.error('Failed to download personalized checklist:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="smart-docs-panel" aria-label={t('doc.checklist.title')}>
      <div className="smart-docs-header">
        <div>
          <h2>{t('doc.checklist.title')}</h2>
          <p className="smart-docs-sub">{t('doc.checklist.subtitle')}</p>
        </div>
        <button
          type="button"
          className="btn btn-solid btn-sm"
          onClick={handleDownload}
          disabled={downloading}
        >
          <IconDownload />
          {downloading ? t('btn.preparing') : t('btn.download')}
        </button>
      </div>

      <div className="smart-docs-progress-row">
        <div className="smart-progress-track">
          <div className="smart-progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="smart-progress-text">
          {t('doc.progress', { done: collectedCount, total: allDocs.length })} ({percent}%)
        </span>
      </div>

      <ul className="smart-docs-list">
        {allDocs.map((docKey) => {
          const isCollected = collectedDocs.includes(docKey);
          const schemesNeedingDoc = docToSchemes.get(docKey) || [];

          return (
            <li key={docKey} className={`smart-doc-item ${isCollected ? 'is-collected' : ''}`}>
              <label className="smart-doc-label">
                <input
                  type="checkbox"
                  checked={isCollected}
                  onChange={() => toggleCollectedDoc(docKey)}
                  className="smart-doc-checkbox"
                />
                <span className="smart-doc-check-custom">
                  {isCollected && <IconCheck />}
                </span>
                <span className="smart-doc-name">{tx(docKey)}</span>
              </label>

              <div className="smart-doc-meta">
                <span className={`doc-tag ${isCollected ? 'tag-collected' : 'tag-pending'}`}>
                  {isCollected ? t('doc.status.collected') : t('doc.status.pending')}
                </span>
                <span className="smart-doc-count">
                  Used in {schemesNeedingDoc.length} {schemesNeedingDoc.length === 1 ? 'scheme' : 'schemes'}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
