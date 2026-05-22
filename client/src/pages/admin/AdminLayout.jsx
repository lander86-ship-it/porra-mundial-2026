import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/admin', label: 'Resultados', icon: '⚽', end: true },
  { to: '/admin/ranking', label: 'Ranking', icon: '🏆' },
  { to: '/admin/players', label: 'Jugadores', icon: '👥' },
  { to: '/admin/scoring', label: 'Puntos', icon: '⚙️' },
]

export default function AdminLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚙️</span>
          <span className="font-black text-sm">Admin · Mundial 2026</span>
        </div>
        <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm">
          Salir
        </button>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full z-10">
        <div className="flex max-w-4xl mx-auto">
          {navItems.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                  isActive ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              <span className="text-xl">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="h-16" />
    </div>
  )
}
