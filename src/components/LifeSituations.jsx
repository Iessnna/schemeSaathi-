import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { LIFE_SITUATIONS } from '../utils/lifeSituations.js';

export default function LifeSituations() {
  const { t, lang } = useI18n();
  const { lifeSituation, setLifeSituation } = useProfile();

  const currentSit = LIFE_SITUATIONS.find((s) => s.key === lifeSituation);

  return (
    <section className="life-situations-bar" aria-label={t('life.title')}>
      <div className="life-header">
        <span className="life-title">{t('life.title')}:</span>
      </div>

      <div className="life-pills-row" role="group" aria-label={t('life.title')}>
        <button
          type="button"
          className={`life-pill ${lifeSituation === 'all' ? 'is-active' : ''}`}
          onClick={() => setLifeSituation('all')}
        >
          <span>🌐</span> {t('life.all')}
        </button>

        {LIFE_SITUATIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`life-pill ${lifeSituation === s.key ? 'is-active' : ''}`}
            onClick={() => setLifeSituation(s.key)}
          >
            <span>{s.icon}</span> {s.name[lang] || s.name.en}
          </button>
        ))}
      </div>

      {lifeSituation !== 'all' && currentSit && (
        <div className="life-active-banner" role="status">
          <p>
            {t('life.notice', { name: currentSit.name[lang] || currentSit.name.en })}
          </p>
        </div>
      )}
    </section>
  );
}
