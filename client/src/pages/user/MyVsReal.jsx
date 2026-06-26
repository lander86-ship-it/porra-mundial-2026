import { useState, useEffect, useMemo } from 'react'
import { matches as matchApi, predictions as predApi, daily as dailyApi } from '../../api'
import { getFlag } from '../../utils/flags'

const PHASES = [
  { key: 'groups', label: 'Grupos' },
  { key: 'r16', label: '1/16' },
  { key: 'r8', label: '1/8' },
  { key: 'r4', label: '1/4' },
  { key: 'r2', label: '1/2' },
  { key: 'final', label: 'Final' },
]

function ResultRow({ match, pred }) {
  const hasPred = pred?.home_score !== null && pred?.home_score !== undefined

  const actualSign = match.home_score > match.away_score ? '1'
    : match.home_score < match.away_score ? '2' : 'X'
  const predSign = hasPred
    ? (pred.home_score > pred.away_score ? '1' : pred.home_score < pred.away_score ? '2' : 'X')
    : null

  const exact = hasPred && match.home_score === pred.home_score && match.away_score === pred.away_score
  const signOk = hasPred && actualSign === predSign && !exact

  const borderColor = !hasPred
    ? 'border-gray-100'
    : exact ? 'border-green-400 bg-green-50'
    : signOk ? 'border-yellow-300 bg-yellow-50'
    : 'border-red-200 bg-red-50'

  const icon = !hasPred ? '—' : exact ? '✅' : signOk ? '🟡' : '❌'

  return (
    <div className={`border-2 rounded-xl p-3 ${borderColor}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-mono text-gray-400">{match.code}</span>
        {match.match_date && (
          <span className="text-xs text-gray-400">{match.match_date}</span>
        )}
        <span className="ml-auto text-base">{icon}</span>
        {hasPred && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            (pred.points || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
          }`}>
            {pred.points || 0} pts
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm font-semibold text-right leading-tight">
          {getFlag(match.home_team)} {match.home_team}
        </span>

        <div className="text-center min-w-[80px]">
          {/* Real result */}
          <div className="text-base font-black text-gray-800">
            {match.home_score} – {match.away_score}
          </div>
          {/* My prediction */}
          {hasPred ? (
            <div className={`text-xs mt-0.5 font-semibold ${exact ? 'text-green-600' : signOk ? 'text-yellow-600' : 'text-red-400'}`}>
              Tú: {pred.home_score}–{pred.away_score}
            </div>
          ) : (
            <div className="text-xs text-gray-300 mt-0.5">Sin pred.</div>
          )}
        </div>

        <span className="flex-1 text-sm font-semibold leading-tight">
          {getFlag(match.away_team)} {match.away_team}
        </span>
      </div>
    </div>
  )
}

