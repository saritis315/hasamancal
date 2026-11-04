import { cloneElement, useId, type ReactElement } from 'react'
import { Icon } from './Icon.tsx'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  /** שדה אחד (input, select או textarea). Field מוסיף לו id, aria-describedby ו-aria-invalid. */
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>
}

/** שדה עם תווית מקושרת, הנחיה והודעת שגיאה (DESIGN.md סעיף 3.2). */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId()
  const describedBy = [hint ? id + '-hint' : null, error ? id + '-err' : null].filter(Boolean).join(' ') || undefined
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      {cloneElement(children, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && <div className="field__hint" id={id + '-hint'}>{hint}</div>}
      {error && (
        <div className="field__error" id={id + '-err'}>
          <Icon name="alert-triangle" size={16} />
          {error}
        </div>
      )}
    </div>
  )
}
