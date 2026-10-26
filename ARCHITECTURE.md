# הסמנכ״ל — ארכיטקטורה

גרסה 2.0 (טיוטה לאישור) | 26.10.2026

מבוסס על: `PRD.md` גרסה 2.0, `MVP.md` גרסה 2.1, `tech-stack.md` גרסה 2.0 (מאושר), `course-stack.md`, `product-10-definitions.md` גרסה 2.0.

המסמך מתרגם את דרישות ה-PRD לתכנון טכני פשוט. הוא משתמש רק בטכנולוגיות שב-`tech-stack.md`, ובכל מקום שמידע טכני חסר מופיעה בחירה סבירה עם משפט הסבר (מסומנת **החלטה**). הוא אינו כולל Milestones, משימות או לוחות זמנים.

**מה השתנה מגרסה 1.0:** אין עוד צינור n8n שמושך מ-Arbox. הנתונים מגיעים מקובץ שנקרא בדפדפן, והחישוב נעשה בקוד בדפדפן. תהליך n8n אחד נשאר (בדיקת תוצאה). פונקציה אחת בצד השרת מטפלת בכל קריאות ה-AI. ההגדרה של העסק נשמרת בטבלה רביעית.

---

## 1. מבט על

```
┌──────────────────────────────────────────────────────────────┐
│ צד לקוח (GitHub Pages): HTML, CSS, JavaScript                │
│ התחברות, הקמה, קריאת קובץ, חישוב KPI וחריגות, מסכים          │
└───────┬──────────────────────────────┬───────────────────────┘
        │ supabase-js                   │ POST /api/ai
        │ (מפתח ציבורי + סשן משתמש)     │ (הקמה, תובנה, "הסבר לי")
        ▼                               ▼
┌──────────────────────────┐   ┌───────────────────────────────┐
│ נתונים: Supabase         │   │ לוגיקה: פונקציה ב-Vercel      │
│ Auth + 4 טבלאות + RLS    │◄──│ api/ai.js → Gemini            │
└───────────▲──────────────┘   └───────────────────────────────┘
            │ מפתח service_role (רק ב-n8n)
┌───────────┴──────────────────────────────────────────────────┐
│ לוגיקה: n8n Cloud                                            │
│ W2 בדיקת תוצאה יומית (הנתון היחיד שנכתב ע"י n8n)             │
└──────────────────────────────────────────────────────────────┘
```

**עיקרון מנחה:** הדפדפן קורא וכותב ל-Supabase רק במה שהרשאות הטבלה מתירות. כל קריאה למודל עוברת דרך פונקציה אחת. כל חישוב נעשה בקוד, לא במודל. בדיקת התוצאה, היחידה שדורשת תזמון, רצה ב-n8n.

---

## 2. סתירות בין המקורות והחלטות שהתקבלו

| # | הסתירה או השאלה | ההחלטה |
|---|---|---|
| 1 | הסטאק מגביל לשלוש טבלאות, וההגדרה של העסק נוצרת בזמן ריצה. | טבלה רביעית `business_config`, באישור בעלת המוצר (PRD סעיף 5). חלופת גיבוי בסעיף 4.5. |
| 2 | הסטאק מורה להתחיל בפונקציה אחת. ל-AI יש שלוש קריאות מהדפדפן: הקמה, תובנה, "הסבר לי". | פונקציה אחת, `api/ai.js`, עם שדה `action`. כך נשארים בפונקציה אחת. |
| 3 | ה-PRD לא קובע מה "מפעיל" את החישוב האירועי. | האירוע הוא סיום העלאת קובץ תקין (או בחירת עסק דמה). החישוב רץ בדפדפן באותה פעולה. |
| 4 | חישוב KPI צריך להיות בקוד. הקוד יכול לרוץ בדפדפן, בפונקציה או ב-n8n. | **החלטה:** בדפדפן, במודול `engine.js` של פונקציות טהורות. הקובץ ממילא נקרא בדפדפן, אין צורך להעביר אותו לשרת, והסטאק מדגיש פונקציה אחת בלבד. משתמש אחד, ולכן אין צורך להגן על החישוב מפני משתמש זדוני. |
| 5 | ה-PRD אומר שסכום החתכים שווה לסכום הכולל, אבל יש KPI שאינם ניתנים לחיבור (אחוזי המרה, ממוצעים). | **החלטה:** לכל KPI יש סימון `additive`. בדיקת הסכום חלה רק על KPI שסומנו כניתנים לחיבור. צריך לעדכן את סעיף F8 ב-PRD (ראו סעיף 12). |
| 6 | נושא "תפעול" יצא מגרסת הקורס, ו-3 הנושאים קבועים. | שלושת הנושאים קבועים בקוד (`leads`, `sales`, `finance`). ה-AI מציע KPI בתוכם, ולא מציע נושאים. |

---

## 3. שלוש השכבות

### 3.1 צד לקוח

אתר סטטי ב-GitHub Pages: HTML, CSS ו-JavaScript בלבד, בלי React ובלי שלב בנייה.

