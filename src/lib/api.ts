// הסמנכל: api.ts (גרסה מדומה)
// שכבת נתונים מדומה במקום Supabase ו-Gemini. הממשק זהה לפונקציה האמיתית: callApi(action, payload)
// עם הפעולות config_get, config_save, metrics_save, snapshot, insight, decision_save, setup (ARCHITECTURE.md 6.3).
// במוצר האמיתי הקובץ הזה שולח POST ל-/api/app עם access_token, והבקשה והתשובה נשארות כמו כאן.
//
// הנחות של הגרסה המדומה:
//  - "מסד הנתונים" נשמר ב-sessionStorage של הדפדפן, רק כדי לשמור מצב בין טעינות. זו לא זיכרון המערכת האמיתי.
//  - תשובות ה-AI (תובנה והצעת הקמה) קבועות ומוכנות מראש. המספרים בתובנה נלקחים מ-facts, כדי שיתאימו לנתונים.
//  - בדיקת התוצאה (W2 ב-n8n) מדומה: רצה בכל קריאה ל-snapshot על החלטות שהגיע תאריך הבדיקה שלהן.
import type {
  Action, ActionMap, ApiFail, ApiResult, BusinessConfig, CustomerType, Decision, Insight, InsightContent,
  InsightFacts, KpiDecision, ManagerDecision, MetricInput, MetricValue, Proposal, ProposalKpi, Unit,
} from './types.ts'
import { isFromZero } from './engine.ts'
import { formatNumber, formatPct, formatWeekRange, isIsoDate, todayIso } from './format.ts'

interface Db {
  config: BusinessConfig | null
  metrics: MetricValue[]
  insights: Insight[]
  decisions: Decision[]
}

const DB_KEY = 'hs_mock_db'
const empty = (): Db => ({ config: null, metrics: [], insights: [], decisions: [] })
let memory: string | null = null // גיבוי אם sessionStorage חסום

function load(): Db {
  try {
    const s = sessionStorage.getItem(DB_KEY)
    if (s) return JSON.parse(s) as Db
  } catch { /* חסום */ }
  return memory ? (JSON.parse(memory) as Db) : empty()
}
function save(db: Db) {
  const s = JSON.stringify(db)
  memory = s
  try { sessionStorage.setItem(DB_KEY, s) } catch { /* חסום */ }
}

const bad = (detail: string): ApiFail => ({ ok: false, error: 'bad_request', detail })
const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now())
type Seg = { kpi_key: string; activity_key: string; customer_type: CustomerType }
const sameSeg = (a: Seg, b: Seg) => a.kpi_key === b.kpi_key && a.activity_key === b.activity_key && a.customer_type === b.customer_type
const newestFirst = (a: { period_start: string }, b: { period_start: string }) => (a.period_start < b.period_start ? 1 : -1)

let failInsights = false
/** לבדיקות: גורם ליצירת תובנה להיכשל (מצב "כשל ב-AI"). */
export function mockSetFail(v: boolean) { failInsights = v }
/** מנקה את כל המסד המדומה. */
export function mockClear() {
  memory = null
  try { sessionStorage.removeItem(DB_KEY) } catch { /* חסום */ }
}

// ---------- בדיקת תוצאה מדומה (W2) ----------
function runOutcomeCheck(db: Db): boolean {
  const today = todayIso()
  let changed = false
  for (const d of db.decisions) {
    if (d.kind !== 'kpi' || d.outcome_status !== 'pending' || d.check_date > today) continue
    const current = db.metrics.filter((m) => sameSeg(m, d) && m.period_end <= today).sort(newestFirst)[0]
    if (!current || current.period_start <= d.baseline_period_start) {
      d.outcome_status = 'unavailable'
      d.outcome = { reason: 'no_newer_data' }
    } else {
      const changeAbs = current.value - d.baseline_value
      const changePct = d.baseline_value === 0 ? null : Math.round((changeAbs / d.baseline_value) * 1000) / 10
      d.outcome_status = 'done'
      d.outcome = {
        checked_at: today, baseline_value: d.baseline_value, current_value: current.value, change_abs: changeAbs, change_pct: changePct,
        direction_met: d.desired_direction === 'up' ? changeAbs > 0 : changeAbs < 0,
      }
    }
    changed = true
  }
  return changed
}

