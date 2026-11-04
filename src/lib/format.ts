// הסמנכל: format.ts
// פורמט מספרים, תאריכים וטווחי שבוע (DESIGN.md סעיף 2.5). פונקציות טהורות, בלי DOM.
import type { Unit } from './types.ts'

const nf = (max: number) => new Intl.NumberFormat('he-IL', { maximumFractionDigits: max })

/** מספר לפי יחידה. null מחזיר null (הקורא מציג "אין נתון"). */
export function formatNumber(value: number | null | undefined, unit: Unit = 'number'): string | null {
  if (value == null || Number.isNaN(Number(value))) return null
  const v = Number(value)
  switch (unit) {
    case 'count': return nf(0).format(v)
    case 'ILS': return nf(0).format(v) + '₪' // הנחה: ₪ צמוד אחרי המספר
    case 'percent': return nf(1).format(v) + '%'
    default: return nf(2).format(v)
  }
}

/** אחוז שינוי עם סימן לפני המספר: +13.6% או -15.7%. */
export function formatPct(p: number | null | undefined): string | null {
  if (p == null || Number.isNaN(Number(p))) return null
  const v = Number(p)
  const s = nf(1).format(Math.abs(v)) + '%'
  return v > 0 ? '+' + s : v < 0 ? '-' + s : s
}

function parseIso(iso: string): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) throw new Error('תאריך לא תקין: ' + iso)
  return { y: +m[1], m: +m[2], d: +m[3] }
}
const p2 = (n: number) => String(n).padStart(2, '0')

/** YYYY-MM-DD ל-dd.mm.yyyy */
export function formatDate(iso: string): string {
  const { y, m, d } = parseIso(iso)
  return `${p2(d)}.${p2(m)}.${y}`
}

/** מוסיף ימים לתאריך ISO, בלי תלות באזור זמן. */
export function addDays(iso: string, days: number): string {
  const { y, m, d } = parseIso(iso)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return `${t.getUTCFullYear()}-${p2(t.getUTCMonth() + 1)}-${p2(t.getUTCDate())}`
}

/** יום בשבוע של תאריך ISO. 0 = ראשון. */
export function weekdayOf(iso: string): number {
  const { y, m, d } = parseIso(iso)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** תאריך היום לפי השעון המקומי, בפורמט YYYY-MM-DD. */
export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

/** טווח שבוע לפי יום ראשון: 18.10–24.10.2026. הנחה: בין שנים מוצגות שתי השנים. */
export function formatWeekRange(startIso: string): string {
  const start = parseIso(startIso)
  const end = parseIso(addDays(startIso, 6))
  const a = `${p2(start.d)}.${p2(start.m)}`
  const b = `${p2(end.d)}.${p2(end.m)}.${end.y}`
  return start.y === end.y ? `${a}–${b}` : `${a}.${start.y}–${b}`
}

export function isIsoDate(s: string | null | undefined): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(Date.parse(s as string))
}
