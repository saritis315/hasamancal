import type { ReactNode } from 'react'

/** מספר או טקסט שאסור להתהפך בתוך עברית (DESIGN.md סעיף 2.5). */
export function Num({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={('num ' + className).trim()}>{children}</span>
}

// הסימן נחשב חלק מהמספר רק אם אינו צמוד לאות עברית ("ל-439" הוא מקף, לא מינוס)
const NUMBER = /(?:(?<![א-ת])[+-])?\d+(?:[.,]\d+)*(?:–\d+(?:[.,]\d+)*)?[%₪]?/g

/** טקסט חופשי (למשל מהמודל) עם מספרים שלא יתהפכו. הטקסט מוצג כטקסט בלבד, בלי HTML. */
export function NumText({ text }: { text: string }) {
  const parts: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(NUMBER)) {
    const i = m.index
    if (i > last) parts.push(text.slice(last, i))
    parts.push(<Num key={i}>{m[0]}</Num>)
    last = i + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}
