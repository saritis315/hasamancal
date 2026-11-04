// הסמנכל: types.ts
// טיפוס אחד לכל טבלה (ARCHITECTURE.md סעיף 4.2), טיפוסי ההגדרה (4.4) וטיפוסי הבקשות והתשובות של /api/app (6.3).
// כל המסכים והפונקציה משתמשים בקובץ הזה.

export type Unit = 'count' | 'ILS' | 'percent' | 'number'
export type CustomerType = 'total' | 'new' | 'existing'
export type TopicKey = 'leads' | 'sales' | 'finance'
export type ThresholdStatus = 'normal' | 'anomaly' | 'unavailable'
export type Direction = 'up' | 'down'

// ---------- הגדרת העסק (business_config.definition) ----------
export interface Kpi {
  key: string
  label: string
  unit: Unit
  higher_is_better: boolean
  additive: boolean
  by_customer_type: boolean
  definition: string
  threshold_pct: number | null
}
export interface Topic { key: TopicKey; label: string; kpis: Kpi[] }
export interface ActivityArea { key: string; label: string }
export interface Definition { version: number; topics: Topic[]; activity_areas: ActivityArea[] }

// ---------- טבלה 1: business_config ----------
export interface BusinessConfig {
  name: string
  description: string
  definition: Definition
  source: 'setup' | 'demo'
  created_at: string
}

// ---------- טבלה 2: metric_values ----------
/** שורה שחושבה בקוד (engine.ts), לפני השמירה. */
export interface MetricInput {
  kpi_key: string
  activity_key: string
  customer_type: CustomerType
  period_type: 'week'
  period_start: string
  period_end: string
  value: number
  previous_value: number | null
  change_abs: number | null
  change_pct: number | null
  threshold_status: ThresholdStatus
}
export interface MetricValue extends MetricInput { id: string; computed_at: string }

// ---------- טבלה 3: insights ----------
export interface InsightFacts {
  topic: { key: TopicKey; label: string }
  kpi: { key: string; label: string; unit: Unit; higher_is_better: boolean; definition: string }
  segment: { activity: { key: string; label: string }; customer_type: CustomerType }
  period: { type: 'week'; start: string; end: string }
  current_value: number
  previous_value: number | null
  change_abs: number | null
  change_pct: number | null
  from_zero: boolean
  threshold: { threshold_pct: number | null; status: ThresholdStatus }
  history: { period_start: string; value: number }[]
  unavailable: string[]
}
export interface InsightContent {
  what_happened: string
  trend: string
  why_it_matters: string
  hypothesis: string
  what_to_check: string
}
export interface Insight {
  id: string
  metric_value_id: string
  facts: InsightFacts
  content: InsightContent
  model: string
  created_at: string
}

// ---------- טבלה 4: decisions ----------
export type DecisionOutcome =
  | { checked_at: string; baseline_value: number; current_value: number; change_abs: number; change_pct: number | null; direction_met: boolean }
  | { reason: 'no_newer_data' }

interface DecisionBase { id: string; decision_text: string; created_at: string }
export interface KpiDecision extends DecisionBase {
  kind: 'kpi'
  insight_id: string | null
  kpi_key: string
  activity_key: string
  customer_type: CustomerType
  desired_direction: Direction
  check_date: string
  baseline_value: number
  baseline_period_start: string
  outcome_status: 'pending' | 'done' | 'unavailable'
  outcome: DecisionOutcome | null
}
export interface ManagerDecision extends DecisionBase {
  kind: 'manager'
  category: string
  description: string
  reason: string
  case_date: string
  is_precedent: boolean
  outcome_status: 'not_applicable'
  outcome: null
}
export type Decision = KpiDecision | ManagerDecision

// ---------- הצעת הקמה (6.4) ----------
export interface ProposalKpi {
  label: string
  unit: Unit
  higher_is_better: boolean
  additive: boolean
  by_customer_type: boolean
  definition: string
  threshold_pct: number | null
}
export interface Proposal {
  topics: { key: TopicKey; kpis: ProposalKpi[] }[]
  activity_areas: { label: string }[]
}

// ---------- קובץ הנתונים ----------
export interface FileRow {
  week_start: string
  kpi_key: string
  activity_key: string
  customer_type: CustomerType
  value: number
}

// ---------- /api/app ----------
export interface Counts { metric_values: number; insights: number; decisions: number }

export interface SetupReq { description: string; answers?: string[] }
export type SetupRes =
  | { ok: true; type: 'questions'; questions: string[] }
  | { ok: true; type: 'proposal'; proposal: Proposal }

export interface ConfigSaveReq { name: string; description: string; definition: Definition; source: 'setup' | 'demo'; replace?: boolean }

export type SnapshotRes =
  | { ok: true; config: null }
  | { ok: true; config: BusinessConfig; last_week: string | null; metrics: MetricValue[]; insights: Insight[]; decisions: Decision[] }

export interface InsightReq { metric_value_id: string; regenerate?: boolean }

export interface KpiDecisionReq {
  kind: 'kpi'
  decision_text: string
  kpi_key: string
  activity_key?: string
  customer_type?: CustomerType
  desired_direction: Direction
  check_date: string
  insight_id?: string | null
}
export interface ManagerDecisionReq {
  kind: 'manager'
  decision_text: string
  category: string
  description: string
  reason: string
  case_date: string
  is_precedent: boolean
}
export type DecisionSaveReq = KpiDecisionReq | ManagerDecisionReq

export interface ApiFail {
  ok: false
  error: 'unauthorized' | 'bad_request' | 'not_found' | 'conflict' | 'ai_unavailable'
  /** לשימוש המסך בלבד, למשל no_value או check_date. */
  detail?: string
}

export interface ActionMap {
  config_get: { req: Record<string, never>; res: { ok: true; config: BusinessConfig | null; counts: Counts } }
  setup: { req: SetupReq; res: SetupRes }
  config_save: { req: ConfigSaveReq; res: { ok: true } }
  metrics_save: { req: { rows: MetricInput[] }; res: { ok: true; saved: number } }
  snapshot: { req: Record<string, never>; res: SnapshotRes }
  insight: { req: InsightReq; res: { ok: true; insight: Insight } }
  decision_save: { req: DecisionSaveReq; res: { ok: true; decision: Decision } }
}
export type Action = keyof ActionMap
export type ApiResult<A extends Action> = ActionMap[A]['res'] | ApiFail
