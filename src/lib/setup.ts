// הסמנכל: setup.ts
// לוגיקה טהורה של מסך ההקמה: בניית הגדרה מההצעה, אימות ההצעה אחרי עריכה והורדת תבנית.
// מקור: ARCHITECTURE.md סעיף 6.4.
import type { Definition, Proposal, TopicKey, Unit } from './types.ts'

export const TOPICS: { key: TopicKey; label: string }[] = [
  { key: 'leads', label: 'מתעניינים' },
  { key: 'sales', label: 'מכירות' },
  { key: 'finance', label: 'כספים' },
]
export const UNIT_LABEL: Record<Unit, string> = { count: 'כמות', ILS: 'שקלים', percent: 'אחוזים', number: 'מספר' } // הנחה: נוסח
export const MAX_DESC = 1000
export const MAX_ANSWER = 300
export const MAX_LABEL = 40
export const MAX_DEF = 200
export const MAX_AREAS = 6

/** מוסיף מפתחות (leads_1, a1 וכו') להצעה שאושרה. המפתחות נוצרים בקוד, לא ב-AI. */
export function buildDefinition(proposal: Proposal): Definition {
  return {
    version: 1,
    topics: TOPICS.map(({ key, label }) => ({
      key,
      label,
      kpis: (proposal.topics.find((t) => t.key === key)?.kpis ?? []).map((k, i) => ({
        key: `${key}_${i + 1}`,
        label: k.label.trim(),
        unit: k.unit,
        higher_is_better: k.higher_is_better,
        additive: k.additive,
        by_customer_type: k.by_customer_type,
        definition: k.definition.trim(),
        threshold_pct: k.threshold_pct,
      })),
    })),
    activity_areas: proposal.activity_areas.map((a, i) => ({ key: 'a' + (i + 1), label: a.label.trim() })),
  }
}

/** אימות ההצעה אחרי עריכה. מחזיר מפה { נתיב: הודעה }, ריקה אם הכל תקין. */
export function validateProposal(p: Proposal): Record<string, string> {
  const errs: Record<string, string> = {}
  p.topics.forEach((t, ti) => t.kpis.forEach((k, ki) => {
    const id = `${ti}.${ki}`
    if (!k.label.trim()) errs[id + '.label'] = 'יש להזין שם'
    else if (k.label.trim().length > MAX_LABEL) errs[id + '.label'] = `השם ארוך מ-${MAX_LABEL} תווים`
    if (!k.definition.trim()) errs[id + '.definition'] = 'יש להזין הגדרה'
    else if (k.definition.trim().length > MAX_DEF) errs[id + '.definition'] = `ההגדרה ארוכה מ-${MAX_DEF} תווים`
    if (k.threshold_pct != null && !(k.threshold_pct > 0 && k.threshold_pct <= 100)) errs[id + '.threshold'] = 'הסף חייב להיות מספר גדול מ-0 ועד 100'
  }))
  const labels = p.activity_areas.map((a) => a.label.trim())
  if (labels.length < 1) errs.areas = 'יש להגדיר תחום פעילות אחד לפחות'
  else if (labels.length > MAX_AREAS) errs.areas = `אפשר עד ${MAX_AREAS} תחומי פעילות`
  else if (labels.some((l) => !l || l.length > MAX_LABEL)) errs.areas = `שם תחום חייב להיות לא ריק ועד ${MAX_LABEL} תווים`
  else if (new Set(labels).size !== labels.length) errs.areas = 'אין להזין שני תחומים בשם זהה'
  return errs
}

/** מוריד טקסט כקובץ CSV (בדפדפן בלבד). */
export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
