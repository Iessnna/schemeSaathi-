import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { getScheme, isDemo, isVerificationOutdated } from '../data/index.js';
import { downloadChecklist } from '../services/pdf.js';
import { BackLink, CheckList } from '../components/SchemeParts.jsx';
import { DemoTag, StatusBadge, VerifiedTag } from '../components/Chrome.jsx';
import { IconCheck, IconDownload, IconLink } from '../components/Icons.jsx';
import CompareTray from '../components/CompareTray.jsx';

export default function SchemeDetail() {
  const { id } = useParams();
  const ctx = useI18n();
  const { t, tx } = ctx;
  const {
    analysis,
    isSample,
    schemesCatalog,
    collectedDocs,
    toggleCollectedDoc,
    compareList,
    toggleCompare,
  } = useProfile();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const scheme = getScheme(id, schemesCatalog);
  if (!scheme) {
    return (
      <main id="main" className="wrap page">
        <p>{t('det.notFound')}</p>
        <BackLink to="/results">{t('btn.back')}</BackLink>
      </main>
    );
  }

  const result = analysis?.results.find((r) => r.schemeId === id) || null;
  const demo = isDemo(scheme);
  const isComparing = compareList.includes(scheme.id);
  const outdated = isVerificationOutdated(scheme);

  const e = scheme.eligibility;
  const states = scheme.applicableStates.includes('ALL')
    ? t('det.allStates')
    : scheme.applicableStates.join(', ');
  const domicile = e.domicile?.states?.length
    ? t('det.domicileReqText', { list: e.domicile.states.join(', ') }) +
      (e.domicile.certificateRequired ? ` (${t('det.certNeeded')})` : '')
    : t('det.noDomicile');
  const verif = t('det.verif.' + scheme.verificationStatus);

  const download = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await downloadChecklist({
        items: [{ scheme, result }],
        profile: analysis?.profile,
        isSample,
        ctx,
        collectedDocs,
      });
    } catch (err) {
      console.error(err);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main" className="wrap page detail">
      <div className="detail-top-bar">
        <BackLink to="/results">{t('btn.back')}</BackLink>
        <button
          type="button"
          className={`btn btn-sm ${isComparing ? 'btn-compare-active' : 'btn-ghost'}`}
          onClick={() => toggleCompare(scheme.id)}
          aria-pressed={isComparing}
        >
          {isComparing ? '✓ ' + t('compare.bar', { n: compareList.length }) : '+ ' + t('compare.add')}
        </button>
      </div>

      <header className="detail-head">
        {result && <StatusBadge status={result.status} sample={demo} />}
        <h1>{tx(scheme.name)}</h1>
        <div className="detail-tags-line">
          {demo ? <DemoTag /> : <VerifiedTag />}
          {outdated && (
            <span className="outdated-pill">
              ⚠️ {t('status.outdated')} ({scheme.lastVerified})
            </span>
          )}
        </div>
        <p className="lede-sm">{tx(scheme.description)}</p>
        <button type="button" className="btn btn-solid" onClick={download} disabled={busy}>
          <IconDownload />{busy ? t('btn.preparing') : t('btn.download')}
        </button>
        {failed && <p className="note note-error" role="alert">{t('common.error')}</p>}
      </header>

      <div className="detail-grid">
        <section className="detail-main">
          {result ? (
            <>
              <h2>{t('det.why')}</h2>
              <CheckList checks={result.checks} />
              {result.status === 'maybe' && result.missing.length > 0 && (
                <div className="missing-inline">
                  <h3>{t('det.missing')}</h3>
                  <ul>{result.missing.map((m) => <li key={m}>{t('miss.' + m)}</li>)}</ul>
                  <Link to="/results" className="btn btn-ghost">{t('gap.title')}</Link>
                </div>
              )}
            </>
          ) : (
            <p className="note">{t('res.needProfile')} <Link to="/profile">{t('btn.find')}</Link></p>
          )}

          <h2>{t('det.docs')}</h2>
          <ul className="docs-interactive-list">
            {scheme.documents.map((d) => {
              const collected = collectedDocs.includes(d);
              return (
                <li key={d} className={`doc-item ${collected ? 'is-collected' : ''}`}>
                  <label className="doc-item-label">
                    <input
                      type="checkbox"
                      checked={collected}
                      onChange={() => toggleCollectedDoc(d)}
                    />
                    <span className="doc-check-box">{collected && <IconCheck />}</span>
                    <span className="doc-text">{tx(d)}</span>
                  </label>
                  <span className={`doc-status-badge ${collected ? 'badge-collected' : 'badge-pending'}`}>
                    {collected ? t('doc.status.collected') : t('doc.status.pending')}
                  </span>
                </li>
              );
            })}
          </ul>

          <h2>{t('det.steps')}</h2>
          <ol className="steps">{scheme.steps.map((s) => <li key={s}>{tx(s)}</li>)}</ol>
          {demo && <p className="note">{t('step.demoNote')}</p>}
        </section>

        <aside className="facts">
          <dl>
            <dt>{t('det.level')}</dt>
            <dd>{scheme.level === 'central' ? t('scope.central') : t('scope.state', { s: scheme.governingState })}</dd>
            <dt>{t('det.states')}</dt><dd>{states}</dd>
            <dt>{t('det.domicileReq')}</dt><dd>{domicile}</dd>
            <dt>{t('det.verified')}</dt><dd>{scheme.lastVerified || verif}</dd>
            {scheme.publisher && (
              <>
                <dt>Publisher</dt>
                <dd>{scheme.publisher}</dd>
              </>
            )}
          </dl>
          <div className="links">
            {scheme.applicationUrl && (
              <a className="btn btn-primary" href={scheme.applicationUrl} target="_blank" rel="noopener noreferrer">
                <IconLink />{t('det.apply')}
              </a>
            )}
            {scheme.sourceUrl && (
              <a className="btn btn-ghost" href={scheme.sourceUrl} target="_blank" rel="noopener noreferrer">
                <IconLink />{t('det.source')}
              </a>
            )}
            {!scheme.applicationUrl && !scheme.sourceUrl && <p className="note">{t('det.noLinks')}</p>}
          </div>
          <p className="fine">{t('det.final')}</p>
        </aside>
      </div>

      <CompareTray />
    </main>
  );
}
