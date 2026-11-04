// הסמנכל: decisions.js
// כרטיס ההחלטות (רשימה, פילטר, פירוט בשורה) ופאנל "החלטה חדשה" (DESIGN.md סעיפים 4.5, 4.6, 4.7).
import {
  el, icon, num, mount, segmented, field, notice, nextId, statusChip,
  formatNumber, formatPct, formatDate, formatWeekRange, addDays,
} from './ui.js';
import { callApi, todayIso } from './api.js';

const DIR_LABEL = { up: 'עלייה', down: 'ירידה' };

function findKpi(def, key) {
  for (const t of def.topics) { const k = t.kpis.find((x) => x.key === key); if (k) return { kpi: k, topic: t }; }
  return null;
}

// ---------- רשימה ----------
function resultCell(d) {
  if (d.kind === 'manager') return statusChip(d.is_precedent ? 'precedent' : 'one_off');
  if (d.outcome_status === 'done') return statusChip(d.outcome.direction_met ? 'achieved' : 'not_achieved');
  if (d.outcome_status === 'unavailable') return statusChip('no_new_data');
  return el('span', { class: 'muted', text: '—' });
}
function statusCell(d) {
  if (d.kind === 'manager') return statusChip('saved');
  return statusChip(d.outcome_status === 'pending' ? 'pending' : 'completed');
}
function dirCell(d) {
  if (d.kind !== 'kpi') return el('span', { class: 'muted', text: '—' });
  return el('span', { class: 'row', style: 'gap:4px' }, icon(d.desired_direction === 'up' ? 'arrow-up' : 'arrow-down', { size: 16 }), DIR_LABEL[d.desired_direction]);
}

function detailRows(pairs) {
  return el('dl', { class: 'detail-grid' }, pairs.filter(Boolean).map(([k, v]) => [el('dt', { class: 't-small muted', text: k }), el('dd', {}, v)]));
}

function renderDetail(d, def, ctx) {
  if (d.kind === 'manager') {
    return detailRows([
      ['קטגוריה', d.category], ['תיאור ההחלטה', d.description], ['ההחלטה', d.decision_text],
      ['סיבה', d.reason], ['תאריך', num(formatDate(d.case_date))], ['סוג', statusChip(d.is_precedent ? 'precedent' : 'one_off')],
    ]);
  }
  const found = findKpi(def, d.kpi_key);
  const kpi = found ? found.kpi : { label: d.kpi_key, unit: 'number' };
  const pairs = [
    ['מדד', kpi.label], ['תיאור ההחלטה', d.decision_text], ['כיוון רצוי', dirCell(d)],
    ['תאריך בדיקה', num(formatDate(d.check_date))],
    d.insight_id ? ['תובנה', el('button', { type: 'button', class: 'btn btn--text', onClick: () => ctx.onGoToInsight(d.insight_id), text: 'מעבר לתובנה' })] : null,
  ];
  let outcome;
  if (d.outcome_status === 'done') {
    const o = d.outcome;
    outcome = el('div', { class: 'sunken stack' },
      el('h4', { class: 't-h3' }, 'תוצאה'),
      detailRows([
        [el('span', {}, 'ערך בסיס (שבוע ', num(formatWeekRange(d.baseline_period_start)), ')'), num(formatNumber(o.baseline_value, kpi.unit))],
        ['ערך נוכחי', num(formatNumber(o.current_value, kpi.unit))],
        ['שינוי', o.change_pct == null ? '—' : num(formatPct(o.change_pct))],
      ]),
      el('div', {}, statusChip(o.direction_met ? 'achieved' : 'not_achieved')));
  } else if (d.outcome_status === 'unavailable') {
    outcome = el('div', { class: 'sunken stack' }, el('div', {}, statusChip('no_new_data')),
      el('p', { class: 'secondary', text: 'לא הועלה שבוע חדש מאז ההחלטה, ולכן אין תוצאה.' }));
  } else {
    outcome = el('p', { class: 'secondary' }, 'תאריך הבדיקה: ', num(formatDate(d.check_date)));
  }
  return el('div', { class: 'stack' }, detailRows(pairs), outcome);
}

/**
 * כרטיס החלטות. מחזיר { root, setDecisions(list), showNotice(node|null) }.
 * ctx: { def, decisions, onNew(), onGoToInsight(id) }
 */
