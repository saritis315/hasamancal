// הסמנכל: ui.js
// עזרי תצוגה: אייקונים, בניית DOM בטוחה, פורמט מספרים ותאריכים, תגי מצב, הודעות, לוגו.
// מקור: DESIGN.md (סעיפים 2.2, 2.5, 2.7, 3.3, 3.4, חלק 5) ו-ARCHITECTURE.md סעיף 11.
// כלל: טקסט מהנתונים או מהמודל נכנס רק כטקסט (textContent / append של מחרוזת), אף פעם לא innerHTML.
// innerHTML מותר כאן רק לקבועים סטטיים של הקובץ (נתיבי האייקונים והלוגו).

// ---------- אייקונים ----------
// Tabler Icons v3.49.0 (outline), רישיון MIT. https://tabler.io/icons
const ICON_PATHS = {
  'alert-triangle': '<path d="M12 9v4" /><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0" /><path d="M12 16h.01" />',
  'arrow-down': '<path d="M12 5l0 14" /><path d="M18 13l-6 6" /><path d="M6 13l6 6" />',
  'arrow-left': '<path d="M5 12l14 0" /><path d="M5 12l6 6" /><path d="M5 12l6 -6" />',
  'arrow-right': '<path d="M5 12l14 0" /><path d="M13 18l6 -6" /><path d="M13 6l6 6" />',
  'arrow-up': '<path d="M12 5l0 14" /><path d="M18 11l-6 -6" /><path d="M6 11l6 -6" />',
  'bulb': '<path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7" /><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3" /><path d="M9.7 17l4.6 0" />',
  'calendar': '<path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /><path d="M11 15h1" /><path d="M12 15v3" />',
  'chart-bar': '<path d="M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6" /><path d="M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10" /><path d="M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14" /><path d="M4 20h14" />',
  'check': '<path d="M5 12l5 5l10 -10" />',
  'chevron-down': '<path d="M6 9l6 6l6 -6" />',
  'chevron-left': '<path d="M15 6l-6 6l6 6" />',
  'circle-x': '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M10 10l4 4m0 -4l-4 4" />',
  'clock': '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 7v5l3 3" />',
  'coin': '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M14.8 9a2 2 0 0 0 -1.8 -1h-2a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4h-2a2 2 0 0 1 -1.8 -1" /><path d="M12 7v10" />',
  'download': '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" />',
  'home': '<path d="M5 12l-2 0l9 -9l9 9l-2 0" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" /><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" />',
  'info-circle': '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 9h.01" /><path d="M11 12h1v4h1" />',
  'menu-2': '<path d="M4 6l16 0" /><path d="M4 12l16 0" /><path d="M4 18l16 0" />',
  'minus': '<path d="M5 12l14 0" />',
  'plus': '<path d="M12 5l0 14" /><path d="M5 12l14 0" />',
  'shopping-cart': '<path d="M4 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M15 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 17h-11v-14h-2" /><path d="M6 5l14 1l-1 7h-13" />',
  'sparkles': '<path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6" />',
  'target': '<path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M7 12a5 5 0 1 0 10 0a5 5 0 1 0 -10 0" /><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />',
  'upload': '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 9l5 -5l5 5" /><path d="M12 4l0 12" />',
  'user': '<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />',
  'users': '<path d="M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />',
  'x': '<path d="M18 6l-12 12" /><path d="M6 6l12 12" />'
};

/** מחזיר אלמנט SVG. עובי קו 1.75, גודל 20 (16 בתוך תגים). */
export function icon(name, { size = 20, label = '', className = '' } = {}) {
  const paths = ICON_PATHS[name];
  if (!paths) throw new Error('אייקון לא קיים: ' + name);
  const t = document.createElement('template');
  t.innerHTML =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" ` +
    `fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false">${paths}</svg>`;
  const svg = t.content.firstElementChild;
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); }
  else svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);
  return svg;
}

// ---------- בניית DOM בטוחה ----------
/**
 * el('div', { class: 'card', text: '...', onClick: fn, dataset: {id: 1} }, ...children)
 * ילדים: אלמנטים או מחרוזות (מחרוזת נכנסת כצומת טקסט).
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : String(c));
  }
  return node;
}

/** מחליף את כל תוכן האלמנט. */
export function mount(container, ...nodes) {
  container.replaceChildren(...nodes.flat(Infinity).filter((n) => n != null && n !== false));
  return container;
}

// ---------- מספרים ותאריכים (DESIGN 2.5) ----------
const nf = (max) => new Intl.NumberFormat('he-IL', { maximumFractionDigits: max });

