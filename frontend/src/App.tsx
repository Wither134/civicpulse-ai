import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AllReports } from './pages/AllReports'
import { Overview } from './pages/Overview'
import { SubmitComplaint } from './pages/SubmitComplaint'
import { TrackComplaint } from './pages/TrackComplaint'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="submit" element={<SubmitComplaint />} />
        <Route path="track" element={<TrackComplaint />} />
        <Route path="reports" element={<AllReports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
