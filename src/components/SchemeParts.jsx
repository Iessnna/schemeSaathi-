// Pieces used on both the results list and the detail page.
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { describeCheck, headlineReason } from '../utils/describe.js';
import { isDemo, isVerificationOutdated } from '../data/index.js';
import { DemoTag, StatusBadge, VerifiedTag } from './Chrome.jsx';
import { IconDownload, IconBack, Seal } from './Icons.jsx';

const MARK = { pass: 'check', unknown: 'maybe', fail: 'cross' };

// "Why this result": every check with a tick, question mark or cross.
export function CheckList({ checks }) {
  const ctx = useI18n();
  return (
    <ul className="checks">
      {checks.map((c, i) => (
        <li key={i} className={`check check-${c.status}`}>
          <Seal kind={MARK[c.status] || 'maybe'} size={22} />
          <span>{describeCheck(c, ctx)}</span>
        </li>
      ))}
    </ul>
  );
}

// One row in the results "ledger". Rows are rows (not identical cards) and the left edge shows status.
export function SchemeRow({ scheme, result, onDownload, busy }) {
  const ctx = useI18n();
  const { t, tx } = ctx;
  const { compareList, toggleCompare } = useProfile();
  const demo = isDemo(scheme);
  const isComparing = compareList.includes(scheme.id);
  const outdated = isVerificationOutdated(scheme);

  return (
    <article className={`row row-${result.status}`}>
      <div className="row-main">
        <div className="row-badges-line">
          <StatusBadge status={result.status} sample={demo} />
          {demo ? <DemoTag compact /> : <VerifiedTag compact />}
          {outdated && (
            <span className="outdated-pill" title="Verified > 180 days ago">
              ⚠️ {t('status.outdated')}
            </span>
          )}
        </div>

        <h3 className="row-title">{tx(scheme.name)}</h3>
        <p className="row-desc">{tx(scheme.description)}</p>
        <p className="row-reason">{headlineReason(result, ctx)}</p>
        <p className="row-meta">
          {t('rank.passed', { p: result.passed, t: result.total })}
          {scheme.lastVerified && <span className="meta-verif"> • Verified: {scheme.lastVerified}</span>}
        </p>
      </div>

      <div className="row-actions">
        <Link className="btn btn-solid" to={`/scheme/${scheme.id}`}>{t('btn.view')}</Link>

        <button
          type="button"
          className={`btn ${isComparing ? 'btn-compare-active' : 'btn-ghost'}`}
          onClick={() => toggleCompare(scheme.id)}
          aria-pressed={isComparing}
        >
          {isComparing ? '✓ Comparing' : `+ ${t('compare.add')}`}
        </button>

        <button type="button" className="btn btn-ghost" onClick={onDownload} disabled={busy}>
          <IconDownload />{busy ? t('btn.preparing') : t('btn.download')}
        </button>
      </div>
    </article>
  );
}

export function BackLink({ to, children }) {
  return <Link to={to} className="back-link"><IconBack />{children}</Link>;
}
