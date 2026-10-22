// Optional: describe yourself in one sentence and let Gemini suggest form answers.
// Gemini only SUGGESTS fields. The user confirms them, and the rule engine decides eligibility.
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { getStatus, parseProfileText } from '../services/api.js';

export default function NaturalInput() {
  const { t } = useI18n();
  const { applyExtracted } = useProfile();
  const [available, setAvailable] = useState(null); // null = still checking
  const [text, setText] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | done | error

  useEffect(() => { getStatus().then((s) => setAvailable(s.gemini)); }, []);

  const run = async () => {
    setState('loading');
    try { applyExtracted(await parseProfileText(text)); setState('done'); }
    catch { setState('error'); }
  };

  return (
    <section className="nl" aria-labelledby="nl-title">
      <h2 id="nl-title" className="nl-title">{t('nl.title')}</h2>
      <p className="field-help">{t('nl.hint')}</p>
      {available === false ? (
        <p className="note">{t('nl.unavailable')}</p>
      ) : (
        <>
          <label className="sr-only" htmlFor="nl-text">{t('nl.title')}</label>
          <textarea id="nl-text" className="input" rows={3} maxLength={600} value={text}
            onChange={(e) => setText(e.target.value)} placeholder={t('nl.placeholder')} disabled={available === null} />
          <div className="nl-actions">
            <button type="button" className="btn btn-ghost" onClick={run} disabled={!text.trim() || state === 'loading' || !available}>
              {state === 'loading' ? t('common.loading') : t('btn.parse')}
            </button>
            <span className="field-help" role="status">
              {state === 'done' && t('nl.done')}
              {state === 'error' && t('nl.error')}
            </span>
          </div>
          <p className="field-help">{t('nl.note')}</p>
        </>
      )}
    </section>
  );
}