export function renderDecisionsCard(ctx) {
  let decisions = ctx.decisions;
  let filter = 'all';
  const expanded = new Set();
  const noticeBox = el('div', { 'aria-live': 'polite' });
  const listBox = el('div', {});

  const topicOf = (d) => (d.kind === 'manager' ? d.category : (findKpi(ctx.def, d.kpi_key)?.topic.label ?? ''));

  function draw(focusId) {
    const rows = decisions.filter((d) => filter === 'all' || d.kind === (filter === 'kpi' ? 'kpi' : 'manager'));
    if (!decisions.length) {
      mount(listBox, el('div', { class: 'empty stack' },
        el('p', { class: 'secondary', text: 'עדיין לא נשמרו החלטות' }),
        el('div', {}, el('button', { type: 'button', class: 'btn btn--secondary', onClick: ctx.onNew, text: 'החלטה חדשה' }))));
      return;
    }
    if (!rows.length) { mount(listBox, el('p', { class: 'secondary', text: 'אין החלטות מהסוג הזה' })); return; }
    const body = rows.flatMap((d) => {
      const open = expanded.has(d.id);
      const rowEl = el('tr', {},
        el('td', {}, el('button', {
          type: 'button', class: 'btn btn--text', 'data-id': d.id, 'aria-expanded': String(open),
          onClick: () => { if (open) expanded.delete(d.id); else expanded.add(d.id); draw(d.id); },
        }, icon(open ? 'chevron-down' : 'chevron-left', { size: 16 }), num(formatDate(d.created_at.slice(0, 10))))),
        el('td', { text: d.kind === 'kpi' ? 'החלטת מדד' : 'החלטת מנהל' }),
        el('td', { text: topicOf(d) }),
        el('td', {}, dirCell(d)),
        el('td', {}, resultCell(d)),
        el('td', {}, statusCell(d)));
      const out = [rowEl];
      if (open) out.push(el('tr', { class: 'table__detail' }, el('td', { colspan: 6 }, renderDetail(d, ctx.def, ctx))));
      return out;
    });
    mount(listBox, el('div', { class: 'table-wrap' },
      el('table', { class: 'table table--cards' },
        el('thead', {}, el('tr', {}, ['תאריך', 'סוג', 'נושא', 'כיוון רצוי', 'תוצאה / סימון', 'סטטוס'].map((h) => el('th', { scope: 'col', text: h })))),
        el('tbody', {}, body))));
    if (focusId) listBox.querySelector(`[data-id="${focusId}"]`)?.focus();
  }

  const filterBar = segmented({
    label: 'סינון החלטות', value: 'all',
    options: [{ value: 'all', label: 'כל ההחלטות' }, { value: 'kpi', label: 'החלטות מדד' }, { value: 'manager', label: 'החלטות מנהל' }],
    onChange: (v) => { filter = v; draw(); },
  });

  const root = el('section', { class: 'card', 'aria-labelledby': 'decisions-title' },
    el('div', { class: 'card__head' },
      icon('target', { size: 24, className: 'card__icon' }),
      el('h2', { class: 't-h2', id: 'decisions-title', text: 'החלטות' }),
      el('button', { type: 'button', class: 'btn btn--primary', id: 'new-decision', onClick: () => ctx.onNew(), text: 'החלטה חדשה' })),
    noticeBox,
    el('div', { class: 'stack' }, filterBar, listBox));
  draw();

  return {
    root,
    setDecisions(list) { decisions = list; draw(); },
    showNotice(node) { mount(noticeBox, node ? el('div', { style: 'margin-bottom:16px' }, node) : null); },
  };
}

// ---------- פאנל "החלטה חדשה" ----------
/**
 * ctx: {
 *   def, metrics: שורות השבוע האחרון, presets: { kpi_key?, insight_id? }, opener: אלמנט לפוקוס בחזרה,
 *   onSaved(decision)
 * }
 */
