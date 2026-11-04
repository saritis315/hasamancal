// הסמנכל: demo.ts
// עסקי דמה (F5): טעינה באותו מסלול כמו העלאה אמיתית (ARCHITECTURE.md סעיף 8).
import type { Definition } from './types.ts'
import { callApi, mockSeedDecisions, saveMetrics } from './api.ts'
import { tableFromText, validateTable } from './filecontract.ts'
import { computeMetrics } from './engine.ts'

export interface DemoBusiness { key: string; name: string; description: string }

/** רשימת עסקי הדמה (הנחה: public/demo/index.json, לא מופיע ב-ARCHITECTURE.md). */
export async function listDemoBusinesses(): Promise<DemoBusiness[]> {
  const res = await fetch('/demo/index.json')
  if (!res.ok) throw new Error('רשימת עסקי הדמה לא נטענה')
  return (await res.json()) as DemoBusiness[]
}

/**
 * טוען עסק דמה: הגדרה, אימות, חישוב ושמירה. מחליף הגדרה קיימת.
 * seedDecisions: מוסיף החלטות לדוגמה (מדומה בלבד).
 */
export async function loadDemoBusiness(key: string, { seedDecisions = true } = {}): Promise<DemoBusiness> {
  const biz = (await listDemoBusinesses()).find((b) => b.key === key)
  if (!biz) throw new Error('עסק דמה לא קיים: ' + key)
  const [defRes, csvRes] = await Promise.all([fetch(`/demo/${key}/definition.json`), fetch(`/demo/${key}/data.csv`)])
  if (!defRes.ok || !csvRes.ok) throw new Error('קובצי עסק הדמה לא נטענו')
  const definition = (await defRes.json()) as Definition
  const checked = validateTable(tableFromText(await csvRes.text()), definition)
  if (!checked.ok) throw new Error(`עסק הדמה לא תקין, שורה ${checked.line}: ${checked.message}`)
  const saved = await callApi('config_save', { name: biz.name, description: biz.description, definition, source: 'demo', replace: true })
  if (!saved.ok) throw new Error('שמירת ההגדרה נכשלה')
  await saveMetrics(computeMetrics(definition, checked.rows))
  if (seedDecisions) mockSeedDecisions()
  return biz
}
