import { Route, Routes } from 'react-router-dom'

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<main className="page container"><p>הסמנכל: בבנייה</p></main>} />
    </Routes>
  )
}
