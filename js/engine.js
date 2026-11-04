// הסמנכל: engine.js
// חישוב השוואה לתקופה קודמת, שינוי וחריגה (F8, F9, F10). פונקציות טהורות, בלי גישה לרשת ובלי DOM.
// מקור: ARCHITECTURE.md סעיף 9.2.
import { addDays } from './ui.js';

/**
 * rows: [{ week_start, kpi_key, activity_key, customer_type, value }] (value מספר, שורות ריקות כבר הוסרו)
 * מחזיר שורות במבנה של metric_values (בלי id ו-computed_at).
 */
export function computeMetrics(definition, rows) {
  const thresholds = new Map(
    definition.topics.flatMap((t) => t.kpis).map((k) => [k.key, k.threshold_pct ?? null]));
  const keyOf = (r, week) => `${r.kpi_key}|${r.activity_key}|${r.customer_type}|${week}`;
  const byKey = new Map(rows.map((r) => [keyOf(r, r.week_start), r.value]));

  return rows.map((r) => {
    // השבוע הקודם הוא בדיוק שבוע לפני. אחרת אין השוואה (לא מנחשים).
    const prevKey = keyOf(r, addDays(r.week_start, -7));
    const previous = byKey.has(prevKey) ? byKey.get(prevKey) : null;
    const threshold = thresholds.get(r.kpi_key) ?? null;

    const change_abs = previous == null ? null : r.value - previous;
    const change_pct = previous == null || previous === 0 ? null : (change_abs / previous) * 100;

    let status;
    if (previous == null || threshold == null) status = 'unavailable';
    else if (previous === 0 && r.value > 0) status = 'anomaly';          // גידול מאפס
    else if (previous === 0 && r.value === 0) status = 'normal';
    else status = Math.abs(change_pct) >= threshold ? 'anomaly' : 'normal';

    const round2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
    return {
      kpi_key: r.kpi_key,
      activity_key: r.activity_key,
      customer_type: r.customer_type,
      period_type: 'week',
      period_start: r.week_start,
      period_end: addDays(r.week_start, 6),
      value: r.value,
      previous_value: previous,
      change_abs: round2(change_abs),
      change_pct: round2(change_pct),
      threshold_status: status,
    };
  });
}

/** גידול מאפס: הערך הקודם 0 והנוכחי גדול מ-0. נגזר בזמן הקריאה, לא נשמר. */
export function isFromZero(m) {
  return m.previous_value === 0 && m.value > 0;
}

/** השבוע האחרון שיש בו נתונים (לא לפי התאריך של היום). */
export function lastPeriodStart(metrics) {
  let last = null;
  for (const m of metrics) if (last == null || m.period_start > last) last = m.period_start;
  return last;
}

/** חריגות לפי גודל השינוי, יורד. גידול מאפס נחשב הגדול ביותר (הנחה: אין אחוז, והשינוי אינסופי). */
export function rankAnomalies(metrics) {
  const size = (m) => (isFromZero(m) ? Infinity : Math.abs(m.change_pct ?? 0));
  return metrics.filter((m) => m.threshold_status === 'anomaly').sort((a, b) => size(b) - size(a));
}

/** שורת סך הכול (תחום וסוג לקוח total). */
export function isTotalRow(m) {
  return m.activity_key === 'total' && m.customer_type === 'total';
}
