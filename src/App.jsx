import { Routes, Route, Navigate } from 'react-router-dom'
import HelpForm from './components/HelpForm'
import ITDashboard from './components/ITDashboard'
import { withAuth } from './components/withAuth'

const ProtectedDashboard = withAuth(ITDashboard)

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/help" replace />} />
      <Route path="/help" element={<HelpForm />} />
      <Route path="/it" element={<ProtectedDashboard />} />
      <Route path="*" element={<Navigate to="/help" replace />} />
    </Routes>
  )
}
