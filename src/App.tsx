import type { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { getSession } from './lib/auth.ts'
import Login from './screens/Login.tsx'
import Setup from './screens/Setup.tsx'
import Snapshot from './screens/Snapshot.tsx'

/** מסך פנימי בלי סשן מפנה להתחברות (ARCHITECTURE.md סעיף 5.3). */
function RequireSession({ children }: { children: ReactElement }) {
  return getSession() ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/setup" element={<RequireSession><Setup /></RequireSession>} />
      <Route path="/snapshot" element={<RequireSession><Snapshot /></RequireSession>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
