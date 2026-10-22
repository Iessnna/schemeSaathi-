import { useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { STATES } from '../data/states.js';
import { IconCheck, Seal } from './Icons.jsx';

export default function EligibilityGapFinder({ missingFields = [], onUpdated = null }) {
  const { t } = useI18n();
  const { form, updateGaps } = useProfile();
  const [answers, setAnswers] = useState({});
  const [saved, setSaved] = useState(false);

  if (!missingFields || missingFields.length === 0) {
    return null;
  }

  const handleChange = (field, value) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleApply = (e) => {
    e.preventDefault();
    if (Object.keys(answers).length === 0) return;
    updateGaps(answers);
    setSaved(true);
    if (onUpdated) onUpdated();
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <section className="gap-finder-panel" aria-label={t('gap.title')}>
      <div className="gap-header">
        <div className="gap-icon-badge">
          <Seal kind="maybe" size={28} />
        </div>
        <div>
          <h2>{t('gap.title')}</h2>
          <p className="gap-subtitle">{t('gap.subtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleApply} className="gap-form">
        <div className="gap-grid">
          {missingFields.map((field) => {
            const currentVal = answers[field] !== undefined ? answers[field] : form[field] || '';

            if (field === 'annualIncome') {
              return (
                <div key={field} className="gap-item">
                  <label htmlFor="gap-income" className="gap-label">{t('f.income')}</label>
                  <div className="gap-input-row">
                    <input
                      id="gap-income"
                      type="number"
                      min="0"
                      step="1000"
                      className="gap-input"
                      placeholder="e.g. 120000"
                      value={currentVal === 'unsure' ? '' : currentVal}
                      onChange={(e) => handleChange('income', e.target.value)}
                    />
                    <label className="gap-checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.incomeUnsure || answers.incomeUnsure || false}
                        onChange={(e) => {
                          handleChange('incomeUnsure', e.target.checked);
                          if (e.target.checked) handleChange('income', '');
                        }}
                      />
                      <span>{t('f.incomeUnsure')}</span>
                    </label>
                  </div>
                </div>
              );
            }

            if (field === 'domicile') {
              return (
                <div key={field} className="gap-item">
                  <label htmlFor="gap-domicile" className="gap-label">{t('f.domicile')}</label>
                  <select
                    id="gap-domicile"
                    className="gap-select"
                    value={currentVal}
                    onChange={(e) => handleChange('domicile', e.target.value)}
                  >
                    <option value="">{t('f.select.placeholder')}</option>
                    <option value="unsure">{t('opt.unsure')}</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              );
            }

            // Yes / No / Unsure fields
            let label = t('miss.' + field);
            if (field === 'ownsLand') label = t('f.ownsLand');
            else if (field === 'domicileCertificate') label = t('f.domicileCert');
            else if (field === 'isStudent') label = t('f.isStudent');
            else if (field === 'hasDisabilityCertificate') label = t('f.disability');

            return (
              <div key={field} className="gap-item">
                <span className="gap-label">{label}</span>
                <div className="gap-btn-group" role="radiogroup" aria-label={label}>
                  <button
                    type="button"
                    className={`gap-choice-btn ${currentVal === 'yes' ? 'is-selected' : ''}`}
                    onClick={() => handleChange(field, 'yes')}
                  >
                    {t('opt.yes')}
                  </button>
                  <button
                    type="button"
                    className={`gap-choice-btn ${currentVal === 'no' ? 'is-selected' : ''}`}
                    onClick={() => handleChange(field, 'no')}
                  >
                    {t('opt.no')}
                  </button>
                  <button
                    type="button"
                    className={`gap-choice-btn ${currentVal === 'unsure' ? 'is-selected' : ''}`}
                    onClick={() => handleChange(field, 'unsure')}
                  >
                    {t('opt.unsure')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="gap-actions">
          <button
            type="submit"
            className="btn btn-solid"
            disabled={Object.keys(answers).length === 0}
          >
            {t('gap.update')}
          </button>
          {saved && (
            <span className="gap-success-msg" role="status">
              <IconCheck /> {t('gap.cleared')}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
