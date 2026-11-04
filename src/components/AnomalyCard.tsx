import { useState } from 'react'
import type { CustomerType, Definition, Insight, Kpi, MetricValue, Topic } from '../lib/types.ts'
import { Accordion } from './Accordion.tsx'
import { ChangeChip } from './Chip.tsx'
import { Icon } from './Icon.tsx'
import { InsightDetail, InsightTitle } from './InsightDetail.tsx'

const MAX_VISIBLE = 5 // DESIGN.md סעיף 4.3

interface AnomalyCardProps {
  anomalies: MetricValue[]
  def: Definition
  index: (kpiKey: string, activityKey: string, customerType: CustomerType) => MetricValue | undefined
  insights: Insight[]
  pending: ReadonlySet<string>
  failed: ReadonlySet<string>
  openIds: ReadonlySet<string>
  onToggleOpen: (id: string, open: boolean) => void
  /** "מכין תובנות, 3 מתוך 6", או null כשאין יצירה כרגע. */
  progress: { done: number; total: number } | null
  onCreate: (m: MetricValue, regenerate: boolean) => void
  onDecide: (presets: { kpi_key: string; insight_id: string | null }) => void
}

function kpiInfo(def: Definition, key: string): { kpi: Kpi; topic: Topic } {
  for (const topic of def.topics) {
    const kpi = topic.kpis.find((k) => k.key === key)
    if (kpi) return { kpi, topic }
  }
  throw new Error('KPI לא קיים בהגדרה: ' + key)
}

/** כרטיס חריגות: עד 5 ברמת הסכום הכולל, ממוינות לפי גודל השינוי, עם "הצג הכל". */
export function AnomalyCard(props: AnomalyCardProps) {
  const { anomalies, def, index, insights, pending, failed, openIds, onToggleOpen, progress, onCreate, onDecide } = props
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? anomalies : anomalies.slice(0, MAX_VISIBLE)

  return (
    <section className="card" aria-labelledby="anomalies-title">
      <div className="card__head">
        <Icon name="alert-triangle" size={24} className="card__icon accent-graphic" />
        <h2 className="t-h2" id="anomalies-title">חריגות</h2>
      </div>
      <div aria-live="polite">
        {progress && <span className="progress-msg">מכין תובנות, {progress.done} מתוך {progress.total}</span>}
      </div>
      {anomalies.length === 0 ? (
        <div className="row" style={{ color: 'var(--success-text)' }}>
          <Icon name="check" />
          <strong>אין חריגות השבוע</strong>
        </div>
      ) : (
        <div>
          <ul className="anomaly-list">
            {shown.map((m) => {
              const { kpi, topic } = kpiInfo(def, m.kpi_key)
              const insight = insights.find((i) => i.metric_value_id === m.id) ?? null
              const stale = !!insight && insight.facts.current_value !== m.value
              const state = pending.has(m.id) ? 'pending' : insight ? 'ready' : failed.has(m.id) ? 'failed' : 'none'
              return (
                <li key={m.id} className="anomaly-item" id={'anomaly-' + m.id}>
                  <Accordion
                    open={openIds.has(m.id)}
                    onToggle={(o) => onToggleOpen(m.id, o)}
                    trigger={
                      <span className="row anomaly-trigger">
                        <ChangeChip metric={m} higherIsBetter={kpi.higher_is_better} />
                        <span className="grow">
                          <strong><InsightTitle kpi={kpi} m={m} /></strong>
                          <span className="t-small muted"> · {topic.label}</span>
                        </span>
                      </span>
                    }
                  >
                    <InsightDetail
                      m={m} kpi={kpi} topic={topic} def={def} index={index}
                      insight={insight} state={state} stale={stale}
                      onCreate={(regen) => onCreate(m, regen)}
                      onDecide={() => onDecide({ kpi_key: m.kpi_key, insight_id: insight ? insight.id : null })}
                    />
                  </Accordion>
                </li>
              )
            })}
          </ul>
          {anomalies.length > MAX_VISIBLE && (
            <button type="button" className="btn btn--text" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'הצג פחות' : `הצג הכל (${anomalies.length})`}
              <Icon name={showAll ? 'chevron-down' : 'arrow-left'} size={16} />
            </button>
          )}
        </div>
      )}
    </section>
  )
}