function GroupHeatmap({ stats }) {
  const hasData = stats.some(s => s.playedMatches > 0)
  if (!hasData) return null
  return (
    <div className="card">
      <p className="text-xs text-gray-400 font-semibold mb-3">🗺️ MAPA DE CALOR — ACIERTOS POR GRUPO (koadrilla)</p>
      <div className="grid grid-cols-4 gap-2">
        {stats.map(g => {
          const bg = g.playedMatches === 0 ? 'bg-gray-50 border-gray-100'
            : g.signPct >= 65 ? 'bg-green-50 border-green-200'
            : g.signPct >= 40 ? 'bg-yellow-50 border-yellow-200'
            : 'bg-red-50 border-red-200'
          const textColor = g.playedMatches === 0 ? 'text-gray-300'
            : g.signPct >= 65 ? 'text-green-600'
            : g.signPct >= 40 ? 'text-yellow-600'
            : 'text-red-500'
          return (
            <div key={g.group} className={`border rounded-xl p-2 text-center ${bg}`}>
              <div className="text-[10px] font-bold text-gray-500">Grupo {g.group}</div>
              {g.playedMatches > 0 ? (
                <>
                  <div className={`text-xl font-black mt-0.5 ${textColor}`}>{g.signPct}%</div>
                  <div className="text-[9px] text-gray-400">{g.playedMatches}/{g.totalMatches} partidos</div>
                  {g.exactPct > 0 && (
                    <div className="text-[9px] text-green-500 font-semibold">{g.exactPct}% exactos</div>
                  )}
                </>
              ) : (
                <div className="text-[10px] text-gray-300 mt-1">—</div>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-4 text-[10px] text-gray-400">
        <span><span className="text-green-500 font-bold">■</span> ≥65% acertó signo</span>
        <span><span className="text-yellow-500 font-bold">■</span> 40–64%</span>
        <span><span className="text-red-400 font-bold">■</span> &lt;40%</span>
      </div>
    </div>
  )
}

export default function MyVsReal() {
  const [allMatches, setAllMatches] = useState([])
  const [myPreds, setMyPreds] = useState({})
  const [groupStats, setGroupStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePhase, setActivePhase] = useState('groups')
  const [activeGroup, setActiveGroup] = useState('A')

  useEffect(() => {
    Promise.all([matchApi.all(), predApi.my(), dailyApi.groupStats()])
      .then(([m, p, gs]) => {
        setAllMatches(m.data)
        const map = {}
        p.data.match.forEach(pr => { map[pr.match_id] = pr })
        setMyPreds(map)
        setGroupStats(gs.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const groups = useMemo(() => {
    return [...new Set(allMatches.filter(m => m.phase === 'groups').map(m => m.group_name))].sort()
  }, [allMatches])

  // Only played matches for the selected phase/group
  const filtered = useMemo(() => {
    const played = allMatches.filter(m => m.home_score !== null)
    if (activePhase === 'groups') {
      return played.filter(m => m.phase === 'groups' && m.group_name === activeGroup)
    }
    return played.filter(m => m.phase === activePhase)
  }, [allMatches, activePhase, activeGroup])

  // Summary stats across ALL played matches
  const stats = useMemo(() => {
    const played = allMatches.filter(m => m.home_score !== null)
    let exact = 0, sign = 0, miss = 0, noPred = 0, totalPts = 0
    for (const m of played) {
      const p = myPreds[m.id]
      if (!p || p.home_score === null || p.home_score === undefined) { noPred++; continue }
      totalPts += p.points || 0
      const as_ = m.home_score > m.away_score ? '1' : m.home_score < m.away_score ? '2' : 'X'
      const ps = p.home_score > p.away_score ? '1' : p.home_score < p.away_score ? '2' : 'X'
      if (p.home_score === m.home_score && p.away_score === m.away_score) exact++
      else if (as_ === ps) sign++
      else miss++
    }
    return { exact, sign, miss, noPred, total: played.length, totalPts }
  }, [allMatches, myPreds])

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  const playedTotal = allMatches.filter(m => m.home_score !== null).length

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="text-xl font-black">Mi Porra vs Real</h1>
        <p className="text-sm text-gray-500 mt-1">Resultados reales frente a tus predicciones</p>
      </div>

      {/* Summary stats */}
      {playedTotal > 0 && (
        <div className="card">
          <p className="text-xs text-gray-400 font-semibold mb-3">RESUMEN GLOBAL ({playedTotal} partidos jugados)</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-2xl font-black text-green-600">{stats.exact}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Exactos ✅</div>
            </div>
            <div>
              <div className="text-2xl font-black text-yellow-500">{stats.sign}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Signo 🟡</div>
            </div>
            <div>
              <div className="text-2xl font-black text-red-400">{stats.miss}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Fallos ❌</div>
            </div>
            <div>
              <div className="text-2xl font-black text-fifa-blue">{stats.totalPts}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Puntos</div>
            </div>
          </div>
          {stats.exact + stats.sign + stats.miss > 0 && (
            <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden flex">
              <div className="bg-green-400 h-full" style={{ width: `${(stats.exact / (stats.exact + stats.sign + stats.miss)) * 100}%` }} />
              <div className="bg-yellow-300 h-full" style={{ width: `${(stats.sign / (stats.exact + stats.sign + stats.miss)) * 100}%` }} />
              <div className="bg-red-300 h-full" style={{ width: `${(stats.miss / (stats.exact + stats.sign + stats.miss)) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Group heatmap */}
      <GroupHeatmap stats={groupStats} />

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

      {/* Legend */}
      <div className="flex gap-3 text-[10px] text-gray-400">
        <span>✅ Resultado exacto</span>
        <span>🟡 Signo correcto</span>
        <span>❌ Fallo</span>
      </div>

      {/* Match list */}
      <div className="space-y-2">
        {filtered.map(m => (
          <ResultRow key={m.id} match={m} pred={myPreds[m.id]} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">⏳</p>
            <p className="text-sm">Aún no hay resultados en esta fase/grupo</p>
          </div>
        )}
      </div>
    </div>
  )
}
