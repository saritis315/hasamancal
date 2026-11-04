import type { MetricInput } from '../lib/types.ts'
import { isFromZero } from '../lib/engine.ts'
import { formatPct } from '../lib/format.ts'
import { Icon, type IconName } from './Icon.tsx'
import { Num } from './NumText.tsx'

// תגי מצב (DESIGN.md סעיף 3.3): תמיד אייקון ומילה.
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
} as const satisfies Record<string, { text: string; icon: IconName | null; cls: string }>

export type ChipKind = keyof typeof CHIPS

interface StatusChipProps {
  kind: ChipKind
  /** כיוון החץ בשיפור ובהרעה. */
  direction?: 'up' | 'down'
  /** מחליף את המילה, למשל "חריגה · הרעה". */
  text?: string
}

export function StatusChip({ kind, direction = 'up', text }: StatusChipProps) {
  const def = CHIPS[kind]
  let iconName: IconName | null = def.icon
  if ((kind === 'improvement' || kind === 'worsening') && direction === 'down') iconName = 'arrow-down'
  return (
    <span className={'chip ' + def.cls}>
      {iconName && <Icon name={iconName} size={16} />}
      {text ?? def.text}
    </span>
  )
}

export type ChangeMetric = Pick<MetricInput, 'value' | 'previous_value' | 'change_abs' | 'change_pct' | 'threshold_status'>

/**
 * תג שינוי ל-KPI. צבע ומילה אומרים אם זה טוב או רע (לא לאן המספר זז).
 * חריגה מוצגת בענבר, עם "הרעה" או "שיפור" בתוכה (DESIGN.md סעיף 2.4, כלל 5).
 */
export function ChangeChip({ metric, higherIsBetter }: { metric: ChangeMetric | undefined; higherIsBetter: boolean }) {
  if (!metric) return <StatusChip kind="no_data" />
  if (metric.change_abs == null) return <StatusChip kind="no_comparison" />
  const direction = metric.change_abs > 0 ? 'up' : metric.change_abs < 0 ? 'down' : null
  if (direction === null) {
    return <span className="chip chip--neutral"><Icon name="minus" size={16} />ללא שינוי</span> // הנחה: נוסח
  }
  const good = (direction === 'up') === higherIsBetter
  if (metric.threshold_status === 'anomaly') {
    return <StatusChip kind="anomaly" text={'חריגה · ' + (good ? 'שיפור' : 'הרעה')} /> // הנחה: נוסח
  }
  return <StatusChip kind={good ? 'improvement' : 'worsening'} direction={direction} />
}

/** חץ ואחוז שינוי, לצד התג. גידול מאפס: "עלייה ממצב של אפס". */
export function ChangeValue({ metric }: { metric: ChangeMetric | undefined }) {
  if (!metric || metric.change_abs == null) return null
  if (isFromZero(metric)) return <span className="secondary">עלייה ממצב של אפס</span>
  const pct = formatPct(metric.change_pct)
  if (pct == null) return null
  return (
    <span className="row" style={{ gap: 4 }}>
      {metric.change_abs !== 0 && <Icon name={metric.change_abs > 0 ? 'arrow-up' : 'arrow-down'} size={16} />}
      <Num>{pct}</Num>
    </span>
  )
}
