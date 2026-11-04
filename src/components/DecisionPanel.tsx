import { useEffect, useId, useRef, useState } from 'react'
import type { Decision, DecisionSaveReq, Definition, Direction, MetricValue } from '../lib/types.ts'
import { callApi } from '../lib/api.ts'
import { addDays, formatNumber, formatWeekRange, todayIso } from '../lib/format.ts'
import { Field } from './Field.tsx'
import { Icon } from './Icon.tsx'
import { Notice } from './Notice.tsx'
import { Num } from './NumText.tsx'
import { Segmented } from './Segmented.tsx'
import { useFocusInvalid } from './useFocusInvalid.ts'

interface DecisionPanelProps {
  def: Definition
  /** שורות השבוע האחרון בנתונים. */
  metrics: MetricValue[]
  presets: { kpi_key?: string; insight_id?: string | null }
  onClose: () => void
  onSaved: (decision: Decision) => void
}

type Mode = 'kpi' | 'manager'
type Errors = Record<string, string>

/** פאנל "החלטה חדשה" (DESIGN.md סעיף 4.6): החלטת מדד והחלטת מנהל. */
export function DecisionPanel({ def, metrics, presets, onClose, onSaved }: DecisionPanelProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<Element | null>(document.activeElement)
  const [mode, setMode] = useState<Mode>('kpi')
  const [errors, setErrors] = useState<Errors>({})
  const [saveError, setSaveError] = useState<{ title: string; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  useFocusInvalid(errors, panelRef)

  // החלטת מדד
  const [kpiKey, setKpiKey] = useState(presets.kpi_key ?? '')
  const [kText, setKText] = useState('')
  const [kDir, setKDir] = useState<Direction | ''>('')
  const [kDate, setKDate] = useState('')
  // החלטת מנהל
  const [mCat, setMCat] = useState('')
  const [mDesc, setMDesc] = useState('')
  const [mText, setMText] = useState('')
  const [mReason, setMReason] = useState('')
  const [mDate, setMDate] = useState(todayIso())
  const [mType, setMType] = useState<'one_off' | 'precedent' | ''>('')

  const allKpis = def.topics.flatMap((t) => t.kpis)
  const totalRow = (key: string) => metrics.find((m) => m.kpi_key === key && m.activity_key === 'total' && m.customer_type === 'total')
  const baselineRow = kpiKey ? totalRow(kpiKey) : undefined
  const baselineKpi = allKpis.find((k) => k.key === kpiKey)

  // פוקוס פנימה בפתיחה, חזרה לפותח בסגירה, Escape, ולכידת Tab בתוך הפאנל
  useEffect(() => {
    const opener = openerRef.current as HTMLElement | null
    panelRef.current?.querySelector<HTMLElement>(presets.kpi_key ? 'textarea' : 'select')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = [...panelRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea')]
        .filter((n) => !(n as HTMLButtonElement).disabled && n.offsetParent !== null)
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); opener?.focus() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function validate(): Errors {
    const e: Errors = {}
    if (mode === 'kpi') {
      if (!kpiKey) e.kpi = 'יש לבחור מדד'
      if (!kText.trim()) e.ktext = 'יש להזין תיאור להחלטה'
      if (!kDir) e.kdir = 'יש לבחור כיוון רצוי'
      if (!kDate) e.kdate = 'יש לבחור תאריך בדיקה'
      else if (kDate <= todayIso()) e.kdate = 'תאריך הבדיקה חייב להיות עתידי'
    } else {
      if (!mCat.trim()) e.mcat = 'יש להזין קטגוריה'
      if (!mDesc.trim()) e.mdesc = 'יש להזין תיאור להחלטה'
      if (!mText.trim()) e.mtext = 'יש להזין את ההחלטה'
      if (!mReason.trim()) e.mreason = 'יש להזין סיבה'
      if (!mDate) e.mdate = 'יש לבחור תאריך'
      if (!mType) e.mtype = 'יש לבחור סוג'
    }
    return e
  }

  async function save() {
    setSaveError(null)
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    const payload: DecisionSaveReq = mode === 'kpi'
      ? { kind: 'kpi', kpi_key: kpiKey, activity_key: 'total', customer_type: 'total', decision_text: kText.trim(),
          desired_direction: kDir as Direction, check_date: kDate, insight_id: presets.insight_id ?? null }
      : { kind: 'manager', category: mCat.trim(), description: mDesc.trim(), decision_text: mText.trim(),
          reason: mReason.trim(), case_date: mDate, is_precedent: mType === 'precedent' }
    setBusy(true)
    const res = await callApi('decision_save', payload)
    setBusy(false)
    if (res.ok) { onSaved(res.decision); return }
    setSaveError(
      res.detail === 'no_value' ? { title: 'ההחלטה לא נשמרה.', text: 'אין ערך למדד הזה, ולכן אי אפשר לקבוע ערך בסיס.' }
        : res.detail === 'check_date' ? { title: 'ההחלטה לא נשמרה.', text: 'תאריך הבדיקה חייב להיות עתידי.' }
          : { title: 'ההחלטה לא נשמרה.', text: 'אפשר לנסות שוב.' },
    )
  }

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div ref={panelRef} className="panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="panel__head">
          <h2 className="t-h2 grow" id={titleId}>החלטה חדשה</h2>
          <button type="button" className="icon-btn" aria-label="סגירה" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="panel__body stack">
          <Segmented<Mode>
            label="סוג ההחלטה"
            value={mode}
            onChange={(v) => { setMode(v); setSaveError(null); setErrors({}) }}
            options={[{ value: 'kpi', label: 'החלטת מדד' }, { value: 'manager', label: 'החלטת מנהל' }]}
          />
          <div aria-live="assertive">{saveError && <Notice type="error" title={saveError.title}>{saveError.text}</Notice>}</div>

          {mode === 'kpi' ? (
            <div className="stack">
              <Field label="מדד" error={errors.kpi}>
                <select className="select" value={kpiKey} onChange={(e) => setKpiKey(e.target.value)}>
                  <option value="">בחרו מדד</option>
                  {def.topics.map((t) => (
                    <optgroup key={t.key} label={t.label}>
                      {t.kpis.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <div className="sunken" aria-live="polite">
                {!kpiKey ? <span className="muted">ערך נוכחי של המדד: יוצג אחרי בחירת מדד</span>
                  : !baselineRow || !baselineKpi ? <span className="accent-text">אין ערך נוכחי למדד הזה, ולכן ההחלטה לא תישמר.</span>
                    : <>ערך נוכחי של המדד (יישמר כערך בסיס): <Num>{formatNumber(baselineRow.value, baselineKpi.unit)}</Num> · שבוע <Num>{formatWeekRange(baselineRow.period_start)}</Num></>}
              </div>
              <Field label="תיאור ההחלטה" error={errors.ktext}>
                <textarea className="textarea" maxLength={1000} value={kText} onChange={(e) => setKText(e.target.value)} />
              </Field>
              <Field label="כיוון רצוי" error={errors.kdir}>
                <select className="select" value={kDir} onChange={(e) => setKDir(e.target.value as Direction | '')}>
                  <option value="">בחרו כיוון</option>
                  <option value="up">עלייה</option>
                  <option value="down">ירידה</option>
                </select>
              </Field>
              <Field label="תאריך בדיקה" error={errors.kdate}>
                <input className="input" type="date" min={addDays(todayIso(), 1)} value={kDate} onChange={(e) => setKDate(e.target.value)} />
              </Field>
            </div>
          ) : (
            <div className="stack">
              <Notice type="info" title="שימו לב.">אין להזין שם או פרטים מזהים של לקוח או שותף.</Notice>
              <Field label="קטגוריה" error={errors.mcat}>
                <input className="input" type="text" maxLength={60} value={mCat} onChange={(e) => setMCat(e.target.value)} />
              </Field>
              <Field label="תיאור ההחלטה" error={errors.mdesc}>
                <textarea className="textarea" maxLength={1000} value={mDesc} onChange={(e) => setMDesc(e.target.value)} />
              </Field>
              <Field label="ההחלטה" error={errors.mtext}>
                <textarea className="textarea" maxLength={1000} value={mText} onChange={(e) => setMText(e.target.value)} />
              </Field>
              <Field label="סיבה" error={errors.mreason}>
                <textarea className="textarea" maxLength={1000} value={mReason} onChange={(e) => setMReason(e.target.value)} />
              </Field>
              <Field label="תאריך" error={errors.mdate}>
                <input className="input" type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} />
              </Field>
              <fieldset className="fieldset">
                <legend className="field__label">סוג</legend>
                <div className="row">
                  <label className="check"><input type="radio" name="decision-type" checked={mType === 'one_off'} onChange={() => setMType('one_off')} />חד-פעמי</label>
                  <label className="check"><input type="radio" name="decision-type" checked={mType === 'precedent'} onChange={() => setMType('precedent')} />תקדים</label>
                </div>
                {errors.mtype && <div className="field__error"><Icon name="alert-triangle" size={16} />{errors.mtype}</div>}
              </fieldset>
            </div>
          )}
        </div>
        <div className="panel__foot">
          <button type="button" className="btn btn--primary" disabled={busy} onClick={save}>{mode === 'kpi' ? 'שמור החלטה' : 'שמור'}</button>
          <button type="button" className="btn btn--secondary" onClick={onClose}>ביטול</button>
        </div>
      </div>
    </>
  )
}
