// Builds a readable PDF checklist in the user's language (English, Hindi or Urdu).
// We lay the checklist out as normal HTML, let the browser draw it (so Devanagari and
// Urdu shape correctly), then place the pictures on A4 pages with jsPDF.
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { describeCheck } from '../utils/describe.js';
import { formatDate } from '../utils/format.js';
import { isDemo } from '../data/index.js';

const WIDTH = 794; // px, roughly A4 at 96 dpi

function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  Object.assign(node, props.prop || {});
  Object.assign(node.style, props.style || {});
  for (const k of kids.flat()) if (k != null) node.append(k instanceof Node ? k : document.createTextNode(k));
  return node;
}

function list(items) {
  return el('ul', { style: { margin: '4px 0 0', paddingInlineStart: '20px' } },
    items.map((i) => el('li', { style: { margin: '3px 0' } }, i)));
}

function block(ctx, scheme, result, collectedDocs = []) {
  const { t, tx } = ctx;
  const demo = isDemo(scheme);
  const wrap = el('section', { style: { padding: '14px 0', borderTop: '2px solid #1E3B2C', pageBreakInside: 'avoid' } });
  wrap.append(el('h2', { style: { font: 'inherit', fontSize: '20px', fontWeight: '700', margin: '0 0 4px', color: '#1E3B2C' } }, tx(scheme.name)));
  if (demo) wrap.append(el('div', { style: { fontWeight: '700', color: '#A4461F', margin: '2px 0 6px' } }, t('demo.label')));
  if (result) {
    wrap.append(el('div', { style: { fontWeight: '700', margin: '4px 0' } },
      t('status.' + result.status) + (demo ? ` (${t('status.sample')})` : '')));
    wrap.append(list(result.checks.map((c) => describeCheck(c, ctx))));
  }

  // Document items with personalized collected/pending indicator
  const docElements = scheme.documents.map((d) => {
    const isCollected = collectedDocs.includes(d);
    const badge = el('span', {
      style: {
        display: 'inline-block',
        fontSize: '11px',
        fontWeight: 'bold',
        padding: '1px 6px',
        marginInlineEnd: '8px',
        borderRadius: '4px',
        background: isCollected ? '#E3EDE3' : '#F5E6DC',
        color: isCollected ? '#1E3B2C' : '#A4461F',
      },
    }, isCollected ? '✓ Collected' : 'Pending');

    return el('li', { style: { margin: '4px 0' } }, badge, tx(d));
  });

  wrap.append(el('h3', { style: { fontSize: '15px', margin: '12px 0 0' } }, t('det.docs')),
    el('ul', { style: { margin: '4px 0 0', paddingInlineStart: '20px', listStyleType: 'none' } }, docElements));

  wrap.append(el('h3', { style: { fontSize: '15px', margin: '12px 0 0' } }, t('det.steps')),
    el('ol', { style: { margin: '4px 0 0', paddingInlineStart: '20px' } }, scheme.steps.map((s) => el('li', { style: { margin: '3px 0' } }, tx(s)))));
  if (demo) wrap.append(el('p', { style: { margin: '8px 0 0', fontStyle: 'italic' } }, t('step.demoNote')));
  const links = [];
  if (scheme.sourceUrl) links.push(`${t('det.source')}: ${scheme.sourceUrl}`);
  if (scheme.applicationUrl) links.push(`${t('det.apply')}: ${scheme.applicationUrl}`);
  wrap.append(el('p', { style: { margin: '8px 0 0', wordBreak: 'break-all', whiteSpace: 'pre-line' } },
    links.length ? links.join('\n') : t('det.noLinks')));
  if (scheme.lastVerified) wrap.append(el('p', { style: { margin: '2px 0 0' } }, `${t('det.verified')}: ${scheme.lastVerified}`));
  if (scheme.publisher) wrap.append(el('p', { style: { margin: '2px 0 0', fontSize: '12px', color: '#46544B' } }, `Publisher: ${scheme.publisher}`));
  return wrap;
}

