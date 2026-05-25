import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ranking } from '../../api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const PHASES = [
  { key: 'groups_match', label: 'Gr.R' },
  { key: 'groups_pos',   label: 'Gr.P' },
  { key: 'r16', label: '1/16' },
  { key: 'r8',  label: '1/8' },
  { key: 'r4',  label: '1/4' },
  { key: 'r2',  label: '1/2' },
  { key: 'final', label: 'Final' },
]

const LINE_COLORS = [
  '#3b82f6','#ef4444','#10b981','#f59e0b',
  '#8b5cf6','#ec4899','#06b6d4','#84cc16',
  '#f97316','#6b7280',
]

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-')
  const months = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${parseInt(d)} ${months[parseInt(m)]}`
}

export default function RankingPage() {
  const { user } = useAuth()
  const [data, setData] = useState({ ranking: [], prizes: null })
  const [loading, setLoading] = useState(true)
  const [showPhase, setShowPhase] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const [progression, setProgression] = useState([])
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [loadingChart, setLoadingChart] = useState(false)

  useEffect(() => {
    ranking.get()
      .then(r => {
        setData(r.data)
        // Pre-select top 4 players for chart
        const top4 = r.data.ranking.slice(0, 4).map(p => p.id)
        setSelectedPlayers(top4)
      })
      .finally(() => setLoading(false))
  }, [])

  const loadChart = async () => {
    if (progression.length > 0) { setShowChart(true); return }
    setLoadingChart(true)
    try {
      const r = await ranking.progression()
      setProgression(r.data)
    } finally {
      setLoadingChart(false)
      setShowChart(true)
    }
  }

  const toggleChart = () => {
    if (!showChart) loadChart()
    else setShowChart(false)
  }

  // Build chart data: merge all players' dates into unified timeline
  const chartData = useMemo(() => {
    if (!progression.length) return []
    const selected = progression.filter(p => selectedPlayers.includes(p.id))
    const allDates = [...new Set(selected.flatMap(p => p.data.map(d => d.date)))].sort()
    return allDates.map(date => {
      const point = { date: formatDate(date) }
      for (const player of selected) {
        const entry = player.data.find(d => d.date === date)
        if (entry) {
          point[player.name] = entry.cumulative
        } else {
          // Fill forward: use last known cumulative
          const prev = player.data.filter(d => d.date < date)
          point[player.name] = prev.length ? prev[prev.length - 1].cumulative : 0
        }
      }
      return point
    })
  }, [progression, selectedPlayers])

  const togglePlayer = (id) => {
    setSelectedPlayers(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 5 ? [...prev, id] : prev
    )
  }

  const { ranking: list, prizes } = data

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-black">🏆 Clasificación</h1>
        <div className="flex gap-2">
          <button
            onClick={toggleChart}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              showChart
                ? 'bg-purple-600 text-white border-purple-600'
                : 'text-purple-600 border-purple-200 hover:bg-purple-50'
            }`}
          >
            📈 {showChart ? 'Ocultar gráfica' : 'Ver evolución'}
          </button>
          <button
            onClick={() => setShowPhase(!showPhase)}
            className="text-xs text-fifa-blue font-semibold"
          >
            {showPhase ? '← Resumen' : 'Detalle →'}
          </button>
        </div>
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

      {/* Points progression chart */}
      {showChart && (
        <div className="card space-y-3">
          <div>
            <h3 className="font-bold text-gray-800">Evolución de puntos</h3>
            <p className="text-xs text-gray-400 mt-0.5">Selecciona hasta 5 jugadores para comparar</p>
          </div>

          {/* Player selector */}
          {loadingChart ? (
            <div className="text-center py-4 text-gray-400 text-sm">Cargando datos...</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {list.map((p, idx) => {
                  const colorIdx = progression.findIndex(pl => pl.id === p.id)
                  const color = LINE_COLORS[colorIdx % LINE_COLORS.length]
                  const isSelected = selectedPlayers.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlayer(p.id)}
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-colors ${
                        isSelected
                          ? 'text-white border-transparent'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'
                      }`}
                      style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                    >
                      {p.name}
                    </button>
                  )
                })}
              </div>

              {chartData.length > 0 ? (
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(value, name) => [`${value} pts`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {progression
                        .filter(p => selectedPlayers.includes(p.id))
                        .map((p, i) => {
                          const colorIdx = progression.findIndex(pl => pl.id === p.id)
                          return (
                            <Line
                              key={p.id}
                              type="monotone"
                              dataKey={p.name}
                              stroke={LINE_COLORS[colorIdx % LINE_COLORS.length]}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4 }}
                            />
                          )
                        })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <p className="text-2xl mb-2">📈</p>
                  <p>La gráfica aparecerá cuando haya resultados</p>
                </div>
              )}
            </>
          )}
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
        <div className="card bg-gray-50 text-xs text-gray-500 space-y-2">
          <p className="font-bold text-gray-600 text-xs uppercase tracking-wide mb-1">Leyenda de columnas</p>
          <p><strong className="text-gray-700">Gr.R</strong> — <em>Grupos · Resultados:</em> puntos obtenidos por acertar el signo del partido (victoria local / empate / victoria visitante), la diferencia de goles exacta y/o el marcador completo en los 72 partidos de la fase de grupos. Los puntos se acumulan: signo correcto da lo básico, acertar además la diferencia suma más, y acertar el marcador exacto suma el máximo.</p>
          <p><strong className="text-gray-700">Gr.P</strong> — <em>Grupos · Posiciones finales:</em> puntos extra por acertar el puesto final de cada equipo dentro de su grupo (1º, 2º, 3er o 4º lugar). Se calculan automáticamente a partir de tus predicciones de partido en cuanto el admin cierra ese grupo. Cuanto más alta la posición acertada, más puntos.</p>
          <p><strong className="text-gray-700">1/16 → Final</strong> — Puntos acumulados en las fases eliminatorias: dieciseisavos de final (1/16), octavos (1/8), cuartos de final (1/4), semifinales (1/2) y la gran final. En cada partido eliminatorio suman: acertar el equipo clasificado, el signo, la diferencia de goles y/o el marcador exacto.</p>
          <p><strong className="text-gray-700">Gol.</strong> — <em>Máximo goleador:</em> puntos por haber predicho correctamente al pichichi del torneo, con un bonus adicional por cada gol que marque ese jugador durante el mundial.</p>
          <p><strong className="text-gray-700">Esp.</strong> — <em>Predicciones especiales:</em> puntos extra por acertar el campeón del mundial, el subcampeón (finalista perdedor), el equipo que gana el partido por el 3er puesto y el que pierde dicho partido (4º clasificado).</p>
          <p><strong className="text-gray-700">Man.</strong> — <em>Ajuste manual:</em> corrección de puntos aplicada directamente por el administrador de la porra. Puede ser positiva (bonus) o negativa (penalización). Consulta al admin si tienes dudas sobre este valor.</p>
        </div>
      )}
    </div>
  )
}
