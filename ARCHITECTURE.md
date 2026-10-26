# הסמנכ״ל — ארכיטקטורה

גרסה 1.0 (טיוטה לאישור) | מבוסס על: PRD.md, tech-stack.md (מאושר), course-stack.md, מסמך עשרת ההיבטים.

המסמך מתרגם את דרישות ה-PRD לתכנון טכני פשוט. הוא משתמש רק בטכנולוגיות שבקובץ tech-stack.md, ובכל מקום שמידע טכני חסר מופיעה החלטה סבירה עם משפט הסבר (מסומנת **החלטה**). הוא אינו כולל Milestones, משימות או לוחות זמנים.

---

## 1. מבט על

```
┌─────────────────────────────────────────────────────────────┐
│ צד לקוח (GitHub Pages): HTML, CSS, JavaScript               │
│ התחברות, מסכים, שמירת החלטות                                │
└───────────┬─────────────────────────────┬───────────────────┘
            │ supabase-js                  │ POST /api/explain
            │ (מפתח ציבורי + סשן משתמש)    │ (רק "הסבר לי")
            ▼                              ▼
┌──────────────────────────┐   ┌───────────────────────────────┐
│ נתונים: Supabase         │   │ לוגיקה: פונקציה ב-Vercel      │
│ Auth + 3 טבלאות + RLS    │◄──│ api/explain.js → Gemini       │
└───────────▲──────────────┘   └───────────────────────────────┘
            │ מפתח service_role (רק ב-n8n)
┌───────────┴──────────────────────────────────────────────────┐
│ לוגיקה: n8n Cloud                                           │
│ W1 צינור יומי (משיכה, חישוב, חריגה, תובנה) + טעינת היסטוריה │
│ W2 בדיקת תוצאה יומית                                         │
│ קורא ל-Arbox API ול-Gemini                                  │
└──────────────────────────────────────────────────────────────┘
```

**עיקרון מנחה:** הדפדפן קורא וכותב ל-Supabase רק במה שהרשאות הטבלה מתירות. כל מה שכותב מדדים ותובנות הוא n8n. כל קריאה למודל מהדפדפן עוברת דרך פונקציה אחת.

---

## 2. סתירות בין המקורות והחלטות שהתקבלו

| # | הסתירה | ההחלטה |
|---|---|---|
| 1 | עשרת ההיבטים מתכננים סביב תשע ישויות. הסטאק מגביל לשלוש טבלאות. | Business, Data Source, Metric Definition: קובצי JSON בריפו (סעיף 4.4). Metric Value: טבלה `metric_values`. Insight: טבלה `insights`. Decision, Outcome ו-Management Case: טבלה `decisions` (Outcome כעמודת JSON, Management Case כערך `kind`). Action אינה ממומשת, כי אף דרישה ב-PRD לא צריכה אותה. |
| 2 | חישובי KPI צריכים להיות בקוד, אבל הסטאק מורה להתחיל מפונקציה אחת בלבד ולהוסיף רק כשדרישת Must מחייבת. | החישובים רצים בצמתי Code של n8n. הפונקציה היחידה היא `api/explain.js` (F11). תהליכי n8n מיוצאים כקבצי JSON לתיקיית `n8n/` בריפו לצורך גרסאות. |
| 3 | Arbox API טרם אומת (שדות, היסטוריה, סיווג מוצר), והקורס עובד על נתוני דמה. | מתג `data_source.mode` בקובץ הגדרות: `demo` או `live`. רק צומת הנרמול של Arbox מוחלף אחרי בדיקת ה-API. כל מה שאחריו זהה בשני המצבים. |
| 4 | ה-PRD לא קובע מה "מפעיל" את החישוב האירועי. | האירוע הוא סיום משיכת הנתונים. כל השרשרת רצה בהרצה אחת של תהליך W1. |
| 5 | תקופת הניסיון של n8n Cloud מוגבלת ל-180 שניות להרצה (לפי tech-stack.md). | התובנות נוצרות רק לשבוע המלא האחרון (סעיף 7.2), כך שמספר קריאות ה-AI בהרצה קטן. |

---

## 3. שלוש השכבות

### 3.1 צד לקוח

אתר סטטי ב-GitHub Pages: HTML, CSS ו-JavaScript בלבד, בלי React ובלי שלב בנייה (לפי course-stack.md).