/** מספר לפי יחידה: count, ILS, percent, number. null מחזיר null (הקורא מציג "אין נתון"). */
export function formatNumber(value, unit = 'number') {
  if (value == null || Number.isNaN(Number(value))) return null;
  const v = Number(value);
  switch (unit) {
    case 'count': return nf(0).format(v);
    case 'ILS': return nf(0).format(v) + '₪';          // הנחה: ₪ צמוד אחרי המספר
    case 'percent': return nf(1).format(v) + '%';
    default: return nf(2).format(v);
  }
}

/** אחוז שינוי עם סימן לפני המספר: +13.6% או -15.7%. null מחזיר null. */
export function formatPct(p) {
  if (p == null || Number.isNaN(Number(p))) return null;
  const v = Number(p);
  const s = nf(1).format(Math.abs(v)) + '%';
  return v > 0 ? '+' + s : v < 0 ? '-' + s : s;
}

/** מספר או טקסט שאסור להתהפך בתוך עברית. */
export function num(text, className = '') {
  return el('span', { class: ('num ' + className).trim(), text });
}

function parseIso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) throw new Error('תאריך לא תקין: ' + iso);
  return { y: +m[1], m: +m[2], d: +m[3] };
}
const p2 = (n) => String(n).padStart(2, '0');

/** YYYY-MM-DD ל-dd.mm.yyyy */
export function formatDate(iso) {
  const { y, m, d } = parseIso(iso);
  return `${p2(d)}.${p2(m)}.${y}`;
}

