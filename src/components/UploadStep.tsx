import { useEffect, useState, type DragEvent } from 'react'
import { Link, useNavigate } from "react-router-dom"
import type { Counts, Definition } from '../lib/types.ts'
import { saveMetrics } from '../lib/api.ts'
import { listDemoBusinesses, loadDemoBusiness, type DemoBusiness } from '../lib/demo.ts'
import { computeMetrics } from '../lib/engine.ts'
import { buildTemplate, parseAndValidate, validKeys } from '../lib/filecontract.ts'
import { todayIso } from '../lib/format.ts'
import { downloadText } from '../lib/setup.ts'
import { Accordion } from './Accordion.tsx'
import { Icon } from './Icon.tsx'
import { Notice } from './Notice.tsx'

interface UploadStepProps {
  definition: Definition
  /** כשיש כבר עסק: העלאת נתונים נוספים, ובחירה בעסק דמה מחליפה אותו. */
  existing: Counts | null
  /** true כשהמסך נפתח רק להעלאת נתונים נוספים, בלי הקמה. */
  uploadOnly: boolean
}

/** שלב 3: הורדת תבנית, העלאת קובץ ועסקי דמה (DESIGN.md סעיף 4.2, F3, F4, F5). */
export function UploadStep({ definition, existing, uploadOnly }: UploadStepProps) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState('')
  const [uploadError, setUploadError] = useState<{ line: number | null; message: string } | null>(null)
  const [over, setOver] = useState(false)
  const [demos, setDemos] = useState<DemoBusiness[] | null>(null)
  const [demosFailed, setDemosFailed] = useState(false)
  const keys = validKeys(definition)

  useEffect(() => {
    let cancelled = false
    listDemoBusinesses().then((l) => { if (!cancelled) setDemos(l) }).catch(() => { if (!cancelled) setDemosFailed(true) })
    return () => { cancelled = true }
  }, [])

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploadError(null)
    setBusy('קורא את הקובץ')
    const res = await parseAndValidate(file, definition)
    if (!res.ok) { setBusy(''); setUploadError({ line: res.line, message: res.message }); return }
    setBusy('שומר את הנתונים')
    try {
      await saveMetrics(computeMetrics(definition, res.rows))
    } catch {
      setBusy('')
      setUploadError({ line: null, message: 'שמירת הנתונים נכשלה.' })
      return
    }
    navigate('/snapshot')
  }

  async function chooseDemo(key: string) {
    setUploadError(null)
    setBusy('טוען עסק דמה')
    try {
      await loadDemoBusiness(key)
      navigate('/snapshot')
    } catch {
      setBusy('')
      setUploadError({ line: null, message: 'עסק הדמה לא נטען.' })
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    void handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="stack-lg" style={{ maxWidth: 820 }}>
      {uploadOnly && (
        <Notice type="info" title="העלאת נתונים נוספים.">
          אפשר להעלות קובץ חדש לעסק הקיים. שבוע שכבר קיים יתעדכן. הקובץ צריך לכלול גם את השבוע הקודם לכל שבוע חדש, כדי שאפשר יהיה להשוות.
        </Notice>
      )}

      <section className="card stack">
        <h2 className="t-h2">העלאת נתונים</h2>
        <div>
          <button type="button" className="btn btn--secondary" onClick={() => { const t = buildTemplate(definition, todayIso()); downloadText(t.filename, t.csv) }}>
            <Icon name="download" />הורדת תבנית
          </button>
        </div>
        <Accordion trigger={<span className="link-text">המפתחות התקפים לחתכים אופציונליים</span>}>
          <div className="stack">
            <p className="secondary">שורות בסך הכול מספיקות. אפשר להוסיף שורות של חתכים, עם המפתחות האלה:</p>
            <div>
              <h4 className="t-h3">מדדים (kpi_key)</h4>
              <ul>{keys.kpis.map((k) => <li key={k.key}><code className="num">{k.key}</code> {k.label}{k.by_customer_type ? ' (אפשר גם חתך לפי סוג לקוח)' : ''}</li>)}</ul>
            </div>
            <div>
              <h4 className="t-h3">תחומי פעילות (activity_key)</h4>
              <ul>
                <li><code className="num">total</code> סך הכול</li>
                {keys.areas.map((a) => <li key={a.key}><code className="num">{a.key}</code> {a.label}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="t-h3">סוגי לקוח (customer_type)</h4>
              <ul>
                <li><code className="num">total</code> סך הכול</li>
                <li><code className="num">new</code> לקוח חדש</li>
                <li><code className="num">existing</code> לקוח קיים</li>
              </ul>
            </div>
          </div>
        </Accordion>

        <input
          type="file" id="f-file" className="visually-hidden" accept=".csv,.xlsx"
          onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = '' }}
        />
        <div
          className={'dropzone' + (over ? ' is-over' : '')} id="dropzone"
          onDragEnter={(e) => { e.preventDefault(); setOver(true) }} onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={(e) => { e.preventDefault(); setOver(false) }} onDrop={onDrop}
        >
          <Icon name="upload" size={32} />
          <p>גוררים לכאן קובץ CSV או Excel</p>
          <p className="t-small muted">עד 2MB</p>
          <label className="btn btn--secondary" htmlFor="f-file">בחירת קובץ</label>
        </div>
        {busy && <p className="progress-msg" role="status">{busy}</p>}
        {uploadError && (
          <Notice type="error" title="הקובץ לא נקלט.">
            {uploadError.line ? `שורה ${uploadError.line}: ` : ''}{uploadError.message}
          </Notice>
        )}
      </section>

      <section className="card stack">
        <h2 className="t-h2">או נסו עסק דמה</h2>
        {existing && <Notice type="warning" title="בחירה בעסק דמה תחליף את ההגדרה והנתונים הקיימים." />}
        <div className="stack">
          {demosFailed ? <Notice type="error" title="רשימת עסקי הדמה לא נטענה." />
            : demos === null ? <p className="progress-msg">טוען עסקי דמה</p>
              : demos.map((b) => (
                <div key={b.key} className="list-row">
                  <div className="grow">
                    <div className="list-row__title">{b.name}</div>
                    <div className="list-row__sub">{b.description}</div>
                  </div>
                  <button type="button" className="btn btn--secondary" disabled={!!busy} onClick={() => void chooseDemo(b.key)}>טעינת עסק הדמה</button>
                </div>
              ))}
        </div>
      </section>

      {uploadOnly && <p><Link to="/setup?restart=1">הקמת עסק מחדש</Link></p>}
    </div>
  )
}
