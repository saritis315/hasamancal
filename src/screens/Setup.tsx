import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Counts, Definition, Proposal } from '../lib/types.ts'
import { callApi } from '../lib/api.ts'
import { signOut } from '../lib/auth.ts'
import { buildDefinition, MAX_ANSWER, MAX_DESC } from '../lib/setup.ts'
import { Field } from '../components/Field.tsx'
import { Icon } from '../components/Icon.tsx'
import { Notice } from '../components/Notice.tsx'
import { ProposalEditor } from '../components/ProposalEditor.tsx'
import { Stepper } from '../components/Stepper.tsx'
import { Topbar } from '../components/Topbar.tsx'
import { UploadStep } from '../components/UploadStep.tsx'
import { useFocusInvalid } from '../components/useFocusInvalid.ts'

/** הקמה והעלאה (F1 עד F5): שלושה שלבים, או העלאת נתונים נוספים כשכבר יש עסק. */
export default function Setup() {
  // מעבר בין "העלאת נתונים" ל"הקמה מחדש" מאפס את המסך (מפתח שונה)
  const [params] = useSearchParams()
  return <SetupFlow key={params.has('restart') ? 'restart' : 'normal'} />
}

function SetupFlow() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const restart = params.has('restart')

  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [uploadOnly, setUploadOnly] = useState(false)
  const [step, setStep] = useState(1)
  const [businessName, setBusinessName] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<string[] | null>(null)
  const [answers, setAnswers] = useState<string[]>([])
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [definition, setDefinition] = useState<Definition | null>(null)
  const [existing, setExisting] = useState<Counts | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({})

  useFocusInvalid(errors)

  useEffect(() => {
    let cancelled = false
    void callApi('config_get').then((cfg) => {
      if (cancelled) return
      if (!cfg.ok) { setLoadFailed(true); setLoading(false); return }
      if (cfg.config) {
        setExisting(cfg.counts)
        setDefinition(cfg.config.definition)
        setBusinessName(cfg.config.name)
        if (!restart) { setUploadOnly(true); setStep(3) }
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [restart])

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  function goStep(n: number) {
    setStep(n)
    setError(null)
    window.scrollTo({ top: 0 })
  }

  async function submitStep1() {
    const e = { name: name.trim() ? undefined : 'יש להזין שם לעסק', description: description.trim() ? undefined : 'יש להזין תיאור' }
    setErrors(e)
    if (e.name || e.description) return
    setBusy('מכין הצעה')
    setError(null)
    const sent = questions ? answers.slice(0, questions.length).map((a) => a.trim().slice(0, MAX_ANSWER)) : []
    const res = await callApi('setup', { description: description.trim(), answers: sent })
    setBusy('')
    if (!res.ok) { setError('לא הצלחנו להכין הצעה.'); return }
    if (res.type === 'questions') { setQuestions(res.questions); setAnswers(res.questions.map(() => '')); return }
    setProposal(res.proposal)
    goStep(2)
  }

  async function approve() {
    if (!proposal) return
    setBusy('שומר את ההגדרה')
    setError(null)
    const def = buildDefinition(proposal)
    const res = await callApi('config_save', { name: name.trim(), description: description.trim(), definition: def, source: 'setup', replace: !!existing })
    setBusy('')
    if (!res.ok) { setError('השמירה נכשלה.'); return }
    setDefinition(def)
    setExisting(null)
    setBusinessName(name.trim())
    goStep(3)
  }

  if (loading) return <main className="page container"><p className="progress-msg" role="status">טוען</p></main>
  if (loadFailed) return <main className="page container"><Notice type="error" title="המסך לא נטען.">אפשר לרענן את הדף ולנסות שוב.</Notice></main>

  return (
    <>
      <Topbar active="setup" businessName={businessName} onSignOut={handleSignOut} />
      <main className="page container" id="main" tabIndex={-1}>
        <div className="page-head"><h1 className="t-h1">{uploadOnly ? 'העלאת נתונים' : 'הקמת העסק'}</h1></div>
        <div className="stack-lg">
          {!uploadOnly && <Stepper step={step} />}

          {step === 1 && (
            <div className="card stack" style={{ maxWidth: 720 }}>
              <h2 className="t-h2">ספרו לנו על העסק</h2>
              <Field label="שם העסק" error={errors.name}>
                <input className="input" type="text" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="תיאור העסק" hint="אין להזין שם או פרטים מזהים של אדם." error={errors.description}>
                <textarea className="textarea" maxLength={MAX_DESC} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
              {questions && (
                <div className="stack">
                  <div className="bubble bubble--assistant"><Icon name="sparkles" /><span>כדי להכין הצעה מתאימה, חסר לנו קצת מידע.</span></div>
                  {questions.map((q, i) => (
                    <Field key={q} label={q}>
                      <textarea
                        className="textarea" maxLength={MAX_ANSWER} value={answers[i] ?? ''}
                        onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))}
                      />
                    </Field>
                  ))}
                </div>
              )}
              {error && <Notice type="error" title={error}>אפשר לנסות שוב.</Notice>}
              {busy && <p className="progress-msg" role="status">{busy}</p>}
              <div>
                <button type="button" className="btn btn--primary btn--lg" disabled={!!busy} onClick={() => void submitStep1()}>
                  {questions ? 'שליחה' : 'המשך'}<Icon name="arrow-left" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && proposal && (
            <ProposalEditor
              name={name} description={description} questions={questions} answers={answers}
              proposal={proposal} onChange={setProposal} existing={existing}
              busy={busy} error={error} onBack={() => goStep(1)} onApprove={() => void approve()}
            />
          )}

          {step === 3 && definition && <UploadStep definition={definition} existing={existing} uploadOnly={uploadOnly} />}
        </div>
      </main>
    </>
  )
}
