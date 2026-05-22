import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-br from-fifa-blue via-blue-700 to-blue-900 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10">
        <div className="text-7xl mb-4">⚽</div>
        <h1 className="text-4xl font-black text-white tracking-tight">Porra Mundial 2026</h1>
        <p className="text-blue-200 mt-2 text-lg">USA · México · Canadá</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button
          onClick={() => navigate('/login')}
          className="flex-1 bg-white text-fifa-blue font-bold py-5 rounded-2xl shadow-lg hover:bg-blue-50 transition-all text-lg flex flex-col items-center gap-2"
        >
          <span className="text-3xl">🎮</span>
          Soy Jugador
        </button>
        <button
          onClick={() => navigate('/login?admin=1')}
          className="flex-1 bg-fifa-gold text-gray-900 font-bold py-5 rounded-2xl shadow-lg hover:bg-yellow-400 transition-all text-lg flex flex-col items-center gap-2"
        >
          <span className="text-3xl">⚙️</span>
          Soy Admin
        </button>
      </div>

      <p className="text-blue-300 text-sm mt-10">
        ¿Primera vez? Pulsa "Soy Jugador" para registrarte
      </p>
    </div>
  )
}
