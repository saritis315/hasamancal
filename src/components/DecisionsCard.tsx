import { useState, type ReactNode } from 'react'
import type { Decision, Definition, KpiDecision } from '../lib/types.ts'
import { formatDate, formatNumber, formatPct, formatWeekRange } from '../lib/format.ts'
import { Icon } from './Icon.tsx'
import { Num } from './NumText.tsx'
import { Segmented } from './Segmented.tsx'
import { StatusChip } from './Chip.tsx'

const DIR_LABEL = { up: 'עלייה', down: 'ירידה' } as const
type Filter = 'all' | 'kpi' | 'manager'

function findKpi(def: Definition, key: string) {
  for (const topic of def.topics) {
    const kpi = topic.kpis.find((k) => k.key === key)
    if (kpi) return { kpi, topic }
  }
  return null
}

function ResultCell({ d }: { d: Decision }) {
  if (d.kind === 'manager') return <StatusChip kind={d.is_precedent ? 'precedent' : 'one_off'} />
  if (d.outcome_status === 'done' && d.outcome && 'direction_met' in d.outcome) {
    return <StatusChip kind={d.outcome.direction_met ? 'achieved' : 'not_achieved'} />
  }
  if (d.outcome_status === 'unavailable') return <StatusChip kind="no_new_data" />
  return <span className="muted">—</span>
}

function DirCell({ d }: { d: Decision }) {
  if (d.kind !== 'kpi') return <span className="muted">—</span>
  return (
    <span className="row" style={{ gap: 4 }}>
      <Icon name={d.desired_direction === 'up' ? 'arrow-up' : 'arrow-down'} size={16} />
      {DIR_LABEL[d.desired_direction]}
    </span>
  )
}

function DetailGrid({ pairs }: { pairs: ([string, ReactNode] | null)[] }) {
  return (
    <dl className="detail-grid">
      {pairs.map((p) => p && (
        <div key={p[0]} style={{ display: 'contents' }}>
          <dt className="t-small muted">{p[0]}</dt>
          <dd>{p[1]}</dd>
        </div>
      ))}
    </dl>
  )
}

/** פירוט החלטה בתוך השורה (DESIGN.md סעיף 4.7). */
function Detail({ d, def, onGoToInsight }: { d: Decision; def: Definition; onGoToInsight: (insightId: string) => void }) {
  if (d.kind === 'manager') {
    return (
      <DetailGrid pairs={[
        ['קטגוריה', d.category], ['תיאור ההחלטה', d.description], ['ההחלטה', d.decision_text], ['סיבה', d.reason],
        ['תאריך', <Num key="d">{formatDate(d.case_date)}</Num>],
        ['סוג', <StatusChip key="t" kind={d.is_precedent ? 'precedent' : 'one_off'} />],
      ]} />
    )
  }
  const found = findKpi(def, d.kpi_key)
  const unit = found?.kpi.unit ?? 'number'
  const outcome = d.outcome && 'direction_met' in d.outcome ? d.outcome : null
  return (
    <div className="stack">
      <DetailGrid pairs={[
        ['מדד', found?.kpi.label ?? d.kpi_key],
        ['תיאור ההחלטה', d.decision_text],
        ['כיוון רצוי', <DirCell key="dir" d={d} />],
        ['תאריך בדיקה', <Num key="cd">{formatDate(d.check_date)}</Num>],
        d.insight_id ? ['תובנה', <button key="ins" type="button" className="btn btn--text" onClick={() => onGoToInsight(d.insight_id as string)}>מעבר לתובנה</button>] : null,
      ]} />
      {d.outcome_status === 'done' && outcome ? (
        <div className="sunken stack">
          <h4 className="t-h3">תוצאה</h4>
          <DetailGrid pairs={[
            [`ערך בסיס (שבוע ${formatWeekRange(d.baseline_period_start)})`, <Num key="b">{formatNumber(outcome.baseline_value, unit)}</Num>],
            ['ערך נוכחי', <Num key="c">{formatNumber(outcome.current_value, unit)}</Num>],
            ['שינוי', outcome.change_pct == null ? '—' : <Num key="p">{formatPct(outcome.change_pct)}</Num>],
          ]} />
          <div><StatusChip kind={outcome.direction_met ? 'achieved' : 'not_achieved'} /></div>
        </div>
      ) : d.outcome_status === 'unavailable' ? (
        <div className="sunken stack">
          <div><StatusChip kind="no_new_data" /></div>
          <p className="secondary">לא הועלה שבוע חדש מאז ההחלטה, ולכן אין תוצאה.</p>
        </div>
      ) : (
        <p className="secondary">תאריך הבדיקה: <Num>{formatDate((d as KpiDecision).check_date)}</Num></p>
      )}
    </div>
  )
}