/** items: [{ scheme, result }]  - result may be null if no profile was entered. */
export async function downloadChecklist({ items, profile, isSample, ctx, collectedDocs = [] }) {
  const { t, lang, dir } = ctx;
  const body = {
    en: "'Hanken Grotesk', system-ui, sans-serif",
    hi: "'Noto Sans Devanagari', 'Hanken Grotesk', sans-serif",
    ur: "'Noto Naskh Arabic', serif",
  }[lang];

  const root = el('div', { style: {
    position: 'fixed', left: '-10000px', top: '0', width: WIDTH + 'px', padding: '36px 44px', boxSizing: 'border-box',
    background: '#FBF7EC', color: '#1B2620', fontFamily: body, fontSize: '14px', lineHeight: lang === 'en' ? '1.5' : '1.9',
    letterSpacing: '0', direction: dir, textAlign: dir === 'rtl' ? 'right' : 'left',
  } });
  root.setAttribute('lang', lang);
  document.body.append(root);

  const head = el('header', { style: { paddingBottom: '10px' } });
  head.append(el('h1', { style: { fontSize: '28px', margin: '0', color: '#1E3B2C' } }, t('pdf.title')));
  head.append(el('p', { style: { margin: '4px 0' } }, t('pdf.prepared', { date: formatDate(new Date(), lang) })));
  if (items.some((i) => isDemo(i.scheme))) head.append(el('p', { style: { margin: '4px 0', fontWeight: '700', color: '#A4461F' } }, t('pdf.illustrative')));

  if (profile) {
    const parts = [
      `${t('f.age')}: ${profile.age}`,
      `${t('f.state')}: ${profile.state}`,
      `${t('f.domicile')}: ${profile.domicile === 'unsure' ? t('opt.unsure') : profile.domicile}`,
      `${t('f.occupation')}: ${t('occ.' + profile.occupation)}`,
    ];
    head.append(el('p', { style: { margin: '4px 0' } }, `${t('pdf.profile')}${isSample ? ` (${t('res.sample')})` : ''}: ${parts.join(' | ')}`));
  }

  // Document progress summary line
  const allDocKeys = new Set(items.flatMap((i) => i.scheme.documents || []));
  if (allDocKeys.size > 0 && collectedDocs.length > 0) {
    const doneCount = Array.from(allDocKeys).filter((d) => collectedDocs.includes(d)).length;
    head.append(el('p', { style: { margin: '4px 0', fontWeight: '600', color: '#1E3B2C' } },
      `Checklist progress: ${doneCount} of ${allDocKeys.size} documents collected (${Math.round((doneCount / allDocKeys.size) * 100)}%)`));
  }

  const foot = el('footer', { style: { borderTop: '2px solid #1E3B2C', paddingTop: '12px', fontSize: '12px' } },
    t('det.final'), el('br'), t('footer.disclaimer'));

  const blocks = [head, ...items.map((i) => block(ctx, i.scheme, i.result, collectedDocs)), foot];
  blocks.forEach((b) => root.append(b));

  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;
    let y = margin;

    // Draw each block separately so a scheme is never cut in half across two pages.
    for (const b of blocks) {
      const canvas = await html2canvas(b, { scale: 2, backgroundColor: '#FBF7EC', logging: false, scrollX: 0, scrollY: 0 });
      let w = pageW - margin * 2;
      let h = (canvas.height * w) / canvas.width;
      const maxH = pageH - margin * 2;
      if (h > maxH) { w = (w * maxH) / h; h = maxH; } // very long block: shrink to fit one page
      if (y + h > pageH - margin) { pdf.addPage(); y = margin; }
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, y, w, h);
      y += h;
    }
    const name = items.length === 1 ? items[0].scheme.id : 'all-schemes';
    pdf.save(`schemesaathi-${name}-${lang}.pdf`);
  } finally {
    root.remove();
  }
}