// ---------- תובנה מדומה ----------
function buildFacts(db: Db, m: MetricValue): InsightFacts {
  const def = (db.config as BusinessConfig).definition
  const topic = def.topics.find((t) => t.kpis.some((k) => k.key === m.kpi_key))!
  const kpi = topic.kpis.find((k) => k.key === m.kpi_key)!
  const area = m.activity_key === 'total' ? null : def.activity_areas.find((a) => a.key === m.activity_key)
  const history = db.metrics
    .filter((x) => sameSeg(x, m) && x.period_start < m.period_start)
    .sort(newestFirst).slice(0, 4)
    .map((x) => ({ period_start: x.period_start, value: x.value }))
  return {
    topic: { key: topic.key, label: topic.label },
    kpi: { key: kpi.key, label: kpi.label, unit: kpi.unit, higher_is_better: kpi.higher_is_better, definition: kpi.definition },
    segment: { activity: area ? { key: area.key, label: area.label } : { key: 'total', label: 'סך הכול' }, customer_type: m.customer_type },
    period: { type: 'week', start: m.period_start, end: m.period_end },
    current_value: m.value, previous_value: m.previous_value, change_abs: m.change_abs, change_pct: m.change_pct,
    from_zero: isFromZero(m),
    threshold: { threshold_pct: kpi.threshold_pct, status: m.threshold_status },
    history,
    unavailable: ['סיבת השינוי', 'נתוני תקופה קודמת מעבר לשבועות שנשלחו'],
  }
}

const WHY = {
  leads: 'פניות הן תחילת הדרך למכירה, ושינוי בהן משפיע על המכירות בשבועות הבאים.',
  sales: 'מכירות הן הדרך שבה פניות הופכות להכנסה, ושינוי בהן משפיע ישירות על הכספים.',
  finance: 'הכספים קובעים כמה מרווח יש לעסק לפעול ולהשקיע.',
}
const HYPOTHESIS = {
  leads: 'ייתכן שהשינוי קשור לפעילות שיווקית, לעונתיות או לשינוי בערוץ שהביא את הפניות. אין בנתונים שסופקו מידע שמאשר זאת.',
  sales: 'ייתכן שהשינוי קשור למבצע, למחיר או לשינוי בסוג הלקוחות שרכשו. אין בנתונים שסופקו מידע שמאשר זאת.',
  finance: 'ייתכן שהשינוי קשור לשינוי בהכנסות או בהוצאות באותו שבוע. אין בנתונים שסופקו מידע שמאשר זאת.',
}
const CHECK = {
  leads: 'כדאי לבדוק איזה תחום פעילות הניע את השינוי, ולהשוות לשבועות קודמים.',
  sales: 'כדאי לבדוק באיזה סוג לקוח ובאיזה תחום פעילות השינוי הבולט, ולהשוות לשבועות קודמים.',
  finance: 'כדאי לבדוק איזה סעיף הוצאה או הכנסה השתנה, ולהשוות לשבועות קודמים.',
}

function cannedContent(f: InsightFacts): InsightContent {
  const fmt = (v: number | null) => formatNumber(v, f.kpi.unit) ?? ''
  const range = formatWeekRange(f.period.start)
  const good = (f.change_abs ?? 0) > 0 ? f.kpi.higher_is_better : !f.kpi.higher_is_better
  const what_happened = f.from_zero
    ? `בשבוע ${range} הערך של "${f.kpi.label}" היה ${fmt(f.current_value)}, לעומת אפס בשבוע הקודם. זו עלייה ממצב של אפס.`
    : `בשבוע ${range} הערך של "${f.kpi.label}" היה ${fmt(f.current_value)}, לעומת ${fmt(f.previous_value)} בשבוע הקודם. השינוי הוא ${formatPct(f.change_pct)}.`
  const hist = f.history.map((h) => h.value)
  const trend = hist.length >= 2
    ? `בשבועות שקדמו נע הערך בין ${fmt(Math.min(...hist))} ל-${fmt(Math.max(...hist))}. הערך השבוע ${f.current_value < Math.min(...hist) || f.current_value > Math.max(...hist) ? 'מחוץ לטווח' : 'בתוך הטווח'} הזה.`
    : 'אין מספיק שבועות קודמים כדי לתאר מגמה.'
  return {
    what_happened,
    trend,
    why_it_matters: `${WHY[f.topic.key]} לפי ההגדרה של המדד, הכיוון הוא ${good ? 'שיפור' : 'הרעה'}.`,
    hypothesis: HYPOTHESIS[f.topic.key],
    what_to_check: CHECK[f.topic.key],
  }
}

