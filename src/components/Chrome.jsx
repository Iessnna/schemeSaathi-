// Page chrome: Header (nav + assistant trigger + language switcher), Footer, and shared pieces.
import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LANGS, useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import SchemeAssistant from './SchemeAssistant.jsx';
import { IconClose, IconMenu, Logo, Seal } from './Icons.jsx';

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { compareList } = useProfile();
  const [open, setOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <header className="site-header">
        <a className="skip" href="#main">{t('skip')}</a>
        <div className="wrap header-row">
          <Link to="/" className="brand" onClick={close}>
            <Logo />
            <span>SchemeSaathi</span>
          </Link>

          <button
            className="menu-btn"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen(!open)}
            aria-label={t('nav.menu')}
          >
            {open ? <IconClose /> : <IconMenu />}
          </button>

          <div id="site-nav" className={'nav-panel' + (open ? ' is-open' : '')}>
            <nav aria-label="Main">
              <NavLink to="/" end onClick={close}>{t('nav.home')}</NavLink>
              <NavLink to="/profile" onClick={close}>{t('nav.find')}</NavLink>
              <NavLink to="/results" onClick={close}>{t('nav.results')}</NavLink>
              <NavLink to="/compare" onClick={close}>
                {t('nav.compare')}
                {compareList.length > 0 && <span className="nav-badge-count">{compareList.length}</span>}
              </NavLink>
              <NavLink to="/manage" onClick={close}>{t('nav.manage')}</NavLink>
            </nav>

            <div className="header-actions-group">
              <button
                type="button"
                className="btn-assistant-trigger"
                onClick={() => {
                  setAssistantOpen(true);
                  close();
                }}
                aria-label={t('nav.assistant')}
              >
                💬 <span>{t('nav.assistant')}</span>
              </button>

              <div className="lang" role="group" aria-label={t('lang.label')}>
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    lang={l.code}
                    aria-pressed={lang === l.code}
                    className={lang === l.code ? 'is-on' : ''}
                    onClick={() => {
                      setLang(l.code);
                      close();
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <SchemeAssistant
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
      />
    </>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="wrap footer-content">
        <div className="footer-links-row">
          <Link to="/">{t('nav.home')}</Link>
          <Link to="/profile">{t('nav.find')}</Link>
          <Link to="/results">{t('nav.results')}</Link>
          <Link to="/compare">{t('nav.compare')}</Link>
          <Link to="/manage">{t('nav.manage')}</Link>
        </div>
        <p>{t('footer.disclaimer')}</p>
      </div>
    </footer>
  );
}

// Visible on every fictional scheme.
export function DemoTag({ compact = false }) {
  const { t } = useI18n();
  return (
    <span className={'demo-tag' + (compact ? ' is-compact' : '')} role="note">
      {compact ? t('demo.short') : t('demo.label')}
    </span>
  );
}

export function VerifiedTag({ compact = false }) {
  const { t } = useI18n();
  return (
    <span className={'verified-tag' + (compact ? ' is-compact' : '')} role="note">
      ✓ {t('status.verified')}
    </span>
  );
}

const SEAL = {
  eligible: 'check',
  maybe: 'maybe',
  not_eligible: 'cross',
  insufficient_info: 'maybe',
};

export function StatusBadge({ status, sample }) {
  const { t } = useI18n();
  const kind = SEAL[status] || 'maybe';
  const labelKey = status === 'maybe' ? 'status.possibly_eligible' : 'status.' + status;

  return (
    <span className={`status status-${status}`}>
      <Seal kind={kind} size={22} />
      <span>
        {t(labelKey)}
        {sample && <small> ({t('status.sample')})</small>}
      </span>
    </span>
  );
}
