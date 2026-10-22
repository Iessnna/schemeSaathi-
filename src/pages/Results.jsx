import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { isDemo } from '../data/index.js';
import { downloadChecklist } from '../services/pdf.js';
import { formatINR } from '../utils/format.js';
import { filterSchemesBySituation } from '../utils/lifeSituations.js';
import { IconDownload, IconEdit } from '../components/Icons.jsx';
import { SchemeRow } from '../components/SchemeParts.jsx';
import ReadinessScore from '../components/ReadinessScore.jsx';
import LifeSituations from '../components/LifeSituations.jsx';
import EligibilityGapFinder from '../components/EligibilityGapFinder.jsx';
import SmartDocumentChecklist from '../components/SmartDocumentChecklist.jsx';
import CompareTray from '../components/CompareTray.jsx';

export default function Results() {
  const ctx = useI18n();
  const { t } = ctx;
  const { analysis, isSample, schemesCatalog, lifeSituation, collectedDocs } = useProfile();
  const [busy, setBusy] = useState(null);
  const [failed, setFailed] = useState(false);

  if (!analysis) {
    return (
      <main id="main" className="wrap page">
        <h1>{t('res.title')}</h1>
        <p className="lede-sm">{t('res.needProfile')}</p>
        <Link to="/profile" className="btn btn-primary">{t('btn.find')}</Link>
      </main>
    );
  }

  const { profile, results, summary } = analysis;
  const byId = Object.fromEntries(schemesCatalog.map((s) => [s.id, s]));

  // Filter schemes by life situation if selected
  const situationFilteredSchemes = filterSchemesBySituation(schemesCatalog, lifeSituation);
  const situationFilteredIds = new Set(situationFilteredSchemes.map((s) => s.id));

  const filteredResults = lifeSituation === 'all'
    ? results
    : results.filter((r) => situationFilteredIds.has(r.schemeId));

  const main = filteredResults.filter((r) => r.status !== 'not_eligible');
  const notEligible = filteredResults.filter((r) => r.status === 'not_eligible');

  // Collect missing fields across maybe and insufficient_info schemes
  const missing = [
    ...new Set(
      results
        .filter((r) => r.status === 'maybe' || r.status === 'insufficient_info')
        .flatMap((r) => r.missing)
    ),
  ];

  const anyDemo = results.some((r) => isDemo(byId[r.schemeId]));

  const download = async (key, list) => {
    setBusy(key);
    setFailed(false);
    try {
      await downloadChecklist({
        items: list.map((r) => ({ scheme: byId[r.schemeId], result: r })).filter((i) => Boolean(i.scheme)),
        profile,
        isSample,
        ctx,
        collectedDocs,
      });
    } catch (e) {
      console.error(e);
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  const facts = [
    t('about.profile.age', { n: profile.age }),
    profile.state,
    `${t('f.domicile')}: ${profile.domicile === 'unsure' ? t('opt.unsure') : profile.domicile}`,
    t('occ.' + profile.occupation),
    profile.annualIncome === 'unsure'
      ? `${t('f.income')}: ${t('opt.unsure')}`
      : t('about.profile.income', { n: formatINR(profile.annualIncome) }),
  ];

  return (
    <main id="main" className="wrap page results-page">
      <header className="results-head">
        <div>
          <h1>{t('res.title')}</h1>
          <p className="results-count">{t('res.checked', { n: summary.checked })}</p>
          <ul className="tally">
            <li className="tally-eligible"><strong>{summary.eligible}</strong> {t('status.eligible')}</li>
            <li className="tally-maybe"><strong>{summary.maybe}</strong> {t('status.possibly_eligible')}</li>
            {summary.insufficientInfo > 0 && (
              <li className="tally-insufficient"><strong>{summary.insufficientInfo}</strong> {t('status.insufficient_info')}</li>
            )}
            <li className="tally-not"><strong>{summary.notEligible}</strong> {t('status.not_eligible')}</li>
          </ul>
        </div>
        <div className="results-tools">
          <Link to="/profile" className="btn btn-ghost"><IconEdit />{t('btn.edit')}</Link>
          <button
            type="button"
            className="btn btn-solid"
            disabled={busy !== null}
            onClick={() => download('all', results.filter((r) => r.status !== 'not_eligible'))}
          >
            <IconDownload />{busy === 'all' ? t('btn.preparing') : t('btn.downloadAll')}
          </button>
        </div>
      </header>

      {failed && <p className="note note-error" role="alert">{t('common.error')}</p>}
      {anyDemo && <p className="demo-banner" role="note">{t('demo.label')}. {t('demo.results')}</p>}

      {/* Feature 8: Application Readiness Score */}
      <ReadinessScore />

      {/* Profile summary strip */}
      <section className="profile-strip" aria-label={t('res.profile')}>
        <h2>{t('res.profile')}{isSample && <span className="sample-tag">{t('res.sample')}</span>}</h2>
        <ul>{facts.map((f) => <li key={f}>{f}</li>)}</ul>
        <p>{t('res.domicileNote', { d: profile.domicile === 'unsure' ? t('opt.unsure') : profile.domicile, s: profile.state })}</p>
      </section>

      {/* Feature 7: Life Situations Filter */}
      <LifeSituations />

      <details className="rank-explain">
        <summary>{t('res.rank.title')}</summary>
        <p>{t('res.rank.body')}</p>
      </details>

      {/* Matched Schemes Ledger */}
      <section className="ledger" aria-label={t('res.title')}>
        {main.length === 0 && <p className="note">{t('res.none')}</p>}
        {main.map((r) => {
          const s = byId[r.schemeId];
          if (!s) return null;
          return (
            <SchemeRow
              key={r.schemeId}
              scheme={s}
              result={r}
              busy={busy === r.schemeId}
              onDownload={() => download(r.schemeId, [r])}
            />
          );
        })}
      </section>

      {/* Feature 3: Interactive Eligibility Gap Finder */}
      {missing.length > 0 && (
        <EligibilityGapFinder missingFields={missing} />
      )}

      {/* Feature 4: Smart Document Checklist */}
      <SmartDocumentChecklist
        schemes={schemesCatalog}
        results={results}
      />

      {/* Not eligible schemes accordion */}
      {notEligible.length > 0 && (
        <details className="not-eligible">
          <summary>{t('res.notEligible', { n: notEligible.length })}</summary>
          <div className="ledger">
            {notEligible.map((r) => {
              const s = byId[r.schemeId];
              if (!s) return null;
              return (
                <SchemeRow
                  key={r.schemeId}
                  scheme={s}
                  result={r}
                  busy={busy === r.schemeId}
                  onDownload={() => download(r.schemeId, [r])}
                />
              );
            })}
          </div>
        </details>
      )}

      {/* Feature 5: Comparison Floating Tray */}
      <CompareTray />
    </main>
  );
}
