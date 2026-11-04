// הסמנכל: setup.js
// הקמה והעלאה (F1, F2, F3, F4, F5): תיאור העסק, שאלות הבהרה, עריכת ההצעה, תבנית, העלאת קובץ ועסקי דמה.
// מקור: DESIGN.md סעיף 4.2 ו-ARCHITECTURE.md סעיפים 6.4, 7, 8, 9.1.
import {
  el, icon, num, numText, mount, field, accordion, notice, nextId, topbar, statusChip,
  formatNumber,
} from './ui.js';
import { requireSession, signOut } from './supabase.js';
import { callApi, mockSeedDecisions, todayIso } from './api.js';
import { buildTemplate, validKeys, parseAndValidate, tableFromText, validateTable, LIMITS } from './filecontract.js';
import { computeMetrics } from './engine.js';

const CHUNK = 1000; // הנחה: קבוצות של עד 1,000 שורות לבקשה
const TOPICS = [['leads', 'מתעניינים'], ['sales', 'מכירות'], ['finance', 'כספים']];
const UNIT_LABEL = { count: 'כמות', ILS: 'שקלים', percent: 'אחוזים', number: 'מספר' }; // הנחה: נוסח
const MAX_DESC = 1000, MAX_ANSWER = 300, MAX_LABEL = 40, MAX_DEF = 200, MAX_AREAS = 6;

// ---------- עסקי דמה ----------
/** רשימת עסקי הדמה (הנחה: demo/index.json, לא מופיע ב-ARCHITECTURE.md). */
export async function listDemoBusinesses() {
  const res = await fetch('demo/index.json');
  if (!res.ok) throw new Error('רשימת עסקי הדמה לא נטענה');
  return res.json();
}

/** טוען עסק דמה באותו מסלול כמו העלאה אמיתית: הגדרה, אימות, חישוב ושמירה. מחליף הגדרה קיימת. */
export async function loadDemoBusiness(key, { seedDecisions = true } = {}) {
  const index = await listDemoBusinesses();
  const biz = index.find((b) => b.key === key);
  if (!biz) throw new Error('עסק דמה לא קיים: ' + key);
  const [defRes, csvRes] = await Promise.all([fetch(`demo/${key}/definition.json`), fetch(`demo/${key}/data.csv`)]);
  if (!defRes.ok || !csvRes.ok) throw new Error('קובצי עסק הדמה לא נטענו');
  const definition = await defRes.json();
  const checked = validateTable(tableFromText(await csvRes.text()), definition);
  if (!checked.ok) throw new Error(`עסק הדמה לא תקין, שורה ${checked.line}: ${checked.message}`);
  const saved = await callApi('config_save', { name: biz.name, description: biz.description, definition, source: 'demo', replace: true });
  if (!saved.ok) throw new Error('שמירת ההגדרה נכשלה');
  await saveMetrics(computeMetrics(definition, checked.rows));
  if (seedDecisions) mockSeedDecisions();
  return biz;
}

async function saveMetrics(metrics) {
  for (let i = 0; i < metrics.length; i += CHUNK) {
    const res = await callApi('metrics_save', { rows: metrics.slice(i, i + CHUNK) });
    if (!res.ok) throw new Error('שמירת הנתונים נכשלה');
  }
}

// ---------- הגדרה מההצעה ----------
/** מוסיף מפתחות (leads_1, a1 וכו') להצעה שאושרה. המפתחות נוצרים בקוד, לא ב-AI. */
export function buildDefinition(proposal) {
  return {
    version: 1,
    topics: TOPICS.map(([key, label]) => ({
      key, label,
      kpis: proposal.topics.find((t) => t.key === key).kpis.map((k, i) => ({
        key: `${key}_${i + 1}`, label: k.label.trim(), unit: k.unit, higher_is_better: k.higher_is_better,
        additive: k.additive, by_customer_type: k.by_customer_type, definition: k.definition.trim(), threshold_pct: k.threshold_pct,
      })),
    })),
    activity_areas: proposal.activity_areas.map((a, i) => ({ key: 'a' + (i + 1), label: a.label.trim() })),
  };
}

