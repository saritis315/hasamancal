// הסמנכל: filecontract.js
// חוזה קובץ הנתונים: הפקת תבנית (F3), קריאת CSV או xlsx עם SheetJS ואימות (F4).
// מקור: ARCHITECTURE.md סעיף 7. כל שגיאה דוחה את כל הקובץ, עם הודעה אחת: מה השגיאה ובאיזו שורה.
import { addDays } from './ui.js';

export const LIMITS = { maxBytes: 2 * 1024 * 1024, maxRows: 10000 }; // הנחה (סעיף 7.3)
const REQUIRED = ['week_start', 'kpi_key', 'activity_key', 'customer_type', 'value'];
const CUSTOMER_TYPES = ['total', 'new', 'existing'];
const SUM_TOLERANCE = 0.01; // הנחה: הפרש של עד אחוז אחד

/** שגיאת קובץ עם מספר שורה (או null). */
export class FileError extends Error {
  constructor(line, message) { super(message); this.line = line; }
}

function XLSXLib() {
  if (!globalThis.XLSX) throw new FileError(null, 'ספריית קריאת הקבצים לא נטענה.');
  return globalThis.XLSX;
}

// ---------- תבנית (F3) ----------
function weekdayOf(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = ראשון
}

/** ראשון של השבוע השלם האחרון שנגמר לפני התאריך (שבת שקדמה ל-today). */
export function lastFullWeekStart(todayIso) {
  let d = addDays(todayIso, -1);
  while (weekdayOf(d) !== 6) d = addDays(d, -1);
  return addDays(d, -6);
}

