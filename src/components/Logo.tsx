import { useId } from 'react'

/** לוגו מלא (DESIGN.md סעיף 2.2). לכל לוגו mask ייחודי. הגופן M PLUS Rounded 1c נטען ב-index.html. */
export function Logo({ color = '#14253D', accent = '#E8912D' }: { color?: string; accent?: string }) {
  const id = useId()
  return (
    <span
      role="img"
      aria-label="הסמנכל"
      style={{ fontFamily: "'M PLUS Rounded 1c', sans-serif", fontWeight: 900, color, direction: 'rtl', whiteSpace: 'nowrap' }}
    >
      ה
      <svg width="0.656em" height="0.656em" viewBox="0 0 40 40" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: '-0.0654em' }}>
        <defs>
          <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="40" height="40">
            <rect width="40" height="40" fill="#fff" />
            <circle cx="29.2" cy="10.8" r="6.3" fill="#000" />
          </mask>
        </defs>
        <circle cx="20" cy="20" r="13.04" fill="none" stroke="currentColor" strokeWidth="7.93" mask={`url(#${id})`} />
        <circle cx="29.2" cy="10.8" r="4.1" fill={accent} />
      </svg>
      מנכל
    </span>
  )
}