/** אימות ההצעה אחרי עריכה (ARCHITECTURE 6.4). מחזיר מפה { נתיב: הודעה }. */
export function validateProposal(p) {
  const errs = {};
  p.topics.forEach((t, ti) => t.kpis.forEach((k, ki) => {
    const id = `${ti}.${ki}`;
    if (!k.label.trim()) errs[id + '.label'] = 'יש להזין שם';
    else if (k.label.trim().length > MAX_LABEL) errs[id + '.label'] = `השם ארוך מ-${MAX_LABEL} תווים`;
    if (!k.definition.trim()) errs[id + '.definition'] = 'יש להזין הגדרה';
    else if (k.definition.trim().length > MAX_DEF) errs[id + '.definition'] = `ההגדרה ארוכה מ-${MAX_DEF} תווים`;
    if (k.threshold_pct != null && !(k.threshold_pct > 0 && k.threshold_pct <= 100)) errs[id + '.threshold'] = 'הסף חייב להיות מספר גדול מ-0 ועד 100';
  }));
  const labels = p.activity_areas.map((a) => a.label.trim());
  if (labels.length < 1) errs.areas = 'יש להגדיר תחום פעילות אחד לפחות';
  else if (labels.length > MAX_AREAS) errs.areas = `אפשר עד ${MAX_AREAS} תחומי פעילות`;
  else if (labels.some((l) => !l || l.length > MAX_LABEL)) errs.areas = `שם תחום חייב להיות לא ריק ועד ${MAX_LABEL} תווים`;
  else if (new Set(labels).size !== labels.length) errs.areas = 'אין להזין שני תחומים בשם זהה';
  return errs;
}

