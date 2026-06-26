import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { auth as authApi, notifications as notifApi } from '../../api'

function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4)
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

function NotificationToggle() {
  const [status, setStatus] = useState('loading') // loading | unsupported | denied | off | on
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied'); return
    }
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription()
    ).then(sub => {
      setStatus(sub ? 'on' : 'off')
    }).catch(() => setStatus('off'))
  }, [])

  const activate = async () => {
    setBusy(true); setMsg('')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus('denied'); return }
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready
      const { data } = await notifApi.vapidKey()
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      })
      await notifApi.subscribe(sub.toJSON())
      setStatus('on')
      setMsg('¡Notificaciones activadas!')
    } catch (e) {
      setMsg('Error al activar: ' + (e.message || 'desconocido'))
    } finally {
      setBusy(false)
    }
  }

  const deactivate = async () => {
    setBusy(true); setMsg('')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await notifApi.unsubscribe(sub.endpoint)
        await sub.unsubscribe()
      }
      setStatus('off')
      setMsg('Notificaciones desactivadas')
    } catch (e) {
      setMsg('Error: ' + (e.message || 'desconocido'))
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading') return null

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-800">🔔 Notificaciones</h2>
          <p className="text-xs text-gray-500 mt-0.5">Aviso en el móvil cuando el admin mete un resultado</p>
        </div>
        {status === 'unsupported' && (
          <span className="text-xs text-gray-400">No soportado</span>
        )}
        {status === 'denied' && (
          <span className="text-xs text-red-400">Bloqueadas en el navegador</span>
        )}
        {status === 'off' && (
          <button
            onClick={activate}
            disabled={busy}
            className="text-sm px-3 py-1.5 rounded-full bg-green-500 text-white font-semibold disabled:opacity-50"
          >
            {busy ? '...' : 'Activar'}
          </button>
        )}
        {status === 'on' && (
          <button
            onClick={deactivate}
            disabled={busy}
            className="text-sm px-3 py-1.5 rounded-full bg-gray-200 text-gray-600 font-semibold disabled:opacity-50"
          >
            {busy ? '...' : '✓ Activadas'}
          </button>
        )}
      </div>
      {status === 'denied' && (
        <p className="text-xs text-amber-600">Para activarlas, ve a la configuración del navegador y permite notificaciones para esta web.</p>
      )}
      {msg && <p className="text-xs text-gray-500">{msg}</p>}
    </div>
  )
}

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

      <NotificationToggle />

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
