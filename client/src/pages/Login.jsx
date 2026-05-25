import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Countdown() {
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    // World Cup starts June 11, 2026 at 21:00 CEST = 19:00 UTC
    const target = new Date('2026-06-11T19:00:00Z')

    const calc = () => {
      const diff = target - new Date()
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, started: true })
        return
      }
      setTimeLeft({
        days:    Math.floor(diff / 86400000),
        hours:   Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000)  / 60000),
        seconds: Math.floor((diff % 60000)    / 1000),
        started: false,
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [])

  if (!timeLeft) return null

  if (timeLeft.started) {
    return (
      <div className="text-center mb-5">
        <p className="text-white font-black text-lg">⚽ ¡El Mundial ha comenzado!</p>
      </div>
    )
  }

  const units = [
    { v: timeLeft.days,    l: 'días' },
    { v: timeLeft.hours,   l: 'horas' },
    { v: timeLeft.minutes, l: 'min' },
    { v: timeLeft.seconds, l: 'seg' },
  ]

  return (
    <div className="text-center mb-5">
      <p className="text-blue-200 text-xs font-semibold mb-3 tracking-widest uppercase">⚽ Faltan para el mundial</p>
      <div className="flex justify-center gap-2">
        {units.map(({ v, l }) => (
          <div key={l} className="bg-white/20 backdrop-blur rounded-xl px-3 py-2 min-w-[56px]">
            <p className="text-3xl font-black text-white tabular-nums leading-none">
              {String(v).padStart(2, '0')}
            </p>
            <p className="text-[10px] text-blue-200 mt-1 font-medium">{l}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Login() {
  const [params] = useSearchParams()
  const isAdmin = params.get('admin') === '1'
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = mode === 'login'
        ? await login(name, pin)
        : await register(name, pin)
      navigate(user.isAdmin ? '/admin' : '/user')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al conectar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fifa-blue to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-2">
      <Countdown />
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <Link to="/" className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block">← Volver</Link>

        <div className="text-center mb-6">
          <span className="text-4xl">{isAdmin ? '⚙️' : '🎮'}</span>
          <h2 className="text-2xl font-black mt-2">
            {isAdmin ? 'Panel Admin' : mode === 'login' ? 'Iniciar sesión' : 'Registrarse'}
          </h2>
        </div>

        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Nombre</label>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={isAdmin ? 'Admin' : 'Tu nombre'}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">PIN</label>
            <input
              className="input"
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="••••"
              required
              minLength={4}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        {!isAdmin && (
          <p className="text-center text-sm text-gray-500 mt-4">
            {mode === 'login' ? '¿Sin cuenta? ' : '¿Ya tienes cuenta? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
              className="text-fifa-blue font-semibold hover:underline"
            >
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        )}
      </div>
      </div>
    </div>
  )
}
