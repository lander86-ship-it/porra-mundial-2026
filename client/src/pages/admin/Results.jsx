import { useState, useEffect, useMemo } from 'react'
import { matches as matchesApi, admin } from '../../api'
import { computeStandings } from '../../utils/standings'
import { getFlag } from '../../utils/flags'

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

  useEffect(() => {
    setHome(match.home_score ?? '')
    setAway(match.away_score ?? '')
    setHomeTeam(match.home_team)
    setAwayTeam(match.away_team)
  }, [match.home_score, match.away_score, match.home_team, match.away_team])

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
        <span className="flex-1 text-sm font-semibold text-right truncate">
          {getFlag(match.home_team)} {match.home_team}
        </span>
        <input type="number" min="0" max="20" value={home} onChange={e => setHome(e.target.value)}
          className="w-12 text-center border rounded-lg p-1.5 text-sm font-bold" />
        <span className="text-gray-400 font-bold">–</span>
        <input type="number" min="0" max="20" value={away} onChange={e => setAway(e.target.value)}
          className="w-12 text-center border rounded-lg p-1.5 text-sm font-bold" />
        <span className="flex-1 text-sm font-semibold truncate">
          {getFlag(match.away_team)} {match.away_team}
        </span>
        <div className="flex gap-1 flex-shrink-0">
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

