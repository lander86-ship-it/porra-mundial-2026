import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/user', label: 'Inicio', icon: '🏠', end: true },
  { to: '/user/predictions', label: 'Apuestas', icon: '⚽' },
  { to: '/user/groups', label: 'Grupos', icon: '📊' },
  { to: '/user/scorer', label: 'Goleador', icon: '🥅' },
  { to: '/user/daily', label: 'Diaria', icon: '📅' },
  { to: '/user/ranking', label: 'Ranking', icon: '🏆' },
]

export default function UserLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-fifa-blue text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚽</span>
          <span className="font-black text-sm sm:text-base">Mundial 2026</span>
        </div>
        <div className="flex items-center gap-3">
          <NavLink to="/user/simulator" className={({ isActive }) =>
            `text-xs font-medium px-2 py-1 rounded-full transition-colors ${isActive ? 'bg-white text-fifa-blue' : 'text-blue-200 hover:text-white'}`
          }>
            🔮 Simulador
          </NavLink>
          <span className="text-blue-200 text-sm hidden sm:block">👤 {user?.name}</span>
          <button onClick={handleLogout} className="text-blue-200 hover:text-white text-sm">
            Salir
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full z-10">
        <div className="flex max-w-3xl mx-auto overflow-x-auto">
          {navItems.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-1.5 text-xs font-medium transition-colors min-w-[50px] ${
                  isActive ? 'text-fifa-blue' : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              <span className="text-lg">{icon}</span>
              <span className="text-[10px] mt-0.5">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="h-16" /> {/* spacer for fixed nav */}
    </div>
  )
}