const csvCell = (s) => (/[",\n]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s));

/** תבנית מצומצמת: 12 KPI × 8 שבועות × סך הכול. 96 שורות. UTF-8 עם BOM. */
export function buildTemplate(definition, todayIso, weeks = 8) {
  const last = lastFullWeekStart(todayIso);
  const lines = ['week_start,kpi_key,kpi_label,activity_key,customer_type,value'];
  for (let i = weeks - 1; i >= 0; i--) {
    const week = addDays(last, -7 * i);
    for (const t of definition.topics) {
      for (const k of t.kpis) lines.push([week, k.key, csvCell(k.label), 'total', 'total', ''].join(','));
    }
  }
  return { filename: 'hasamancal-template.csv', csv: '﻿' + lines.join('\n') + '\n' };
}

/** המפתחות התקפים, להצגה ליד העלאה (חתכים אופציונליים). */
export function validKeys(definition) {
  return {
    kpis: definition.topics.flatMap((t) => t.kpis).map((k) => ({ key: k.key, label: k.label, by_customer_type: !!k.by_customer_type })),
    areas: definition.activity_areas.map((a) => ({ key: a.key, label: a.label })),
    customerTypes: CUSTOMER_TYPES,
  };
}

// ---------- קריאה ----------
function tableFromWorkbook(wb) {
  const X = XLSXLib();
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new FileError(null, 'הגיליון ריק.');
  // raw:true: ערכים כמו שהם. בקובץ xlsx תאריך מגיע כמספר סידורי, ובקובץ CSV כמחרוזת.
  const aoa = X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  if (!aoa.length) throw new FileError(null, 'הגיליון ריק.');
  const header = aoa[0].map((h) => String(h).trim().toLowerCase());
  const wi = header.indexOf('week_start');
  const pad = (n) => String(n).padStart(2, '0');
  const rows = aoa.slice(1).map((r) => r.map((v, i) => {
    if (typeof v === 'number' && i === wi) { // מספר סידורי של Excel, בלי תלות באזור זמן
      const p = X.SSF.parse_date_code(v);
      return p ? `${p.y}-${pad(p.m)}-${pad(p.d)}` : String(v);
    }
    return typeof v === 'string' ? v : String(v);
  }));
  return { header, rows };
}

/** טקסט CSV (UTF-8). raw:true כדי שתאריכים ומספרים יישארו מחרוזות. */
export function tableFromText(text) {
  const wb = XLSXLib().read(text.replace(/^﻿/, ''), { type: 'string', raw: true });
  return tableFromWorkbook(wb);
}

/** קובץ שהמשתמש העלה (File). */
export async function readFile(file) {
  if (file.size > LIMITS.maxBytes) throw new FileError(null, 'הקובץ גדול מ-2MB.');
  const name = (file.name || '').toLowerCase();
  const buf = await file.arrayBuffer();
  if (name.endsWith('.csv')) return tableFromText(new TextDecoder('utf-8').decode(buf));
  if (name.endsWith('.xlsx')) return tableFromWorkbook(XLSXLib().read(buf, { type: 'array' }));
  throw new FileError(null, 'סוג הקובץ אינו נתמך. יש להעלות קובץ CSV או xlsx.');
}

// ---------- אימות (7.3) ----------
/**
 * מחזיר { ok: true, rows } או { ok: false, line, message }.
 * שורה = מספר השורה בקובץ (הכותרת היא שורה 1). אין שמירה חלקית.
 */
export function validateTable(table, definition) {
  const fail = (line, message) => ({ ok: false, line, message });
  const col = Object.fromEntries(table.header.map((h, i) => [h, i]));
  for (const c of REQUIRED) if (!(c in col)) return fail(1, `העמודה ${c} חסרה.`);
  if (!table.rows.length) return fail(null, 'הגיליון ריק.');
  if (table.rows.length > LIMITS.maxRows) return fail(null, 'בקובץ יותר מ-10,000 שורות.');

  const kpis = new Map(definition.topics.flatMap((t) => t.kpis).map((k) => [k.key, k]));
  const areas = new Set(['total', ...definition.activity_areas.map((a) => a.key)]);
  const seen = new Map();
  const out = []; // { line, week_start, kpi_key, activity_key, customer_type, value }

  for (let i = 0; i < table.rows.length; i++) {
    const r = table.rows[i];
    const line = i + 2;
    const cell = (c) => String(r[col[c]] ?? '').trim();
    if (REQUIRED.every((c) => cell(c) === '')) continue; // שורה ריקה לגמרי

    const week = cell('week_start');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || Number.isNaN(Date.parse(week))) {
      return fail(line, 'התאריך בעמודה week_start אינו תקין. הפורמט הנדרש: YYYY-MM-DD.');
    }
    if (weekdayOf(week) !== 0) return fail(line, 'התאריך בעמודה week_start אינו יום ראשון.');

    const kpiKey = cell('kpi_key');
    const kpi = kpis.get(kpiKey);
    if (!kpi) return fail(line, `המפתח "${kpiKey}" בעמודה kpi_key אינו קיים בהגדרה.`);

    const act = cell('activity_key');
    if (!areas.has(act)) return fail(line, `המפתח "${act}" בעמודה activity_key אינו קיים בהגדרה.`);

    const ct = cell('customer_type');
    if (!CUSTOMER_TYPES.includes(ct)) return fail(line, 'הערך בעמודה customer_type חייב להיות total, new או existing.');
    if (ct !== 'total' && !kpi.by_customer_type) return fail(line, `ל-KPI ${kpiKey} אין חתך לפי סוג לקוח.`);

    const key = [week, kpiKey, act, ct].join('|');
    if (seen.has(key)) return fail(line, `שורה כפולה: אותו KPI, תחום, סוג לקוח ושבוע מופיעים גם בשורה ${seen.get(key)}.`);
    seen.set(key, line);

    const raw = cell('value');
    if (raw === '') continue; // אין נתון: מדלגים
    if (!/^-?\d+(\.\d+)?$/.test(raw)) return fail(line, 'הערך בעמודה value אינו מספר.');
    out.push({ line, week_start: week, kpi_key: kpiKey, activity_key: act, customer_type: ct, value: Number(raw) });
  }

  // בדיקות סכום ל-KPI ניתן לחיבור (רק כשיש חתכים באותו שבוע)
  const get = new Map(out.map((o) => [[o.week_start, o.kpi_key, o.activity_key, o.customer_type].join('|'), o]));
  const differs = (sum, total) => Math.abs(sum - total) > Math.max(SUM_TOLERANCE * Math.abs(total), 1e-9);
  for (const k of kpis.values()) {
    if (!k.additive) continue;
    const weeks = new Set(out.filter((o) => o.kpi_key === k.key).map((o) => o.week_start));
    for (const w of [...weeks].sort()) {
      const total = get.get([w, k.key, 'total', 'total'].join('|'));
      const parts = out.filter((o) => o.week_start === w && o.kpi_key === k.key && o.customer_type === 'total' && o.activity_key !== 'total');
      if (total && parts.length) {
        const sum = parts.reduce((s, o) => s + o.value, 0);
        if (differs(sum, total.value)) return fail(total.line, `סכום התחומים (${sum}) שונה מהסכום הכולל (${total.value}) ב-${k.key} בשבוע ${w}.`);
      }
      for (const act of ['total', ...definition.activity_areas.map((a) => a.key)]) {
        const t = get.get([w, k.key, act, 'total'].join('|'));
        const n = get.get([w, k.key, act, 'new'].join('|'));
        const e = get.get([w, k.key, act, 'existing'].join('|'));
        if (t && n && e && differs(n.value + e.value, t.value)) {
          return fail(t.line, `סכום חדש וקיים (${n.value + e.value}) שונה מהסכום הכולל (${t.value}) ב-${k.key} בשבוע ${w}.`);
        }
      }
    }
  }

  if (!out.length) return fail(null, 'בקובץ אין אף ערך בעמודה value.');
  return { ok: true, rows: out.map(({ line, ...row }) => row) };
}

/** קובץ → שורות מאומתות, או { ok:false, line, message }. */
export async function parseAndValidate(file, definition) {
  try {
    return validateTable(await readFile(file), definition);
  } catch (e) {
    if (e instanceof FileError) return { ok: false, line: e.line, message: e.message };
    throw e;
  }
}
