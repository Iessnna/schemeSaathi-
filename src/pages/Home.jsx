import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { LIFE_SITUATIONS } from '../utils/lifeSituations.js';
import HeroArt from '../components/HeroArt.jsx';

export default function Home() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { setLifeSituation } = useProfile();

  const principles = [
    ['home.how.ai', 'home.how.ai.body'],
    ['home.how.rules', 'home.how.rules.body'],
    ['home.how.source', 'home.how.source.body'],
  ];

  const handleSelectSituation = (key) => {
    setLifeSituation(key);
    navigate('/results');
  };

  return (
    <main id="main">
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-text">
            <h1>{t('hero.title')}</h1>
            <p className="lede">{t('hero.body')}</p>
            <div className="cta-row">
              <Link to="/profile" className="btn btn-primary btn-lg">{t('hero.cta')}</Link>
              <a href="#how" className="btn btn-link">{t('hero.cta2')}</a>
            </div>
          </div>
          <div className="hero-panel"><HeroArt /></div>
        </div>
      </section>

      {/* Feature 7: Life Situations Quick Access */}
      <section className="section wrap">
        <h2 className="section-title">{t('life.title')}</h2>
        <div className="life-situations-grid">
          {LIFE_SITUATIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              className="situation-card"
              onClick={() => handleSelectSituation(s.key)}
            >
              <span className="situation-card-icon">{s.icon}</span>
              <h3 className="situation-card-title">{s.name[lang] || s.name.en}</h3>
              <p className="situation-card-desc">{s.description[lang] || s.description.en}</p>
            </button>
          ))}
        </div>
      </section>

      <section id="how" className="section wrap">
        <h2 className="section-title">{t('home.how.title')}</h2>
        <div className="principles">
          {principles.map(([head, body]) => (
            <div className="principle" key={head}>
              <h3>{t(head)}</h3>
              <p>{t(body)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap section-tight">
        <aside className="demo-note">
          <h2>{t('home.demo.title')}</h2>
          <p>{t('home.demo.body')}</p>
        </aside>
      </section>
    </main>
  );
}