export function openDecisionPanel(ctx) {
  const { def } = ctx;
  const totalRow = (kpiKey) => ctx.metrics.find((m) => m.kpi_key === kpiKey && m.activity_key === 'total' && m.customer_type === 'total');
  let mode = 'kpi';

  const panelId = nextId('panel');
  const titleId = panelId + '-title';
  const overlay = el('div', { class: 'overlay' });
  const errorBox = el('div', { 'aria-live': 'assertive' });

  // --- טופס החלטת מדד ---
  const kpiSelect = el('select', { class: 'select', id: panelId + '-kpi' },
    el('option', { value: '', text: 'בחרו מדד' }),
    def.topics.map((t) => el('optgroup', { label: t.label }, t.kpis.map((k) => el('option', { value: k.key, text: k.label })))));
  kpiSelect.value = ctx.presets.kpi_key || '';
  const baselineBox = el('div', { class: 'sunken', 'aria-live': 'polite' });
  const kText = el('textarea', { class: 'textarea', id: panelId + '-ktext', maxlength: '1000' });
  const kDir = el('select', { class: 'select', id: panelId + '-kdir' },
    el('option', { value: '', text: 'בחרו כיוון' }), el('option', { value: 'up', text: 'עלייה' }), el('option', { value: 'down', text: 'ירידה' }));
  const tomorrow = addDays(todayIso(), 1);
  const kDate = el('input', { class: 'input', type: 'date', id: panelId + '-kdate', min: tomorrow });
  const f = {
    kpi: field({ id: panelId + '-kpi', label: 'מדד', control: kpiSelect }),
    text: field({ id: panelId + '-ktext', label: 'תיאור ההחלטה', control: kText }),
    dir: field({ id: panelId + '-kdir', label: 'כיוון רצוי', control: kDir }),
    date: field({ id: panelId + '-kdate', label: 'תאריך בדיקה', control: kDate }),
  };
  const updateBaseline = () => {
    const row = kpiSelect.value ? totalRow(kpiSelect.value) : null;
    if (!kpiSelect.value) { mount(baselineBox, el('span', { class: 'muted', text: 'ערך נוכחי של המדד: יוצג אחרי בחירת מדד' })); return; }
    if (!row) { mount(baselineBox, el('span', { class: 'accent-text', text: 'אין ערך נוכחי למדד הזה, ולכן ההחלטה לא תישמר.' })); return; }
    const unit = def.topics.flatMap((t) => t.kpis).find((k) => k.key === kpiSelect.value).unit;
    mount(baselineBox, 'ערך נוכחי של המדד (יישמר כערך בסיס): ', num(formatNumber(row.value, unit)), ' · שבוע ', num(formatWeekRange(row.period_start)));
  };
  kpiSelect.addEventListener('change', updateBaseline);
  updateBaseline();
  const kpiForm = el('div', { class: 'stack' }, f.kpi.root, baselineBox, f.text.root, f.dir.root, f.date.root);

  // --- טופס החלטת מנהל ---
  const mCat = el('input', { class: 'input', type: 'text', id: panelId + '-mcat', maxlength: '60' });
  const mDesc = el('textarea', { class: 'textarea', id: panelId + '-mdesc', maxlength: '1000' });
  const mText = el('textarea', { class: 'textarea', id: panelId + '-mtext', maxlength: '1000' });
  const mReason = el('textarea', { class: 'textarea', id: panelId + '-mreason', maxlength: '1000' });
  const mDate = el('input', { class: 'input', type: 'date', id: panelId + '-mdate', value: todayIso() });
  const radioName = panelId + '-type';
  const rOne = el('input', { type: 'radio', name: radioName, value: 'one_off' });
  const rPrec = el('input', { type: 'radio', name: radioName, value: 'precedent' });
  const typeErr = el('div', { class: 'field__error', hidden: true });
  const m = {
    cat: field({ id: panelId + '-mcat', label: 'קטגוריה', control: mCat }),
    desc: field({ id: panelId + '-mdesc', label: 'תיאור ההחלטה', control: mDesc }),
    text: field({ id: panelId + '-mtext', label: 'ההחלטה', control: mText }),
    reason: field({ id: panelId + '-mreason', label: 'סיבה', control: mReason }),
    date: field({ id: panelId + '-mdate', label: 'תאריך', control: mDate }),
  };
  const managerForm = el('div', { class: 'stack', hidden: true },
    notice('info', { title: 'שימו לב.', text: 'אין להזין שם או פרטים מזהים של לקוח או שותף.' }),
    m.cat.root, m.desc.root, m.text.root, m.reason.root, m.date.root,
    el('fieldset', { class: 'fieldset' },
      el('legend', { class: 'field__label', text: 'סוג' }),
      el('div', { class: 'row' },
        el('label', { class: 'check' }, rOne, 'חד-פעמי'),
        el('label', { class: 'check' }, rPrec, 'תקדים')),
      typeErr));

  const modeTabs = segmented({
    label: 'סוג ההחלטה', value: 'kpi',
    options: [{ value: 'kpi', label: 'החלטת מדד' }, { value: 'manager', label: 'החלטת מנהל' }],
    onChange: (v) => { mode = v; kpiForm.hidden = v !== 'kpi'; managerForm.hidden = v !== 'manager'; mount(errorBox); },
  });

  // --- שמירה ---
  const saveBtn = el('button', { type: 'button', class: 'btn btn--primary', text: 'שמור החלטה' });
  const cancelBtn = el('button', { type: 'button', class: 'btn btn--secondary', text: 'ביטול' });

  function validate() {
    let ok = true;
    const need = (fld, val, msg) => { fld.setError(val ? '' : msg); if (!val) ok = false; return !!val; };
    if (mode === 'kpi') {
      need(f.kpi, kpiSelect.value, 'יש לבחור מדד');
      need(f.text, kText.value.trim(), 'יש להזין תיאור להחלטה');
      need(f.dir, kDir.value, 'יש לבחור כיוון רצוי');
      if (need(f.date, kDate.value, 'יש לבחור תאריך בדיקה')) {
        if (kDate.value <= todayIso()) { f.date.setError('תאריך הבדיקה חייב להיות עתידי'); ok = false; }
      }
    } else {
      need(m.cat, mCat.value.trim(), 'יש להזין קטגוריה');
      need(m.desc, mDesc.value.trim(), 'יש להזין תיאור להחלטה');
      need(m.text, mText.value.trim(), 'יש להזין את ההחלטה');
      need(m.reason, mReason.value.trim(), 'יש להזין סיבה');
      need(m.date, mDate.value, 'יש לבחור תאריך');
      const typeOk = rOne.checked || rPrec.checked;
      typeErr.replaceChildren(...(typeOk ? [] : [icon('alert-triangle', { size: 16 }), 'יש לבחור סוג']));
      typeErr.hidden = typeOk;
      if (!typeOk) ok = false;
    }
    return ok;
  }

  async function save() {
    mount(errorBox);
    if (!validate()) { panel.querySelector('[aria-invalid="true"]')?.focus(); return; }
    saveBtn.disabled = true;
    const payload = mode === 'kpi'
      ? { kind: 'kpi', kpi_key: kpiSelect.value, activity_key: 'total', customer_type: 'total', decision_text: kText.value.trim(),
          desired_direction: kDir.value, check_date: kDate.value, insight_id: ctx.presets.insight_id || null }
      : { kind: 'manager', category: mCat.value.trim(), description: mDesc.value.trim(), decision_text: mText.value.trim(),
          reason: mReason.value.trim(), case_date: mDate.value, is_precedent: rPrec.checked };
    const res = await callApi('decision_save', payload);
    saveBtn.disabled = false;
    if (res.ok) { close(); ctx.onSaved(res.decision); return; }
    const msg = res.detail === 'no_value'
      ? { title: 'ההחלטה לא נשמרה.', text: 'אין ערך למדד הזה, ולכן אי אפשר לקבוע ערך בסיס.' }
      : res.detail === 'check_date'
        ? { title: 'ההחלטה לא נשמרה.', text: 'תאריך הבדיקה חייב להיות עתידי.' }
        : { title: 'ההחלטה לא נשמרה.', text: 'אפשר לנסות שוב.' };
    mount(errorBox, notice('error', msg));
  }
  saveBtn.addEventListener('click', save);

  // --- הרכבת הפאנל ---
  const panel = el('div', { class: 'panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    el('div', { class: 'panel__head' },
      el('h2', { class: 't-h2 grow', id: titleId, text: 'החלטה חדשה' }),
      el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'סגירה', onClick: () => close() }, icon('x'))),
    el('div', { class: 'panel__body stack' }, modeTabs, errorBox, kpiForm, managerForm),
    el('div', { class: 'panel__foot' }, saveBtn, cancelBtn));

  function close() {
    document.removeEventListener('keydown', onKey);
    overlay.remove(); panel.remove();
    ctx.opener?.focus();
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return; // לכידת פוקוס בתוך הפאנל
    const items = [...panel.querySelectorAll('button, [href], input, select, textarea')].filter((n) => !n.disabled && n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  cancelBtn.addEventListener('click', () => close());
  overlay.addEventListener('click', () => close());
  document.addEventListener('keydown', onKey);
  document.body.append(overlay, panel);
  (ctx.presets.kpi_key ? kText : kpiSelect).focus();
  return { close };
}
