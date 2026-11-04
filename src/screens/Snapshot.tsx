import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BusinessConfig, CustomerType, Decision, Insight, MetricValue } from '../lib/types.ts'
import { callApi } from '../lib/api.ts'
import { signOut } from '../lib/auth.ts'
import { isTotalRow, rankAnomalies } from '../lib/engine.ts'
import { formatWeekRange } from '../lib/format.ts'
import { AnomalyCard } from '../components/AnomalyCard.tsx'
import { DecisionPanel } from '../components/DecisionPanel.tsx'
import { DecisionsCard } from '../components/DecisionsCard.tsx'
import { Notice } from '../components/Notice.tsx'
import { Num } from '../components/NumText.tsx'
import { TopicCard } from '../components/TopicCard.tsx'
import { Topbar } from '../components/Topbar.tsx'

const MAX_AUTO_INSIGHTS = 6 // ARCHITECTURE.md סעיף 6.10 (הנחה)

interface Loaded {
  config: BusinessConfig
  lastWeek: string | null
  metrics: MetricValue[]
}
type Presets = { kpi_key?: string; insight_id?: string | null }

/** תמונת מצב (F18): כרטיס חריגות עם פירוט תובנה, שלושה כרטיסי נושא וכרטיס החלטות. */
export default function Snapshot() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [data, setData] = useState<Loaded | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set())
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set())
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [panel, setPanel] = useState<Presets | null>(null)
  const [notice, setNotice] = useState<ReactNode>(null)

  const withSet = (s: ReadonlySet<string>, id: string, on: boolean) => {
    const next = new Set(s)
    if (on) next.add(id); else next.delete(id)
    return next
  }

  /** יצירת תובנה (או יצירה מחדש של תובנה מיושנת) לחריגה אחת. */
  const createInsight = useCallback(async (m: MetricValue, regenerate: boolean) => {
    setPending((s) => withSet(s, m.id, true))
    setFailed((s) => withSet(s, m.id, false))
    const res = await callApi('insight', { metric_value_id: m.id, regenerate })
    setPending((s) => withSet(s, m.id, false))
    if (res.ok) setInsights((list) => list.filter((i) => i.metric_value_id !== m.id).concat(res.insight))
    else setFailed((s) => withSet(s, m.id, true))
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const snap = await callApi('snapshot')
      if (cancelled) return
      if (!snap.ok) { setStatus('error'); return }
      if (!snap.config) { navigate('/setup', { replace: true }); return }
      setData({ config: snap.config, lastWeek: snap.last_week, metrics: snap.metrics })
      setInsights(snap.insights)
      setDecisions(snap.decisions)
      setStatus('ready')

      // לכל חריגה של השבוע האחרון בנתונים בלי תובנה, ברצף, עד 6. השאר מקבלות כפתור "צור תובנה".
      const targets = rankAnomalies(snap.metrics.filter(isTotalRow))
        .filter((m) => !snap.insights.some((i) => i.metric_value_id === m.id))
        .slice(0, MAX_AUTO_INSIGHTS)
      for (let i = 0; i < targets.length; i++) {
        if (cancelled) return
        setProgress({ done: i + 1, total: targets.length })
        await createInsight(targets[i], false)
      }
      if (!cancelled) setProgress(null)
    })()
    return () => { cancelled = true }
  }, [navigate, createInsight])

  const metrics = data?.metrics
  const index = useMemo(() => {
    const map = new Map((metrics ?? []).map((m) => [`${m.kpi_key}|${m.activity_key}|${m.customer_type}`, m]))
    return (kpi: string, act: string, ct: CustomerType) => map.get(`${kpi}|${act}|${ct}`)
  }, [metrics])
  const anomalies = useMemo(() => rankAnomalies((metrics ?? []).filter(isTotalRow)), [metrics])

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  if (status === 'loading') return <main className="page container"><p className="progress-msg" role="status">טוען</p></main>
  if (status === 'error' || !data) {
    return <main className="page container"><Notice type="error" title="המסך לא נטען.">אפשר לרענן את הדף ולנסות שוב.</Notice></main>
  }

  const def = data.config.definition

  async function onSaved(d: Decision) {
    setPanel(null)
    const snap = await callApi('snapshot')
    if (snap.ok && snap.config) setDecisions(snap.decisions)
    setNotice(<Notice type="success" title="ההחלטה נשמרה.">{d.kind === 'kpi' ? 'נבדוק את התוצאה בתאריך שבחרת.' : null}</Notice>)
    document.getElementById('decisions-title')?.scrollIntoView({ block: 'start' })
  }

  function goToInsight(insightId: string) {
    const ins = insights.find((i) => i.id === insightId)
    if (!ins) return
    setOpenIds((s) => withSet(s, ins.metric_value_id, true))
    // גלילה לחריגה אחרי שנפתחה, מקישור בפירוט החלטה
    requestAnimationFrame(() => document.getElementById('anomaly-' + ins.metric_value_id)?.scrollIntoView({ block: 'center' }))
  }

  return (
    <>
      <Topbar active="snapshot" businessName={data.config.name} onSignOut={handleSignOut} />
      <main className="page container" id="main" tabIndex={-1}>
        <div className="page-head">
          <h1 className="t-h1">תמונת מצב</h1>
          {data.lastWeek && <span className="page-head__meta">השבוע שהסתיים: <Num>{formatWeekRange(data.lastWeek)}</Num></span>}
        </div>
        <div className="stack-lg">
          <AnomalyCard
            anomalies={anomalies} def={def} index={index} insights={insights}
            pending={pending} failed={failed} openIds={openIds}
            onToggleOpen={(id, open) => setOpenIds((s) => withSet(s, id, open))}
            progress={progress}
            onCreate={(m, regen) => void createInsight(m, regen)}
            onDecide={(presets) => setPanel(presets)}
          />
          <div className="topic-grid">
            {def.topics.map((t) => (
              <TopicCard
                key={t.key} topic={t} def={def} index={index}
                hasAnomaly={(metrics ?? []).some((m) => m.threshold_status === 'anomaly' && t.kpis.some((k) => k.key === m.kpi_key))}
              />
            ))}
          </div>
          <DecisionsCard def={def} decisions={decisions} notice={notice} onNew={() => setPanel({})} onGoToInsight={goToInsight} />
        </div>
      </main>
      {panel && <DecisionPanel def={def} metrics={data.metrics} presets={panel} onClose={() => setPanel(null)} onSaved={(d) => void onSaved(d)} />}
    </>
  )
}

