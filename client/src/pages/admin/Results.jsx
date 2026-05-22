import { useState, useEffect } from 'react'
import { matches as matchesApi, admin } from '../../api'

const PHASES = [
  { key: 'groups', label: 'Grupos' },
  { key: 'r16', label: '1/16' },
  { key: 'r8', label: '1/8' },
  { key: 'r4', label: '1/4' },
  { key: 'r2', label: '1/2' },
  { key: 'final', label: 'Final' },
]

function MatchResultRow({ match, onSave }) {
  const [home, setHome] = useState(match.home_score ?? '')
  const [away, setAway] = useState(match.away_score ?? '')
  const [homeTeam, setHomeTeam] = useState(match.home_team)
  const [awayTeam, setAwayTeam] = useState(match.away_team)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const isKnockout = match.phase !== 'groups'
  const hasResult = match.home_score !== null

  const save = async () => {
    setSaving(true)
    try {
      await admin.setResult(
        match.id,
        home !== '' ? parseInt(home) : '',
        away !== '' ? parseInt(away) : '',
        isKnockout ? homeTeam : undefined,
        isKnockout ? awayTeam : undefined,
      )
      setMsg('✓')
      onSave?.()
      setTimeout(() => setMsg(''), 2000)
    } catch (e) {
      setMsg('Error')
    }
    setSaving(false)
  }

  const clear = async () => {
    if (!confirm('¿Borrar el resultado?')) return
    await admin.clearResult(match.id)
    setHome(''); setAway('')
    onSave?.()
  }

  return (
    <div className={`border rounded-xl p-3 ${hasResult ? 'border-green-200 bg-green-50' : 'bg-white'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-mono text-gray-400">{match.code}</span>
        {match.match_time && <span className="text-xs text-gray-400">{match.match_time}</span>}
        {msg && <span className={`text-xs font-semibold ${msg === '✓' ? 'text-green-600' : 'text-red-500'}`}>{msg}</span>}
      </div>

      {isKnockout && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input className="input text-sm" value={homeTeam} onChange={e => setHomeTeam(e.target.value)} placeholder="Equipo local" />
          <input className="input text-sm" value={awayTeam} onChange={e => setAwayTeam(e.target.value)} placeholder="Equipo visitante" />
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm font-semibold text-right truncate">{match.home_team}</span>
        <input type="number" min="0" max="20" value={home} onChange={e => setHome(e.target.value)}
          className="w-12 text-center border rounded-lg p-1.5 text-sm font-bold" />
        <span className="text-gray-400 font-bold">–</span>
        <input type="number" min="0" max="20" value={away} onChange={e => setAway(e.target.value)}
          className="w-12 text-center border rounded-lg p-1.5 text-sm font-bold" />
        <span className="flex-1 text-sm font-semibold truncate">{match.away_team}</span>
        <div className="flex gap-1">
          <button onClick={save} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
            {saving ? '...' : 'OK'}
          </button>
          {hasResult && (
            <button onClick={clear} className="btn-ghost text-xs px-2 py-1.5">✕</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Results() {
  const [allMatches, setAllMatches] = useState([])
  const [activePhase, setActivePhase] = useState('groups')
  const [activeGroup, setActiveGroup] = useState('A')
  const [phase2Unlocked, setPhase2Unlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [phaseMsg, setPhaseMsg] = useState('')

  const load = () => {
    Promise.all([matchesApi.all(), admin.phase2Status()])
      .then(([m, p2]) => {
        setAllMatches(m.data)
        setPhase2Unlocked(p2.data.unlocked)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const phaseMatches = allMatches.filter(m => m.phase === activePhase)
  const groups = [...new Set(allMatches.filter(m => m.phase === 'groups').map(m => m.group_name))].sort()
  const displayed = activePhase === 'groups'
    ? phaseMatches.filter(m => m.group_name === activeGroup)
    : phaseMatches

  const groupTotal = allMatches.filter(m => m.phase === 'groups').length
  const groupDone = allMatches.filter(m => m.phase === 'groups' && m.home_score !== null).length
  const pct = groupTotal ? Math.round((groupDone / groupTotal) * 100) : 0

  const togglePhase2 = async () => {
    if (phase2Unlocked) {
      if (!confirm('¿Bloquear la Fase 2?')) return
      await admin.phase2Lock()
      setPhase2Unlocked(false)
      setPhaseMsg('Fase 2 bloqueada')
    } else {
      if (!confirm('¿Iniciar Fase 2? Los jugadores podrán apostar en eliminatorias.')) return
      await admin.phase2Unlock()
      setPhase2Unlocked(true)
      setPhaseMsg('¡Fase 2 activada!')
    }
    setTimeout(() => setPhaseMsg(''), 3000)
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-black">Introducir resultados</h1>

      {/* Phase 2 banner */}
      <div className={`card border-2 ${phase2Unlocked ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex-1">
            <p className="font-bold text-sm flex items-center gap-2">
              {phase2Unlocked ? '✅ Fase 2 activa' : '🔒 Fase 2 bloqueada'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Fase grupos: {groupDone}/{groupTotal} resultados ({pct}%)
            </p>
            {phaseMsg && <p className="text-xs font-semibold text-green-700 mt-1">{phaseMsg}</p>}
          </div>
          <button
            onClick={togglePhase2}
            className={`text-sm px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-colors ${
              phase2Unlocked
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {phase2Unlocked ? '🔒 Bloquear Fase 2' : '🚀 Comenzar Fase 2'}
          </button>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
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

      {/* Match list */}
      <div className="space-y-2">
        {displayed.map(m => (
          <MatchResultRow key={m.id} match={m} onSave={load} />
        ))}
        {displayed.length === 0 && (
          <p className="text-center py-8 text-gray-400">No hay partidos en esta fase aún</p>
        )}
      </div>
    </div>
  )
}
