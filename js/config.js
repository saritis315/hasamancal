// הסמנכל: config.js
// גרסת הפרונט בלבד: שכבת נתונים מדומה במקום Supabase ו-Gemini.
// במעבר לשכבה האמיתית: SUPABASE_URL והמפתח הציבורי (publishable) נכנסים לכאן, לכניסה בלבד,
// ו-js/api.js ו-js/supabase.js מוחלפים בגרסאות שפונות ל-/api/app ול-Supabase Auth. שאר הקוד לא משתנה.
export const MOCK = true;
export const SUPABASE_URL = '';
export const SUPABASE_PUBLISHABLE_KEY = '';
