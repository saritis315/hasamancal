// הסמנכל: supabase.js (גרסה מדומה)
// כניסה, יציאה ובדיקת סשן. במוצר האמיתי: לקוח supabase-js לכניסה בלבד.
// הממשק נשמר זהה: signIn, signOut, getSession, requireSession.
// הנחה: בגרסה המדומה כל זוג אימייל וסיסמה לא ריקים נכנס. הסשן נשמר ב-sessionStorage של הדפדפן.
const KEY = 'hs_mock_session';

export async function signIn(email, password) {
  await new Promise((r) => setTimeout(r, 200));
  if (!String(email).trim() || !String(password)) return { ok: false };
  try { sessionStorage.setItem(KEY, JSON.stringify({ access_token: 'mock-token', email: String(email).trim() })); } catch { /* חסום */ }
  return { ok: true };
}

export async function signOut() {
  try { sessionStorage.removeItem(KEY); } catch { /* חסום */ }
}

export function getSession() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; }
}

/** דף פנימי: אם אין סשן, הפניה לכניסה. מחזיר את הסשן או null. */
export function requireSession() {
  const s = getSession();
  if (!s) { location.replace('index.html'); return null; }
  return s;
}