/** מוסיף ימים לתאריך ISO, בלי תלות באזור זמן. */
export function addDays(iso, days) {
  const { y, m, d } = parseIso(iso);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${p2(t.getUTCMonth() + 1)}-${p2(t.getUTCDate())}`;
}

/** טווח שבוע לפי יום ראשון: 18.10–24.10.2026. הנחה: בין שנים מוצגות שתי השנים. */
export function formatWeekRange(startIso) {
  const start = parseIso(startIso);
  const end = parseIso(addDays(startIso, 6));
  const a = `${p2(start.d)}.${p2(start.m)}`;
  const b = `${p2(end.d)}.${p2(end.m)}.${end.y}`;
  return start.y === end.y ? `${a}–${b}` : `${a}.${start.y}–${b}`;
}

// ---------- תגי מצב (DESIGN 3.3): תמיד אייקון ומילה ----------
const CHIPS = {
  anomaly:       { text: 'חריגה',            icon: 'alert-triangle', cls: 'chip--anomaly' },
  improvement:   { text: 'שיפור',            icon: 'arrow-up',       cls: 'chip--good' },
  worsening:     { text: 'הרעה',             icon: 'arrow-up',       cls: 'chip--bad' },
  achieved:      { text: 'הושג',             icon: 'check',          cls: 'chip--good' },
  not_achieved:  { text: 'לא הושג',          icon: 'circle-x',       cls: 'chip--bad' },
  pending:       { text: 'ממתין לבדיקה',     icon: 'clock',          cls: 'chip--info' },
  completed:     { text: 'הושלם',            icon: 'check',          cls: 'chip--neutral' },
  saved:         { text: 'נשמר',             icon: 'check',          cls: 'chip--neutral' },
  one_off:       { text: 'חד-פעמי',          icon: null,             cls: 'chip--neutral' },
  precedent:     { text: 'תקדים',            icon: null,             cls: 'chip--info' },
  no_data:       { text: 'אין נתון',         icon: 'minus',          cls: 'chip--neutral' },
  no_comparison: { text: 'אין השוואה',       icon: 'clock',          cls: 'chip--neutral' },
  stale:         { text: 'מיושנת',           icon: 'clock',          cls: 'chip--neutral' },
  no_new_data:   { text: 'אין נתונים חדשים', icon: 'minus',          cls: 'chip--neutral' },
  hypothesis:    { text: 'השערה, לא עובדה',  icon: null,             cls: 'chip--anomaly' },
};

/**
 * תג מצב. direction ('up'|'down') קובע את כיוון החץ בשיפור ובהרעה.
 * text מחליף את המילה (למשל "חריגה · הרעה").
 */
export function statusChip(kind, { direction = 'up', text } = {}) {
  const def = CHIPS[kind];
  if (!def) throw new Error('סוג תג לא מוכר: ' + kind);
  let iconName = def.icon;
  if ((kind === 'improvement' || kind === 'worsening') && direction === 'down') iconName = 'arrow-down';
  return el('span', { class: 'chip ' + def.cls },
    iconName ? icon(iconName, { size: 16 }) : null,
    text || def.text);
}

/**
 * תג שינוי ל-KPI. מקבל שורה בצורת metric_values ואת higher_is_better.
 * צבע ומילה אומרים אם זה טוב או רע (לא לאן המספר זז). חריגה מוצגת בענבר, עם "הרעה" או "שיפור" בתוכה.
 * { value, change_abs, change_pct, threshold_status, from_zero, higher_is_better }
 */
export function changeChip(m) {
  if (m.value == null) return statusChip('no_data');
  if (m.threshold_status === 'unavailable' && m.change_abs == null) return statusChip('no_comparison');
  if (m.change_abs == null) return statusChip('no_comparison');
  const direction = m.change_abs > 0 ? 'up' : m.change_abs < 0 ? 'down' : null;
  if (direction === null) return el('span', { class: 'chip chip--neutral' }, icon('minus', { size: 16 }), 'ללא שינוי'); // הנחה: נוסח
  const good = (direction === 'up') === !!m.higher_is_better;
  if (m.threshold_status === 'anomaly') {
    return statusChip('anomaly', { text: 'חריגה · ' + (good ? 'שיפור' : 'הרעה') }); // הנחה: נוסח
  }
  return statusChip(good ? 'improvement' : 'worsening', { direction });
}

/** חץ ואחוז שינוי, לצד התג. גידול מאפס: "עלייה ממצב של אפס". */
export function changeValue(m) {
  if (m.value == null || m.change_abs == null) return null;
  if (m.from_zero) return el('span', { class: 'secondary', text: 'עלייה ממצב של אפס' });
  const pct = formatPct(m.change_pct);
  if (pct == null) return null;
  const up = m.change_abs > 0;
  return el('span', { class: 'row', style: 'gap:4px' },
    m.change_abs === 0 ? null : icon(up ? 'arrow-up' : 'arrow-down', { size: 16 }),
    num(pct));
}

// ---------- הודעות (DESIGN 3.4) ----------
const NOTICE_ICON = { info: 'info-circle', success: 'check', warning: 'alert-triangle', error: 'circle-x' };

/** notice('error', { title: 'הקובץ לא נקלט.', text: 'שורה 14: ...' }) */
export function notice(type, { title = '', text = '' } = {}) {
  if (!NOTICE_ICON[type]) throw new Error('סוג הודעה לא מוכר: ' + type);
  return el('div', { class: 'notice notice--' + type, role: type === 'error' ? 'alert' : 'status' },
    el('span', { class: 'notice__icon' }, icon(NOTICE_ICON[type])),
    el('div', {}, title ? el('strong', { text: title }) : null, title && text ? ' ' : null, text));
}

// ---------- לוגו (DESIGN 2.2) ----------
let logoCounter = 0;

/** לוגו מלא. לכל לוגו mask ייחודי. הגופן M PLUS Rounded 1c נטען ב-<head> של הדף. */
export function logo({ color = '#14253D', accent = '#E8912D' } = {}) {
  const id = 'cut' + ++logoCounter;
  const t = document.createElement('template');
  t.innerHTML =
    `<span role="img" aria-label="הסמנכל" style="font-family:'M PLUS Rounded 1c',sans-serif;font-weight:900;color:${color};direction:rtl;white-space:nowrap">ה<svg ` +
    `width="0.656em" height="0.656em" viewBox="0 0 40 40" aria-hidden="true" style="display:inline-block;vertical-align:-0.0654em">` +
    `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="40" height="40">` +
    `<rect width="40" height="40" fill="#fff"/><circle cx="29.2" cy="10.8" r="6.3" fill="#000"/></mask></defs>` +
    `<circle cx="20" cy="20" r="13.04" fill="none" stroke="currentColor" stroke-width="7.93" mask="url(#${id})"/>` +
    `<circle cx="29.2" cy="10.8" r="4.1" fill="${accent}"/></svg>מנכל</span>`;
  return t.content.firstElementChild;
}

// ---------- רכיבים משותפים (DESIGN 3.2, 3.7, חלק 4) ----------
let uid = 0;
export const nextId = (prefix = 'id') => `${prefix}${++uid}`;

/** פילטר מקוטע. options: [{ value, label }]. */
export function segmented({ options, value, onChange, label = '' }) {
  const buttons = options.map((o) => el('button', {
    type: 'button', class: 'segmented__item', 'aria-pressed': String(o.value === value),
    onClick: () => {
      value = o.value;
      buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i].value === value)));
      onChange(value);
    },
  }, o.label));
  return el('div', { class: 'segmented', role: 'group', 'aria-label': label || null }, buttons);
}

/** אקורדיון: שורה שנפתחת במקום. נפתח וננעל במקלדת (כפתור אמיתי). */
export function accordion({ trigger, panel, open = false, onToggle }) {
  const id = nextId('acc');
  const button = el('button', { type: 'button', class: 'accordion__trigger', id: id + '-t', 'aria-expanded': String(open), 'aria-controls': id + '-p' },
    el('span', { class: 'grow' }, trigger),
    el('span', { class: 'accordion__chevron' }, icon('chevron-down')));
  const body = el('div', { class: 'accordion__panel', id: id + '-p', role: 'region', 'aria-labelledby': id + '-t', hidden: !open }, panel);
  const set = (o) => { button.setAttribute('aria-expanded', String(o)); body.hidden = !o; if (onToggle) onToggle(o); };
  button.addEventListener('click', () => set(button.getAttribute('aria-expanded') !== 'true'));
  return { root: el('div', { class: 'accordion' }, button, body), button, body, set };
}

/** שדה עם תווית מקושרת, הנחיה והודעת שגיאה. control חייב לקבל id זהה ל-id. */
export function field({ id, label, control, hint = '' }) {
  const hintEl = hint ? el('div', { class: 'field__hint', id: id + '-hint', text: hint }) : null;
  const errEl = el('div', { class: 'field__error', id: id + '-err', hidden: true });
  const describedBy = [hint ? id + '-hint' : null, id + '-err'].filter(Boolean).join(' ');
  control.setAttribute('aria-describedby', describedBy);
  const root = el('div', { class: 'field' }, el('label', { class: 'field__label', for: id, text: label }), control, hintEl, errEl);
  return {
    root, control,
    setError(msg) {
      errEl.replaceChildren(...(msg ? [icon('alert-triangle', { size: 16 }), msg] : []));
      errEl.hidden = !msg;
      if (msg) control.setAttribute('aria-invalid', 'true'); else control.removeAttribute('aria-invalid');
    },
  };
}

/**
 * סרגל עליון (מחשב) וניווט תחתון (נייד), עם תפריט משתמש.
 * הנחה: בנייד אין תפריט המבורגר נפרד. הפעולות "הקמת עסק מחדש" ו"יציאה" בתפריט המשתמש.
 */
export function topbar({ active, businessName = '', onSignOut }) {
  const links = [
    { id: 'snapshot', href: 'snapshot.html', label: 'תמונת מצב' },
    { id: 'setup', href: 'setup.html', label: 'הקמה והעלאה' },
  ];
  const tabs = () => links.map((l) => el('a', { class: 'tab', href: l.href, 'aria-current': active === l.id ? 'page' : null }, l.label));

  const menuId = nextId('menu');
  const btn = el('button', { type: 'button', class: 'user-menu__btn', 'aria-expanded': 'false', 'aria-controls': menuId },
    icon('user'), el('span', { class: 'user-menu__label', text: 'מנהל העסק' }), icon('chevron-down', { size: 16 }));
  const menu = el('div', { class: 'menu', id: menuId, hidden: true },
    el('a', { class: 'menu__item', href: 'setup.html?restart=1', text: 'הקמת עסק מחדש' }),
    el('button', { type: 'button', class: 'menu__item', onClick: () => onSignOut && onSignOut(), text: 'יציאה' }));
  const setOpen = (o) => { menu.hidden = !o; btn.setAttribute('aria-expanded', String(o)); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(menu.hidden); });
  document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); } });

  const header = el('header', { class: 'topbar' },
    el('div', { class: 'container topbar__inner' },
      el('a', { class: 'brand', href: 'snapshot.html', 'aria-label': 'הסמנכל, לתמונת מצב' }, logo()),
      el('nav', { class: 'tabs', 'aria-label': 'ניווט ראשי' }, tabs()),
      el('div', { class: 'topbar__side' },
        businessName ? el('span', { class: 'chip chip--neutral', text: businessName }) : null,
        el('div', { class: 'user-menu' }, btn, menu))));
  const bottomNav = el('nav', { class: 'bottom-nav', 'aria-label': 'ניווט תחתון' }, tabs());
  return { header, bottomNav };
}

/**
 * טקסט חופשי (למשל מהמודל) עם מספרים שלא יתהפכו בתוך עברית (DESIGN 2.5).
 * מחזיר מערך צמתים: טקסט רגיל, ומספרים עטופים ב-span.num. אין innerHTML.
 */
export function numText(str) {
  const out = [];
  // הסימן נחשב חלק מהמספר רק אם אינו צמוד לאות עברית ("ל-439" הוא מקף, לא מינוס)
  const re = /(?:(?<![א-ת])[+-])?\d+(?:[.,]\d+)*(?:–\d+(?:[.,]\d+)*)?[%₪]?/g;
  const s = String(str ?? '');
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push(num(m[0]));
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}
