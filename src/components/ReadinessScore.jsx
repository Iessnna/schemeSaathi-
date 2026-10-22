import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';

export default function ReadinessScore() {
  const { t } = useI18n();
  const { readiness } = useProfile();

  if (!readiness) return null;

  const { score, tier, breakdown, counts, disclaimer } = readiness;

  const tierColors = {
    high_readiness: 'tier-high',
    moderate_readiness: 'tier-mod',
    getting_started: 'tier-low',
  };

  const tierLabels = {
    high_readiness: t('readiness.tier.high'),
    moderate_readiness: 'Moderate Readiness',
    getting_started: 'Getting Started',
  };

  return (
    <section className="readiness-panel" aria-label={t('readiness.title')}>
      <div className="readiness-header">
        <div>
          <h2>{t('readiness.title')}</h2>
          <p className="readiness-sub">{t('readiness.desc')}</p>
        </div>
        <div className={`readiness-badge ${tierColors[tier] || 'tier-low'}`}>
          <span className="readiness-score-num">{score}%</span>
          <span className="readiness-tier-name">{tierLabels[tier] || tier}</span>
        </div>
      </div>

      <div className="readiness-meters-grid">
        <div className="meter-card">
          <div className="meter-info">
            <span className="meter-label">{t('readiness.profile', { pct: breakdown.profile })}</span>
            <span className="meter-val">{counts.answered} / {counts.totalFields} answers</span>
          </div>
          <div className="meter-track">
            <div className="meter-fill fill-forest" style={{ width: `${breakdown.profile}%` }} />
          </div>
        </div>

        <div className="meter-card">
          <div className="meter-info">
            <span className="meter-label">Eligibility Decisiveness: {breakdown.eligibility}%</span>
            <span className="meter-val">Decisive results</span>
          </div>
          <div className="meter-track">
            <div className="meter-fill fill-turmeric" style={{ width: `${breakdown.eligibility}%` }} />
          </div>
        </div>

        <div className="meter-card">
          <div className="meter-info">
            <span className="meter-label">{t('readiness.docs', { pct: breakdown.documents })}</span>
            <span className="meter-val">{counts.collectedDocs} / {counts.totalDocs} collected</span>
          </div>
          <div className="meter-track">
            <div className="meter-fill fill-sage" style={{ width: `${breakdown.documents}%` }} />
          </div>
        </div>
      </div>

      <p className="readiness-disclaimer-note" role="note">
        <strong>Note:</strong> {disclaimer}
      </p>
    </section>
  );
}