// ---------- הצעת הקמה מדומה ----------
function cannedProposal(): Proposal {
  const kpi = (label: string, unit: Unit, hib: boolean, additive: boolean, byCt: boolean, def: string, thr: number): ProposalKpi =>
    ({ label, unit, higher_is_better: hib, additive, by_customer_type: byCt, definition: def, threshold_pct: thr })
  return {
    topics: [
      { key: 'leads', kpis: [
        kpi('פניות חדשות', 'count', true, true, false, 'מספר הפניות החדשות בשבוע', 20),
        kpi('נרשמים לניוזלטר', 'count', true, true, true, 'מספר הנרשמים החדשים בשבוע', 25),
        kpi('עלות לליד', 'ILS', false, false, false, 'הוצאות השיווק חלקי מספר הפניות', 20),
        kpi('המרה מליד ללקוח', 'percent', true, false, false, 'אחוז הפניות שהפכו ללקוח', 15)] },
      { key: 'sales', kpis: [
        kpi('מספר עסקאות', 'count', true, true, true, 'מספר העסקאות שנסגרו בשבוע', 20),
        kpi('ערך עסקה ממוצע', 'ILS', true, false, false, 'סכום המכירות חלקי מספר העסקאות', 15),
        kpi('שיעור לקוחות חוזרים', 'percent', true, false, false, 'אחוז העסקאות מלקוחות קיימים', 10),
        kpi('ביטולים', 'count', false, true, false, 'מספר הביטולים בשבוע', 30)] },
      { key: 'finance', kpis: [
        kpi('הכנסות', 'ILS', true, true, true, 'סך ההכנסות בשבוע', 15),
        kpi('הוצאות', 'ILS', false, true, false, 'סך ההוצאות בשבוע', 20),
        kpi('רווח', 'ILS', true, true, true, 'הכנסות פחות הוצאות', 20),
        kpi('אחוז רווח', 'percent', true, false, false, 'הרווח כאחוז מההכנסות', 10)] },
    ],
    activity_areas: [{ label: 'תחום ראשון' }, { label: 'תחום שני' }],
  }
}

// ---------- פעולות ----------
type Handlers = { [A in Action]: (db: Db, p: ActionMap[A]['req']) => ApiResult<A> }

