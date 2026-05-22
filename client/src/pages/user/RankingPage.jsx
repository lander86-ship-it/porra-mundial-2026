import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ranking } from '../../api'

const PHASES = [
  { key: 'groups_match', label: 'Gr.R' },
  { key: 'groups_pos',   label: 'Gr.P' },
  { key: 'r16', label: '1/16' },
  { key: 'r8',  label: '1/8' },
  { key: 'r4',  label: '1/4' },
  { key: 'r2',  label: '1/2' },
  { key: 'final', label: 'Final' },
]

export default function RankingPage() {
  const { user } = useAuth()
  const [data, setData] = useState({ ranking: [], prizes: null })
  const [loading, setLoading] = useState(true)
  const [showPhase, setShowPhase] = useState(false)

  useEffect(() => {
    ranking.get()
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  const { ranking: list, prizes } = data

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black">🏆 Clasificación</h1>
        <button
          onClick={() => setShowPhase(!showPhase)}
          className="text-xs text-fifa-blue font-semibold"
        >
          {showPhase ? '← Resumen' : 'Detalle →'}
        </button>
      </div>

      {/* Prize pool */}
      {prizes && prizes.pool > 0 && (
        <div className="card bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-amber-800">Bote: {prizes.pool}€</p>
            <p className="text-xs text-amber-600">
              {prizes.paid_count}/{list.length} pagados · {prizes.paid_pool}€ recaudados
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <div className="flex-1 bg-white rounded-lg py-1.5 text-center">
              <span className="font-black text-amber-600">🥇 {prizes.first}€</span>
            </div>
            <div className="flex-1 bg-white rounded-lg py-1.5 text-center">
              <span className="font-black text-gray-500">🥈 {prizes.second}€</span>
            </div>
            <div className="flex-1 bg-white rounded-lg py-1.5 text-center">
              <span className="font-black text-orange-600">🥉 {prizes.third}€</span>
            </div>
          </div>
        </div>
      )}

      {/* Ranking table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b">
              <th className="text-left pb-2 w-7">#</th>
              <th className="text-left pb-2">Jugador</th>
              <th className="text-center pb-2 w-6" title="Porra enviada">🔒</th>
              <th className="text-center pb-2 w-6" title="Pagado">💶</th>
              <th className="text-right pb-2 font-bold text-gray-700">Pts</th>
              {showPhase && PHASES.map(p => (
                <th key={p.key} className="text-right pb-2 pl-2 whitespace-nowrap text-xs">{p.label}</th>
              ))}
              {showPhase && (
                <>
                  <th className="text-right pb-2 pl-2 whitespace-nowrap text-amber-600">Gol.</th>
                  <th className="text-right pb-2 pl-2 whitespace-nowrap text-purple-600">Esp.</th>
                  <th className="text-right pb-2 pl-2 whitespace-nowrap text-gray-400">Man.</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {list.map(r => (
              <tr
                key={r.id}
                className={`border-b last:border-0 ${
                  r.id === user?.id ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'
                }`}
              >
                <td className="py-2.5 text-gray-400 font-bold text-sm">
                  {r.pos === 1 ? '🥇' : r.pos === 2 ? '🥈' : r.pos === 3 ? '🥉' : r.pos}
                </td>
                <td className="py-2.5">
                  {r.name}
                  {r.id === user?.id && <span className="ml-1 text-xs text-blue-400">(tú)</span>}
                </td>
                <td className="py-2.5 text-center">
                  {r.locked ? <span className="text-blue-400 text-xs">🔒</span> : <span className="text-gray-200 text-xs">○</span>}
                </td>
                <td className="py-2.5 text-center">
                  {r.paid ? <span className="text-green-500 text-xs">✓</span> : <span className="text-gray-200 text-xs">○</span>}
                </td>
                <td className="py-2.5 text-right font-black text-fifa-blue">{r.total}</td>
                {showPhase && PHASES.map(p => (
                  <td key={p.key} className="py-2.5 text-right text-gray-500 pl-2 text-xs">{r[p.key] || 0}</td>
                ))}
                {showPhase && (
                  <>
                    <td className="py-2.5 text-right pl-2 text-xs text-amber-600">{r.scorer_pts || 0}</td>
                    <td className="py-2.5 text-right pl-2 text-xs text-purple-600">{r.special_pts || 0}</td>
                    <td className="py-2.5 text-right pl-2 text-xs text-gray-400">{r.manual_points || 0}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="text-center py-8 text-gray-400">Nadie ha ganado puntos todavía</p>
        )}
      </div>

      {showPhase && (
        <div className="card bg-gray-50 text-xs text-gray-500 space-y-1">
          <p><strong>Gr.R</strong> = Grupos: puntos por resultados (signo, goles, exacto)</p>
          <p><strong>Gr.P</strong> = Grupos: puntos por posición final (1º, 2º, 3º, 4º) — se suman al cerrar cada grupo</p>
          <p><strong>1/16 → Final</strong> = puntos de cada fase eliminatoria</p>
          <p><strong>Gol.</strong> = puntos por máximo goleador</p>
          <p><strong>Esp.</strong> = puntos especiales (campeón, subcampeón, 3º y 4º)</p>
          <p><strong>Man.</strong> = ajuste manual del admin</p>
        </div>
      )}
    </div>
  )
}
