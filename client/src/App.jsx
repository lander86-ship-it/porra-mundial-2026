import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import UserLayout from './pages/user/UserLayout'
import UserDashboard from './pages/user/Dashboard'
import Predictions from './pages/user/Predictions'
import MyVsReal from './pages/user/MyVsReal'
import RankingPage from './pages/user/RankingPage'
import Scorer from './pages/user/Scorer'
import DailyPorra from './pages/user/DailyPorra'
import Simulator from './pages/user/Simulator'
import SideBets from './pages/user/SideBets'
import AdminLayout from './pages/admin/AdminLayout'
import AdminResults from './pages/admin/Results'
import AdminPlayers from './pages/admin/Players'
import AdminScoring from './pages/admin/Scoring'
import AdminRanking from './pages/admin/AdminRanking'

function ProtectedUser({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function ProtectedAdmin({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Cargando...</div>
  if (!user) return <Navigate to="/login?admin=1" replace />
  if (!user.isAdmin) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/" element={user ? (user.isAdmin ? <Navigate to="/admin" /> : <Navigate to="/user" />) : <Home />} />
      <Route path="/login" element={<Login />} />

      <Route path="/user" element={<ProtectedUser><UserLayout /></ProtectedUser>}>
        <Route index element={<UserDashboard />} />
        <Route path="predictions" element={<Predictions />} />
        <Route path="vs-real" element={<MyVsReal />} />
        <Route path="ranking" element={<RankingPage />} />
        <Route path="scorer" element={<Scorer />} />
        <Route path="daily" element={<DailyPorra />} />
        <Route path="simulator" element={<Simulator />} />
        <Route path="bets" element={<SideBets />} />
      </Route>

      <Route path="/admin" element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}>
        <Route index element={<AdminResults />} />
        <Route path="players" element={<AdminPlayers />} />
        <Route path="scoring" element={<AdminScoring />} />
        <Route path="ranking" element={<AdminRanking />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
