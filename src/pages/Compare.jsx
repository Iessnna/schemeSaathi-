import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { getScheme, isDemo } from '../data/index.js';
import { formatINR } from '../utils/format.js';
import { BackLink } from '../components/SchemeParts.jsx';
import { DemoTag, StatusBadge } from '../components/Chrome.jsx';
import { IconClose, IconLink } from '../components/Icons.jsx';

export default function Compare() {
  const ctx = useI18n();
  const { t, tx } = ctx;
  const { compareList, toggleCompare, clearCompare, schemesCatalog, analysis } = useProfile();

  const schemes = compareList.map((id) => getScheme(id, schemesCatalog)).filter(Boolean);

  if (schemes.length === 0) {
    return (
      <main id="main" className="wrap page">
        <BackLink to="/results">{t('btn.back')}</BackLink>
        <h1>{t('compare.title')}</h1>
        <p className="note">{t('compare.empty')}</p>
        <Link to="/results" className="btn btn-primary">{t('nav.results')}</Link>
      </main>
    );
  }

  const getResult = (id) => analysis?.results.find((r) => r.schemeId === id) || null;

  return (
    <main id="main" className="wrap page compare-page">
      <div className="compare-top-nav">
        <BackLink to="/results">{t('btn.back')}</BackLink>
        <button type="button" className="btn btn-ghost btn-sm" onClick={clearCompare}>
          {t('compare.clear')}
        </button>
      </div>

      <header className="compare-head">
        <h1>{t('compare.title')}</h1>
        <p className="lede-sm">{t('compare.subtitle')}</p>
      </header>

      <div className="compare-table-container">
        <table className="compare-matrix">
          <thead>
            <tr>
              <th className="matrix-field-col">Feature</th>
              {schemes.map((s) => (
                <th key={s.id} className="matrix-scheme-col">
                  <div className="scheme-header-cell">
                    <button
                      type="button"
                      className="matrix-remove-btn"
                      onClick={() => toggleCompare(s.id)}
                      aria-label={`${t('compare.remove')} ${tx(s.name)}`}
                    >
                      <IconClose size={16} />
                    </button>
                    <h3>{tx(s.name)}</h3>
                    {isDemo(s) ? <DemoTag compact /> : <span className="verified-badge">{t('status.verified')}</span>}
                    <div className="matrix-header-links">
                      <Link to={`/scheme/${s.id}`} className="matrix-view-link">
                        {t('btn.view')}
                      </Link>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Match Status */}
            <tr>
              <td className="matrix-label">{t('compare.field.match')}</td>
              {schemes.map((s) => {
                const r = getResult(s.id);
                return (
                  <td key={s.id}>
                    {r ? (
                      <StatusBadge status={r.status} sample={isDemo(s)} />
                    ) : (
                      <span className="text-muted">No profile evaluated</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Level */}
            <tr>
              <td className="matrix-label">{t('compare.field.level')}</td>
              {schemes.map((s) => (
                <td key={s.id}>
                  {s.level === 'central'
                    ? t('scope.central')
                    : t('scope.state', { s: s.governingState || t('compare.none') })}
                </td>
              ))}
            </tr>

            {/* Age */}
            <tr>
              <td className="matrix-label">{t('compare.field.age')}</td>
              {schemes.map((s) => {
                const age = s.eligibility?.age;
                if (!age || (age.min == null && age.max == null)) {
                  return <td key={s.id}>Any age</td>;
                }
                if (age.min != null && age.max != null) {
                  return <td key={s.id}>{t('range.between', { min: age.min, max: age.max })}</td>;
                }
                if (age.min != null) {
                  return <td key={s.id}>{t('range.min', { min: age.min })}</td>;
                }
                return <td key={s.id}>{t('range.max', { max: age.max })}</td>;
              })}
            </tr>

            {/* Income */}
            <tr>
              <td className="matrix-label">{t('compare.field.income')}</td>
              {schemes.map((s) => {
                const inc = s.eligibility?.income?.max;
                return (
                  <td key={s.id}>
                    {inc != null ? `Up to ₹${formatINR(inc)}` : 'No income ceiling specified'}
                  </td>
                );
              })}
            </tr>

            {/* Occupations */}
            <tr>
              <td className="matrix-label">{t('compare.field.occupation')}</td>
              {schemes.map((s) => {
                const occs = s.eligibility?.occupations;
                return (
                  <td key={s.id}>
                    {occs && occs.length
                      ? occs.map((o) => t('occ.' + o)).join(', ')
                      : 'Any occupation'}
                  </td>
                );
              })}
            </tr>

            {/* Domicile */}
            <tr>
              <td className="matrix-label">{t('compare.field.domicile')}</td>
              {schemes.map((s) => {
                const d = s.eligibility?.domicile;
                return (
                  <td key={s.id}>
                    {d?.states?.length
                      ? `${d.states.join(', ')} ${d.certificateRequired ? `(${t('det.certNeeded')})` : ''}`
                      : t('det.noDomicile')}
                  </td>
                );
              })}
            </tr>

            {/* Required Documents */}
            <tr>
              <td className="matrix-label">{t('compare.field.docs')}</td>
              {schemes.map((s) => (
                <td key={s.id}>
                  <ul className="matrix-doc-list">
                    {(s.documents || []).map((d) => (
                      <li key={d}>{tx(d)}</li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>

            {/* Application Steps */}
            <tr>
              <td className="matrix-label">{t('det.steps')}</td>
              {schemes.map((s) => (
                <td key={s.id}>
                  <ol className="matrix-step-list">
                    {(s.steps || []).map((st) => (
                      <li key={st}>{tx(st)}</li>
                    ))}
                  </ol>
                </td>
              ))}
            </tr>

            {/* Verification Status & Date */}
            <tr>
              <td className="matrix-label">{t('compare.field.status')}</td>
              {schemes.map((s) => (
                <td key={s.id}>
                  <div>
                    <strong>{t('det.verif.' + s.verificationStatus)}</strong>
                    {s.lastVerified && <div className="text-muted"><small>Verified: {s.lastVerified}</small></div>}
                    {s.publisher && <div className="text-muted"><small>Publisher: {s.publisher}</small></div>}
                  </div>
                </td>
              ))}
            </tr>

            {/* Official Links */}
            <tr>
              <td className="matrix-label">{t('compare.field.links')}</td>
              {schemes.map((s) => (
                <td key={s.id}>
                  <div className="matrix-links">
                    {s.applicationUrl ? (
                      <a href={s.applicationUrl} target="_blank" rel="noopener noreferrer" className="link-item">
                        <IconLink size={14} /> {t('det.apply')}
                      </a>
                    ) : null}
                    {s.sourceUrl ? (
                      <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="link-item">
                        <IconLink size={14} /> {t('det.source')}
                      </a>
                    ) : null}
                    {!s.applicationUrl && !s.sourceUrl && (
                      <span className="text-muted">{t('compare.none')}</span>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