| רכיב | תפקיד |
|---|---|
| `index.html` | טופס כניסה (אימייל וסיסמה). אין הרשמה, שחזור סיסמה או כניסה עם Google. |
| `setup.html` | הקמה והעלאה (F1, F2, F3, F4, F5): תיאור העסק, שאלות הבהרה, הצעה לאישור, הורדת תבנית, העלאת קובץ או בחירת עסק דמה. |
| `snapshot.html` | המסך העיקרי: תמונת מצב ניהולית (F18). |
| `insights.html` | רשימת תובנות, פירוט, "הסבר לי" ושמירת החלטת KPI (F11, F13, F14, F19). |
| `decisions.html` | החלטות ותוצאות, וטופס החלטת מנהל (F15, F16, F20). |
| `js/supabase.js` | יצירת לקוח Supabase, בדיקת סשן והפניה לכניסה אם אין סשן. |
| `js/setup.js` | שיחת ההקמה, אישור ההצעה ושמירתה. |
| `js/filecontract.js` | הפקת תבנית, קריאת הקובץ ואימות מבנה מול ההגדרה (סעיף 7). |
| `js/engine.js` | חישוב השוואה לתקופה קודמת, שינוי וחריגה. פונקציות טהורות, בלי גישה לרשת. |
| `vendor/xlsx.full.min.js` | SheetJS Community Edition (נשמר בריפו, לפי `tech-stack.md`). |
| גופן | Heebo מ-Google Fonts. |
| ספריות | `@supabase/supabase-js@2` בתג script מ-CDN (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`), לפי תיעוד Supabase. |

**כללי ממשק (מה-PRD ומסטאק הקורס):**

- `<html lang="he" dir="rtl">`, מסך הניהול נבנה קודם למחשב ועובד גם בנייד (F21).
- מצב חריגה מוצג בצבע וגם במילה או באייקון.
- ניווט מלא במקלדת, תווית לכל שדה, ניגודיות מספקת.
- `localStorage` לא משמש כזיכרון המערכת.

**מה הדפדפן עושה:** קורא מכל הטבלאות כמשתמש מחובר. קורא ומאמת קובץ. מחשב מדדים וחריגות. כותב ל-`business_config`, ל-`metric_values` ולשורות חדשות ב-`decisions`. קורא ל-`/api/ai`. טוען עסקי דמה מהריפו.

**מה הדפדפן לא עושה:** לא קורא למודל ישירות, לא מחזיק מפתח סודי, ולא מעדכן תוצאות החלטות (זה n8n).

### 3.2 לוגיקה

| רכיב | תפקיד | סוג הפעלה |
|---|---|---|
| פונקציה `api/ai.js` ב-Vercel | שלוש פעולות AI: `setup`, `insight`, `explain` | לפי בקשה מהדפדפן |
| תהליך **W2** ב-n8n: בדיקת תוצאה | בדיקת החלטות שהגיע תאריך הבדיקה שלהן | מתוזמן יומי |

### 3.3 נתונים

- **Supabase Postgres:** ארבע טבלאות (סעיף 4).
- **Supabase Auth:** משתמש אחד שנוצר ידנית בדשבורד (סעיף 5).
- **קובצי הדגמה בריפו:** עסקי הדמה (סעיף 8).
- **אין** Supabase Storage: קובץ הנתונים לא נשמר, רק הנתונים המצרפיים. אין מידע אישי.

---

## 4. מבנה הנתונים

שמות טבלאות ושדות באנגלית באותיות קטנות עם קו תחתון. התוכן בעברית (לפי `course-stack.md`).

### 4.1 מיפוי ישויות עשרת ההיבטים

| ישות | איפה היא יושבת |
|---|---|
| Business, Data Source | טבלה `business_config` |
| Metric Definition | `business_config.definition` (JSON) |
| Metric Value | טבלה `metric_values` |
| Insight | טבלה `insights` |
| Decision | טבלה `decisions`, `kind = 'kpi'` |
| Outcome | עמודות `outcome_status` ו-`outcome` ב-`decisions` |
| Management Case | טבלה `decisions`, `kind = 'manager'` |
| Action | לא ממומשת בגרסת הקורס |

### 4.2 טבלאות

```sql
-- 1. הגדרת העסק: שורה אחת בלבד בגרסת הקורס
create table business_config (
  id         int primary key default 1 check (id = 1),
  name       text not null,
  description text not null,          -- התיאור החופשי שהמנהל כתב (נתוני דמה בלבד בקורס)
  definition jsonb not null,          -- נושאים, KPI, ספים, תחומי פעילות (סעיף 4.4)
  source     text not null check (source in ('setup','demo')),
  created_at timestamptz not null default now()
);

-- 2. ערכי מדדים מחושבים: לפי KPI, תחום פעילות, סוג לקוח ושבוע
create table metric_values (
  id               uuid primary key default gen_random_uuid(),
  kpi_key          text not null,                       -- מפתח מתוך definition
  activity_key     text not null default 'total',       -- 'total' או מפתח תחום פעילות
  customer_type    text not null default 'total' check (customer_type in ('total','new','existing')),
  period_type      text not null default 'week' check (period_type = 'week'),
  period_start     date not null,                       -- ראשון
  period_end       date not null,                       -- שבת
  value            numeric not null,
  previous_value   numeric,                             -- null אם אין תקופה קודמת
  change_abs       numeric,                             -- null אם לא ניתן לחשב
  change_pct       numeric,                             -- null אם previous_value הוא 0 או null
  threshold_status text not null check (threshold_status in ('normal','anomaly','unavailable')),
  computed_at      timestamptz not null default now(),
  unique (kpi_key, activity_key, customer_type, period_type, period_start)
);

-- 3. תובנות AI, אחת לכל ערך חריג
create table insights (
  id              uuid primary key default gen_random_uuid(),
  metric_value_id uuid not null unique references metric_values(id) on delete cascade,
  facts           jsonb not null,    -- המספרים המדויקים שנשלחו למודל
  content         jsonb not null,    -- פלט המודל המאומת (סעיף 6.4)
  model           text not null,     -- שם הדגם שיצר את התובנה
  created_at      timestamptz not null default now()
);

-- 4. החלטות: החלטת KPI והחלטת מנהל
create table decisions (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null check (kind in ('kpi','manager')),
  decision_text    text not null,
  insight_id       uuid references insights(id) on delete set null,
  -- שדות החלטת KPI
  kpi_key          text,
  activity_key     text not null default 'total',
  customer_type    text not null default 'total',
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

- `activity_key = 'total'` ו-`customer_type = 'total'` מייצגים את הסכום הכולל, כך שאותה טבלה מכסה גם KPI כולל וגם חתכים.
- `period_type` מוגבל ל-`week` בגרסת הקורס (**הנחה**, PRD סעיף 3).
- `outcome` ו-`definition` הן עמודות JSON כי הן שייכות לשורה אחת (כלל הסטאק).
- `facts` נשמר ב-`insights` כדי ש"הסבר לי" ישתמש באותם מספרים בדיוק ולא יחשב מחדש.
- אין עריכה של החלטות מהדפדפן (ה-PRD לא דורש).
- `business_config` מוגבלת לשורה אחת (`id = 1`) כי בגרסת הקורס יש עסק אחד (ריבוי עסקים הוא F26).

### 4.3 הרשאות ברמת טבלה (RLS)

RLS מופעל על כל ארבע הטבלאות. אין policy למשתמש אנונימי, כלומר אנונימי לא קורא ולא כותב דבר.

```sql
alter table business_config enable row level security;
alter table metric_values   enable row level security;
alter table insights        enable row level security;
alter table decisions       enable row level security;

-- קריאה: משתמש מחובר
create policy "read" on business_config for select to authenticated using (true);
create policy "read" on metric_values   for select to authenticated using (true);
create policy "read" on insights        for select to authenticated using (true);
create policy "read" on decisions       for select to authenticated using (true);

-- כתיבה מהדפדפן: הגדרה ונתונים מצרפיים (upsert דורש insert ו-update)
create policy "write" on business_config for insert to authenticated with check (true);
create policy "write" on business_config for update to authenticated using (true) with check (true);
create policy "write" on metric_values   for insert to authenticated with check (true);
create policy "write" on metric_values   for update to authenticated using (true) with check (true);

-- תובנות: נכתבות רק ע"י הפונקציה, בשם המשתמש (טוקן המשתמש, RLS חל)
create policy "write" on insights for insert to authenticated with check (true);

-- החלטות: הוספה בלבד
create policy "owner creates decisions" on decisions for insert to authenticated
  with check (
    created_by = auth.uid()
    and (kind <> 'kpi' or check_date > current_date)
    and (kind <> 'kpi' or outcome_status = 'pending')
    and outcome is null
  );

-- מחיקה: רק בהקמה מחדש, אחרי אישור מפורש של המנהל (סעיף 5.4)
create policy "reset" on business_config for delete to authenticated using (true);
create policy "reset" on metric_values   for delete to authenticated using (true);
create policy "reset" on insights        for delete to authenticated using (true);
create policy "reset" on decisions       for delete to authenticated using (true);
```

- עדכון `decisions.outcome` נעשה רק על ידי n8n עם מפתח `service_role`, שעוקף RLS. אין policy כזו למשתמש מחובר.
- ההגבלה `check_date > current_date` מיישמת את ההנחה ב-PRD שתאריך בדיקה שעבר לא נקלט.
- **החלטה:** כל משתמש מחובר נחשב "המנהל", כי יש משתמש אחד שנוצר ידנית (רמה 1 בסטאק). אסור ליצור משתמש נוסף ב-Supabase Auth.
- מחיקה בטבלאות מותרת למשתמש המחובר, אבל רק מסך ההקמה מציע אותה, אחרי אישור מפורש (סעיף 5.4).
- **יש לאמת בבנייה:** שה-`upsert` של supabase-js עובד מול ה-policies האלה.

### 4.4 מבנה `business_config.definition`

מבנה זה הוא ה"חוזה" בין שיחת ההקמה, התבנית, האימות והחישוב. המפתחות נוצרים בקוד, לא ב-AI, ואין בהם עברית.

```json
{
  "version": 1,
  "topics": [
    {
      "key": "leads",
      "label": "מתעניינים",
      "kpis": [
        {
          "key": "leads_1",
          "label": "פניות חדשות",
          "unit": "count",
          "higher_is_better": true,
          "additive": true,
          "by_customer_type": false,
          "definition": "מספר הפניות החדשות בשבוע",
          "threshold_pct": 20
        }
      ]
    },
    { "key": "sales",   "label": "מכירות", "kpis": [] },
    { "key": "finance", "label": "כספים",  "kpis": [] }
  ],
  "activity_areas": [
    { "key": "a1", "label": "תחום ראשון" }
  ]
}
```

- שלושה נושאים בדיוק, בסדר קבוע ובמפתחות קבועים: `leads` (מתעניינים), `sales` (מכירות), `finance` (כספים).
- ארבעה KPI בכל נושא. מפתח KPI: `<topic_key>_<מספר>`.
- `unit`: `count`, `ILS`, `percent` או `number`.
- `additive`: האם מותר לחבר את ערכי החתכים לסכום (למשל פניות כן, אחוז המרה לא).
- `by_customer_type`: האם ה-KPI מוצג גם לפי חדש וקיים.
- מפתח תחום פעילות: `a<מספר>`. בין 1 ל-6 תחומים (**הנחה**).
- `threshold_pct`: מספר חיובי. `null` פירושו "אין סף" (לא מסומנת חריגה).
- **החלטה:** חריגה מוגדרת כ-`abs(change_pct) >= threshold_pct`, בשני הכיוונים, כי גם שיפור חריג דורש תשומת לב. `higher_is_better` משמש לניסוח התובנה ולצבע/אייקון בלבד.
- התוויות והתיאורים בעברית מגיעים מההצעה של ה-AI אחרי אישור המנהל.

### 4.5 חלופה בטוחה לטבלה הרביעית

אם האישור לטבלה הרביעית יתברר כלא תקף: להסיר את `business_config`, ולשמור את `name`, `description`, `definition` ו-`source` בעמודת JSON אחת בשורה מיוחדת (`kind = 'config'`) בטבלה קיימת. זה מחייב להתאים את ה-constraints של `decisions` או `metric_values`, ולכן ההמלצה היא להשאיר את הטבלה הרביעית כל עוד האישור בתוקף.

### 4.6 נתוני דוגמה

קובץ `supabase/seed.sql` מכניס לפחות 5 שורות לכל טבלה (כלל הסטאק). לצורך זה משמש עסק דמה אחד, ראו סעיף 8.

---

## 5. התחברות והרשאות

### 5.1 תפקידים

תפקיד אחד: **מנהל העסק**. התפקידים העתידיים (יועץ, מנהל תחום) אינם ממומשים ואין להם שדה בטבלאות.

### 5.2 רמת הרשאות

רמה 1 של סטאק הקורס: משתמש אחד ב-Supabase Auth, שנוצר ידנית בדשבורד (אימייל וסיסמה). באתר יש טופס כניסה בלבד. ההגנה היא בהרשאות הטבלה (סעיף 4.3), לא בהסתרת דף. הריפו ציבורי ואין בו דף סודי או סיסמה שנבדקת ב-JavaScript.

### 5.3 זרימת כניסה

1. `index.html`: `supabase.auth.signInWithPassword({ email, password })`.
2. הצלחה: אם אין הגדרת עסק, הפניה ל-`setup.html`. אחרת ל-`snapshot.html`. כישלון: הודעה כללית "פרטי הכניסה שגויים", בלי פירוט.
3. כל דף פנימי קורא ל-`getSession()` בטעינה. אם אין סשן, הפניה ל-`index.html`.
4. כפתור "יציאה" קורא ל-`signOut()`.
5. קריאה ל-`/api/ai` נושאת את `access_token` של הסשן בכותרת `Authorization: Bearer`.

### 5.4 הקמה מחדש

הקמה מחדש (PRD הנחה 9) מוחקת את ההגדרה הקודמת ואת כל הנתונים שנוצרו איתה: מדדים, תובנות והחלטות. **החלטה:** כי יש עסק אחד, ושארית של עסק קודם תתערבב בנתונים החדשים. המסך מציג אזהרה ברורה (מה יימחק ובאילו כמויות), ומבצע מחיקה רק אחרי אישור מפורש של המנהל.

---

## 6. שכבת ה-AI

### 6.1 מקום הקריאה

כל קריאות ה-AI עוברות דרך `api/ai.js`. אין קריאות ל-Gemini מ-n8n או מהדפדפן. **החלטה:** כך המפתח נשמר במקום אחד בלבד (משתנה סביבה ב-Vercel), ושם הדגם מוגדר במקום אחד, `GEMINI_MODEL`.

| פעולה | פיצ'ר | מי מפעיל |
|---|---|---|
| `setup` | F1 הקמה בשיחה | הדפדפן, ב-`setup.html` |
| `insight` | F11 יצירת תובנה | הדפדפן, אחרי העלאת קובץ, לכל חריגה |
| `explain` | F13 "הסבר לי" | הדפדפן, בלחיצה |

### 6.2 הקריאה ל-Gemini

לפי תיעוד Gemini API (quickstart ו-Structured output), כפי שנבדק בגרסה 1.0:

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
- שם הדגם: `gemini-3.8-flash` (מאושר ב-`tech-stack.md`), ממשתנה הסביבה `GEMINI_MODEL`. הדגם בפועל נשמר ב-`insights.model`.
- **החלטה:** כל ההוראות נכנסות בשדה `input`, כי שדה נפרד להוראות מערכת לא אומת בתיעוד שנבדק.
- **לא נבדק מחדש בגרסה זו:** הקריאה והפורמט. יש לאמת מול התיעוד העדכני בבנייה.
- בקורס המפתח הוא מהשכבה החינמית ונשלחים רק נתוני דמה. למעבר לנתונים אמיתיים מחליפים את ערך המפתח בלבד.

### 6.3 עיקרון משותף לכל הפעולות

כל פעולה בפונקציה:

1. מטפלת בבקשת OPTIONS ובכותרות CORS. מאשרת רק את `ALLOWED_ORIGIN` (כתובת האתר ב-GitHub Pages).
2. מאמתת את הסשן: `GET {SUPABASE_URL}/auth/v1/user` עם `apikey: <המפתח הציבורי>` ו-`Authorization: Bearer <access_token>`. אם נכשל, 401.
3. מאמתת את גוף הבקשה ומגבילה אורך קלט.
4. קוראת ל-Gemini עם סכמת פלט, ומאמתת את התוצאה בקוד לפני החזרה.
5. מחזירה JSON תמיד: `{ "ok": true, ... }` או `{ "ok": false, "error": "unauthorized" | "bad_request" | "not_found" | "ai_unavailable" }`, בלי מפתח ובלי שגיאה גולמית של ספק.

קודי סטטוס: 200, 400, 401, 404, 502 (כשל במודל או בפלט לא תקין).

### 6.4 `setup`: הקמה בשיחה (F1)

**בקשה:**

```json
{ "action": "setup", "description": "...", "answers": ["...", "..."] }
```

- `description`: תיאור העסק, עד 1,000 תווים (**הנחה**).
- `answers`: אופציונלי, התשובות לשאלות ההבהרה, עד 3, כל אחת עד 300 תווים (**הנחה**).
- הפונקציה חסרת מצב: הדפדפן שולח את כל ההיסטוריה בכל קריאה.

**שני סוגי תשובה:**

```json
{ "ok": true, "type": "questions", "questions": ["...", "..."] }
{ "ok": true, "type": "proposal",  "proposal": { ... } }
```

- בקריאה הראשונה (בלי `answers`) המודל מחליט אם לשאול (עד 3 שאלות קצרות) או להציע ישר.
- בקריאה עם `answers` הוא חייב להחזיר הצעה. **החלטה:** סבב שאלות אחד בלבד, כדי לשמור על "עד 3 שאלות" ועל פשטות.

**סכמת ההצעה (`proposal`):**

```json
{
  "topics": [
    { "key": "leads",   "kpis": [ { "label": "", "unit": "count", "higher_is_better": true, "additive": true, "by_customer_type": false, "definition": "", "threshold_pct": 20 } ] },
    { "key": "sales",   "kpis": [ ... ] },
    { "key": "finance", "kpis": [ ... ] }
  ],
  "activity_areas": [ { "label": "" } ]
}
```

**אימות בקוד לפני החזרה:**

- שלושה נושאים בדיוק, במפתחות `leads`, `sales`, `finance`.
- ארבעה KPI בכל נושא.
- `label` לא ריק עד 40 תווים, `definition` לא ריק עד 200 תווים.
- `unit` מתוך הרשימה. `threshold_pct` מספר גדול מ-0 ועד 100, או `null`.
- 1 עד 6 תחומי פעילות, כל `label` עד 40 תווים, בלי כפילויות.
- אין מפתחות נוספים.

אם האימות נכשל, ההצעה לא מוחזרת: 502 והודעה כללית בדפדפן, עם אפשרות לנסות שוב.

**אחרי האימות** (בדפדפן) הקוד מוסיף את המפתחות (`leads_1`, `a1` וכו') ומציג את ההצעה לתיקון. שום דבר לא נשמר לפני אישור המנהל.

**הוראות בפרומפט:**

1. לבסס את ההצעה רק על התיאור והתשובות. אסור להמציא נתונים על העסק.
2. להציע רק KPI שאפשר למדוד מנתונים מצרפיים שבועיים.
3. לא לבצע חישובים. הספים הם הצעה בלבד.
4. הפלט בעברית פשוטה.
5. אין להזכיר שמות או פרטים מזהים של אנשים.

### 6.5 `insight`: יצירת תובנה (F11)

**בקשה:** `{ "action": "insight", "metric_value_id": "<uuid>" }`

הפונקציה:

1. בודקת ש-`metric_value_id` הוא UUID תקין.
2. קוראת את שורת `metric_values` ואת עד ארבע התקופות הקודמות של אותו KPI, תחום וסוג לקוח, מ-PostgREST **עם טוקן המשתמש** (RLS חל). וקוראת את `business_config.definition` לתוויות.
3. בודקת ש-`threshold_status = 'anomaly'`, אחרת 400.
4. בונה את `facts` (סעיף 6.6) ומפעילה את Gemini.
5. מאמתת את הפלט (סעיף 6.7), ו**שומרת** שורה ב-`insights` עם טוקן המשתמש.
6. מחזירה את התובנה.

**אידמפוטנטי:** אם כבר קיימת תובנה לאותו `metric_value_id`, היא מוחזרת בלי קריאה למודל.

### 6.6 מה נשלח למודל (תובנה)

אובייקט `facts`, שנשמר גם ב-`insights.facts`. מספרים שחושבו בקוד בלבד, בלי מידע אישי:

```json
{
  "topic": { "key": "finance", "label": "כספים" },
  "kpi": { "key": "finance_1", "label": "הכנסות", "unit": "ILS", "higher_is_better": true, "definition": "..." },
  "segment": { "activity": { "key": "a1", "label": "..." }, "customer_type": "total" },
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

**הוראות בפרומפט (מקור: שכבת ה-AI ב-`product-10-definitions.md`):**

1. אסור להמציא נתונים, סיבות או קשרים שאינם במידע שסופק.
2. יש להבדיל במפורש בין עובדה, מגמה שנצפתה, השערה והמלצה.
3. אין לבצע חישובים עצמאיים או להשלים נתון חסר. אם נתון לא חושב מראש, יש לציין שהוא אינו זמין.
4. הפלט בעברית, בשפה פשוטה, בלי ז'רגון.

### 6.7 מה חוזר מהמודל (תובנה)

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

**אימות בקוד לפני שימוש:**

- כל חמשת המפתחות קיימים, מסוג מחרוזת, לא ריקים, ואורך כל אחד עד 600 תווים.
- אין מפתחות נוספים.
- אם האימות נכשל, התובנה לא נשמרת (סעיף 6.9).

### 6.8 `explain`: "הסבר לי" (F13)

**בקשה:** `{ "action": "explain", "insight_id": "<uuid>" }`

הפונקציה קוראת את `facts` ו-`content` של התובנה מ-PostgREST עם טוקן המשתמש, בונה פרומפט באותן הוראות כמו ב-6.6 בתוספת בקשה להסביר לעומק, קוטעת את הקלט ל-8,000 תווים, וקוראת ל-Gemini עם סכמה `{"explanation": string}` ואימות (מחרוזת לא ריקה עד 1,500 תווים). ההסבר לא נשמר במסד, ונוצר לפי בקשה.

### 6.9 כשלים

| מצב | התנהגות |
|---|---|
| כשל בקריאה ל-Gemini, או פלט לא תקין, ב-`insight` | לא נשמרת שורה ב-`insights`. החריגה מוצגת בלי טקסט תובנה (PRD הנחה 8), עם כפתור "נסה שוב ליצור תובנה". |
| נתון חסר בקלט | נרשם ב-`facts.unavailable`, והמודל מציין שאינו זמין. |
| כשל ב-`setup` או `explain` | הודעה כללית בעברית. אין חשיפת שגיאה. |
| מגבלת קצב של השכבה החינמית | **לא אומתה.** ראו 6.10 ו-12. |

### 6.10 מגבלת מספר קריאות

אחרי העלאה, הדפדפן קורא ל-`insight` רק לחריגות של **השבוע האחרון בנתונים**, ברצף ולא במקביל, ועד 6 קריאות להעלאה (**הנחה**). חריגות נוספות מקבלות כפתור "צור תובנה". כך מוגבל מספר הקריאות ומכובדת מגבלת הקצב הלא ידועה של השכבה החינמית.

### 6.11 בדיקות AI

קובץ אחד בשורש הריפו, `ai-tests.md` (לפי הסטאק): לפחות עשרה קלטי דמה, התוצאה הצפויה לכל אחד, ואחוז ההצלחה. כולל קלטים להצעת ההקמה: תיאורי עסק שונים, תיאור קצר מדי ותיאור שמנסה לגרום ל-AI להמציא נתונים. כולל השוואה בין `gemini-3.8-flash` ל-`gemini-3.5-flash-lite` ובדיקת איכות העברית (אושר ב-`tech-stack.md`).

---

## 7. חוזה קובץ הנתונים (F3, F4)

### 7.1 מבנה

פורמט "ארוך": שורה אחת לכל ערך. קובץ CSV (UTF-8) או xlsx, בגיליון הראשון.

| עמודה | חובה | תיאור |
|---|---|---|
| `week_start` | כן | תאריך תחילת השבוע (יום ראשון), בפורמט `YYYY-MM-DD` |
| `kpi_key` | כן | מפתח ה-KPI מההגדרה |
| `kpi_label` | לא | שם ה-KPI בעברית, לנוחות המנהל בלבד. הקוד מתעלם ממנה |
| `activity_key` | כן | `total` או מפתח תחום פעילות מההגדרה |
| `customer_type` | כן | `total`, `new` או `existing` |
| `value` | כן | מספר. נקודה עשרונית. ריק פירושו "אין נתון" |

### 7.2 הפקת התבנית (F3)

אחרי אישור ההגדרה, הקוד מפיק קובץ CSV (UTF-8 עם BOM) הכולל שורה לכל שילוב, עם `value` ריק, ל-8 שבועות אחרונים שלפני תאריך ההפקה (**הנחה**):

- כל KPI × `total` × `total`.
- כל KPI × כל תחום פעילות × `total`.
- ל-KPI עם `by_customer_type`: גם `new` ו-`existing`, עם `total` בתחום.

### 7.3 אימות (F4)

הקוד קורא את הקובץ עם SheetJS ומאמת את כל השורות לפני שכותב משהו. **כל שגיאה דוחה את כל הקובץ**, עם הודעה שמציינת מה השגיאה ובאיזו שורה. אין שמירה חלקית.

| בדיקה | תוצאה |
|---|---|
| עמודה חובה חסרה, או גיליון ריק | נדחה |
| `week_start` לא תאריך תקין, או לא יום ראשון | נדחה |
| `kpi_key`, `activity_key` או `customer_type` לא קיימים בהגדרה | נדחה |
| `customer_type` שאינו `total` ל-KPI בלי `by_customer_type` | נדחה |
| `value` שאינו מספר (ואינו ריק) | נדחה |
| שורה כפולה (אותו KPI, תחום, סוג לקוח ושבוע) | נדחה |
| גודל קובץ מעל 2MB או מעל 10,000 שורות | נדחה (**הנחה**, תוגדר בבנייה) |
| ל-KPI `additive`, סכום ערכי התחומים בשבוע שונה מהסכום הכולל (בהפרש מעל אחוז אחד) | נדחה (**הנחה** לגבי הסובלנות) |
| שורת `total` חסרה לשבוע | לא שגיאה: הערך מסומן "לא זמין" |
| `value` ריק | לא שגיאה: מדלגים על השורה |

### 7.4 קידוד

קובץ CSV שנשמר ב-Excel בקידוד ישן עלול להציג עברית משובשת. הבדיקה מבוצעת בשלב 2 (ראו `tech-stack.md` סעיף 2.4). התבנית עצמה בקידוד UTF-8, ואפשר להעלות גם xlsx.

---

## 8. עסקי דמה (F5)

- שני עסקי דמה לפחות, בתחומים שונים (התחומים עדיין לא נבחרו, פתוח).
- לכל עסק תיקייה `demo/<key>/` עם שני קבצים: `definition.json` (במבנה של סעיף 4.4) ו-`data.csv` (בחוזה של סעיף 7).
- בחירת עסק דמה טוענת את שני הקבצים **באותו מסלול כמו העלאה אמיתית**: כתיבת `business_config` עם `source = 'demo'`, ואז אימות, חישוב ושמירה. כך עסקי הדמה בודקים את החוזה עצמו.
- בכל עסק דמה לפחות 8 שבועות, עם חריגה מכוונת אחת לפחות בכל נושא.
- **החלטה:** כל המקורות הם קבצים סטטיים בריפו. אין עסק דמה בקוד.

---

## 9. זרימות עיקריות

### 9.1 הקמה והעלאה

| שלב | מי | מה |
|---|---|---|
| 1 | הדפדפן | המנהל כותב תיאור ושולח `setup` |
| 2 | הפונקציה | מחזירה שאלות הבהרה או הצעה |
| 3 | הדפדפן | אם התקבלו שאלות, שולח שוב עם התשובות ומקבל הצעה |
| 4 | הדפדפן | מוסיף מפתחות, מציג הצעה לתיקון ואישור |
| 5 | הדפדפן | אם קיימת הגדרה, מציג אזהרת מחיקה ומחכה לאישור (סעיף 5.4) |
| 6 | הדפדפן | שומר `business_config` ומפיק תבנית להורדה |
| 7 | הדפדפן | המנהל מעלה קובץ. קריאה, אימות (סעיף 7.3) |
| 8 | הדפדפן | `engine.js` מחשב לכל KPI, תחום, סוג לקוח ושבוע: `previous_value`, `change_abs`, `change_pct`, `threshold_status` |
| 9 | הדפדפן | `upsert` ל-`metric_values` על המפתח הייחודי, בקבוצות אם נדרש. כל קבוצה היא בקשה אחת |
| 10 | הדפדפן | שולף חריגות של השבוע האחרון בנתונים ללא תובנה, וקורא ל-`insight` (סעיף 6.10) |

### 9.2 חישוב (`engine.js`)

פונקציה טהורה. לכל שורה (KPI, תחום, סוג לקוח), ממוינת לפי שבוע:

- `previous_value` = הערך בשבוע הקודם לו, אם קיים ובדיוק שבוע לפניו. אחרת `null`.
- `change_abs = value - previous_value`. `null` אם אין קודם.
- `change_pct = change_abs / previous_value * 100`. `null` אם הקודם הוא 0 או `null`.
- `threshold_status`: `unavailable` אם אין `change_pct` או `threshold_pct` הוא `null`. אחרת `anomaly` כש-`abs(change_pct) >= threshold_pct`, ו-`normal` בכל מקרה אחר.
- שבוע ללא קודם מיד לפניו, או ללא `total`, מסומן "לא זמין" ולא מחושב בניחוש.

**שבוע אחרון:** מוגדר כשבוע האחרון שיש בו נתונים בקובץ, לא לפי התאריך של היום, כדי שעסקי דמה יציגו תמונת מצב מלאה בכל תאריך. **החלטה.**

### 9.3 W2: בדיקת תוצאה (F15)

**הפעלה:** Schedule Trigger יומי ב-06:30, אזור הזמן של n8n מוגדר ל-`Asia/Jerusalem`. **החלטה:** שעה יומית שנבחרה ע"י, לא נתון מהמקורות.

| שלב | מה עושה |
|---|---|
| 1 | HTTP GET: `decisions?kind=eq.kpi&outcome_status=eq.pending&check_date=lte.<היום>` (בשירות `service_role`). |
| 2 | לכל החלטה: `baseline` = שורת `metric_values` העדכנית ביותר עבור `kpi_key`, `activity_key` ו-`customer_type` שלה, שבה `period_end <= created_at` של ההחלטה. `current` = השורה העדכנית ביותר עם `period_end <= היום`. |
| 3 | Code: אם חסרה אחת מהשתיים, `outcome_status = 'unavailable'` ו-`outcome = {"reason": "no_data"}`. אחרת מחשבים `change_abs`, `change_pct` ו-`direction_met` (`true` כש-`desired_direction = 'up'` והשינוי חיובי, או `'down'` והשינוי שלילי; אחרת `false`). |
| 4 | HTTP PATCH ל-`decisions`: `outcome_status = 'done'` ו-`outcome`, לפי `id` ובתנאי `outcome_status = 'pending'`. |

מבנה `outcome` ב-`done`:

```json
{ "checked_at": "2026-10-20", "baseline_value": 41200, "current_value": 46800,
  "change_abs": 5600, "change_pct": 13.6, "direction_met": true }
```

התנאי `outcome_status = 'pending'` בעדכון מונע דריסה בהרצה חוזרת.

**שים לב:** עסקי הדמה מכילים נתונים של שבועות קבועים בעבר. החלטה שנשמרת היום עם תאריך בדיקה עתידי תיבדק מול הערך האחרון שבטבלה, שאולי לא ישתנה. כדי להדגים את הלולאה בקורס, צריך תרחיש שבו מועלה קובץ נוסף עם שבוע חדש אחרי שמירת ההחלטה. **פתוח:** תרחיש ההדגמה המדויק.

### 9.4 מתזמנים

| תהליך | תדירות |
|---|---|
| W2 | יומי, 06:30 |

אוטומציה רצה בתדירות הנמוכה ביותר שמספיקה להדגמה (כלל הסטאק).

---

## 10. מפתחות סודיים

הריפו ציבורי, וכל מה שבדפדפן גלוי לכל אדם (חוק הברזל ב-`course-stack.md`).

| מפתח / ערך | איפה יושב | מי קורא |
|---|---|---|
| מפתח Gemini | משתנה סביבה `GEMINI_API_KEY` בפרויקט Vercel | הפונקציה בלבד |
| מפתח `service_role` של Supabase | Credentials של n8n | n8n בלבד |
| `SUPABASE_URL`, המפתח הציבורי (`anon`) | `js/config.js` בריפו, ומשתני סביבה בפונקציה | הדפדפן והפונקציה (מותר: המפתח הציבורי מוגן בהרשאות הטבלה) |
| `ALLOWED_ORIGIN`, `GEMINI_MODEL` | משתני סביבה בפונקציה | הפונקציה (לא סודיים) |
| סיסמת המשתמש | Supabase Auth בלבד | אף קוד שלנו |

**מה אסור שיגיע לדפדפן:** מפתח Gemini, מפתח `service_role`, ושגיאות גולמיות מ-Gemini או מ-Supabase.

**כללים:**

- מפתח סודי חי בשני מקומות לכל היותר: משתני הסביבה של הפונקציה ו-Credentials של n8n. אין מפתח בקוד, בקובץ הגדרות או בקובצי ה-JSON שבריפו.
- קובץ ה-JSON של תהליך n8n בתיקיית `n8n/` יוצא בלי ערכי Credentials, ולפני כל קומיט יש לוודא שאין בו מפתח.
- אחרי כל שינוי במשתנה סביבה ב-Vercel נדרשת פריסה חדשה (Redeploy).
- מעבר מנתוני דמה לנתוני אמת: החלפת ערך מפתח Gemini בלבד.
- **פרטיות:** תיאור העסק והנתונים בקורס הם נתוני דמה. השכבה החינמית משתמשת בתוכן לשיפור מוצרי הספק (`course-stack.md`).

---

## 11. מבנה התיקיות

ריפו אחד, ענף `main` בלבד, תיקיית השורש משמשת את GitHub Pages ואת Vercel.

```
/
├── index.html                  # כניסה
├── setup.html                  # הקמה והעלאה
├── snapshot.html               # תמונת מצב ניהולית
├── insights.html               # תובנות, "הסבר לי", שמירת החלטת KPI
├── decisions.html              # החלטות ותוצאות, החלטת מנהל
├── css/
│   └── styles.css              # RTL, גופן Heebo, Responsive, מצבי חריגה
├── js/
│   ├── config.js               # SUPABASE_URL, מפתח ציבורי, כתובת הפונקציה
│   ├── supabase.js             # לקוח, בדיקת סשן, יציאה
│   ├── setup.js                # שיחת ההקמה ואישור ההצעה
│   ├── filecontract.js         # תבנית, קריאה ואימות קובץ
│   ├── engine.js               # חישוב השוואה, שינוי וחריגה (פונקציות טהורות)
│   ├── snapshot.js
│   ├── insights.js
│   ├── decisions.js
│   └── ui.js                   # עזרי תצוגה (סטטוס עם מילה ואייקון, פורמט מספרים)
├── vendor/
│   └── xlsx.full.min.js        # SheetJS Community Edition
├── demo/
│   ├── <business-a>/definition.json
│   ├── <business-a>/data.csv
│   ├── <business-b>/definition.json
│   └── <business-b>/data.csv
├── api/
│   └── ai.js                   # הפונקציה היחידה (Vercel): setup, insight, explain
├── lib/                        # קוד משותף לפונקציה, מחוץ ל-api/
│   ├── gemini.js               # קריאה ל-Gemini ופענוח התגובה
│   ├── validate.js             # אימות סכמות
│   └── prompt.js               # בניית הפרומפטים
├── n8n/
│   └── w2-outcome-check.json   # ייצוא תהליך W2 (בלי Credentials)
├── supabase/
│   ├── schema.sql              # טבלאות, אילוצים, RLS
│   └── seed.sql                # נתוני דוגמה
├── ai-tests.md                 # בדיקות AI
├── package.json                # { "type": "module" }, בלי תלויות מיותרות
├── docs/                       # PRD.md, ARCHITECTURE.md, tech-stack.md, MVP.md
└── .gitignore
```

- **החלטה:** `api/ai.js` מייצא `export default { async fetch(request) { ... } }` (תקן Web, לפי תיעוד Vercel כפי שנבדק בגרסה 1.0), ו-`package.json` כולל `"type": "module"`. יש לאמת בבנייה.
- כל קוד שאינו נקודת כניסה נמצא ב-`lib/`, כי Vercel יוצר פונקציה נפרדת לכל קובץ שבתוך `api/`.
- אין `node_modules` בריפו, ואין ספריות בצד הלקוח מלבד supabase-js מה-CDN ו-SheetJS שנשמר ב-`vendor/`.

---

## 12. מסכים ושאילתות

| מסך | מה מציג | שאילתות |
|---|---|---|
| `setup.html` | שיחת ההקמה, ההצעה לתיקון, התבנית להורדה, העלאת קובץ ובחירת עסק דמה | `business_config`; קריאות ל-`/api/ai` (`setup`); `upsert` ל-`business_config` ול-`metric_values` |
| `snapshot.html` | כרטיס לכל אחד משלושת הנושאים, עם 4 ה-KPI שלו (ערך, שינוי וסטטוס), חלוקה לפי תחום פעילות וסוג לקוח, רשימת חריגות עם טקסט התובנה, והחלטות פתוחות | `business_config`; `metric_values` לשבוע האחרון בנתונים (`order period_end desc limit 1` ואז סינון לפי `period_start`); `insights` של שורות חריגות; `decisions` עם `outcome_status = pending` |
| `insights.html` | רשימת תובנות, פירוט (חמשת החלקים בנפרד: עובדה, מגמה, חשיבות, השערה, המלצה), כפתור "הסבר לי", וטופס שמירת החלטת KPI | `insights` עם join ל-`metric_values`; קריאה ל-`/api/ai` (`explain`); `insert` ל-`decisions` |
| `decisions.html` | רשימת החלטות עם KPI, כיוון, תאריך בדיקה ותוצאה, וטופס החלטת מנהל (כולל סימון חד-פעמי/תקדים) | `decisions order created_at desc`; `insert` ל-`decisions` |

**מצבים ריקים וחסרים:**

- אין הגדרה: הפניה ל-`setup.html`.
- אין חריגות: הודעה "אין חריגות השבוע" (**החלטה:** כדי שהמסך לא יראה שבור).
- ערך `unavailable` או חתך חסר: מוצג "לא זמין", לא 0.
- בשדות הטקסט החופשי של החלטת מנהל ובתיאור העסק מוצגת הנחיה: "אין להזין שם או פרטים מזהים של אדם".

---

## 13. כיסוי דרישות ה-PRD

| פיצ'ר | איפה ממומש |
|---|---|
| F1 | `api/ai.js` (`setup`), `js/setup.js`, סעיף 6.4 |
| F2 | `setup.html`, סעיף 9.1 |
| F3 | `js/filecontract.js`, סעיף 7.2 |
| F4 | `js/filecontract.js`, סעיף 7.3 |
| F5 | `demo/`, סעיף 8 |
| F6, F7 | סעיף 4, `js/engine.js`, `upsert` ל-`metric_values` |
| F8, F9, F10 | `js/engine.js`, סעיף 9.2 |
| F11, F12 | `api/ai.js` (`insight`), סעיף 6, `ai-tests.md` |
| F13 | `api/ai.js` (`explain`), סעיף 6.8 |
| F14, F16 | `insights.html` ו-`decisions.html`, `insert` ל-`decisions` |
| F15 | W2, סעיף 9.3 |
| F17 | סעיף 5 |
| F18, F19, F20, F21 | סעיפים 3.1 ו-12 |

---

## 14. נקודות פתוחות והנחות

1. **עסקי הדמה:** התחומים עדיין לא נבחרו, ועד אז המבנה ב-`demo/` הוא שלד.
2. **תרחיש הדגמה לבדיקת תוצאה:** נתוני הדמה קבועים בעבר, ובדיקת תוצאה צריכה שבוע חדש. צריך לקבוע איך מדגימים את זה (סעיף 9.3). פתוח.
3. **עדכון ל-PRD (F8):** קריטריון הקבלה "סכום החתכים שווה לסכום הכולל" צריך להתייחס רק ל-KPI ניתנים לחיבור (סעיף 2, שורה 5). ישונה ב-PRD אם תאשרי.
4. **מחיקה בהקמה מחדש:** מוחקת הגדרה ונתונים (סעיף 5.4). מרחיבה את PRD הנחה 9.
5. **הערכים הלא מאומתים:** גבולות הגודל של הקובץ, מספר מקסימלי של 6 קריאות תובנה בהעלאה, מגבלת הקצב של Gemini בשכבה החינמית, וההתנהגות של `upsert` מול ה-policies.
6. **תבנית ל-8 שבועות:** מספר השבועות בתבנית הוא הנחה.
7. **שעת הרצה וחשבון זמן:** 06:30 ו-`Asia/Jerusalem` הן החלטות שלי ולא נתון מהמקורות.
8. **הגדרת שבוע:** ראשון עד שבת, לפי המקובל בישראל.
9. **כל משתמש מחובר הוא המנהל:** תקף כל עוד קיים משתמש אחד בלבד ב-Supabase Auth.
10. **n8n Cloud בתקופת הניסיון:** 1,000 הרצות ו-180 שניות להרצה (לפי `tech-stack.md`). W2 קטן מאוד ביחס למגבלות אלה.
11. **קריאת Gemini ופורמט הפונקציה ב-Vercel:** נבדקו בגרסה 1.0 ולא נבדקו מחדש. יש לאמת בבנייה.
12. **טבלה רביעית:** אושרה ע"י בעלת המוצר, עם חלופת גיבוי (סעיף 4.5).
