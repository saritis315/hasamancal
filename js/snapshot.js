// הסמנכל: snapshot.js
// הרכבת מסך תמונת מצב (F18): כרטיס חריגות עם פירוט תובנה, שלושה כרטיסי נושא, כרטיס החלטות.
// מקור: DESIGN.md סעיף 4.3 ו-ARCHITECTURE.md סעיפים 9.1 ו-12.
import {
  el, icon, num, mount, accordion, notice, statusChip, changeChip, changeValue, topbar,
  formatNumber, formatWeekRange,
} from './ui.js';
import { requireSession, signOut } from './supabase.js';
import { callApi } from './api.js';
import { rankAnomalies, isTotalRow, isFromZero } from './engine.js';
import { renderInsightDetail, insightTitle } from './insights.js';
import { renderDecisionsCard, openDecisionPanel } from './decisions.js';

const MAX_VISIBLE_ANOMALIES = 5;   // DESIGN 4.3
const MAX_AUTO_INSIGHTS = 6;       // ARCHITECTURE 6.10 (הנחה)
const TOPIC_ICON = { leads: 'users', sales: 'shopping-cart', finance: 'coin' };
const CT_LABEL = { new: 'לקוחות חדשים', existing: 'לקוחות קיימים' };

const app = document.getElementById('app');

const state = {
  def: null, businessName: '', lastWeek: null, metrics: [], insights: [], decisions: [],
  pending: new Set(), failed: new Set(), showAll: false,
};

const keyOf = (kpi, act, ct) => `${kpi}|${act}|${ct}`;
let index = new Map();
const rowOf = (kpi, act = 'total', ct = 'total') => index.get(keyOf(kpi, act, ct));
const withFlags = (m) => (m ? { ...m, from_zero: isFromZero(m) } : m);

function kpiInfo(key) {
  for (const t of state.def.topics) { const k = t.kpis.find((x) => x.key === key); if (k) return { kpi: k, topic: t }; }
  return null;
}
const insightOf = (m) => state.insights.find((i) => i.metric_value_id === m.id) || null;

// ---------- טעינה ----------
async function boot() {
  if (!requireSession()) return;
  mount(app, el('main', { class: 'page container' }, el('p', { class: 'progress-msg', role: 'status', text: 'טוען' })));
  const snap = await callApi('snapshot');
  if (!snap.ok) {
    mount(app, el('main', { class: 'page container' }, notice('error', { title: 'המסך לא נטען.', text: 'אפשר לרענן את הדף ולנסות שוב.' })));
    return;
  }
  if (!snap.config) { location.replace('setup.html'); return; }
  state.def = snap.config.definition;
  state.businessName = snap.config.name;
  state.lastWeek = snap.last_week;
  state.metrics = snap.metrics;
  state.insights = snap.insights;
  state.decisions = snap.decisions;
  index = new Map(state.metrics.map((m) => [keyOf(m.kpi_key, m.activity_key, m.customer_type), m]));
  render();
  generateInsights();
}

// ---------- כרטיס חריגות ----------
let progressEl;
let anomalyRows = new Map(); // metric id -> { redraw }
let decisionsCard;

function setProgress(done, total) {
  mount(progressEl, total ? el('span', { class: 'progress-msg', text: `מכין תובנות, ${done} מתוך ${total}` }) : null);
}