interface DecisionsCardProps {
  def: Definition
  decisions: Decision[]
  notice: ReactNode
  onNew: () => void
  onGoToInsight: (insightId: string) => void
}

/** כרטיס החלטות: רשימה, פילטר מקוטע ופירוט בשורה (DESIGN.md סעיף 4.5). */
export function DecisionsCard({ def, decisions, notice, onNew, onGoToInsight }: DecisionsCardProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const rows = decisions.filter((d) => filter === 'all' || d.kind === filter)
  const topicOf = (d: Decision) => (d.kind === 'manager' ? d.category : (findKpi(def, d.kpi_key)?.topic.label ?? ''))
  const toggle = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id); else next.add(id)
    setExpanded(next)
  }

  return (
    <section className="card" aria-labelledby="decisions-title">
      <div className="card__head">
        <Icon name="target" size={24} className="card__icon" />
        <h2 className="t-h2" id="decisions-title">החלטות</h2>
        <button type="button" className="btn btn--primary" id="new-decision" onClick={onNew}>החלטה חדשה</button>
      </div>
      <div aria-live="polite">{notice && <div style={{ marginBottom: 16 }}>{notice}</div>}</div>
      <div className="stack">
        <Segmented
          label="סינון החלטות"
          value={filter}
          onChange={setFilter}
          options={[{ value: 'all', label: 'כל ההחלטות' }, { value: 'kpi', label: 'החלטות מדד' }, { value: 'manager', label: 'החלטות מנהל' }]}
        />
        {decisions.length === 0 ? (
          <div className="empty stack">
            <p className="secondary">עדיין לא נשמרו החלטות</p>
            <div><button type="button" className="btn btn--secondary" onClick={onNew}>החלטה חדשה</button></div>
          </div>
        ) : rows.length === 0 ? (
          <p className="secondary">אין החלטות מהסוג הזה</p>
        ) : (
          <div className="table-wrap">
            <table className="table table--cards">
              <thead>
                <tr>{['תאריך', 'סוג', 'נושא', 'כיוון רצוי', 'תוצאה / סימון', 'סטטוס'].map((h) => <th key={h} scope="col">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.flatMap((d) => {
                  const open = expanded.has(d.id)
                  const main = (
                    <tr key={d.id}>
                      <td>
                        <button type="button" className="btn btn--text" aria-expanded={open} onClick={() => toggle(d.id)}>
                          <Icon name={open ? 'chevron-down' : 'chevron-left'} size={16} />
                          <Num>{formatDate(d.created_at.slice(0, 10))}</Num>
                        </button>
                      </td>
                      <td>{d.kind === 'kpi' ? 'החלטת מדד' : 'החלטת מנהל'}</td>
                      <td>{topicOf(d)}</td>
                      <td><DirCell d={d} /></td>
                      <td><ResultCell d={d} /></td>
                      <td><StatusChip kind={d.kind === 'manager' ? 'saved' : d.outcome_status === 'pending' ? 'pending' : 'completed'} /></td>
                    </tr>
                  )
                  return open
                    ? [main, <tr key={d.id + '-d'} className="table__detail"><td colSpan={6}><Detail d={d} def={def} onGoToInsight={onGoToInsight} /></td></tr>]
                    : [main]
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
