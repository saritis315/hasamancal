// הסמנכל: auth.ts (גרסה מדומה)
// כניסה, יציאה ובדיקת סשן. במוצר האמיתי: לקוח supabase-js לכניסה בלבד, עם המפתח הציבורי.
// הממשק נשמר זהה: signIn, signOut, getSession.
// הנחה: בגרסה המדומה כל זוג אימייל וסיסמה לא ריקים נכנס. הסשן נשמר ב-sessionStorage של הדפדפן.
const KEY = 'hs_mock_session'

export interface Session { access_token: string; email: string }

export async function signIn(email: string, password: string): Promise<{ ok: boolean }> {
  await new Promise((r) => setTimeout(r, 200))
  if (!email.trim() || !password) return { ok: false }
  const session: Session = { access_token: 'mock-token', email: email.trim() }
  try { sessionStorage.setItem(KEY, JSON.stringify(session)) } catch { /* חסום */ }
  return { ok: true }
}

export async function signOut(): Promise<void> {
  try { sessionStorage.removeItem(KEY) } catch { /* חסום */ }
}

export function getSession(): Session | null {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Session | null } catch { return null }
}
