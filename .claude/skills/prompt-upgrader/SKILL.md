---
name: prompt-upgrader
description: Upgrades a short, raw prompt into a structured prompt with five fixed parts (role, context, task, output format, constraints) and asks up to three questions about missing information. Use whenever the user pastes a short prompt and asks to improve, upgrade, sharpen or rewrite it, in Hebrew or English ("שפר לי את הפרומפט", "תשדרג את זה", "improve this prompt"), even if they don't say "skill". Optionally takes the target tool (ChatGPT, Claude, Midjourney, etc.).
---

# prompt-upgrader

Turns a raw prompt into a prompt that works better. A short prompt leaves the model guessing about who it is, who it writes for, and what the result should look like. The fixed structure makes those gaps visible.

## Input
- The raw prompt (required).
- The target tool, if the user said which (optional). Use it to adapt the format and style, for example an image tool needs a visual description, not a role.

If the raw prompt is missing, ask for it. Do not ask about the tool: if it was not given, write a general prompt.

## Output
Reply in the language of the raw prompt (Hebrew prompt, Hebrew reply). Keep professional terms in English. Two parts, in this order:

### 1. Upgraded prompt
One single code block, so it is easy to copy. Use exactly these five headings, in this order:

```
תפקיד:
הקשר:
משימה:
פורמט הפלט:
מגבלות:
```

(For an English prompt: Role, Context, Task, Output format, Constraints.)

### 2. Questions
Up to three questions, only about information whose answer would change the result. Rank by impact. If nothing important is missing, ask fewer or none. Do not pad to three.

## Rules
- **Do not invent facts about the user.** Audience, industry, company, experience, tone, length and so on are not yours to guess. A guess presented as fact makes the prompt worse and the user may not notice.
- **Mark every missing detail in square brackets**, for example `[קהל היעד]`, `[אורך הטקסט]`. Each bracket should ideally match a question.
- What is safe to add: generic role wording derived from the task itself, standard structure, and obvious constraints implied by the raw prompt (such as "do not add facts that were not given").
- Keep the user's intent. Do not change the goal or add tasks they did not ask for.
- Write the prompt in the second person, addressed to the model.
- Keep it short and concrete. Every line should earn its place.

## Example

**Before** (raw prompt, tool: ChatGPT):
```
תכתוב לי פוסט על הקורס שלי
```

**After:**

```
תפקיד:
את/ה קופירייטר/ית שכותב/ת פוסטים לרשתות חברתיות בעברית.

הקשר:
אני מפרסם/ת פוסט על הקורס שלי. נושא הקורס: [נושא הקורס]. קהל היעד: [קהל היעד]. הפלטפורמה: [פלטפורמה, למשל LinkedIn או Instagram].

משימה:
כתוב/י פוסט שמציג את הקורס ומניע את הקוראים ל-[הפעולה הרצויה, למשל הרשמה].

פורמט הפלט:
פוסט אחד, באורך [אורך רצוי]. משפט פתיחה חזק, גוף קצר, וקריאה לפעולה בסוף.

מגבלות:
- אל תוסיף/י עובדות, מחירים או הבטחות שלא נמסרו לך.
- טון: [טון רצוי].
- עברית פשוטה, בלי קלישאות.
```

**Questions:**
1. מה נושא הקורס ומי קהל היעד שלו?
2. באיזו פלטפורמה הפוסט יפורסם ומה האורך הרצוי?
3. מה הפעולה שאת/ה רוצה שהקורא יעשה אחרי הקריאה?
