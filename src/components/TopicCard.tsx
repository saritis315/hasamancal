import type { CustomerType, Definition, Kpi, MetricValue, Topic } from '../lib/types.ts'
import { formatNumber } from '../lib/format.ts'
import { Accordion } from './Accordion.tsx'
import { ChangeChip, ChangeValue, StatusChip } from './Chip.tsx'
import { Icon, type IconName } from './Icon.tsx'
import { Num } from './NumText.tsx'

const TOPIC_ICON: Record<string, IconName> = { leads: 'users', sales: 'shopping-cart', finance: 'coin' }
const CT_LABEL: Record<string, string> = { new: 'לקוחות חדשים', existing: 'לקוחות קיימים' }

type Index = (kpiKey: string, activityKey: string, customerType: CustomerType) => MetricValue | undefined

function KpiLine({ kpi, row }: { kpi: Kpi; row: MetricValue | undefined }) {
  return (
    <div className="kpi-row">
      <span className="kpi-row__name">{kpi.label}</span>
      <span className="kpi-row__value t-kpi-row">{row ? <Num>{formatNumber(row.value, kpi.unit)}</Num> : <StatusChip kind="no_data" />}</span>
      <span className="row" style={{ gap: 8 }}>
        {row && <ChangeChip metric={row} higherIsBetter={kpi.higher_is_better} />}
        {row && <ChangeValue metric={row} />}
      </span>
    </div>
  )
}

function SegmentList({ kpi, def, index }: { kpi: Kpi; def: Definition; index: Index }) {
  const segs: [string, CustomerType][] = def.activity_areas.map((a) => [a.key, 'total'])
  if (kpi.by_customer_type) segs.push(['total', 'new'], ['total', 'existing'])
  return (
    <div>
      {segs.map(([act, ct]) => {
        const r = index(kpi.key, act, ct)
        const label = act !== 'total' ? (def.activity_areas.find((a) => a.key === act)?.label ?? act) : (CT_LABEL[ct] ?? ct)
        return (
          <div key={act + ct} className="list-row">
            <span className="grow">{label}</span>
            {r && <span className="t-body-lg"><Num>{formatNumber(r.value, kpi.unit)}</Num></span>}
            {r ? <ChangeChip metric={r} higherIsBetter={kpi.higher_is_better} /> : <StatusChip kind="no_data" />}
            {r && <ChangeValue metric={r} />}
          </div>
        )
      })}
    </div>
  )
}

/** כרטיס נושא: 4 שורות KPI ופילוח מתקפל (DESIGN.md סעיפים 3.5 ו-4.3). */
export function TopicCard({ topic, def, index, hasAnomaly }: { topic: Topic; def: Definition; index: Index; hasAnomaly: boolean }) {
  const titleId = 'topic-' + topic.key
  return (
    <section className="card" aria-labelledby={titleId}>
      <div className="card__head">
        <Icon name={TOPIC_ICON[topic.key]} size={24} className="card__icon" />
        <h2 className="t-h2" id={titleId}>{topic.label}</h2>
        {hasAnomaly && <StatusChip kind="anomaly" />}
      </div>
      <div>{topic.kpis.map((k) => <KpiLine key={k.key} kpi={k} row={index(k.key, 'total', 'total')} />)}</div>
      <Accordion trigger={<span className="link-text">פילוח לפי תחום פעילות וסוג לקוח</span>}>
        <div className="stack">
          {topic.kpis.map((k) => (
            <div key={k.key}>
              <h4 className="t-h3">{k.label}</h4>
              <SegmentList kpi={k} def={def} index={index} />
            </div>
          ))}
        </div>
      </Accordion>
    </section>
  )
}
