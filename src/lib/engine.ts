// הסמנכל: engine.ts
// חישוב השוואה לתקופה קודמת, שינוי וחריגה (F8, F9, F10). פונקציות טהורות, בלי רשת ובלי DOM.
// מקור: ARCHITECTURE.md סעיף 9.2.
import type { Definition, FileRow, MetricInput, ThresholdStatus } from './types.ts'
import { addDays } from './format.ts'

/** מחזיר שורות במבנה של metric_values (בלי id ו-computed_at). */
export function computeMetrics(definition: Definition, rows: FileRow[]): MetricInput[] {
  const thresholds = new Map<string, number | null>(
    definition.topics.flatMap((t) => t.kpis).map((k) => [k.key, k.threshold_pct ?? null]),
  )
  const keyOf = (r: FileRow, week: string) => `${r.kpi_key}|${r.activity_key}|${r.customer_type}|${week}`
  const byKey = new Map(rows.map((r) => [keyOf(r, r.week_start), r.value]))
  const round2 = (x: number | null) => (x == null ? null : Math.round(x * 100) / 100)

  return rows.map((r) => {
    // השבוע הקודם הוא בדיוק שבוע לפני. אחרת אין השוואה (לא מנחשים).
    const prevKey = keyOf(r, addDays(r.week_start, -7))
    const previous = byKey.has(prevKey) ? (byKey.get(prevKey) as number) : null
    const threshold = thresholds.get(r.kpi_key) ?? null

    const changeAbs = previous == null ? null : r.value - previous
    const changePct = previous == null || previous === 0 || changeAbs == null ? null : (changeAbs / previous) * 100

    let status: ThresholdStatus
    if (previous == null || threshold == null) status = 'unavailable'
    else if (previous === 0 && r.value > 0) status = 'anomaly' // גידול מאפס
    else if (previous === 0 && r.value === 0) status = 'normal'
    else status = Math.abs(changePct as number) >= threshold ? 'anomaly' : 'normal'

    return {
      kpi_key: r.kpi_key,
      activity_key: r.activity_key,
      customer_type: r.customer_type,
      period_type: 'week',
      period_start: r.week_start,
      period_end: addDays(r.week_start, 6),
      value: r.value,
      previous_value: previous,
      change_abs: round2(changeAbs),
      change_pct: round2(changePct),
      threshold_status: status,
    }
  })
}

type MetricLike = Pick<MetricInput, 'previous_value' | 'value'>

/** גידול מאפס: הערך הקודם 0 והנוכחי גדול מ-0. נגזר בזמן הקריאה, לא נשמר. */
export function isFromZero(m: MetricLike): boolean {
  return m.previous_value === 0 && m.value > 0
}

/** השבוע האחרון שיש בו נתונים (לא לפי התאריך של היום). */
export function lastPeriodStart(metrics: Pick<MetricInput, 'period_start'>[]): string | null {
  let last: string | null = null
  for (const m of metrics) if (last == null || m.period_start > last) last = m.period_start
  return last
}

/** חריגות לפי גודל השינוי, יורד. גידול מאפס נחשב הגדול ביותר (הנחה: אין אחוז, והשינוי אינסופי). */
export function rankAnomalies<T extends MetricInput>(metrics: T[]): T[] {
  const size = (m: T) => (isFromZero(m) ? Infinity : Math.abs(m.change_pct ?? 0))
  return metrics.filter((m) => m.threshold_status === 'anomaly').sort((a, b) => size(b) - size(a))
}

/** שורת סך הכול (תחום וסוג לקוח total). */
export function isTotalRow(m: Pick<MetricInput, 'activity_key' | 'customer_type'>): boolean {
  return m.activity_key === 'total' && m.customer_type === 'total'
}
