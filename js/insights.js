// הסמנכל: insights.js
// פירוט התובנה בתוך שורת החריגה (DESIGN.md סעיף 4.4, F11).
// ראש הפירוט: שלושה מספרים ופילטר תחום פעילות. גוף: חמשת החלקים, או מצב (מכין, כשל, מיושנת, עדיין לא נוצרה).
import { el, icon, num, numText, mount, segmented, statusChip, formatNumber, formatPct, formatWeekRange } from './ui.js';
import { isFromZero } from './engine.js';

const PARTS = [
  ['what_happened', 'מה קרה', 'info-circle'],
  ['trend', 'מגמה שנצפתה', 'chart-bar'],
  ['why_it_matters', 'למה זה חשוב', 'bulb'],
  ['hypothesis', 'השערה אפשרית', 'sparkles'],
  ['what_to_check', 'המלצה: מה כדאי לבדוק', 'target'],
];

/** שם התובנה: "עלות לליד: +30%" (הנחה: נוסח). */
export function insightTitle(kpi, m) {
  const change = isFromZero(m) ? 'עלייה ממצב של אפס' : formatPct(m.change_pct);
  return el('span', {}, kpi.label + ': ', change ? num(change) : '');
}

function stat(label, valueNode, extra) {
  return el('div', { class: 'stat' },
    el('div', { class: 't-small muted', text: label }),
    el('div', { class: 't-kpi-main' }, valueNode),
    extra || null);
}

function statsFor(row, kpi) {
  if (!row) return [el('p', { class: 'muted' }, statusChip('no_data'), ' אין נתון לתחום הזה בשבוע הזה')];
  const cur = formatNumber(row.value, kpi.unit);
  const prev = row.previous_value == null ? null : formatNumber(row.previous_value, kpi.unit);
  const change = row.previous_value == null ? null : isFromZero(row) ? 'עלייה ממצב של אפס' : formatPct(row.change_pct);
  const thr = kpi.threshold_pct == null ? null : `הסף: ${kpi.threshold_pct}%`;
  const anomaly = row.threshold_status === 'anomaly';
  return [
    stat('ערך נוכחי', num(cur)),
    stat('ערך קודם', prev ? num(prev) : statusChip('no_comparison')),
    stat('שינוי',
      change ? (isFromZero(row) ? el('span', { class: 't-h3', text: change }) : num(change, anomaly ? 'accent-text' : '')) : statusChip('no_comparison'),
      thr ? el('div', { class: 't-small muted', text: thr }) : null),
  ];
}

/**
 * ctx: {
 *   m: שורת סך הכול החריגה, kpi, topic, def,
 *   index: (kpiKey, activityKey, customerType) => שורה | undefined,
 *   insight: אובייקט תובנה או null, state: 'ready' | 'pending' | 'failed' | 'none', stale: boolean,
 *   onCreate(regenerate:boolean), onDecide()
 * }
 */
export function renderInsightDetail(ctx) {
  const { m, kpi, topic, def } = ctx;

  // ראש: שלושה מספרים + פילטר תחום פעילות (מתעדכן במקום, כדי לא לאבד פוקוס)
  const statsBox = el('div', { class: 'stats' });
  const showArea = (areaKey) => mount(statsBox, statsFor(ctx.index(kpi.key, areaKey, 'total'), kpi));
  showArea('total');
  const areaFilter = segmented({
    label: 'תחום פעילות',
    options: [{ value: 'total', label: 'כל התחומים' }, ...def.activity_areas.map((a) => ({ value: a.key, label: a.label }))],
    value: 'total', onChange: showArea,
  });
  const head = el('div', { class: 'stack' },
    el('div', { class: 'row', style: 'flex-wrap:wrap' },
      el('span', { class: 't-small muted' }, `${topic.label} · שבוע `, num(formatWeekRange(m.period_start)))),
    statsBox,
    areaFilter);

  // גוף
  let body;
  if (ctx.state === 'pending') {
    body = el('p', { class: 'progress-msg', role: 'status', text: 'מכין תובנה' });
  } else if (ctx.state === 'failed') {
    body = el('div', { class: 'stack' },
      el('div', { class: 'notice notice--error', role: 'alert' }, el('span', { class: 'notice__icon' }, icon('circle-x')),
        el('div', {}, el('strong', { text: 'התובנה לא נוצרה.' }), ' אפשר לנסות שוב.')),
      el('div', {}, el('button', { type: 'button', class: 'btn btn--secondary', onClick: () => ctx.onCreate(false), text: 'נסה שוב ליצור תובנה' })));
  } else if (ctx.state === 'none' || !ctx.insight) {
    body = el('div', {}, el('button', { type: 'button', class: 'btn btn--secondary', onClick: () => ctx.onCreate(false), text: 'צור תובנה' }));
  } else {
    const c = ctx.insight.content;
    body = el('div', { class: 'stack' },
      ctx.stale ? el('div', { class: 'row', style: 'flex-wrap:wrap' },
        statusChip('stale'),
        el('span', { class: 'secondary', text: 'התובנה נוצרה על ערך שהוחלף.' }),
        el('button', { type: 'button', class: 'btn btn--text', onClick: () => ctx.onCreate(true), text: 'צור מחדש' })) : null,
      PARTS.map(([key, title, iconName]) => el('div', { class: 'insight-part' + (key === 'hypothesis' ? ' insight-part--hypothesis' : '') },
        el('div', { class: 'insight-part__icon' }, icon(iconName)),
        el('div', { class: 'grow' },
          el('h4', { class: 'insight-part__title' }, title, key === 'hypothesis' ? statusChip('hypothesis') : null),
          el('p', { class: 'secondary' }, numText(c[key]))))));
  }

  return el('div', { class: 'insight-detail stack-lg' },
    head,
    body,
    el('div', {}, el('button', { type: 'button', class: 'btn btn--decision', onClick: () => ctx.onDecide() }, icon('target'), 'שמור החלטה על תובנה זו')));
}
