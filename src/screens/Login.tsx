import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { callApi } from '../lib/api.ts'
import { getSession, signIn } from '../lib/auth.ts'
import { Field } from '../components/Field.tsx'
import { Logo } from '../components/Logo.tsx'
import { Notice } from '../components/Notice.tsx'

/** התחברות (F17, DESIGN.md סעיף 4.1): אימייל וסיסמה בלבד. אין הרשמה, שחזור סיסמה או כניסה עם Google. */
export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  // אחרי כניסה: אם אין הגדרת עסק, הקמה. אחרת, תמונת מצב.
  async function goAfterLogin() {
    const cfg = await callApi('config_get')
    navigate(cfg.ok && cfg.config ? '/snapshot' : '/setup', { replace: true })
  }

  // מי שכבר מחוברת עוברת הלאה בלי להציג את הטופס
  useEffect(() => {
    if (getSession()) void goAfterLogin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFailed(false)
    const next = { email: email.trim() ? undefined : 'יש להזין אימייל', password: password ? undefined : 'יש להזין סיסמה' }
    setErrors(next)
    if (next.email || next.password) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setBusy(true)
    const res = await signIn(email, password)
    if (!res.ok) { setBusy(false); setFailed(true); return } // הודעה כללית, בלי פירוט
    await goAfterLogin()
  }

  return (
    <main className="login" id="main">
      <div className="card login__card stack-lg">
        <div className="t-display"><Logo /></div>
        <p className="t-body-lg secondary">לדעת מה קורה. להחליט מה לעשות.</p>
        <form className="stack" noValidate onSubmit={(e) => void submit(e)}>
          <Field label="אימייל" error={errors.email}>
            <input className="input" type="email" autoComplete="username" dir="ltr" style={{ textAlign: 'start' }} autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="סיסמה" error={errors.password}>
            <input className="input" type="password" autoComplete="current-password" dir="ltr" style={{ textAlign: 'start' }} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <div aria-live="assertive">{failed && <Notice type="error" title="פרטי הכניסה שגויים" />}</div>
          <button type="submit" className="btn btn--primary btn--lg" style={{ width: '100%' }} disabled={busy}>{busy ? 'נכנס' : 'כניסה'}</button>
        </form>
      </div>
    </main>
  )
}
