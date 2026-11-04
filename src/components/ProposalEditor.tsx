import { useId, useState } from 'react'
import type { Counts, Proposal, ProposalKpi, Unit } from '../lib/types.ts'
import { formatNumber } from '../lib/format.ts'
import { MAX_AREAS, MAX_LABEL, TOPICS, UNIT_LABEL, validateProposal } from '../lib/setup.ts'
import { Accordion } from './Accordion.tsx'
import { Icon } from './Icon.tsx'
import { Notice } from './Notice.tsx'

interface ProposalEditorProps {
  name: string
  description: string
  questions: string[] | null
  answers: string[]
  proposal: Proposal
  onChange: (p: Proposal) => void
  /** מספר השורות שיימחקו בהקמה מחדש, או null כשאין הגדרה קיימת. */
  existing: Counts | null
  busy: string
  error: string | null
  onBack: () => void
  onApprove: () => void
}

/** שלב 2: אישור ההצעה, עם עריכת כל שדה (DESIGN.md סעיף 4.2). */
export function ProposalEditor(props: ProposalEditorProps) {
  const { name, description, questions, answers, proposal, onChange, existing, busy, error, onBack, onApprove } = props
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [newArea, setNewArea] = useState('')
  const addId = useId()

  const updateKpi = (ti: number, ki: number, patch: Partial<ProposalKpi>) => {
    onChange({
      ...proposal,
      topics: proposal.topics.map((t, i) => (i !== ti ? t : { ...t, kpis: t.kpis.map((k, j) => (j !== ki ? k : { ...k, ...patch })) })),
    })
  }

  function addArea() {
    const v = newArea.trim()
    if (!v) return
    if (proposal.activity_areas.length >= MAX_AREAS) { setErrors({ ...errors, areas: `אפשר עד ${MAX_AREAS} תחומי פעילות` }); return }
    onChange({ ...proposal, activity_areas: [...proposal.activity_areas, { label: v }] })
    setNewArea('')
    setErrors((e) => { const { areas: _a, ...rest } = e; return rest })
  }

  function approve() {
    const errs = validateProposal(proposal)
    setErrors(errs)
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => document.querySelector('.field__error')?.scrollIntoView({ block: 'center' }))
      return
    }
    onApprove()
  }

  const err = (id: string) => errors[id] && <div className="field__error"><Icon name="alert-triangle" size={16} />{errors[id]}</div>

  return (
    <div className="setup-split">
      <aside className="card stack" aria-label="השיחה">
        <h2 className="t-h3">השיחה</h2>
        <div className="chat">
          <div className="bubble bubble--user"><strong>{name}</strong><br />{description}</div>
          {questions?.map((q, i) => (
            <div key={q} className="chat">
              <div className="bubble bubble--assistant"><Icon name="sparkles" /><span>{q}</span></div>
              {answers[i] && <div className="bubble bubble--user">{answers[i]}</div>}
            </div>
          ))}
          <div className="bubble bubble--assistant"><Icon name="sparkles" /><span>הכנו הצעה לאישור. אפשר לתקן כל שדה.</span></div>
        </div>
        <div>
          <button type="button" className="btn btn--secondary" onClick={onBack}><Icon name="arrow-right" />חזרה לשיחה</button>
        </div>
      </aside>

      <div className="stack-lg">
        {existing && (
          <Notice type="warning" title="הקמה מחדש תמחק את ההגדרה ואת כל הנתונים הקיימים.">
            יימחקו: ההגדרה, {formatNumber(existing.metric_values, 'count')} ערכי מדדים, {formatNumber(existing.insights, 'count')} תובנות
            ו-{formatNumber(existing.decisions, 'count')} החלטות.
          </Notice>
        )}

        {proposal.topics.map((t, ti) => {
          const label = TOPICS.find((x) => x.key === t.key)?.label ?? t.key
          return (
            <section key={t.key} className="card">
              <Accordion defaultOpen={ti === 0} trigger={<span className="t-h2">{label}</span>}>
                <div className="editor-head t-small muted" aria-hidden="true">
                  {['שם', 'הגדרה', 'יחידה', 'כיוון טוב', 'סף חריגה (%)'].map((h) => <span key={h}>{h}</span>)}
                </div>
                {t.kpis.map((k, ki) => {
                  const base = `${ti}.${ki}`
                  const aria = (part: string) => `${label}, מדד ${ki + 1}: ${part}`
                  return (
                    <div key={ki} className="editor-kpi">
                      <input className="input" type="text" aria-label={aria('שם')} value={k.label} onChange={(e) => updateKpi(ti, ki, { label: e.target.value })} />
                      <input className="input" type="text" aria-label={aria('הגדרה')} value={k.definition} onChange={(e) => updateKpi(ti, ki, { definition: e.target.value })} />
                      <select className="select" aria-label={aria('יחידה')} value={k.unit} onChange={(e) => updateKpi(ti, ki, { unit: e.target.value as Unit })}>
                        {(Object.keys(UNIT_LABEL) as Unit[]).map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
                      </select>
                      <select className="select" aria-label={aria('כיוון טוב')} value={k.higher_is_better ? 'up' : 'down'} onChange={(e) => updateKpi(ti, ki, { higher_is_better: e.target.value === 'up' })}>
                        <option value="up">עלייה טובה</option>
                        <option value="down">ירידה טובה</option>
                      </select>
                      <input
                        className="input" type="number" min="0" max="100" step="any" placeholder="בלי סף" aria-label={aria('סף חריגה באחוזים')}
                        value={k.threshold_pct ?? ''} onChange={(e) => updateKpi(ti, ki, { threshold_pct: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                      <div className="editor-kpi__err">{err(base + '.label')}{err(base + '.definition')}{err(base + '.threshold')}</div>
                    </div>
                  )
                })}
              </Accordion>
            </section>
          )
        })}

        <section className="card stack">
          <h3 className="t-h2">תחומי פעילות</h3>
          <label className="field__label" htmlFor={addId}>הוספת תחום</label>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {proposal.activity_areas.map((a, i) => (
              <span key={i} className="tag">
                {a.label}
                <button type="button" aria-label={`הסרת התחום ${a.label}`} onClick={() => onChange({ ...proposal, activity_areas: proposal.activity_areas.filter((_, j) => j !== i) })}>
                  <Icon name="x" size={16} />
                </button>
              </span>
            ))}
          </div>
          <div className="row">
            <input
              id={addId} className="input" type="text" style={{ maxWidth: 240 }} maxLength={MAX_LABEL + 20} value={newArea}
              onChange={(e) => setNewArea(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addArea() } }}
            />
            <button type="button" className="btn btn--secondary" onClick={addArea}><Icon name="plus" size={16} />הוספת תחום</button>
          </div>
          {err('areas')}
        </section>

        {error && <Notice type="error" title={error}>אפשר לנסות שוב.</Notice>}
        {busy && <p className="progress-msg" role="status">{busy}</p>}
        <div>
          <button type="button" className={'btn btn--lg ' + (existing ? 'btn--danger' : 'btn--primary')} disabled={!!busy} onClick={approve}>
            {existing ? 'מחיקה ואישור' : 'אישור והמשך'}<Icon name="arrow-left" />
          </button>
        </div>
      </div>
    </div>
  )
}