| רכיב | תפקיד |
|---|---|
| `index.html` | טופס כניסה (אימייל וסיסמה). אין הרשמה, שחזור סיסמה או כניסה עם Google. |
| `snapshot.html` | המסך העיקרי: תמונת מצב ניהולית (F16). |
| `insights.html` | רשימת תובנות, פירוט תובנה, "הסבר לי" ושמירת החלטת KPI (F9, F11, F12, F17). |
| `decisions.html` | רשימת החלטות ותוצאות, וטופס החלטת מנהל (F13, F14, F18). |
| `js/supabase.js` | יצירת לקוח Supabase, בדיקת סשן והפניה לכניסה אם אין סשן. |
| ספריות | `@supabase/supabase-js@2` נטען בתג script מ-CDN (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`), לפי תיעוד Supabase. |
| גופן | Heebo מ-Google Fonts. |

**כללי ממשק (מה-PRD ומסטאק הקורס):**

- `<html lang="he" dir="rtl">`, מסך הניהול נבנה קודם למחשב ועובד גם בנייד, Responsive (F19).
- מצב חריגה מוצג בצבע וגם במילה או באייקון.
- ניווט מלא במקלדת, תווית לכל שדה, ניגודיות מספקת.
- `localStorage` לא משמש כזיכרון המערכת.

**מה הדפדפן עושה:**

- קורא מ-`metric_values`, `insights`, `decisions` דרך supabase-js, כמשתמש מחובר (RLS קובע מה מותר).
- כותב רק שורות חדשות ל-`decisions`.
- קורא לפונקציה `POST /api/explain` עם הסשן של המשתמש.
- טוען את קובצי ההגדרות מ-`config/` (תוויות KPI ורשימת הפילוחים).

**מה הדפדפן לא עושה:** לא קורא ל-Arbox, לא קורא למודל, לא מחשב KPI, לא כותב ל-`metric_values` או ל-`insights`, ולא מחזיק שום מפתח סודי.

### 3.2 לוגיקה

| רכיב | תפקיד | סוג הפעלה |
|---|---|---|
| תהליך **W1** ב-n8n: צינור נתונים | משיכה, נרמול, חישוב KPI, זיהוי חריגה, יצירת תובנה | מתוזמן יומי + הפעלה ידנית לטעינת היסטוריה |
| תהליך **W2** ב-n8n: בדיקת תוצאה | בדיקת החלטות שהגיע תאריך הבדיקה שלהן | מתוזמן יומי |
| פונקציה `api/explain.js` ב-Vercel | "הסבר לי": קריאה מאובטחת למודל | לפי בקשה מהדפדפן |

**החלטה:** אין פונקציה נוספת מעבר ל-`api/explain.js`. שמירת החלטות היא כתיבה ישירה מהדפדפן ל-Supabase, ולכן לא נדרשת פונקציה.

### 3.3 נתונים

- **Supabase Postgres:** שלוש טבלאות (סעיף 4).
- **Supabase Auth:** משתמש אחד שנוצר ידנית בדשבורד (סעיף 5).
- **קובצי JSON בריפו:** הגדרות קבועות (סעיף 4.4).
- **אין** Supabase Storage (אין העלאת קבצים) ואין מידע אישי של לקוחות Arbox.

---

## 4. מבנה הנתונים

שמות טבלאות ושדות באנגלית באותיות קטנות עם קו תחתון. התוכן בעברית (לפי course-stack.md).

### 4.1 מיפוי ישויות עשרת ההיבטים

| ישות | איפה היא יושבת |
|---|---|
| Business | `config/business.json` |
| Data Source | `config/business.json` (השדה `data_source`) |
| Metric Definition | `config/metrics.json` |
| Metric Value | טבלה `metric_values` |
| Insight | טבלה `insights` |
| Decision | טבלה `decisions`, `kind = 'kpi'` |
| Outcome | עמודות `outcome_status` ו-`outcome` ב-`decisions` |
| Management Case | טבלה `decisions`, `kind = 'manager'` |
| Action | לא ממומשת ב-MVP |

### 4.2 טבלאות

```sql
-- 1. ערכי מדדים מחושבים, לפי KPI, פילוח ושבוע
create table metric_values (
  id               uuid primary key default gen_random_uuid(),
  kpi_key          text not null,                       -- מפתח מתוך config/metrics.json
  segment_key      text not null default 'total',       -- 'total' או סוג מוצר
  period_type      text not null check (period_type in ('week','month')),
  period_start     date not null,                       -- ראשון (שבוע ישראלי)
  period_end       date not null,                       -- שבת
  value            numeric not null,
  previous_value   numeric,                             -- null אם אין תקופה קודמת
  change_abs       numeric,                             -- null אם לא ניתן לחשב
  change_pct       numeric,                             -- null אם previous_value הוא 0 או null
  threshold_status text not null check (threshold_status in ('normal','anomaly','unavailable')),
  computed_at      timestamptz not null default now(),
  unique (kpi_key, segment_key, period_type, period_start)
);

-- 2. תובנות AI, אחת לכל ערך חריג
create table insights (
  id              uuid primary key default gen_random_uuid(),
  metric_value_id uuid not null unique references metric_values(id) on delete cascade,
  facts           jsonb not null,    -- המספרים המדויקים שנשלחו למודל
  content         jsonb not null,    -- פלט המודל המאומת (סעיף 6.3)
  model           text not null,     -- שם הדגם שיצר את התובנה
  created_at      timestamptz not null default now()
);

-- 3. החלטות: החלטת KPI והחלטת מנהל
create table decisions (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null check (kind in ('kpi','manager')),
  decision_text    text not null,
  insight_id       uuid references insights(id) on delete set null,
  -- שדות החלטת KPI
  kpi_key          text,
  segment_key      text not null default 'total',
  desired_direction text check (desired_direction in ('up','down')),
  check_date       date,
  -- שדות החלטת מנהל
  category         text,
  description      text,
  reason           text,
  case_date        date,
  is_precedent     boolean,          -- true = תקדים, false = חד-פעמי
  -- תוצאה
  outcome_status   text not null check (outcome_status in ('pending','done','unavailable','not_applicable')),
  outcome          jsonb,
  created_by       uuid not null default auth.uid() references auth.users(id),
  created_at       timestamptz not null default now(),
  constraint kpi_fields check (
    kind <> 'kpi' or (kpi_key is not null and desired_direction is not null and check_date is not null)
  ),
  constraint manager_fields check (
    kind <> 'manager' or (category is not null and description is not null and reason is not null
                          and case_date is not null and is_precedent is not null)
  ),
  constraint outcome_by_kind check (
    (kind = 'kpi' and outcome_status in ('pending','done','unavailable'))
    or (kind = 'manager' and outcome_status = 'not_applicable')
  )
);

create index on metric_values (period_end desc);
create index on decisions (outcome_status, check_date);
```

**נימוקי החלטות בעיצוב:**

- `segment_key = 'total'` מייצג את הסכום הכולל, כך ששורה אחת מכסה גם KPI כולל וגם פילוח (F27).
- `period_type` כולל `week` ו-`month`, אך ב-MVP נכתב רק `week` (ה-PRD: השוואה שבועית בשלב ראשון).
- `outcome` היא עמודת JSON כי היא שייכת לשורה אחת (כלל הסטאק לרשימה או אובייקט ששייכים לשורה).
- `facts` נשמר ב-`insights` כדי ש"הסבר לי" ישתמש באותם מספרים בדיוק ולא יחשב מחדש.
- החלטות אינן ניתנות לעריכה או מחיקה מהדפדפן (ה-PRD לא דורש), ולכן אין policies של update או delete.

### 4.3 הרשאות ברמת טבלה (RLS)

RLS מופעל על שלוש הטבלאות. אין policy למשתמש אנונימי, כלומר אנונימי לא קורא ולא כותב דבר.

```sql
alter table metric_values enable row level security;
alter table insights      enable row level security;
alter table decisions     enable row level security;

create policy "owner reads metrics"   on metric_values for select to authenticated using (true);
create policy "owner reads insights"  on insights      for select to authenticated using (true);
create policy "owner reads decisions" on decisions     for select to authenticated using (true);

create policy "owner creates decisions" on decisions for insert to authenticated
  with check (
    created_by = auth.uid()
    and (kind <> 'kpi' or check_date > current_date)
    and (kind <> 'kpi' or outcome_status = 'pending')
    and outcome is null
  );
```

- כתיבה ל-`metric_values`, ל-`insights` ולעדכון `decisions.outcome` נעשית רק על ידי n8n עם מפתח `service_role`, שעוקף RLS. אין policy כזו למשתמש מחובר.
- ההגבלה `check_date > current_date` מיישמת את ההנחה ב-PRD שתאריך בדיקה שעבר לא נקלט.
- **החלטה:** כל משתמש מחובר נחשב "המנהל", כי ב-MVP יש משתמש אחד שנוצר ידנית (רמה 1 בסטאק). אסור ליצור משתמש נוסף ב-Supabase Auth.

### 4.4 קובצי הגדרות בריפו

**`config/business.json`**

```json
{
  "name": "FlyFit",
  "timezone": "Asia/Jerusalem",
  "week_starts_on": "sunday",
  "history_starts_on": "2026-09-06",
  "data_source": { "type": "arbox", "mode": "demo" },
  "ai": { "model": "gemini-3.8-flash" }
}
```

`mode` הוא `demo` (קורא את `config/demo_aggregates.json`) או `live` (קורא מ-Arbox).

**`config/metrics.json`**

```json
{
  "kpis": [
    { "key": "active_members", "label": "מנויים פעילים",     "unit": "count", "higher_is_better": true,  "threshold_pct": null },
    { "key": "cancellations",  "label": "ביטולי מנוי",       "unit": "count", "higher_is_better": false, "threshold_pct": null },
    { "key": "revenue",        "label": "הכנסות",            "unit": "ILS",   "higher_is_better": true,  "threshold_pct": null }
  ],
  "segments": [
    { "key": "total",        "label": "סה״כ" },
    { "key": "subscription", "label": "מנוי" },
    { "key": "punch_card",   "label": "כרטיסיה" },
    { "key": "one_on_one",   "label": "אימון 1/1" },
    { "key": "event",        "label": "אירוע" },
    { "key": "retreat",      "label": "ריטריט" },
    { "key": "unclassified", "label": "לא מסווג" }
  ]
}
```

- `threshold_pct: null` פירושו "אין סף מוגדר": לא מסומנת חריגה והסטטוס `unavailable`. ערכי הסף ייקבעו כשיהיו נתונים (הנחה פתוחה ב-PRD).
- **החלטה:** חריגה מוגדרת כ-`abs(change_pct) >= threshold_pct`, בשני הכיוונים, כי גם שיפור חריג דורש תשומת לב ניהולית. `higher_is_better` משמש לניסוח התובנה ולצבע/אייקון בלבד.
- הקובץ נטען גם על ידי הדפדפן (תוויות) וגם על ידי n8n (קריאה ל-`raw.githubusercontent.com` של הריפו הציבורי), כך שיש מקור אמת אחד.

**`config/demo_aggregates.json`**: נתוני דמה במבנה הנורמלי (סעיף 7.1), לפחות 5 שבועות, לכל KPI ולכל פילוח.

### 4.5 נתוני דוגמה

קובץ `supabase/seed.sql` מכניס לפחות 5 שורות לכל טבלה, כדי שכל מסך יוצג מלא (כלל הסטאק: תמיד יש נתוני דוגמה, והטבלה נבנית לפני המסך).

---

## 5. התחברות והרשאות

### 5.1 תפקידים

לפי ה-PRD, ב-MVP יש תפקיד אחד: **מנהל העסק**, שהוא בעל או בעלת העסק. התפקידים העתידיים (מנהל תחום, יועץ, מנהל מערכת) אינם ממומשים ואין להם שדה בטבלאות.

### 5.2 רמת הרשאות

רמה 1 של סטאק הקורס:

- משתמש אחד ב-Supabase Auth, שנוצר ידנית בדשבורד של Supabase (אימייל וסיסמה).
- באתר יש טופס כניסה בלבד. אין הרשמה, הזמנות, שחזור סיסמה או כניסה עם Google.
- ההגנה היא בהרשאות הטבלה (סעיף 4.3), לא בהסתרת דף. הריפו ציבורי ואין בו דף סודי או סיסמה שנבדקת ב-JavaScript.

### 5.3 זרימת כניסה

1. `index.html`: `supabase.auth.signInWithPassword({ email, password })`.
2. הצלחה: הפניה ל-`snapshot.html`. כישלון: הודעה כללית "פרטי הכניסה שגויים", בלי פירוט.
3. כל דף פנימי קורא ל-`getSession()` בטעינה. אם אין סשן, הפניה ל-`index.html`.
4. כפתור "יציאה" קורא ל-`signOut()`.
5. קריאה ל-`/api/explain` נושאת את `access_token` של הסשן בכותרת `Authorization: Bearer`.

---

## 6. שכבת ה-AI

### 6.1 שני מקומות קריאה

| מקום | מה מייצר | איך נקרא |
|---|---|---|
| תהליך W1 ב-n8n | תובנה (F9) | צומת HTTP Request ישירות ל-Gemini, עם מפתח ב-Credentials של n8n (מותר לפי הסטאק, כי באוטומציה אין דפדפן) |
| `api/explain.js` | "הסבר לי" (F11) | מהדפדפן דרך הפונקציה, אף פעם לא ישירות |

### 6.2 הקריאה ל-Gemini

לפי תיעוד Gemini API (quickstart ו-Structured output):

```
POST https://generativelanguage.googleapis.com/v1beta/interactions
x-goog-api-key: <המפתח>
Content-Type: application/json

{
  "model": "<שם הדגם>",
  "input": "<הוראות + הנתונים כטקסט>",
  "response_format": {
    "type": "text",
    "mime_type": "application/json",
    "schema": { ... }
  }
}
```

- קריאת התוצאה: במערך `steps`, הצעד עם `type == "model_output"`, בתוכו פריט ב-`content` עם `type == "text"`, והשדה `text` הוא מחרוזת JSON שמפענחים.
- שם הדגם: `gemini-3.8-flash` (מאושר ב-tech-stack.md). ב-n8n הוא נקרא מ-`config/business.json`. בפונקציה הוא נקרא ממשתנה הסביבה `GEMINI_MODEL`. שני הערכים חייבים להיות זהים, והדגם בפועל נשמר ב-`insights.model`.
- **החלטה:** כל ההוראות נכנסות בשדה `input`, כי שדה נפרד להוראות מערכת לא אומת בתיעוד שנבדק.
- בקורס המפתח הוא מהשכבה החינמית ונשלחים רק נתוני דמה. למעבר לנתוני FlyFit אמיתיים מחליפים את ערך המפתח בשני המקומות (בלי שינוי קוד).

### 6.3 מה נשלח למודל (תובנה)

אובייקט `facts`, שנשמר גם ב-`insights.facts`. הוא מכיל מספרים שחושבו בקוד בלבד, בלי מידע אישי:

```json
{
  "kpi": { "key": "revenue", "label": "הכנסות", "unit": "ILS", "higher_is_better": true },
  "segment": { "key": "subscription", "label": "מנוי" },
  "period": { "type": "week", "start": "2026-09-27", "end": "2026-10-03" },
  "current_value": 41200,
  "previous_value": 48900,
  "change_abs": -7700,
  "change_pct": -15.7,
  "threshold": { "threshold_pct": 10, "status": "anomaly" },
  "history": [
    { "period_start": "2026-09-20", "value": 48900 },
    { "period_start": "2026-09-13", "value": 47300 }
  ],
  "unavailable": ["סיבת השינוי", "נתוני תקופה קודמת מעבר לשבועות שנשלחו"]
}
```

- `history` כולל עד ארבע תקופות קודמות שקיימות ב-`metric_values`.
- `unavailable` מפרט במפורש מה לא חושב מראש, כדי שהמודל יציין זאת ולא ישלים בעצמו.

**הוראות בפרומפט (מקור: שכבת ה-AI בעשרת ההיבטים):**

1. אסור להמציא נתונים, סיבות או קשרים שאינם במידע שסופק.
2. יש להבדיל במפורש בין עובדה, מגמה שנצפתה, השערה והמלצה.
3. אין לבצע חישובים עצמאיים או להשלים נתון חסר. אם נתון לא חושב מראש, יש לציין שהוא אינו זמין.
4. הפלט בעברית, בשפה פשוטה, בלי ז'רגון.

### 6.4 מה חוזר מהמודל (תובנה)

סכמת `response_format.schema`:

```json
{
  "type": "object",
  "properties": {
    "what_happened":  { "type": "string", "description": "עובדה: מה קרה, עם המספרים שסופקו" },
    "trend":          { "type": "string", "description": "מגמה שנצפתה בהיסטוריה שסופקה" },
    "why_it_matters": { "type": "string", "description": "למה זה חשוב לעסק" },
    "hypothesis":     { "type": "string", "description": "השערה אפשרית, מסומנת כהשערה" },
    "what_to_check":  { "type": "string", "description": "המלצה: מה כדאי לבדוק" }
  },
  "required": ["what_happened","trend","why_it_matters","hypothesis","what_to_check"],
  "additionalProperties": false
}
```

**אימות בקוד לפני שימוש (כלל הסטאק: הקוד בודק את המבנה):**

- כל חמשת המפתחות קיימים, מסוג מחרוזת, לא ריקים, ואורך כל אחד עד 600 תווים.
- אין מפתחות נוספים.
- אם האימות נכשל, התובנה לא נשמרת (ראו 6.6).

### 6.5 "הסבר לי"

הדפדפן שולח `POST /api/explain` עם גוף `{"insight_id": "<uuid>"}` וכותרת `Authorization: Bearer <access_token>`.

הפונקציה:

1. מטפלת בבקשת OPTIONS ובכותרות CORS. מאשרת רק את הכתובת `ALLOWED_ORIGIN` (כתובת האתר ב-GitHub Pages).
2. בודקת ש-`insight_id` הוא UUID תקין, אחרת מחזירה 400.
3. מאמתת את הסשן: `GET {SUPABASE_URL}/auth/v1/user` עם הכותרות `apikey: <המפתח הציבורי>` ו-`Authorization: Bearer <access_token>`. אם נכשל, מחזירה 401.
4. קוראת את שורת התובנה מ-PostgREST (`{SUPABASE_URL}/rest/v1/insights?id=eq.<id>&select=facts,content`) **עם אותו access_token של המשתמש**, כך ש-RLS חל. לכן אין צורך במפתח `service_role` בפונקציה.
5. בונה פרומפט מ-`facts` ומ-`content` שנשמרו, באותן הוראות כמו בסעיף 6.3, בתוספת בקשה להסביר לעומק. קוטעת את הקלט ל-8,000 תווים לכל היותר.
6. קוראת ל-Gemini עם סכמת פלט `{"explanation": string}` ואימות: מחרוזת לא ריקה עד 1,500 תווים.
7. מחזירה JSON.

**תגובות הפונקציה** (תמיד JSON, גם בשגיאה, ללא מפתח או שגיאה גולמית של ספק):

```json
{ "ok": true,  "explanation": "..." }
{ "ok": false, "error": "unauthorized" | "bad_request" | "not_found" | "ai_unavailable" }
```

- קודי סטטוס: 200, 400, 401, 404, 502 (כשל במודל או בפלט לא תקין).
- הדפדפן מציג הודעה כללית בעברית לכל `ok: false`.
- הסבר לא נשמר במסד. הוא נוצר לפי בקשה.

### 6.6 כשלים

| מצב | התנהגות |
|---|---|
| כשל בקריאה ל-Gemini בתהליך W1, או פלט לא תקין | לא נשמרת שורה ב-`insights`. החריגה עדיין מוצגת במסך בלי טקסט תובנה (הנחה 8 ב-PRD). ההרצה הבאה תנסה שוב, כי בדיקת "אין תובנה לחריגה" מתבצעת בכל הרצה. |
| נתון חסר בקלט | נרשם ב-`facts.unavailable`, והמודל מציין שאינו זמין. |
| כשל ב"הסבר לי" | הודעה כללית בעברית. אין חשיפת שגיאה. |

### 6.7 בדיקות AI

קובץ אחד בשורש הריפו, `ai-tests.md` (לפי הסטאק): לפחות עשרה קלטי דמה, התוצאה הצפויה לכל אחד, ואחוז ההצלחה. כולל השוואה בין `gemini-3.8-flash` ל-`gemini-3.5-flash-lite` ובדיקת איכות העברית (אושר ב-tech-stack.md).

---

## 7. אינטגרציות, APIs ואוטומציות

### 7.1 אינטגרציות

| מערכת | מי קורא | איך | הערות |
|---|---|---|---|
| Arbox API | n8n בלבד | צומת HTTP Request. המפתח ב-Credentials של n8n | **לא אומת.** רישום של צד שלישי מציין אימות בכותרת `accesstoken`. שמות הדוחות, השדות, נתוני עבר ושדה סוג המוצר ייקבעו בבדיקת ה-API. |
| Gemini API | n8n ו-`api/explain.js` | סעיף 6.2 | |
| Supabase | הדפדפן (מפתח ציבורי + סשן), n8n (`service_role`), הפונקציה (סשן המשתמש) | supabase-js בדפדפן, REST (PostgREST) ב-n8n ובפונקציה | |
| GitHub Pages (קבצי config) | n8n | HTTP GET ל-`raw.githubusercontent.com` | הריפו ציבורי |

**החלטה:** n8n כותב ל-Supabase דרך צומת HTTP Request ולא דרך צומת ה-Supabase המובנה, כי הצומת המובנה לא מציע פעולת upsert (לפי תיעוד n8n), והצינור חייב להיות אידמפוטנטי. הכתיבה: `POST {SUPABASE_URL}/rest/v1/metric_values?on_conflict=kpi_key,segment_key,period_type,period_start` עם הכותרת `Prefer: resolution=merge-duplicates`. יש לאמת התנהגות זו בעת הבנייה.

**מבנה נורמלי פנימי** (החוזה בין צומת הנרמול לשאר השרשרת). מערך של רשומות מצטברות:

```json
{ "period_start": "2026-09-27", "period_end": "2026-10-03",
  "kpi_key": "revenue", "segment_key": "subscription", "value": 41200 }
```

- בקורס (`mode: demo`) המערך נקרא מ-`config/demo_aggregates.json`.
- ב-`mode: live` המערך נבנה מדוחות Arbox בצומת Code אחד ("נרמול Arbox"). זה הצומת היחיד הספציפי ל-Arbox.
- הנרמול מסכם ומשמיט כל מידע אישי. לעולם לא נכתב ל-Supabase שם, טלפון או מזהה של מתאמן.

### 7.2 תהליך W1: צינור נתונים יומי (F1, F2, F3, F4, F6, F7, F8, F9)

**הפעלות:** Schedule Trigger יומי ב-06:00 (שעון ישראל) ו-Manual Trigger לטעינת היסטוריה.

| שלב | צומת | מה עושה |
|---|---|---|
| 1 | Code: קביעת שבועות | מההפעלה המתוזמנת: שני השבועות המלאים האחרונים (ראשון עד שבת). מההפעלה הידנית: כל השבועות המלאים מ-`history_starts_on` (`2026-09-06`, הראשון המלא אחרי תחילת נתוני Arbox ב-1.9.2026) ועד השבוע המלא האחרון. לכל שבוע נוסף גם השבוע שלפניו לצורך "תקופה קודמת", אבל רק אם הוא מתחיל ב-`history_starts_on` או אחריו. שבוע חלקי אף פעם לא משמש להשוואה. |
| 2 | HTTP: טעינת config | `business.json` ו-`metrics.json` מהריפו. |
| 3 | IF: מצב | `demo` או `live`. |
| 4 | HTTP/Code: מקור נתונים | `demo`: קריאת `demo_aggregates.json`. `live`: משיכה מ-Arbox ונרמול. |
| 5 | Code: חישוב | לכל KPI, פילוח ושבוע: `previous_value` מהשבוע הקודם, `change_abs`, `change_pct`, `threshold_status`. לוגיקה: אם אין שבוע קודם (כולל שבוע ראשון מלא), או שהוא 0, או `threshold_pct` הוא `null`, הסטטוס `unavailable`. אחרת `anomaly` כש-`abs(change_pct) >= threshold_pct`, ו-`normal` בכל מקרה אחר. החישוב בקוד, לא במודל. |
| 6 | HTTP: upsert | כתיבה ל-`metric_values` (סעיף 7.1). |
| 7 | HTTP + Code: חריגות בשבוע האחרון | שליפת שורות `threshold_status = 'anomaly'` בשבוע המלא האחרון בלבד ללא תובנה קיימת, ובניית `facts` כולל `history`. |
| 8 | HTTP: Gemini | קריאה אחת לכל חריגה, באופן רציף. |
| 9 | Code: אימות | לפי סעיף 6.4. |
| 10 | HTTP: insert | כתיבה ל-`insights`. |

**החלטה:** תובנות נוצרות רק לשבוע המלא האחרון. טעינת ההיסטוריה ממלאת `metric_values` לכל השבועות, אבל לא מייצרת תובנות לשבועות ישנים, כדי להישאר בתוך מגבלת 180 השניות של n8n Cloud בתקופת הניסיון ולמנוע עלות מיותרת.

**תכונות:**

- **אידמפוטנטי:** הרצה חוזרת באותו יום לא יוצרת כפילויות (upsert על המפתח הייחודי, ו-`unique` על `insights.metric_value_id`).
- **כשל:** אם משיכה או חישוב נכשלים, ההרצה נעצרת לפני כל כתיבה (שלב 6), כך שאין נתונים חלקיים. הכשל נרשם בלוג ההרצות של n8n.
- **שבוע ישראלי:** ראשון עד שבת, `week_starts_on` ב-`business.json`.

### 7.3 תהליך W2: בדיקת תוצאה (F13)

**הפעלה:** Schedule Trigger יומי ב-06:30 (שעון ישראל), אחרי W1.

| שלב | מה עושה |
|---|---|
| 1 | HTTP GET: `decisions?kind=eq.kpi&outcome_status=eq.pending&check_date=lte.<היום>` (בשירות `service_role`). |
| 2 | לכל החלטה: שליפת `baseline` = שורת `metric_values` העדכנית ביותר עבור `kpi_key` ו-`segment_key` שבה `period_end <= created_at` של ההחלטה. שליפת `current` = השורה העדכנית ביותר עם `period_end <= היום`. |
| 3 | Code: אם חסרה אחת מהשתיים, `outcome_status = 'unavailable'` ו-`outcome = {"reason": "no_data"}`. אחרת מחשבים `change_abs` ו-`change_pct`, ו-`direction_met` (`true` כש-`desired_direction = 'up'` והשינוי חיובי, או `'down'` והשינוי שלילי; אחרת `false`). |
| 4 | HTTP PATCH ל-`decisions`: `outcome_status = 'done'` ו-`outcome`, לפי `id` ובתנאי `outcome_status = 'pending'`. |

מבנה `outcome` ב-`done`:

```json
{ "checked_at": "2026-10-20", "baseline_value": 41200, "current_value": 46800,
  "change_abs": 5600, "change_pct": 13.6, "direction_met": true }
```

התנאי `outcome_status = 'pending'` בעדכון מונע דריסה בהרצה חוזרת.

### 7.4 מתזמנים

| תהליך | תדירות | הערה |
|---|---|---|
| W1 | יומי, 06:00 | **החלטה:** יומי, כי המנהל נכנס יומית (הנחה 2 ב-PRD, טעונה אישור) |
| W2 | יומי, 06:30 | |
| W1 ידני | לפי צורך | טעינת היסטוריה (F2) |

אזור הזמן של סביבת n8n מוגדר ל-`Asia/Jerusalem`.

### 7.5 מה שהמערכת לא מבצעת

בלי שליחת הודעות, בלי כתיבה חזרה ל-Arbox, ובלי פעולות אוטומטיות בשם המנהל. ההחלטות נשמרות ולא מופעלות.

---

## 8. מפתחות סודיים

הריפו ציבורי, וכל מה שבדפדפן גלוי לכל אדם (חוק הברזל ב-course-stack.md).

| מפתח / ערך | איפה יושב | מי קורא |
|---|---|---|
| מפתח Gemini | משתנה סביבה `GEMINI_API_KEY` בפרויקט Vercel, וב-Credentials של n8n | הפונקציה, n8n |
| מפתח Arbox | Credentials של n8n | n8n בלבד |
| מפתח `service_role` של Supabase | Credentials של n8n | n8n בלבד |
| `SUPABASE_URL`, המפתח הציבורי (`anon`) | `js/config.js` בריפו, ומשתני סביבה בפונקציה | הדפדפן והפונקציה (מותר: המפתח הציבורי מוגן בהרשאות הטבלה) |
| `ALLOWED_ORIGIN`, `GEMINI_MODEL` | משתני סביבה בפונקציה | הפונקציה (לא סודיים) |
| סיסמת המשתמש | Supabase Auth בלבד | אף קוד שלנו |

**מה אסור שיגיע לדפדפן:**

- מפתח Gemini, מפתח Arbox ומפתח `service_role`.
- נתוני מתאמנים או כל מידע אישי מזהה (הם אינם נשמרים כלל).
- שגיאות גולמיות מ-Gemini, מ-Arbox או מ-Supabase.

**כללים:**

- מפתח סודי חי בשני מקומות לכל היותר: משתני הסביבה של הפונקציה ו-Credentials של n8n. אין מפתח בקוד, בקובץ הגדרות או בקובצי ה-JSON שבריפו.
- קובצי ה-JSON של תהליכי n8n בתיקיית `n8n/` יוצאים בלי ערכי Credentials, ולפני כל קומיט יש לוודא שאין בהם מפתח.
- אחרי כל שינוי במשתנה סביבה ב-Vercel נדרשת פריסה חדשה (Redeploy).
- מעבר מנתוני דמה לנתוני אמת: החלפת ערך מפתח Gemini בשני המקומות בלבד.

---

## 9. מבנה התיקיות

ריפו אחד, ענף `main` בלבד, תיקיית השורש משמשת את GitHub Pages ואת Vercel.

```
/
├── index.html                  # כניסה
├── snapshot.html               # תמונת מצב ניהולית
├── insights.html               # תובנות, "הסבר לי", שמירת החלטת KPI
├── decisions.html              # החלטות ותוצאות, החלטת מנהל
├── css/
│   └── styles.css              # RTL, גופן Heebo, Responsive, מצבי חריגה
├── js/
│   ├── config.js               # SUPABASE_URL, מפתח ציבורי, כתובת הפונקציה
│   ├── supabase.js             # לקוח, בדיקת סשן, יציאה
│   ├── snapshot.js
│   ├── insights.js
│   ├── decisions.js
│   └── ui.js                   # עזרי תצוגה (סטטוס עם מילה ואייקון, פורמט מספרים)
├── config/
│   ├── business.json
│   ├── metrics.json
│   └── demo_aggregates.json
├── api/
│   └── explain.js              # הפונקציה היחידה (Vercel)
├── lib/                        # קוד משותף לפונקציה, מחוץ ל-api/
│   ├── gemini.js               # קריאה ל-Gemini ופענוח התגובה
│   ├── validate.js             # אימות סכמות
│   └── prompt.js               # בניית הפרומפט
├── n8n/
│   ├── w1-pipeline.json        # ייצוא תהליך W1 (בלי Credentials)
│   └── w2-outcome-check.json   # ייצוא תהליך W2
├── supabase/
│   ├── schema.sql              # טבלאות, אילוצים, RLS
│   └── seed.sql                # נתוני דוגמה
├── ai-tests.md                 # בדיקות AI
├── package.json                # { "type": "module" }, בלי תלויות מיותרות
├── docs/                       # PRD.md, ARCHITECTURE.md, tech-stack.md
└── .gitignore
```

- **החלטה:** `api/explain.js` מייצא `export default { async fetch(request) { ... } }` (תקן Web, לפי תיעוד Vercel), ו-`package.json` כולל `"type": "module"`.
- כל קוד שאינו נקודת כניסה נמצא ב-`lib/`, כי Vercel יוצר פונקציה נפרדת לכל קובץ שבתוך `api/`.
- אין `node_modules` בריפו, ואין ספריות בצד הלקוח מלבד supabase-js מה-CDN.

---

## 10. מסכים ושאילתות

| מסך | מה מציג | שאילתות |
|---|---|---|
| `snapshot.html` | שלושה כרטיסי KPI (סה״כ) עם ערך, שינוי וסטטוס, פילוח לפי סוג מוצר מתחת לכל כרטיס, רשימת חריגות עם הטקסט של התובנה, והחלטות פתוחות | `metric_values` לשבוע המלא האחרון (`order period_end desc limit 1` ואז סינון לפי `period_start`); `insights` עם `metric_value_id` בשורות חריגות; `decisions` עם `outcome_status = pending` |
| `insights.html` | רשימת תובנות, פירוט (חמשת החלקים בנפרד: עובדה, מגמה, חשיבות, השערה, המלצה), כפתור "הסבר לי", וטופס שמירת החלטת KPI | `insights` עם join ל-`metric_values`; קריאה ל-`/api/explain`; `insert` ל-`decisions` |
| `decisions.html` | רשימת החלטות עם KPI, כיוון, תאריך בדיקה ותוצאה, וטופס החלטת מנהל (כולל סימון חד-פעמי/תקדים) | `decisions order created_at desc`; `insert` ל-`decisions` |

**מצבים ריקים וחסרים:**

- אין חריגות: הודעה "אין חריגות השבוע" (**החלטה:** נדרשת כדי שהמסך לא יראה שבור).
- ערך `unavailable` או פילוח חסר: מוצג "לא זמין", לא 0.
- פילוח "לא מסווג" מוצג כשורה רגילה.
- בשדות הטקסט החופשי של החלטת מנהל מוצגת הנחיה: "אין להזין שם או פרטים מזהים של לקוח או שותף" (הנחה 12 ב-PRD).

---

## 11. כיסוי דרישות ה-PRD

| פיצ'ר | איפה ממומש |
|---|---|
| F1, F2 | W1 (שלבים 1 עד 4) |
| F3 | צומת הנרמול ב-W1 |
| F4, F5 | סעיף 4 |
| F6, F7, F8, F27 | W1 שלב 5 |
| F9, F10 | W1 שלבים 7 עד 10, סעיף 6, `ai-tests.md` |
| F11 | `api/explain.js` |
| F12 | `insights.html`, `insert` ל-`decisions` |
| F13 | W2 |
| F14 | `decisions.html`, `decisions.kind = 'manager'` |
| F16, F17, F18, F19 | סעיפים 3.1 ו-10 |
| F26 | סעיף 5 |

---

## 12. נקודות פתוחות והנחות

1. **Arbox API:** לא אומת. שמות דוחות, שדות, נתוני עבר (קיימים מספטמבר 2026), שדה סיווג מוצר, והאם הכנסות וביטולים זמינים. עד האימות המערכת רצה במצב `demo`.
2. **ערכי הסף:** `threshold_pct` ריק בכל ה-KPI עד שייקבעו.
3. **upsert דרך REST:** ההתנהגות של `on_conflict` ו-`Prefer: resolution=merge-duplicates` ב-Supabase REST לא נבדקה במחקר, ויש לאמת בעת הבנייה.
4. **שעת הרצה ושעון:** 06:00 ו-06:30, ואזור הזמן `Asia/Jerusalem` בהגדרות n8n, הם החלטות שלי ולא נתון מהמקורות.
5. **הגדרת שבוע:** ראשון עד שבת, לפי המקובל בישראל. אם Arbox מדווח אחרת, יש להתאים.
6. **כל משתמש מחובר הוא המנהל:** תקף כל עוד קיים משתמש אחד בלבד ב-Supabase Auth.
7. **n8n Cloud בתקופת הניסיון:** 1,000 הרצות ו-180 שניות להרצה (לפי tech-stack.md). הצינור תוכנן להישאר בגבולות אלה.
8. **שם הדגם בשני מקומות:** `config/business.json` (ל-n8n) ומשתנה הסביבה `GEMINI_MODEL` (לפונקציה) חייבים להישאר זהים.