// Collapsible group standings based on actual results
function GroupStandingsPanel({ groupName, allMatches }) {
  const [open, setOpen] = useState(false)

  const standings = useMemo(() => {
    const gMatches = allMatches.filter(m => m.phase === 'groups' && m.group_name === groupName)
    return computeStandings(gMatches.map(m => ({
      home_team: m.home_team, away_team: m.away_team,
      home_score: m.home_score, away_score: m.away_score,
    })))
  }, [allMatches, groupName])

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-sm font-semibold text-gray-600 hover:bg-gray-100"
      >
        <span>📊 Clasificación actual Grupo {groupName}</span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <table className="w-full text-xs p-2">
          <thead>
            <tr className="text-gray-400 border-b">
              <th className="text-left py-1 px-2">#</th>
              <th className="text-left py-1">Equipo</th>
              <th className="text-center py-1">PJ</th>
              <th className="text-center py-1">GF</th>
              <th className="text-center py-1">GC</th>
              <th className="text-center py-1">DG</th>
              <th className="text-center py-1 font-bold text-gray-700">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((t, i) => (
              <tr key={t.name} className={`border-b ${i < 2 ? 'font-semibold text-green-700 bg-green-50' : i === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                <td className="py-1 px-2">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '4'}</td>
                <td className="py-1 truncate max-w-[120px]">{getFlag(t.name)} {t.name}</td>
                <td className="text-center py-1">{t.played}</td>
                <td className="text-center py-1">{t.gf}</td>
                <td className="text-center py-1">{t.ga}</td>
                <td className={`text-center py-1 ${t.gd > 0 ? 'text-green-600' : t.gd < 0 ? 'text-red-500' : ''}`}>
                  {t.gd > 0 ? '+' : ''}{t.gd}
                </td>
                <td className="text-center py-1 font-bold">{t.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// Collapsible 3rd-place cross-group ranking
function ThirdPlaceRanking({ allMatches }) {
  const [open, setOpen] = useState(false)
  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L']

  const thirds = useMemo(() => {
    const result = []
    for (const g of groups) {
      const gMatches = allMatches.filter(m => m.phase === 'groups' && m.group_name === g)
      const standings = computeStandings(gMatches.map(m => ({
        home_team: m.home_team, away_team: m.away_team,
        home_score: m.home_score, away_score: m.away_score,
      })))
      if (standings[2] && standings[2].played > 0) {
        result.push({ ...standings[2], group: g })
      }
    }
    return result.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.gd !== a.gd) return b.gd - a.gd
      return b.gf - a.gf
    })
  }, [allMatches])

  if (thirds.length === 0) return null

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-amber-50 text-sm font-semibold text-amber-700 hover:bg-amber-100"
      >
        <span>🥉 Mejores 3ºs ({thirds.filter((_, i) => i < 8).length}/8 clasificados)</span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b">
              <th className="text-left py-1 px-2">#</th>
              <th className="text-left py-1">Equipo</th>
              <th className="text-center py-1">Gr.</th>
              <th className="text-center py-1">PJ</th>
              <th className="text-center py-1">DG</th>
              <th className="text-center py-1 font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {thirds.map((t, i) => (
              <tr key={t.group} className={`border-b ${i < 8 ? 'font-semibold text-green-700 bg-green-50' : 'text-gray-500'}`}>
                <td className="py-1 px-2">{i < 8 ? '✓' : '✗'}</td>
                <td className="py-1 truncate max-w-[100px]">{getFlag(t.name)} {t.name}</td>
                <td className="text-center py-1 font-bold">{t.group}</td>
                <td className="text-center py-1">{t.played}</td>
                <td className={`text-center py-1 ${t.gd > 0 ? 'text-green-600' : t.gd < 0 ? 'text-red-500' : ''}`}>
                  {t.gd > 0 ? '+' : ''}{t.gd}
                </td>
                <td className="text-center py-1 font-bold">{t.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function Results() {
  const [allMatches, setAllMatches] = useState([])
  const [activePhase, setActivePhase] = useState('groups')
  const [activeGroup, setActiveGroup] = useState('A')
  const [phase2Unlocked, setPhase2Unlocked] = useState(false)
  const [groupsStatus, setGroupsStatus] = useState({})
  const [loading, setLoading] = useState(true)
  const [phaseMsg, setPhaseMsg] = useState('')
  const [closingGroup, setClosingGroup] = useState(null)

  const load = () => {
    Promise.all([matchesApi.all(), admin.phase2Status(), admin.groupsStatus()])
      .then(([m, p2, gs]) => {
        setAllMatches(m.data)
        setPhase2Unlocked(p2.data.unlocked)
        setGroupsStatus(gs.data)
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
  const groupDone  = allMatches.filter(m => m.phase === 'groups' && m.home_score !== null).length
  const pct = groupTotal ? Math.round((groupDone / groupTotal) * 100) : 0
  const closedCount = Object.values(groupsStatus).filter(Boolean).length

  const activeGroupMatches = allMatches.filter(m => m.phase === 'groups' && m.group_name === activeGroup)
  const activeGroupDone = activeGroupMatches.filter(m => m.home_score !== null).length
  const canCloseGroup = activeGroupDone >= 6
  const isGroupClosed = groupsStatus[activeGroup] === true

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

  const handleCloseGroup = async () => {
    if (!confirm(`¿Cerrar grupo ${activeGroup}? Los resultados podrán seguir editándose. Solo se sumarán los puntos de posición.`)) return
    setClosingGroup(activeGroup)
    try {
      await admin.closeGroup(activeGroup)
      await load()
      setPhaseMsg(`✅ Grupo ${activeGroup} cerrado — puntos de posición sumados`)
    } catch (e) {
      setPhaseMsg(`Error: ${e.response?.data?.error || 'desconocido'}`)
    }
    setClosingGroup(null)
    setTimeout(() => setPhaseMsg(''), 4000)
  }

  const handleOpenGroup = async () => {
    if (!confirm(`¿Reabrir grupo ${activeGroup}? Se quitarán los puntos de posición hasta que se vuelva a cerrar.`)) return
    await admin.openGroup(activeGroup)
    await load()
    setPhaseMsg(`Grupo ${activeGroup} reabierto`)
    setTimeout(() => setPhaseMsg(''), 3000)
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-black">Introducir resultados</h1>

      {/* Phase 2 + summary banner */}
      <div className={`card border-2 ${phase2Unlocked ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex-1">
            <p className="font-bold text-sm">
              {phase2Unlocked ? '✅ Fase 2 activa' : '🔒 Fase 2 bloqueada'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Grupos: {groupDone}/{groupTotal} resultados ({pct}%) · {closedCount}/12 grupos cerrados
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
        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
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
          {groups.map(g => {
            const gDone = allMatches.filter(m => m.phase === 'groups' && m.group_name === g && m.home_score !== null).length
            const closed = groupsStatus[g] === true
            return (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`relative w-9 h-9 rounded-lg font-bold text-sm transition-colors ${
                  activeGroup === g ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {g}
                {closed && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white text-[7px] flex items-center justify-center text-white font-bold">✓</span>
                )}
                {!closed && gDone === 6 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white"></span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* ─── MATCH RESULTS (always full width, always visible) ─── */}
      <div className="space-y-2">
        {displayed.map(m => (
          <MatchResultRow key={m.id} match={m} onSave={load} />
        ))}
        {displayed.length === 0 && (
          <p className="text-center py-8 text-gray-400">No hay partidos en esta fase aún</p>
        )}
      </div>

      {/* ─── CERRAR GRUPO (only for groups phase) ─── */}
      {activePhase === 'groups' && (
        <div className={`flex items-center justify-between p-3 rounded-xl border-2 ${
          isGroupClosed
            ? 'border-green-300 bg-green-50'
            : canCloseGroup
            ? 'border-amber-300 bg-amber-50'
            : 'border-gray-100 bg-gray-50'
        }`}>
          <div>
            <p className="font-bold text-sm">
              {isGroupClosed ? `✅ Grupo ${activeGroup} — puntos de posición sumados` : `Cerrar Grupo ${activeGroup}`}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isGroupClosed
                ? 'Puedes seguir editando resultados. Reabre para reiniciar.'
                : canCloseGroup
                ? 'Todos los resultados listos. Pulsa para sumar puntos de posición.'
                : `${activeGroupDone}/6 resultados introducidos`}
            </p>
          </div>
          {isGroupClosed ? (
            <button onClick={handleOpenGroup}
              className="text-xs px-3 py-2 rounded-lg bg-white border text-gray-600 hover:bg-gray-50 font-semibold whitespace-nowrap">
              🔓 Reabrir
            </button>
          ) : (
            <button onClick={handleCloseGroup}
              disabled={!canCloseGroup || closingGroup === activeGroup}
              className="text-xs px-3 py-2 rounded-lg font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
              {closingGroup === activeGroup ? '...' : `🔒 Cerrar Grupo ${activeGroup}`}
            </button>
          )}
        </div>
      )}

      {/* ─── COLLAPSIBLE PANELS ─── */}
      {activePhase === 'groups' && (
        <div className="space-y-2">
          <GroupStandingsPanel groupName={activeGroup} allMatches={allMatches} />
          <ThirdPlaceRanking allMatches={allMatches} />
        </div>
      )}
    </div>
  )
}