const handlers: Handlers = {
  config_get(db) {
    return {
      ok: true, config: db.config,
      counts: { metric_values: db.metrics.length, insights: db.insights.length, decisions: db.decisions.length },
    }
  },

  setup(_db, p) {
    const description = String(p.description ?? '').trim()
    if (!description || description.length > 1000) return bad('description')
    const answers = Array.isArray(p.answers) ? p.answers : []
    // קבוע: תיאור קצר מדי מקבל שאלות הבהרה (סבב אחד), אחרת הצעה
    if (!answers.length && description.length < 60) {
      return { ok: true, type: 'questions', questions: ['מה העסק מוכר, ולמי?', 'איך לקוחות מגיעים אליכם היום?'] }
    }
    return { ok: true, type: 'proposal', proposal: cannedProposal() }
  },

  config_save(db, p) {
    const name = String(p.name ?? '').trim()
    if (!name || name.length > 80 || String(p.description ?? '').length > 1000) return bad('fields')
    if (!['setup', 'demo'].includes(p.source) || !p.definition || !Array.isArray(p.definition.topics)) return bad('fields')
    if (db.config && !p.replace) return { ok: false, error: 'conflict' }
    if (db.config) { db.metrics = []; db.insights = []; db.decisions = [] }
    db.config = { name, description: String(p.description ?? ''), definition: p.definition, source: p.source, created_at: new Date().toISOString() }
    return { ok: true }
  },

  metrics_save(db, p) {
    if (!db.config) return bad('no_config')
    if (!Array.isArray(p.rows) || p.rows.length === 0 || p.rows.length > 1000) return bad('rows')
    const key = (r: MetricInput) => `${r.kpi_key}|${r.activity_key}|${r.customer_type}|${r.period_start}`
    const index = new Map(db.metrics.map((m) => [key(m), m]))
    const computed_at = new Date().toISOString()
    for (const r of p.rows) {
      const old = index.get(key(r))
      if (old) Object.assign(old, r, { computed_at }) // עדכון על אותו id, כך שהקישור לתובנה נשמר
      else {
        const row: MetricValue = { ...r, id: uuid(), computed_at }
        db.metrics.push(row)
        index.set(key(row), row)
      }
    }
    return { ok: true, saved: p.rows.length }
  },

  snapshot(db) {
    if (!db.config) return { ok: true, config: null }
    if (runOutcomeCheck(db)) save(db)
    let last: string | null = null
    for (const m of db.metrics) if (last == null || m.period_start > last) last = m.period_start
    return {
      ok: true,
      config: db.config,
      last_week: last,
      metrics: db.metrics.filter((m) => m.period_start === last),
      insights: db.insights,
      decisions: [...db.decisions].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    }
  },

  insight(db, p) {
    const m = db.metrics.find((x) => x.id === p.metric_value_id)
    if (!m) return { ok: false, error: 'not_found' }
    if (m.threshold_status !== 'anomaly') return bad('not_anomaly')
    const existing = db.insights.find((i) => i.metric_value_id === m.id)
    const stale = !!existing && existing.facts.current_value !== m.value
    if (existing && !(p.regenerate && stale)) return { ok: true, insight: existing }
    if (failInsights) return { ok: false, error: 'ai_unavailable' }
    if (existing) db.insights = db.insights.filter((i) => i.id !== existing.id)
    const facts = buildFacts(db, m)
    const insight: Insight = { id: uuid(), metric_value_id: m.id, facts, content: cannedContent(facts), model: 'mock', created_at: new Date().toISOString() }
    db.insights.push(insight)
    return { ok: true, insight }
  },

  decision_save(db, p) {
    if (!db.config) return bad('no_config')
    const text = String(p.decision_text ?? '').trim()
    if (!text || text.length > 1000) return bad('decision_text')
    const now = new Date().toISOString()
    if (p.kind === 'kpi') {
      const kpis = db.config.definition.topics.flatMap((t) => t.kpis)
      if (!kpis.some((k) => k.key === p.kpi_key)) return bad('kpi_key')
      const activity_key = p.activity_key || 'total'
      const customer_type: CustomerType = p.customer_type || 'total'
      if (p.desired_direction !== 'up' && p.desired_direction !== 'down') return bad('desired_direction')
      if (!isIsoDate(p.check_date) || p.check_date <= todayIso()) return bad('check_date')
      const latest = db.metrics.filter((m) => sameSeg(m, { kpi_key: p.kpi_key, activity_key, customer_type })).sort(newestFirst)[0]
      if (!latest) return bad('no_value') // מדד בלי ערך: לא נשמר
      const d: KpiDecision = {
        id: uuid(), kind: 'kpi', decision_text: text, insight_id: p.insight_id || null,
        kpi_key: p.kpi_key, activity_key, customer_type, desired_direction: p.desired_direction, check_date: p.check_date,
        baseline_value: latest.value, baseline_period_start: latest.period_start, // נקבע בפונקציה, לא בדפדפן
        outcome_status: 'pending', outcome: null, created_at: now,
      }
      db.decisions.push(d)
      return { ok: true, decision: d }
    }
    if (p.kind === 'manager') {
      const category = String(p.category ?? '').trim()
      const description = String(p.description ?? '').trim()
      const reason = String(p.reason ?? '').trim()
      if (!category || category.length > 60) return bad('category')
      if (!description || description.length > 1000) return bad('description')
      if (!reason || reason.length > 1000) return bad('reason')
      if (!isIsoDate(p.case_date)) return bad('case_date')
      if (typeof p.is_precedent !== 'boolean') return bad('is_precedent')
      const d: ManagerDecision = {
        id: uuid(), kind: 'manager', decision_text: text, category, description, reason, case_date: p.case_date,
        is_precedent: p.is_precedent, outcome_status: 'not_applicable', outcome: null, created_at: now,
      }
      db.decisions.push(d)
      return { ok: true, decision: d }
    }
    return bad('kind')
  },
}