function anomalyRow(m) {
  const { kpi, topic } = kpiInfo(m.kpi_key);
  const detailBox = el('div', {});
  const redraw = () => {
    const ins = insightOf(m);
    const stale = !!ins && ins.facts.current_value !== m.value;
    const st = state.pending.has(m.id) ? 'pending' : ins ? 'ready' : state.failed.has(m.id) ? 'failed' : 'none';
    mount(detailBox, renderInsightDetail({
      m: withFlags(m), kpi, topic, def: state.def, index: (k, a, c) => withFlags(rowOf(k, a, c)),
      insight: ins, state: st, stale,
      onCreate: (regen) => createInsight(m, regen),
      onDecide: () => newDecision({ kpi_key: m.kpi_key, insight_id: ins ? ins.id : null }),
    }));
  };
  redraw();
  anomalyRows.set(m.id, { redraw });
  const acc = accordion({
    trigger: el('span', { class: 'row anomaly-trigger' }, changeChip({ ...withFlags(m), higher_is_better: kpi.higher_is_better }),
      el('span', { class: 'grow' }, el('strong', {}, insightTitle(kpi, withFlags(m))), el('span', { class: 't-small muted', text: ` · ${topic.label}` }))),
    panel: detailBox,
  });
  const li = el('li', { class: 'anomaly-item', id: 'anomaly-' + m.id }, acc.root);
  li.openPanel = () => { acc.set(true); acc.button.focus(); li.scrollIntoView({ block: 'center' }); };
  return li;
}

function buildAnomalyCard() {
  const anomalies = rankAnomalies(state.metrics.filter(isTotalRow));
  progressEl = el('div', { 'aria-live': 'polite' });
  anomalyRows = new Map();
  const list = el('ul', { class: 'anomaly-list' });
  const moreBox = el('div', {});
  const drawList = () => {
    const shown = state.showAll ? anomalies : anomalies.slice(0, MAX_VISIBLE_ANOMALIES);
    mount(list, shown.map(anomalyRow));
    mount(moreBox, anomalies.length > MAX_VISIBLE_ANOMALIES
      ? el('button', {
        type: 'button', class: 'btn btn--text',
        onClick: () => { state.showAll = !state.showAll; drawList(); },
      }, state.showAll ? 'הצג פחות' : `הצג הכל (${anomalies.length})`, icon(state.showAll ? 'chevron-down' : 'arrow-left', { size: 16 }))
      : null);
  };
  drawList();
  const empty = el('div', { class: 'row', style: 'color:var(--success-text)' }, icon('check'), el('strong', { text: 'אין חריגות השבוע' }));
  return el('section', { class: 'card', 'aria-labelledby': 'anomalies-title' },
    el('div', { class: 'card__head' },
      icon('alert-triangle', { size: 24, className: 'card__icon accent-graphic' }),
      el('h2', { class: 't-h2', id: 'anomalies-title', text: 'חריגות' })),
    progressEl,
    anomalies.length ? el('div', {}, list, moreBox) : empty);
}

// ---------- תובנות ----------
async function createInsight(m, regenerate) {
  state.pending.add(m.id); state.failed.delete(m.id);
  anomalyRows.get(m.id)?.redraw();
  const res = await callApi('insight', { metric_value_id: m.id, regenerate });
  state.pending.delete(m.id);
  if (res.ok) {
    state.insights = state.insights.filter((i) => i.metric_value_id !== m.id).concat(res.insight);
  } else {
    state.failed.add(m.id);
  }
  anomalyRows.get(m.id)?.redraw();
  return res.ok;
}

async function generateInsights() {
  // לכל חריגה של השבוע האחרון בלי תובנה, ברצף, עד 6. השאר מקבלות כפתור "צור תובנה".
  const targets = rankAnomalies(state.metrics.filter(isTotalRow)).filter((m) => !insightOf(m)).slice(0, MAX_AUTO_INSIGHTS);
  for (let i = 0; i < targets.length; i++) {
    setProgress(i + 1, targets.length);
    await createInsight(targets[i], false);
  }
  setProgress(0, 0);
}

// ---------- כרטיסי נושא ----------
function segmentLabel(act, ct) {
  if (act !== 'total') return state.def.activity_areas.find((a) => a.key === act)?.label ?? act;
  return CT_LABEL[ct] ?? ct;
}

function valueCell(row, unit) {
  return row ? num(formatNumber(row.value, unit)) : null;
}

