import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { bets as betsApi } from '../../api'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'Z')
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function SideBets() {
  const { user } = useAuth()
  const [betsList, setBetsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = () => betsApi.all()
    .then(r => setBetsList(r.data))
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const flash = (text, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(''), 2500)
  }

  const create = async () => {
    if (!newDesc.trim()) return
    setSaving(true)
    try {
      await betsApi.create(newDesc.trim())
      setNewDesc('')
      load()
      flash('✓ Apuesta registrada')
    } catch (e) {
      flash('Error: ' + (e.response?.data?.error || 'desconocido'), false)
    }
    setSaving(false)
  }

  const toggleResolve = async (id) => {
    await betsApi.resolve(id)
    load()
  }

  const remove = async (id) => {
    if (!confirm('¿Eliminar esta apuesta?')) return
    await betsApi.delete(id)
    load()
  }

  const canModify = (bet) => user?.isAdmin || bet.creator_id === user?.id

  const pending = betsList.filter(b => !b.resolved)
  const resolved = betsList.filter(b => b.resolved)

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-black">🤝 Porras privadas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Apuestas entre vosotros: cervezas, lacones, lo que sea</p>
        </div>
        {msg && (
          <span className={`text-sm font-semibold ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>
            {msg.text}
          </span>
        )}
      </div>

      {/* New bet form */}
      <div className="card">
        <p className="text-xs font-semibold text-gray-500 mb-2">Registrar nueva apuesta</p>
        <textarea
          className="input w-full text-sm resize-none"
          rows={2}
          placeholder='Ej: "Lander le debe un lacón a Juan si España no pasa de grupos"'
          value={newDesc}
          onChange={e => setNewDesc(e.target.value)}
          maxLength={300}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">{newDesc.length}/300</span>
          <button
            onClick={create}
            disabled={saving || !newDesc.trim()}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {saving ? '...' : '➕ Añadir'}
          </button>
        </div>
      </div>

      {/* Pending bets */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">
            Pendientes <span className="text-amber-500">({pending.length})</span>
          </h2>
          {pending.map(b => (
            <div key={b.id} className="card border-l-4 border-amber-400">
              <p className="text-sm font-medium text-gray-800 leading-snug">{b.description}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-400">
                  <span className="font-semibold text-gray-600">{b.creator_name}</span>
                  {' · '}{formatDate(b.created_at)}
                </div>
                {canModify(b) && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleResolve(b.id)}
                      className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-semibold hover:bg-green-200 transition-colors"
                    >
                      ✓ Saldar
                    </button>
                    <button
                      onClick={() => remove(b.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors px-1"
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved bets */}
      {resolved.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-bold text-gray-400 text-sm uppercase tracking-wide">
            Saldadas ({resolved.length})
          </h2>
          {resolved.map(b => (
            <div key={b.id} className="card border-l-4 border-gray-200 opacity-60">
              <p className="text-sm text-gray-400 line-through leading-snug">{b.description}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-400">
                  <span className="font-semibold">{b.creator_name}</span>
                  {' · '}{formatDate(b.created_at)}
                </div>
                {canModify(b) && (
                  <button
                    onClick={() => toggleResolve(b.id)}
                    className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    Reabrir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {betsList.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🤝</p>
          <p className="text-sm font-medium">Sin apuestas todavía</p>
          <p className="text-xs mt-1">¡Sé el primero en registrar una!</p>
        </div>
      )}
    </div>
  )
}
