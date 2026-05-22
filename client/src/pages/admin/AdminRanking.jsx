import { useState, useEffect } from 'react'
import { ranking, admin } from '../../api'

const PHASES = [
  { key: 'groups', label: 'Grupos' },
  { key: 'r16', label: '1/16' },
  { key: 'r8', label: '1/8' },
  { key: 'r4', label: '1/4' },
  { key: 'r2', label: '1/2' },
  { key: 'final', label: 'Final' },
]

export default function AdminRanking() {
  const [data, setData] = useState({ ranking: [], prizes: null })
  const [scorers, setScorers] = useState([])
  const [editGoals, setEditGoals] = useState({})
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [showScorers, setShowScorers] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [playerPreds, setPlayerPreds] = useState(null)

  const load = () => {
    Promise.all([ranking.get(), admin.scorers()])
      .then(([r, s]) => {
        setData(r.data)
        setScorers(s.data)
        const g = {}
        s.data.forEach(sc => { g[sc.id] = sc.actual_goals })
        setEditGoals(g)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 2500) }

  const saveGoals = async (id) => {
    await admin.updateScorerGoals(id, editGoals[id] ?? 0)
    flash('✓ Goles actualizados')
    load()
  }

  const viewPlayerPreds = async (playerId) => {
    if (selectedPlayer === playerId) { setSelectedPlayer(null); setPlayerPreds(null); return }
    setSelectedPlayer(playerId)
    const r = await admin.playerPredictions(playerId)
    setPlayerPreds(r.data)
  }

  const { ranking: list, prizes } = data
  const paidCount = list.filter(r => r.paid).length

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-black">🏆 Ranking completo</h1>
        {msg && <span className="text-green-600 text-sm font-semibold">{msg}</span>}
      </div>

      {/* Prize pool */}
      {prizes && (
        <div className="card bg-amber-50 border-amber-200">
          <div className="flex justify-between items-center mb-2">
            <p className="font-bold text-amber-800">Bote: {prizes.pool}€</p>
            <p className="text-xs text-amber-600">{paidCount}/{list.length} pagados · {prizes.paid_pool}€</p>
          </div>
          <div className="flex gap-2 text-sm">
            <div className="flex-1 bg-white rounded-lg py-2 text-center">
              <p className="font-black text-amber-600">🥇 {prizes.first}€</p>
              <p className="text-xs text-gray-400">1er puesto</p>
            </div>
            <div className="flex-1 bg-white rounded-lg py-2 text-center">
              <p className="font-black text-gray-500">🥈 {prizes.second}€</p>
              <p className="text-xs text-gray-400">2º puesto</p>
            </div>
            <div className="flex-1 bg-white rounded-lg py-2 text-center">
              <p className="font-black text-orange-500">🥉 {prizes.third}€</p>
              <p className="text-xs text-gray-400">3er puesto</p>
            </div>
          </div>
        </div>
      )}

      {/* Ranking table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead>
            <tr className="text-xs text-gray-400 border-b">
              <th className="text-left pb-2 pr-2">#</th>
              <th className="text-left pb-2 pr-3">Jugador</th>
              <th className="text-center pb-2 w-6">🔒</th>
              <th className="text-center pb-2 w-6">💶</th>
              <th className="text-right pb-2 pr-2 font-bold text-gray-700">Total</th>
              {PHASES.map(p => (
                <th key={p.key} className="text-right pb-2 pl-3">{p.label}</th>
              ))}
              <th className="text-right pb-2 pl-3 text-amber-600">Gol.</th>
              <th className="text-right pb-2 pl-3 text-purple-600">Esp.</th>
              <th className="text-right pb-2 pl-3 text-gray-400">Man.</th>
              <th className="pb-2 pl-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {list.map(r => (
              <>
                <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-2 font-bold text-xs text-gray-400">
                    {r.pos === 1 ? '🥇' : r.pos === 2 ? '🥈' : r.pos === 3 ? '🥉' : `#${r.pos}`}
                  </td>
                  <td className="py-2 pr-3 font-semibold">{r.name}</td>
                  <td className="py-2 text-center text-xs">
                    {r.locked ? '🔒' : <span className="text-gray-300">○</span>}
                  </td>
                  <td className="py-2 text-center text-xs">
                    {r.paid ? <span className="text-green-500">✓</span> : <span className="text-gray-300">○</span>}
                  </td>
                  <td className="py-2 pr-2 text-right font-black text-gray-900">{r.total}</td>
                  {PHASES.map(p => (
                    <td key={p.key} className="py-2 pl-3 text-right text-gray-500 text-xs">{r[p.key] || 0}</td>
                  ))}
                  <td className="py-2 pl-3 text-right text-amber-600 text-xs font-semibold">{r.scorer_pts || 0}</td>
                  <td className="py-2 pl-3 text-right text-purple-600 text-xs font-semibold">{r.special_pts || 0}</td>
                  <td className="py-2 pl-3 text-right text-gray-400 text-xs">{r.manual_points || 0}</td>
                  <td className="py-2 pl-3">
                    <button
                      onClick={() => viewPlayerPreds(r.id)}
                      className="text-xs text-blue-500 hover:text-blue-700 font-semibold whitespace-nowrap"
                    >
                      {selectedPlayer === r.id ? '▲ Cerrar' : '👁 Ver'}
                    </button>
                  </td>
                </tr>

                {/* Player predictions detail */}
                {selectedPlayer === r.id && playerPreds && (
                  <tr key={`${r.id}-detail`}>
                    <td colSpan={13} className="p-0">
                      <div className="bg-blue-50 p-4 border-t border-b border-blue-100">
                        <p className="text-xs font-bold text-blue-700 mb-2">Predicciones de {r.name}</p>
                        {playerPreds.scorer && (
                          <p className="text-xs text-amber-600 mb-2">
                            🥅 Goleador: <strong>{playerPreds.scorer.scorer_name}</strong> ({playerPreds.scorer.scorer_team})
                          </p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-1 max-h-48 overflow-y-auto">
                          {playerPreds.predictions
                            .filter(p => p.home_score !== null)
                            .map(p => (
                              <div key={p.match_id} className={`text-xs px-2 py-1 rounded flex items-center justify-between gap-1 ${p.points > 0 ? 'bg-green-100' : 'bg-white border'}`}>
                                <span className="truncate text-gray-500 w-16">{p.code}</span>
                                <span className="font-bold">{p.home_score}-{p.away_score}</span>
                                {p.result_home !== null && (
                                  <span className={p.points > 0 ? 'text-green-600 font-bold' : 'text-gray-400'}>
                                    {p.points}pts
                                  </span>
                                )}
                              </div>
                            ))
                          }
                          {playerPreds.predictions.filter(p => p.home_score !== null).length === 0 && (
                            <p className="text-xs text-gray-400 col-span-3">Sin predicciones</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="text-center py-8 text-gray-400">No hay datos de clasificación</p>
        )}
      </div>

      {/* Top scorers management */}
      <div className="card">
        <button
          onClick={() => setShowScorers(s => !s)}
          className="w-full flex items-center justify-between font-bold text-gray-700"
        >
          <span>🥅 Goles de candidatos a goleador</span>
          <span className="text-gray-400">{showScorers ? '▲' : '▼'}</span>
        </button>

        {showScorers && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-500">
              Actualiza los goles de cada jugador para calcular el goleador del torneo.
              El jugador con más goles será el ganador.
            </p>
            {scorers.sort((a, b) => (editGoals[b.id] || 0) - (editGoals[a.id] || 0)).map(s => (
              <div key={s.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <span className="text-sm font-semibold">{s.name}</span>
                  <span className="text-xs text-gray-400 ml-1">({s.team})</span>
                </div>
                <input
                  type="number" min="0" max="20"
                  value={editGoals[s.id] ?? 0}
                  onChange={e => setEditGoals(prev => ({ ...prev, [s.id]: parseInt(e.target.value) || 0 }))}
                  className="w-14 text-center border rounded-lg p-1 text-sm font-bold"
                />
                <span className="text-xs text-gray-400">⚽</span>
                <button
                  onClick={() => saveGoals(s.id)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold w-12"
                >
                  Guardar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="card bg-gray-50 text-xs text-gray-500 space-y-1">
        <p><strong>Gol.</strong> = puntos por acertar el máximo goleador</p>
        <p><strong>Esp.</strong> = campeón, subcampeón, 3º y 4º puesto</p>
        <p><strong>Man.</strong> = ajuste manual de puntos</p>
      </div>
    </div>
  )
}
