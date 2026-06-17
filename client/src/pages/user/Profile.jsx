import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { auth as authApi } from '../../api'

export default function Profile() {
  const { user } = useAuth()
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [status, setStatus] = useState(null) // { type: 'ok'|'error', msg: string }
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus(null)

    if (newPin !== confirmPin) {
      setStatus({ type: 'error', msg: 'Los PINs nuevos no coinciden' })
      return
    }
    if (newPin.length < 4) {
      setStatus({ type: 'error', msg: 'El PIN debe tener al menos 4 caracteres' })
      return
    }

    setLoading(true)
    try {
      await authApi.changePin(currentPin, newPin)
      setStatus({ type: 'ok', msg: 'PIN cambiado correctamente' })
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.error || 'Error al cambiar el PIN' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-xl font-black">👤 Mi perfil</h1>
        <p className="text-sm text-gray-500 mt-1">{user?.name}</p>
      </div>

      <div className="card space-y-4">
        <h2 className="font-bold text-gray-800">Cambiar PIN</h2>
        <p className="text-xs text-gray-500">
          Tu PIN es la contraseña que usas para entrar. Mínimo 4 caracteres.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">PIN actual</label>
            <input
              type="password"
              value={currentPin}
              onChange={e => setCurrentPin(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Tu PIN actual"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nuevo PIN</label>
            <input
              type="password"
              value={newPin}
              onChange={e => setNewPin(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Nuevo PIN (mín. 4 caracteres)"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Confirmar nuevo PIN</label>
            <input
              type="password"
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Repite el nuevo PIN"
              required
            />
          </div>

          {status && (
            <div className={`text-sm rounded-lg px-3 py-2 ${
              status.type === 'ok'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {status.type === 'ok' ? '✓ ' : '✗ '}{status.msg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-fifa-blue text-white font-bold py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Guardando...' : 'Cambiar PIN'}
          </button>
        </form>
      </div>
    </div>
  )
}
