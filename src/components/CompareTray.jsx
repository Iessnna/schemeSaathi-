import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { getScheme } from '../data/index.js';
import { IconClose } from './Icons.jsx';

export default function CompareTray() {
  const { t, tx } = useI18n();
  const { compareList, toggleCompare, clearCompare, schemesCatalog } = useProfile();

  if (!compareList || compareList.length === 0) {
    return null;
  }

  const selectedSchemes = compareList.map((id) => getScheme(id, schemesCatalog)).filter(Boolean);

  return (
    <aside className="compare-tray" aria-label={t('compare.title')}>
      <div className="wrap compare-tray-row">
        <div className="compare-tray-info">
          <span className="compare-count-badge">
            {t('compare.bar', { n: selectedSchemes.length })}
          </span>
          <div className="compare-chips">
            {selectedSchemes.map((s) => (
              <span key={s.id} className="compare-chip">
                <span className="chip-text">{tx(s.name)}</span>
                <button
                  type="button"
                  className="chip-remove"
                  onClick={() => toggleCompare(s.id)}
                  aria-label={`${t('compare.remove')} ${tx(s.name)}`}
                >
                  <IconClose size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="compare-tray-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={clearCompare}
          >
            {t('compare.clear')}
          </button>
          <Link
            to="/compare"
            className="btn btn-solid btn-sm"
          >
            {t('compare.view')}
          </Link>
        </div>
      </div>
    </aside>
  );
}