function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = el('a', { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- המסך ----------
export async function startSetupPage() {
  if (!requireSession()) return;
  const app = document.getElementById('app');
  const params = new URLSearchParams(location.search);

  const st = {
    mode: 'wizard', step: 1, name: '', description: '', questions: null, answers: [], proposal: null,
    definition: null, existing: null, busy: '', error: null, uploadError: null,
  };

  mount(app, el('main', { class: 'page container' }, el('p', { class: 'progress-msg', role: 'status', text: 'טוען' })));
  const cfg = await callApi('config_get');
  if (!cfg.ok) {
    mount(app, el('main', { class: 'page container' }, notice('error', { title: 'המסך לא נטען.', text: 'אפשר לרענן את הדף ולנסות שוב.' })));
    return;
  }
  if (cfg.config) {
    st.existing = cfg.counts;
    st.definition = cfg.config.definition;
    st.businessName = cfg.config.name;
    if (!params.has('restart')) { st.mode = 'upload'; st.step = 3; }
  }

  const stage = el('div', { class: 'stack-lg' });
  const stepperBox = el('div', {});
  const bar = topbar({ active: 'setup', businessName: st.businessName || '', onSignOut: async () => { await signOut(); location.href = 'index.html'; } });
  const main = el('main', { class: 'page container', id: 'main', tabindex: '-1' },
    el('div', { class: 'page-head' }, el('h1', { class: 't-h1', id: 'page-title' })),
    stepperBox, stage);
  mount(app, bar.header, main, bar.bottomNav);

  const setBusy = (msg) => { st.busy = msg; render(); };
  const goStep = (n) => { st.step = n; st.error = null; render(); window.scrollTo({ top: 0 }); main.focus({ preventScroll: true }); };

  // ----- מחוון שלבים -----
  function renderStepper() {
    if (st.mode === 'upload') { mount(stepperBox); return; }
    const names = ['תיאור העסק', 'אישור ההצעה', 'העלאת נתונים'];
    const items = names.flatMap((n, i) => {
      const no = i + 1, done = no < st.step, cur = no === st.step;
      const node = el('li', { class: 'step' + (done ? ' is-done' : ''), 'aria-current': cur ? 'step' : null },
        el('span', { class: 'step__dot' }, done ? icon('check', { size: 16 }) : String(no)),
        el('span', { text: n }),
        done ? el('span', { class: 'visually-hidden', text: ' (הושלם)' }) : null);
      return i < names.length - 1 ? [node, el('li', { class: 'step__sep', 'aria-hidden': 'true' })] : [node];
    });
    mount(stepperBox, el('ol', { class: 'stepper', 'aria-label': 'שלבי ההקמה' }, items));
  }

  // ----- שלב 1: תיאור העסק -----
  function renderStep1() {
    const nameIn = el('input', { class: 'input', type: 'text', id: 'f-name', maxlength: '80', value: st.name });
    const descIn = el('textarea', { class: 'textarea', id: 'f-desc', maxlength: String(MAX_DESC) }, st.description);
    const fName = field({ id: 'f-name', label: 'שם העסק', control: nameIn });
    const fDesc = field({ id: 'f-desc', label: 'תיאור העסק', control: descIn, hint: 'אין להזין שם או פרטים מזהים של אדם.' });
    const qFields = (st.questions || []).map((q, i) => {
      const ta = el('textarea', { class: 'textarea', id: 'f-q' + i, maxlength: String(MAX_ANSWER) }, st.answers[i] || '');
      ta.addEventListener('input', () => { st.answers[i] = ta.value; });
      return { q, f: field({ id: 'f-q' + i, label: q, control: ta }) };
    });
    nameIn.addEventListener('input', () => { st.name = nameIn.value; });
    descIn.addEventListener('input', () => { st.description = descIn.value; });

    const submit = async () => {
      fName.setError(st.name.trim() ? '' : 'יש להזין שם לעסק');
      fDesc.setError(st.description.trim() ? '' : 'יש להזין תיאור');
      if (!st.name.trim() || !st.description.trim()) { (!st.name.trim() ? nameIn : descIn).focus(); return; }
      setBusy('מכין הצעה');
      const payload = { action: 'setup', description: st.description.trim() };
      const answers = st.questions ? st.answers.slice(0, st.questions.length).map((a) => (a || '').trim().slice(0, MAX_ANSWER)) : [];
      const res = await callApi('setup', { description: payload.description, answers });
      st.busy = '';
      if (!res.ok) { st.error = 'לא הצלחנו להכין הצעה.'; render(); return; }
      if (res.type === 'questions') { st.questions = res.questions; st.answers = res.questions.map(() => ''); st.error = null; render(); return; }
      st.proposal = res.proposal;
      goStep(2);
    };

    return el('div', { class: 'card stack', style: 'max-width:720px' },
      el('h2', { class: 't-h2', text: 'ספרו לנו על העסק' }),
      fName.root, fDesc.root,
      st.questions ? el('div', { class: 'stack' },
        el('div', { class: 'bubble bubble--assistant' }, icon('sparkles'), el('span', { text: 'כדי להכין הצעה מתאימה, חסר לנו קצת מידע.' })),
        qFields.map((x) => x.f.root)) : null,
      st.error ? notice('error', { title: st.error, text: 'אפשר לנסות שוב.' }) : null,
      st.busy ? el('p', { class: 'progress-msg', role: 'status', text: st.busy }) : null,
      el('div', {}, el('button', { type: 'button', class: 'btn btn--primary btn--lg', disabled: !!st.busy, onClick: submit }, st.questions ? 'שליחה' : 'המשך', icon('arrow-left'))));
  }

  // ----- שלב 2: אישור ההצעה -----
  function renderStep2() {
    const p = st.proposal;
    const errBoxes = new Map();
    const rowErr = (id) => { const e = el('div', { class: 'field__error', hidden: true }); errBoxes.set(id, e); return e; };

    const kpiRow = (t, ti, k, ki) => {
      const base = `${ti}.${ki}`;
      const mk = (cls, props, ariaPart) => el('input', { class: 'input', 'aria-label': `${t[1]}, מדד ${ki + 1}: ${ariaPart}`, ...props });
      const name = mk('', { type: 'text', value: k.label, maxlength: String(MAX_LABEL + 20) }, 'שם');
      const def = mk('', { type: 'text', value: k.definition, maxlength: String(MAX_DEF + 50) }, 'הגדרה');
      const unit = el('select', { class: 'select', 'aria-label': `${t[1]}, מדד ${ki + 1}: יחידה` },
        Object.entries(UNIT_LABEL).map(([v, l]) => el('option', { value: v, selected: v === k.unit }, l)));
      const dir = el('select', { class: 'select', 'aria-label': `${t[1]}, מדד ${ki + 1}: כיוון טוב` },
        el('option', { value: 'up', selected: k.higher_is_better }, 'עלייה טובה'), el('option', { value: 'down', selected: !k.higher_is_better }, 'ירידה טובה'));
      const thr = el('input', { class: 'input', type: 'number', min: '0', max: '100', step: 'any', placeholder: 'בלי סף', 'aria-label': `${t[1]}, מדד ${ki + 1}: סף חריגה באחוזים`, value: k.threshold_pct ?? '' });
      name.addEventListener('input', () => { k.label = name.value; });
      def.addEventListener('input', () => { k.definition = def.value; });
      unit.addEventListener('change', () => { k.unit = unit.value; });
      dir.addEventListener('change', () => { k.higher_is_better = dir.value === 'up'; });
      thr.addEventListener('input', () => { k.threshold_pct = thr.value === '' ? null : Number(thr.value); });
      return el('div', { class: 'editor-kpi' }, name, def, unit, dir, thr, el('div', { class: 'editor-kpi__err' }, rowErr(base + '.label'), rowErr(base + '.definition'), rowErr(base + '.threshold')));
    };

    const topicCards = p.topics.map((t, ti) => {
      const label = TOPICS.find(([k]) => k === t.key)[1];
      return el('section', { class: 'card' }, accordion({
        open: ti === 0,
        trigger: el('span', { class: 'row' }, el('h3', { class: 't-h2', text: label })),
        panel: el('div', {},
          el('div', { class: 'editor-head t-small muted', 'aria-hidden': 'true' }, ['שם', 'הגדרה', 'יחידה', 'כיוון טוב', 'סף חריגה (%)'].map((h) => el('span', { text: h }))),
          t.kpis.map((k, ki) => kpiRow([t.key, label], ti, k, ki))),
      }).root);
    });

    // תחומי פעילות
    const areasBox = el('div', { class: 'row', style: 'flex-wrap:wrap' });
    const areaErr = el('div', { class: 'field__error', hidden: true });
    const addIn = el('input', { class: 'input', type: 'text', id: 'f-addarea', maxlength: String(MAX_LABEL + 20), style: 'max-width:240px' });
    const drawAreas = () => {
      mount(areasBox, p.activity_areas.map((a, i) => el('span', { class: 'tag' }, a.label,
        el('button', { type: 'button', 'aria-label': `הסרת התחום ${a.label}`, onClick: () => { p.activity_areas.splice(i, 1); drawAreas(); } }, icon('x', { size: 16 })))));
    };
    drawAreas();
    const addArea = () => {
      const v = addIn.value.trim();
      if (!v) return;
      if (p.activity_areas.length >= MAX_AREAS) { areaErr.replaceChildren(icon('alert-triangle', { size: 16 }), `אפשר עד ${MAX_AREAS} תחומי פעילות`); areaErr.hidden = false; return; }
      p.activity_areas.push({ label: v }); addIn.value = ''; areaErr.hidden = true; drawAreas(); addIn.focus();
    };
    addIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addArea(); } });
    const areasCard = el('section', { class: 'card stack' },
      el('h3', { class: 't-h2', text: 'תחומי פעילות' }),
      el('label', { class: 'field__label', for: 'f-addarea', text: 'הוספת תחום' }),
      areasBox,
      el('div', { class: 'row' }, addIn, el('button', { type: 'button', class: 'btn btn--secondary', onClick: addArea }, icon('plus', { size: 16 }), 'הוספת תחום')),
      areaErr);

    const approve = async () => {
      const errs = validateProposal(p);
      for (const [id, box] of errBoxes) { const m = errs[id]; box.replaceChildren(...(m ? [icon('alert-triangle', { size: 16 }), m] : [])); box.hidden = !m; }
      areaErr.replaceChildren(...(errs.areas ? [icon('alert-triangle', { size: 16 }), errs.areas] : [])); areaErr.hidden = !errs.areas;
      if (Object.keys(errs).length) { document.querySelector('.field__error:not([hidden])')?.scrollIntoView({ block: 'center' }); return; }
      setBusy('שומר את ההגדרה');
      const definition = buildDefinition(p);
      const res = await callApi('config_save', { name: st.name.trim(), description: st.description.trim(), definition, source: 'setup', replace: !!st.existing });
      st.busy = '';
      if (!res.ok) { st.error = 'השמירה נכשלה.'; render(); return; }
      st.definition = definition; st.existing = null; st.businessName = st.name.trim();
      goStep(3);
    };

    const bubbles = el('div', { class: 'chat' },
      el('div', { class: 'bubble bubble--user' }, el('strong', { text: st.name }), el('br'), st.description),
      st.questions ? st.questions.map((q, i) => [
        el('div', { class: 'bubble bubble--assistant' }, icon('sparkles'), el('span', { text: q })),
        st.answers[i] ? el('div', { class: 'bubble bubble--user', text: st.answers[i] }) : null]) : null,
      el('div', { class: 'bubble bubble--assistant' }, icon('sparkles'), el('span', { text: 'הכנו הצעה לאישור. אפשר לתקן כל שדה.' })));

    return el('div', { class: 'setup-split' },
      el('aside', { class: 'card stack', 'aria-label': 'השיחה' }, el('h2', { class: 't-h3', text: 'השיחה' }), bubbles,
        el('div', {}, el('button', { type: 'button', class: 'btn btn--secondary', onClick: () => goStep(1) }, icon('arrow-right'), 'חזרה לשיחה'))),
      el('div', { class: 'stack-lg' },
        st.existing ? notice('warning', {
          title: 'הקמה מחדש תמחק את ההגדרה ואת כל הנתונים הקיימים.',
          text: `יימחקו: ההגדרה, ${formatNumber(st.existing.metric_values, 'count')} ערכי מדדים, ${formatNumber(st.existing.insights, 'count')} תובנות ו-${formatNumber(st.existing.decisions, 'count')} החלטות.`,
        }) : null,
        topicCards, areasCard,
        st.error ? notice('error', { title: st.error, text: 'אפשר לנסות שוב.' }) : null,
        st.busy ? el('p', { class: 'progress-msg', role: 'status', text: st.busy }) : null,
        el('div', {}, el('button', { type: 'button', class: 'btn btn--lg ' + (st.existing ? 'btn--danger' : 'btn--primary'), disabled: !!st.busy, onClick: approve },
          st.existing ? 'מחיקה ואישור' : 'אישור והמשך', icon('arrow-left')))));
  }

  // ----- שלב 3: העלאת נתונים -----
  function renderStep3() {
    const keys = validKeys(st.definition);
    const fileIn = el('input', { type: 'file', id: 'f-file', class: 'visually-hidden', accept: '.csv,.xlsx' });
    const zone = el('div', { class: 'dropzone', id: 'dropzone' },
      icon('upload', { size: 32 }),
      el('p', {}, 'גוררים לכאן קובץ CSV או Excel'),
      el('p', { class: 't-small muted', text: 'עד 2MB' }),
      el('label', { class: 'btn btn--secondary', for: 'f-file' }, 'בחירת קובץ'));
    const handleFile = async (file) => {
      if (!file) return;
      st.uploadError = null; setBusy('קורא את הקובץ');
      const res = await parseAndValidate(file, st.definition);
      if (!res.ok) { st.busy = ''; st.uploadError = res; render(); return; }
      st.busy = 'שומר את הנתונים';
      render();
      try {
        await saveMetrics(computeMetrics(st.definition, res.rows));
      } catch { st.busy = ''; st.uploadError = { line: null, message: 'שמירת הנתונים נכשלה.' }; render(); return; }
      location.href = 'snapshot.html';
    };
    fileIn.addEventListener('change', () => handleFile(fileIn.files[0]));
    ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('is-over'); }));
    zone.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

    const tpl = () => { const t = buildTemplate(st.definition, todayIso()); download(t.filename, t.csv); };

    const keysList = el('div', { class: 'stack' },
      el('p', { class: 'secondary', text: 'שורות בסך הכול מספיקות. אפשר להוסיף שורות של חתכים, עם המפתחות האלה:' }),
      el('div', {}, el('h4', { class: 't-h3', text: 'מדדים (kpi_key)' }),
        el('ul', {}, keys.kpis.map((k) => el('li', {}, el('code', { class: 'num', text: k.key }), ' ', k.label, k.by_customer_type ? ' (אפשר גם חתך לפי סוג לקוח)' : '')))),
      el('div', {}, el('h4', { class: 't-h3', text: 'תחומי פעילות (activity_key)' }),
        el('ul', {}, el('li', {}, el('code', { class: 'num', text: 'total' }), ' סך הכול'), keys.areas.map((a) => el('li', {}, el('code', { class: 'num', text: a.key }), ' ', a.label)))),
      el('div', {}, el('h4', { class: 't-h3', text: 'סוגי לקוח (customer_type)' }),
        el('ul', {}, el('li', {}, el('code', { class: 'num', text: 'total' }), ' סך הכול'), el('li', {}, el('code', { class: 'num', text: 'new' }), ' לקוח חדש'), el('li', {}, el('code', { class: 'num', text: 'existing' }), ' לקוח קיים'))));

    const demoBox = el('div', { class: 'stack' }, el('p', { class: 'progress-msg', text: 'טוען עסקי דמה' }));
    listDemoBusinesses().then((list) => mount(demoBox, list.map((b) => el('div', { class: 'list-row' },
      el('div', { class: 'grow' }, el('div', { class: 'list-row__title', text: b.name }), el('div', { class: 'list-row__sub', text: b.description })),
      el('button', { type: 'button', class: 'btn btn--secondary', disabled: !!st.busy, onClick: async () => {
        setBusy('טוען עסק דמה');
        try { await loadDemoBusiness(b.key); location.href = 'snapshot.html'; }
        catch { st.busy = ''; st.uploadError = { line: null, message: 'עסק הדמה לא נטען.' }; render(); }
      } }, 'טעינת עסק הדמה'))))).catch(() => mount(demoBox, notice('error', { title: 'רשימת עסקי הדמה לא נטענה.' })));

    return el('div', { class: 'stack-lg', style: 'max-width:820px' },
      st.mode === 'upload' ? el('div', { class: 'notice notice--info', role: 'status' }, el('span', { class: 'notice__icon' }, icon('info-circle')),
        el('div', {}, el('strong', { text: 'העלאת נתונים נוספים.' }), ' אפשר להעלות קובץ חדש לעסק הקיים. שבוע שכבר קיים יתעדכן. הקובץ צריך לכלול גם את השבוע הקודם לכל שבוע חדש, כדי שאפשר יהיה להשוות.')) : null,
      el('section', { class: 'card stack' },
        el('h2', { class: 't-h2', text: 'העלאת נתונים' }),
        el('div', {}, el('button', { type: 'button', class: 'btn btn--secondary', onClick: tpl }, icon('download'), 'הורדת תבנית')),
        accordion({ trigger: el('span', { class: 'link-text', text: 'המפתחות התקפים לחתכים אופציונליים' }), panel: keysList }).root,
        fileIn, zone,
        st.busy ? el('p', { class: 'progress-msg', role: 'status', text: st.busy }) : null,
        st.uploadError ? notice('error', {
          title: 'הקובץ לא נקלט.',
          text: (st.uploadError.line ? `שורה ${st.uploadError.line}: ` : '') + st.uploadError.message,
        }) : null),
      el('section', { class: 'card stack' },
        el('h2', { class: 't-h2', text: 'או נסו עסק דמה' }),
        st.existing ? notice('warning', { title: 'בחירה בעסק דמה תחליף את ההגדרה והנתונים הקיימים.' }) : null,
        demoBox),
      st.mode === 'upload' ? el('p', {}, el('a', { href: 'setup.html?restart=1', text: 'הקמת עסק מחדש' })) : null);
  }

  function render() {
    document.getElementById('page-title').textContent = st.mode === 'upload' ? 'העלאת נתונים' : 'הקמת העסק';
    renderStepper();
    mount(stage, st.step === 1 ? renderStep1() : st.step === 2 ? renderStep2() : renderStep3());
  }
  render();
}