/** callApi('snapshot') וכו'. תמיד מחזיר { ok, ... } ולא זורק. */
export async function callApi<A extends Action>(action: A, payload?: ActionMap[A]['req']): Promise<ApiResult<A>> {
  await new Promise((r) => setTimeout(r, 120))
  const handler = handlers[action] as (db: Db, p: ActionMap[A]['req']) => ApiResult<A>
  if (!handler) return bad('action') as ApiResult<A>
  try {
    const db = load()
    const res = handler(db, (payload ?? {}) as ActionMap[A]['req'])
    if (res.ok) save(db)
    return res
  } catch (e) {
    console.error(e)
    return { ok: false, error: 'bad_request' }
  }
}

/** שמירת ערכי מדדים בקבוצות של עד 1,000 שורות (הנחה, ARCHITECTURE 14). */
export async function saveMetrics(metrics: MetricInput[], chunk = 1000): Promise<void> {
  for (let i = 0; i < metrics.length; i += chunk) {
    const res = await callApi('metrics_save', { rows: metrics.slice(i, i + chunk) })
    if (!res.ok) throw new Error('שמירת הנתונים נכשלה')
  }
}

/**
 * מדומה בלבד: מוסיף החלטות לדוגמה כדי שרשימת ההחלטות תציג את כל המצבים.
 * הערכים והתוצאות נגזרים מנתוני העסק שנטען. הטקסטים מסומנים "(דוגמה)".
 */
export function mockSeedDecisions() {
  const db = load()
  if (!db.config) return
  const val = (kpi: string, week: string) =>
    db.metrics.find((m) => m.kpi_key === kpi && m.activity_key === 'total' && m.customer_type === 'total' && m.period_start === week)?.value
  const kpiDec = (text: string, kpi: string, dir: 'up' | 'down', created: string, baseWeek: string, check: string): KpiDecision | null => {
    const baseline = val(kpi, baseWeek)
    if (baseline === undefined) return null
    return {
      id: uuid(), kind: 'kpi', decision_text: text, insight_id: null, kpi_key: kpi, activity_key: 'total', customer_type: 'total',
      desired_direction: dir, check_date: check, baseline_value: baseline, baseline_period_start: baseWeek,
      outcome_status: 'pending', outcome: null, created_at: created + 'T09:00:00.000Z',
    }
  }
  const mgr = (category: string, description: string, text: string, reason: string, date: string, precedent: boolean): ManagerDecision => ({
    id: uuid(), kind: 'manager', decision_text: text, category, description, reason, case_date: date, is_precedent: precedent,
    outcome_status: 'not_applicable', outcome: null, created_at: date + 'T09:00:00.000Z',
  })
  const seeds: (Decision | null)[] = [
    kpiDec('הגדלת תקציב הפרסום בערוץ הראשי (דוגמה)', 'leads_1', 'up', '2026-10-14', '2026-10-04', '2026-10-30'),
    kpiDec('הפחתת הוצאה על קמפיין קטן (דוגמה)', 'finance_2', 'down', '2026-10-14', '2026-10-04', '2026-10-30'),
    kpiDec('שינוי בסדר הצגת המוצרים (דוגמה)', 'sales_1', 'up', '2026-10-26', '2026-10-25', '2026-11-01'),
    kpiDec('מבצע קצר ללקוחות קיימים (דוגמה)', 'sales_2', 'up', '2026-11-02', '2026-10-25', '2026-11-15'),
    mgr('שירות לקוחות', 'לקוח ביקש לשנות את תנאי החבילה באמצע התקופה (דוגמה)', 'אישור שינוי חד-פעמי בתנאי החבילה', 'שמירה על קשר ארוך טווח עם הלקוח', '2026-10-20', false),
    mgr('מחירים', 'פנייה לגבי הנחה לרוכשים חוזרים (דוגמה)', 'הנחה קבועה לרוכשים חוזרים', 'עידוד חזרה ושמירה על לקוחות', '2026-10-08', true),
  ]
  db.decisions = seeds.filter((d): d is Decision => d !== null)
  runOutcomeCheck(db)
  save(db)
}