function kpiLine(kpi, row, cls = '') {
  const r = withFlags(row);
  return el('div', { class: 'kpi-row ' + cls },
    el('span', { class: 'kpi-row__name', text: kpi.label }),
    el('span', { class: 'kpi-row__value t-kpi-row' }, r ? valueCell(r, kpi.unit) : statusChip('no_data')),
    el('span', { class: 'row', style: 'gap:8px' }, r ? changeChip({ ...r, higher_is_better: kpi.higher_is_better }) : null, r ? changeValue(r) : null));
}

function segmentList(kpi) {
  const segs = state.def.activity_areas.map((a) => [a.key, 'total']);
  if (kpi.by_customer_type) segs.push(['total', 'new'], ['total', 'existing']);
  return el('div', {}, segs.map(([act, ct]) => {
    const r = withFlags(rowOf(kpi.key, act, ct));
    return el('div', { class: 'list-row' },
      el('span', { class: 'grow', text: segmentLabel(act, ct) }),
      r ? el('span', { class: 't-body-lg' }, num(formatNumber(r.value, kpi.unit))) : null,
      r ? changeChip({ ...r, higher_is_better: kpi.higher_is_better }) : statusChip('no_data'),
      r ? changeValue(r) : null);
  }));
}

function topicCard(topic) {
  const rows = topic.kpis.map((k) => rowOf(k.key));
  const hasAnomaly = state.metrics.some((m) => m.threshold_status === 'anomaly' && topic.kpis.some((k) => k.key === m.kpi_key));
  const seg = accordion({
    trigger: el('span', { class: 'link-text', text: 'פילוח לפי תחום פעילות וסוג לקוח' }),
    panel: el('div', { class: 'stack' }, topic.kpis.map((k) => el('div', {},
      el('h4', { class: 't-h3', text: k.label }), segmentList(k)))),
  });
  return el('section', { class: 'card', 'aria-labelledby': 'topic-' + topic.key },
    el('div', { class: 'card__head' },
      icon(TOPIC_ICON[topic.key], { size: 24, className: 'card__icon' }),
      el('h2', { class: 't-h2', id: 'topic-' + topic.key, text: topic.label }),
      hasAnomaly ? statusChip('anomaly') : null),
    el('div', {}, topic.kpis.map((k, i) => kpiLine(k, rows[i]))),
    seg.root);
}

// ---------- החלטות ----------
function newDecision(presets = {}) {
  openDecisionPanel({
    def: state.def, metrics: state.metrics, presets,
    opener: document.activeElement,
    onSaved: async (d) => {
      const snap = await callApi('snapshot');
      if (snap.ok) { state.decisions = snap.decisions; decisionsCard.setDecisions(state.decisions); }
      decisionsCard.showNotice(notice('success', {
        title: 'ההחלטה נשמרה.',
        text: d.kind === 'kpi' ? 'נבדוק את התוצאה בתאריך שבחרת.' : '',
      }));
      decisionsCard.root.scrollIntoView({ block: 'start' });
    },
  });
}

// ---------- הרכבה ----------
function render() {
  const bar = topbar({
    active: 'snapshot', businessName: state.businessName,
    onSignOut: async () => { await signOut(); location.href = 'index.html'; },
  });
  decisionsCard = renderDecisionsCard({
    def: state.def, decisions: state.decisions,
    onNew: () => newDecision({}),
    onGoToInsight: (id) => {
      const ins = state.insights.find((i) => i.id === id);
      document.getElementById('anomaly-' + ins?.metric_value_id)?.openPanel?.();
    },
  });
  const main = el('main', { class: 'page container', id: 'main', tabindex: '-1' },
    el('div', { class: 'page-head' },
      el('h1', { class: 't-h1', text: 'תמונת מצב' }),
      el('span', { class: 'page-head__meta' }, 'השבוע שהסתיים: ', num(formatWeekRange(state.lastWeek)))),
    el('div', { class: 'stack-lg' },
      buildAnomalyCard(),
      el('div', { class: 'topic-grid' }, state.def.topics.map(topicCard)),
      decisionsCard.root));
  mount(app, bar.header, main, bar.bottomNav);
}

boot();
