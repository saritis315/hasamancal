import { useId, useState, type ReactNode } from 'react'
import { Icon } from './Icon.tsx'

interface AccordionProps {
  trigger: ReactNode
  children: ReactNode
  /** מצב נשלט מבחוץ. בלעדיו האקורדיון מנהל את עצמו. */
  open?: boolean
  defaultOpen?: boolean
  onToggle?: (open: boolean) => void
}

/** אקורדיון: שורה שנפתחת במקום (DESIGN.md סעיף 3.7). כפתור אמיתי, ולכן נפתח וננעל במקלדת. */
export function Accordion({ trigger, children, open, defaultOpen = false, onToggle }: AccordionProps) {
  const id = useId()
  const [inner, setInner] = useState(defaultOpen)
  const isOpen = open ?? inner
  const toggle = () => {
    if (open === undefined) setInner(!isOpen)
    onToggle?.(!isOpen)
  }
  return (
    <div className="accordion">
      <button type="button" className="accordion__trigger" id={id + '-t'} aria-expanded={isOpen} aria-controls={id + '-p'} onClick={toggle}>
        <span className="grow">{trigger}</span>
        <span className="accordion__chevron"><Icon name="chevron-down" /></span>
      </button>
      <div className="accordion__panel" id={id + '-p'} role="region" aria-labelledby={id + '-t'} hidden={!isOpen}>
        {children}
      </div>
    </div>
  )
}
