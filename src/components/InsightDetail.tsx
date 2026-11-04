import { useState } from 'react'
import type { CustomerType, Definition, Insight, Kpi, MetricValue, Topic } from '../lib/types.ts'
import { isFromZero } from '../lib/engine.ts'
import { formatNumber, formatPct, formatWeekRange } from '../lib/format.ts'
import { Icon, type IconName } from './Icon.tsx'
import { Num, NumText } from './NumText.tsx'
import { Notice } from './Notice.tsx'
import { Segmented } from './Segmented.tsx'
import { StatusChip } from './Chip.tsx'

const PARTS: { key: keyof Insight['content']; title: string; icon: IconName }[] = [
  { key: 'what_happened', title: 'מה קרה', icon: 'info-circle' },
  { key: 'trend', title: 'מגמה שנצפתה', icon: 'chart-bar' },
  { key: 'why_it_matters', title: 'למה זה חשוב', icon: 'bulb' },
  { key: 'hypothesis', title: 'השערה אפשרית', icon: 'sparkles' },
  { key: 'what_to_check', title: 'המלצה: מה כדאי לבדוק', icon: 'target' },
]

/** שם התובנה: "עלות לליד: +30%" (הנחה: נוסח). */
export function InsightTitle({ kpi, m }: { kpi: Kpi; m: MetricValue }) {
  const change = isFromZero(m) ? 'עלייה ממצב של אפס' : formatPct(m.change_pct)
  return <span>{kpi.label}: {change && <Num>{change}</Num>}</span>
}

function Stat({ label, children, extra }: { label: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="stat">
      <div className="t-small muted">{label}</div>
      <div className="t-kpi-main">{children}</div>
      {extra}
    </div>
  )
}

function Stats({ row, kpi }: { row: MetricValue | undefined; kpi: Kpi }) {
  if (!row) return <p className="muted"><StatusChip kind="no_data" /> אין נתון לתחום הזה בשבוע הזה</p>
  const cur = formatNumber(row.value, kpi.unit)
  const prev = row.previous_value == null ? null : formatNumber(row.previous_value, kpi.unit)
  const fromZero = isFromZero(row)
  const change = row.previous_value == null ? null : fromZero ? 'עלייה ממצב של אפס' : formatPct(row.change_pct)
  const anomaly = row.threshold_status === 'anomaly'
  return (
    <>
      <Stat label="ערך נוכחי"><Num>{cur}</Num></Stat>
      <Stat label="ערך קודם">{prev ? <Num>{prev}</Num> : <StatusChip kind="no_comparison" />}</Stat>
      <Stat label="שינוי" extra={kpi.threshold_pct == null ? null : <div className="t-small muted">הסף: <Num>{kpi.threshold_pct}%</Num></div>}>
        {change ? (fromZero ? <span className="t-h3">{change}</span> : <Num className={anomaly ? 'accent-text' : ''}>{change}</Num>) : <StatusChip kind="no_comparison" />}
      </Stat>
    </>
  )
}

export type InsightState = 'ready' | 'pending' | 'failed' | 'none'

interface InsightDetailProps {
  m: MetricValue
  kpi: Kpi
  topic: Topic
  def: Definition
  index: (kpiKey: string, activityKey: string, customerType: CustomerType) => MetricValue | undefined
  insight: Insight | null
  state: InsightState
  stale: boolean
  onCreate: (regenerate: boolean) => void
  onDecide: () => void
}

/** פירוט התובנה בתוך שורת החריגה (DESIGN.md סעיף 4.4, F11). */
export function InsightDetail({ m, kpi, topic, def, index, insight, state, stale, onCreate, onDecide }: InsightDetailProps) {
  const [area, setArea] = useState('total')

  let body
  if (state === 'pending') {
    body = <p className="progress-msg" role="status">מכין תובנה</p>
  } else if (state === 'failed') {
    body = (
      <div className="stack">
        <Notice type="error" title="התובנה לא נוצרה.">אפשר לנסות שוב.</Notice>
        <div><button type="button" className="btn btn--secondary" onClick={() => onCreate(false)}>נסה שוב ליצור תובנה</button></div>
      </div>
    )
  } else if (state === 'none' || !insight) {
    body = <div><button type="button" className="btn btn--secondary" onClick={() => onCreate(false)}>צור תובנה</button></div>
  } else {
    body = (
      <div className="stack">
        {stale && (
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <StatusChip kind="stale" />
            <span className="secondary">התובנה נוצרה על ערך שהוחלף.</span>
            <button type="button" className="btn btn--text" onClick={() => onCreate(true)}>צור מחדש</button>
          </div>
        )}
        {PARTS.map(({ key, title, icon }) => (
          <div key={key} className={'insight-part' + (key === 'hypothesis' ? ' insight-part--hypothesis' : '')}>
            <div className="insight-part__icon"><Icon name={icon} /></div>
            <div className="grow">
              <h4 className="insight-part__title">{title}{key === 'hypothesis' && <StatusChip kind="hypothesis" />}</h4>
              {/* טקסט מהמודל מוצג כטקסט בלבד (React מבריח אותו), עם מספרים מבודדים */}
              <p className="secondary"><NumText text={insight.content[key]} /></p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="insight-detail stack-lg">
      <div className="stack">
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <span className="t-small muted">{topic.label} · שבוע <Num>{formatWeekRange(m.period_start)}</Num></span>
        </div>
        <div className="stats"><Stats row={index(kpi.key, area, 'total')} kpi={kpi} /></div>
        <Segmented
          label="תחום פעילות"
          value={area}
          onChange={setArea}
          options={[{ value: 'total', label: 'כל התחומים' }, ...def.activity_areas.map((a) => ({ value: a.key, label: a.label }))]}
        />
      </div>
      {body}
      <div>
        <button type="button" className="btn btn--decision" onClick={onDecide}><Icon name="target" />שמור החלטה על תובנה זו</button>
      </div>
    </div>
  )
}
