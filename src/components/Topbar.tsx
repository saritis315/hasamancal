import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon.tsx'
import { Logo } from './Logo.tsx'

type Active = 'snapshot' | 'setup'
const LINKS: { id: Active; to: string; label: string }[] = [
  { id: 'snapshot', to: '/snapshot', label: 'תמונת מצב' },
  { id: 'setup', to: '/setup', label: 'הקמה והעלאה' },
]

/**
 * סרגל עליון (מחשב) וניווט תחתון (נייד), עם תפריט משתמש.
 * הנחה: בנייד אין תפריט המבורגר נפרד. "הקמת עסק מחדש" ו"יציאה" בתפריט המשתמש.
 */
export function Topbar({ active, businessName, onSignOut }: { active: Active; businessName?: string; onSignOut: () => void }) {
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() }
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  const tabs = LINKS.map((l) => (
    <Link key={l.id} className="tab" to={l.to} aria-current={active === l.id ? 'page' : undefined}>{l.label}</Link>
  ))

  return (
    <>
      <header className="topbar">
        <div className="container topbar__inner">
          <Link className="brand" to="/snapshot" aria-label="הסמנכל, לתמונת מצב"><Logo /></Link>
          <nav className="tabs" aria-label="ניווט ראשי">{tabs}</nav>
          <div className="topbar__side">
            {businessName && <span className="chip chip--neutral">{businessName}</span>}
            <div className="user-menu">
              <button ref={btnRef} type="button" className="user-menu__btn" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>
                <Icon name="user" />
                <span className="user-menu__label">מנהל העסק</span>
                <Icon name="chevron-down" size={16} />
              </button>
              <div ref={menuRef} className="menu" id={menuId} hidden={!open}>
                <Link className="menu__item" to="/setup?restart=1" onClick={() => setOpen(false)}>הקמת עסק מחדש</Link>
                <button type="button" className="menu__item" onClick={onSignOut}>יציאה</button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <nav className="bottom-nav" aria-label="ניווט תחתון">{tabs}</nav>
    </>
  )
}
