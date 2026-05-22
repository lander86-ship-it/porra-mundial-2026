import { useState, useEffect } from 'react'
import { admin } from '../../api'

export default function Players() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newPin, setNewPin] = useState({})
  const [manualPts, setManualPts] = useState({})
  const [adminPin, setAdminPin] = useState('')
  const [msg, setMsg] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const load = () => admin.players()
    .then(r => {
      setPlayers(r.data)
      const pts = {}
      r.data.forEach(p => { pts[p.id] = p.manual_points || 0 })
      setManualPts(pts)
    })
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 2500) }

  const deletePlayer = async (id, name) => {
    if (!confirm(`¿Eliminar a ${name}? Se borrarán todas sus apuestas.`)) return
    await admin.deletePlayer(id)
    load()
  }

  const resetPin = async (id) => {
    const pin = newPin[id]
    if (!pin || pin.length < 4) return alert('PIN mínimo 4 caracteres')
    await admin.resetPin(id, pin)
    setNewPin(prev => ({ ...prev, [id]: '' }))
    flash('✓ PIN actualizado')
  }

  const togglePaid = async (id, currentPaid) => {
    await admin.togglePaid(id, !currentPaid)
    load()
  }

  const saveManualPts = async (id) => {
    await admin.setManualPoints(id, manualPts[id] ?? 0)
    flash('✓ Puntos manuales guardados')
  }

  const unlockPlayer = async (id, name) => {
    if (!confirm(`¿Desbloquear las predicciones de ${name}?`)) return
    await admin.unlockPlayer(id)
    flash('✓ Predicciones desbloqueadas')
    load()
  }

  const changeAdminPin = async () => {
    if (!adminPin || adminPin.length < 4) return alert('PIN mínimo 4 caracteres')
    await admin.changeAdminPin(adminPin)
    setAdminPin('')
    flash('✓ PIN de admin actualizado')
  }

  const paidCount = players.filter(p => p.paid).length
  const pool = players.length * 20

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-black">Jugadores ({players.length}/30)</h1>
        {msg && <span className="text-green-600 text-sm font-semibold">{msg}</span>}
      </div>

      {/* Bote summary */}
      <div className="card bg-amber-50 border-amber-200">
        <div className="flex justify-between items-center text-sm">
          <span className="font-semibold text-amber-800">
            💶 {paidCount}/{players.length} pagados
          </span>
          <span className="font-bold text-amber-700">
            {paidCount * 20}€ / {pool}€ bote total
          </span>
        </div>
        <div className="mt-2 h-2 bg-amber-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all"
            style={{ width: players.length ? `${(paidCount / players.length) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Player list */}
      <div className="space-y-2">
        {players.map(p => {
          const isExpanded = expandedId === p.id
          return (
            <div key={p.id} className={`card transition-all ${p.predictions_locked ? 'border-blue-200' : ''}`}>
              {/* Header row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className="flex-1 flex items-center gap-2 text-left"
                >
                  <span className="font-semibold">{p.name}</span>
                  {p.predictions_locked && <span className="text-xs text-blue-500">🔒</span>}
                  {p.manual_points !== 0 && (
                    <span className="text-xs text-purple-500 font-semibold">
                      {p.manual_points > 0 ? '+' : ''}{p.manual_points}pts
                    </span>
                  )}
                </button>

                {/* Unlock button — visible in header when porra is locked */}
                {p.predictions_locked && (
                  <button
                    onClick={() => unlockPlayer(p.id, p.name)}
                    className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-colors whitespace-nowrap"
                    title="Desbloquear predicciones"
                  >
                    🔓 Desbloquear
                  </button>
                )}

                {/* Paid toggle */}
                <button
                  onClick={() => togglePaid(p.id, p.paid)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    p.paid
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-green-50'
                  }`}
                >
                  {p.paid ? '✓ Pagado' : '○ No pagado'}
                </button>

                <button
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  {isExpanded ? '▲' : '▼'}
                </button>
              </div>

              {/* Expanded actions */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t space-y-3">
                  {/* Change PIN */}
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Cambiar PIN</p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        className="input text-sm"
                        placeholder="Nuevo PIN (min. 4)"
                        value={newPin[p.id] || ''}
                        onChange={e => setNewPin(prev => ({ ...prev, [p.id]: e.target.value }))}
                        minLength={4}
                      />
                      <button onClick={() => resetPin(p.id)} className="btn-ghost text-sm whitespace-nowrap">
                        Cambiar
                      </button>
                    </div>
                  </div>

                  {/* Manual points */}
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Ajuste manual de puntos</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="input text-sm w-28"
                        placeholder="Ej: -5 o +10"
                        value={manualPts[p.id] ?? 0}
                        onChange={e => setManualPts(prev => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))}
                      />
                      <button onClick={() => saveManualPts(p.id)} className="btn-ghost text-sm">
                        Guardar
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Suma o resta puntos al total (para correcciones)</p>
                  </div>

                  {/* Delete */}
                  <div className="pt-1 border-t">
                    <button
                      onClick={() => deletePlayer(p.id, p.name)}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      🗑 Eliminar jugador
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {players.length === 0 && (
          <p className="text-center py-8 text-gray-400">No hay jugadores registrados</p>
        )}
      </div>

      {/* Admin PIN */}
      <div className="card border-2 border-gray-200">
        <h2 className="font-bold mb-3">PIN de administrador</h2>
        <div className="flex gap-2">
          <input
            type="password"
            className="input text-sm"
            placeholder="Nuevo PIN admin (min. 4)"
            value={adminPin}
            onChange={e => setAdminPin(e.target.value)}
            minLength={4}
          />
          <button onClick={changeAdminPin} className="btn-primary text-sm whitespace-nowrap">
            Cambiar
          </button>
        </div>
      </div>
    </div>
  )
}
