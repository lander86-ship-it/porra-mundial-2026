import { useState, useEffect, useCallback } from 'react'
import { matches as matchApi, ranking } from '../../api'

const PHASES = [
  { key: 'groups', label: 'Grupos' },
  { key: 'r16', label: '1/16' },
  { key: 'r8', label: '1/8' },
  { key: 'r4', label: '1/4' },
  { key: 'r2', label: '1/2' },
  { key: 'final', label: 'Final' },
]

export default function Simulator() {
  const [allMatches, setAllMatches] = useState([])
  const [hypoResults, setHypoResults] = useState({}) // { matchId: { home, away } }
  const [simRanking, setSimRanking] = useState([])
  const [realRanking, setRealRanking] = useState([])
  const [activePhase, setActivePhase] = useState('groups')
  const [activeGroup, setActiveGroup] = useState('A')
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)

  useEffect(() => {
    Promise.all([matchApi.all(), ranking.get()])
      .then(([m, r]) => {
        setAllMatches(m.data)
        setRealRanking(r.data.ranking || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = allMatches.filter(m => {
    if (activePhase === 'groups') return m.phase === 'groups' && m.group_name === activeGroup
    return m.phase === activePhase
  })

  // Only show unplayed matches (no real result)
  const unplayed = filtered.filter(m => m.home_score === null)
  const played = filtered.filter(m => m.home_score !== null)

  const groups = [...new Set(allMatches.filter(m => m.phase === 'groups').map(m => m.group_name))].sort()

  const handleScore = (matchId, field, value) => {
    setHypoResults(prev => ({
      ...prev,
      [matchId]: { ...(prev[matchId] || {}), [field]: value }
    }))
  }

  const simulate = useCallback(async () => {
    setSimulating(true)
    const hypo = Object.entries(hypoResults)
      .filter(([, v]) => v.home !== undefined && v.away !== undefined && v.home !== '' && v.away !== '')
      .map(([matchId, v]) => ({
        matchId: parseInt(matchId),
        homeScore: parseInt(v.home),
        awayScore: parseInt(v.away),
      }))

    try {
      const r = await ranking.simulate(hypo)
      setSimRanking(r.data)
    } catch (e) {
      console.error(e)
    }
    setSimulating(false)
  }, [hypoResults])

  const clearHypo = () => setHypoResults({})

  const hypoCount = Object.values(hypoResults).filter(v => v.home !== '' && v.away !== '' && v.home !== undefined).length

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="text-xl font-black">🔮 Simulador</h1>
        <p className="text-sm text-gray-500 mt-1">
          Introduce resultados hipotéticos y ve cómo cambiaría el ranking
        </p>
      </div>

      <div className="card bg-blue-50 border-blue-200 text-sm text-blue-700">
        <p>Los resultados <strong>reales ya introducidos</strong> por el admin son fijos. Solo puedes simular los partidos pendientes.</p>
      </div>

      {/* Phase tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PHASES.map(p => (
          <button
            key={p.key}
            onClick={() => setActivePhase(p.key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              activePhase === p.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Group tabs */}
      {activePhase === 'groups' && (
        <div className="flex gap-1.5 flex-wrap">
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`w-9 h-9 rounded-lg font-bold text-sm transition-colors ${
                activeGroup === g ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Already played — fixed */}
      {played.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-400 font-semibold uppercase">Resultados reales (fijos)</p>
          {played.map(m => (
            <div key={m.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <span className="flex-1 text-right text-gray-600 truncate">{m.home_team}</span>
              <span className="font-black text-green-700 min-w-[50px] text-center">{m.home_score}–{m.away_score}</span>
              <span className="flex-1 text-gray-600 truncate">{m.away_team}</span>
            </div>
          ))}
        </div>
      )}

      {/* Unplayed — hypothetical */}
      {unplayed.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-semibold uppercase">Introduce resultados hipotéticos</p>
          {unplayed.map(m => {
            const h = hypoResults[m.id]
            return (
              <div key={m.id} className={`border rounded-xl p-3 ${h?.home !== undefined && h?.away !== undefined && h.home !== '' ? 'bg-purple-50 border-purple-200' : 'bg-white'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 w-14 shrink-0">{m.code}</span>
                  <span className="flex-1 text-sm font-semibold text-right truncate">{m.home_team}</span>
                  <input
                    type="number" min="0" max="20"
                    value={h?.home ?? ''}
                    onChange={e => handleScore(m.id, 'home', e.target.value)}
                    className="w-10 text-center border rounded-lg p-1 text-sm font-bold focus:border-purple-400"
                    placeholder="?"
                  />
                  <span className="text-gray-400 font-bold">–</span>
                  <input
                    type="number" min="0" max="20"
                    value={h?.away ?? ''}
                    onChange={e => handleScore(m.id, 'away', e.target.value)}
                    className="w-10 text-center border rounded-lg p-1 text-sm font-bold focus:border-purple-400"
                    placeholder="?"
                  />
                  <span className="flex-1 text-sm font-semibold truncate">{m.away_team}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400 text-sm">
          Todos los partidos de esta fase tienen resultado real
        </div>
      )}

      {/* Simulate button */}
      <div className="flex gap-2">
        <button
          onClick={simulate}
          disabled={simulating || hypoCount === 0}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          {simulating ? 'Simulando...' : `🔮 Simular (${hypoCount} resultados)`}
        </button>
        {hypoCount > 0 && (
          <button onClick={clearHypo} className="btn-ghost px-4">
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* Simulated ranking */}
      {simRanking.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-gray-700 mb-3">🔮 Ranking simulado</h3>
          <div className="space-y-1.5">
            {simRanking.map(r => {
              const real = realRanking.find(rr => rr.name === r.name)
              const diff = real ? real.pos - r.pos : 0
              return (
                <div key={r.name} className="flex items-center gap-3 py-1">
                  <span className="w-7 text-center font-bold text-sm text-gray-500">
                    {r.pos === 1 ? '🥇' : r.pos === 2 ? '🥈' : r.pos === 3 ? '🥉' : `#${r.pos}`}
                  </span>
                  <span className="flex-1 text-sm font-medium">{r.name}</span>
                  {diff !== 0 && real && (
                    <span className={`text-xs font-bold ${diff > 0 ? 'text-green-500' : 'text-red-400'}`}>
                      {diff > 0 ? `↑${diff}` : `↓${Math.abs(diff)}`}
                    </span>
                  )}
                  <span className="font-bold text-sm text-purple-600">{r.total} pts</span>
                  {real && (
                    <span className="text-xs text-gray-400">
                      (era #{real.pos} · {real.total}pts)
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            * Pts simulados. Entre paréntesis: posición real actual y puntos reales.
          </p>
        </div>
      )}
    </div>
  )
}
