import { useState, useEffect, useCallback, useMemo } from 'react'
import { matches as matchApi, predictions as predApi } from '../../api'
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

const ALL_GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

function MatchRow({ match, pred, onSave, locked }) {
  const [home, setHome] = useState(pred?.home_score ?? '')
  const [away, setAway] = useState(pred?.away_score ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [dirty, setDirty] = useState(false)

  const isPlayed = match.home_score !== null
  const disabled = isPlayed || locked

  useEffect(() => {
    setHome(pred?.home_score ?? '')
    setAway(pred?.away_score ?? '')
    setDirty(false)
  }, [pred?.home_score, pred?.away_score, pred?.match_id])

  const sign = useMemo(() => {
    const h = parseInt(home), a = parseInt(away)
    if (isNaN(h) || isNaN(a)) return null
    return h > a ? '1' : h < a ? '2' : 'X'
  }, [home, away])

  const signColor = sign === '1' ? 'text-green-600' : sign === '2' ? 'text-blue-600' : sign === 'X' ? 'text-yellow-600' : 'text-gray-400'

  const save = async () => {
    if (home === '' || away === '') { setMsg('⚠ Pon ambos goles'); setTimeout(() => setMsg(''), 2000); return }
    setSaving(true)
    try {
      await predApi.saveMatch(match.id, home, away)
      setMsg('✓ Guardado')
      setDirty(false)
      onSave?.()
      setTimeout(() => setMsg(''), 2000)
    } catch (e) {
      setMsg('Error: ' + (e.response?.data?.error || 'desconocido'))
    }
    setSaving(false)
  }

  const handleHome = (v) => { setHome(v); setDirty(true); setMsg('') }
  const handleAway = (v) => { setAway(v); setDirty(true); setMsg('') }

  return (
    <div className={`border rounded-xl p-3 transition-colors ${
      isPlayed ? 'bg-gray-50 border-gray-200' :
      locked ? 'bg-blue-50 border-blue-100' :
      dirty ? 'bg-amber-50 border-amber-200' : 'bg-white'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-mono text-gray-400">{match.code}</span>
        {match.match_time && (
          <span className="text-xs text-gray-400">{match.match_time}</span>
        )}
        {isPlayed && (
          <span className="badge bg-green-100 text-green-700 text-xs">
            Resultado: {match.home_score}-{match.away_score}
          </span>
        )}
        {msg && <span className={`text-xs font-semibold ${msg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{msg}</span>}
      </div>

      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm font-semibold text-right leading-tight">
          {getFlag(match.home_team)} {match.home_team}
        </span>

        <div className="flex items-center gap-1">
          <input
            type="number" min="0" max="20"
            value={home}
            onChange={e => handleHome(e.target.value)}
            disabled={disabled}
            className="w-11 text-center border rounded-lg p-1.5 text-sm font-bold disabled:bg-gray-100 focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          />
          <span className={`w-5 text-center font-black text-base ${signColor}`}>
            {sign || '-'}
          </span>
          <input
            type="number" min="0" max="20"
            value={away}
            onChange={e => handleAway(e.target.value)}
            disabled={disabled}
            className="w-11 text-center border rounded-lg p-1.5 text-sm font-bold disabled:bg-gray-100 focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          />
        </div>

        <span className="flex-1 text-sm font-semibold leading-tight">
          {getFlag(match.away_team)} {match.away_team}
        </span>

        {!isPlayed && !locked && (
          <button
            onClick={save}
            disabled={saving || !dirty}
            className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors min-w-[44px] ${
              dirty ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400'
            } disabled:opacity-60`}
          >
            {saving ? '...' : 'OK'}
          </button>
        )}
        {locked && pred?.home_score !== null && (
          <span className="text-xs text-blue-600 font-semibold">🔒</span>
        )}
      </div>

      {isPlayed && pred?.points !== undefined && pred?.home_score !== null && (
        <div className="mt-1.5 flex justify-end">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pred.points > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {pred.points} pts
          </span>
        </div>
      )}
    </div>
  )
}

// qualifying3rds: Set of team names that are in the best 8 thirds (from user's predictions)
function GroupStandingsPanel({ group, allMatches, myPreds, qualifying3rds }) {
  const groupMatches = allMatches.filter(m => m.group_name === group && m.phase === 'groups')

  const predsWithScores = groupMatches.map(m => ({
    home_team: m.home_team,
    away_team: m.away_team,
    home_score: myPreds[m.id]?.home_score ?? null,
    away_score: myPreds[m.id]?.away_score ?? null,
  }))

  const standings = computeStandings(predsWithScores)

  const rowStyle = (t, i) => {
    if (i < 2) return 'font-semibold text-green-700 bg-green-100' // top 2 — dark green
    if (i === 2 && qualifying3rds?.has(t.name)) return 'font-semibold text-green-600 bg-green-50' // best 8 thirds — light green
    return 'text-gray-500'
  }

  const bulletStyle = (t, i) => {
    if (i < 2) return <span className="text-green-600 font-black">●</span>
    if (i === 2 && qualifying3rds?.has(t.name)) return <span className="text-green-400 font-black">◑</span>
    return <span className="text-gray-300">○</span>
  }

  return (
    <div className="bg-gray-50 rounded-xl p-3 border">
      <h4 className="text-xs font-bold text-gray-500 mb-2">TABLA GRUPO {group}</h4>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400">
            <th className="text-left font-medium pb-1 w-4"></th>
            <th className="text-left font-medium pb-1">Equipo</th>
            <th className="text-center font-medium pb-1">PJ</th>
            <th className="text-center font-medium pb-1">GD</th>
            <th className="text-center font-bold pb-1 text-gray-600">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((t, i) => (
            <tr key={t.name} className={`rounded ${rowStyle(t, i)}`}>
              <td className="py-0.5">{bulletStyle(t, i)}</td>
              <td className="py-0.5 truncate max-w-[90px]">{getFlag(t.name)} {t.name}</td>
              <td className="text-center py-0.5">{t.played}</td>
              <td className={`text-center py-0.5 ${t.gd > 0 ? 'text-green-600' : t.gd < 0 ? 'text-red-500' : ''}`}>
                {t.gd > 0 ? '+' : ''}{t.gd}
              </td>
              <td className="text-center py-0.5 font-bold">{t.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Legend */}
      <div className="mt-2 flex gap-3 text-[10px] text-gray-400">
        <span><span className="text-green-600">●</span> Clasifica (Top 2)</span>
        <span><span className="text-green-400">◑</span> Mejor 3º (actualmente)</span>
      </div>
    </div>
  )
}

function ThirdPlaceRankingPanel({ allThirds }) {
  if (!allThirds || allThirds.length === 0) return null
  return (
    <div className="bg-gray-50 rounded-xl p-3 border">
      <h4 className="text-xs font-bold text-gray-500 mb-2">CLASIFICACIÓN 3ºs <span className="font-normal text-gray-400">(mejores 8 pasan)</span></h4>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b">
            <th className="text-left font-medium pb-1 w-5">#</th>
            <th className="text-left font-medium pb-1">Equipo</th>
            <th className="text-center font-medium pb-1 w-5">G</th>
            <th className="text-center font-medium pb-1 w-8">GD</th>
            <th className="text-center font-bold pb-1 w-8 text-gray-600">Pts</th>
          </tr>
        </thead>
        <tbody>
          {allThirds.map((t, i) => {
            const q = i < 8
            return (
              <tr key={t.group} className={`border-b border-gray-50 ${q ? 'bg-green-50' : ''}`}>
                <td className="py-0.5">
                  <span className={`text-[10px] font-bold ${q ? 'text-green-600' : 'text-gray-300'}`}>{i + 1}</span>
                </td>
                <td className={`py-0.5 truncate max-w-[90px] ${q ? 'font-semibold text-green-700' : 'text-gray-400'}`}>
                  {getFlag(t.name)} {t.name}
                </td>
                <td className="text-center py-0.5 text-gray-400 text-[10px]">{t.group}</td>
                <td className={`text-center py-0.5 font-semibold ${t.gd > 0 ? 'text-green-600' : t.gd < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {t.gd > 0 ? '+' : ''}{t.gd}
                </td>
                <td className={`text-center py-0.5 font-bold ${q ? 'text-green-700' : 'text-gray-400'}`}>{t.pts}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="mt-1.5 text-[10px] text-gray-400">
        <span className="inline-block w-2 h-2 bg-green-100 rounded-sm align-middle mr-1 border border-green-200"></span>Clasifican a 1/16
      </div>
    </div>
  )
}

export default function Predictions() {
  const [allMatches, setAllMatches] = useState([])
  const [myPreds, setMyPreds] = useState({})
  const [locked, setLocked] = useState(false)
  const [activePhase, setActivePhase] = useState('groups')
  const [activeGroup, setActiveGroup] = useState('A')
  const [showStandings, setShowStandings] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')

  const load = useCallback(() => {
    Promise.all([matchApi.all(), predApi.my()])
      .then(([m, p]) => {
        setAllMatches(m.data)
        const map = {}
        p.data.match.forEach(pr => { map[pr.match_id] = pr })
        setMyPreds(map)
        setLocked(p.data.locked)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const groups = useMemo(() => {
    return [...new Set(allMatches.filter(m => m.phase === 'groups').map(m => m.group_name))].sort()
  }, [allMatches])

  const filtered = useMemo(() => {
    if (activePhase === 'groups') {
      return allMatches.filter(m => m.phase === 'groups' && m.group_name === activeGroup)
    }
    return allMatches.filter(m => m.phase === activePhase)
  }, [allMatches, activePhase, activeGroup])

  // Compute 3rd-place teams across all groups (sorted, from user's predictions)
  const thirdsData = useMemo(() => {
    const thirds = []
    for (const g of ALL_GROUPS) {
      const gMatches = allMatches.filter(m => m.phase === 'groups' && m.group_name === g)
      const predsWithScores = gMatches.map(m => ({
        home_team: m.home_team, away_team: m.away_team,
        home_score: myPreds[m.id]?.home_score ?? null,
        away_score: myPreds[m.id]?.away_score ?? null,
      }))
      const standings = computeStandings(predsWithScores)
      if (standings[2] && standings[2].played > 0) {
        thirds.push({ ...standings[2], group: g })
      }
    }
    thirds.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.gd !== a.gd) return b.gd - a.gd
      return b.gf - a.gf
    })
    return { list: thirds, set: new Set(thirds.slice(0, 8).map(t => t.name)) }
  }, [allMatches, myPreds])

  const qualifying3rds = thirdsData.set
  const allThirds = thirdsData.list

  const groupMatchIds = allMatches.filter(m => m.phase === 'groups').map(m => m.id)
  const predCount = groupMatchIds.filter(id => myPreds[id]?.home_score !== null).length

  const handleSubmit = async () => {
    if (!confirm('¿Seguro que quieres enviar tu porra definitivamente? No podrás modificarla después.')) return
    setSubmitting(true)
    try {
      await predApi.submit()
      setLocked(true)
      setSubmitMsg('¡Porra enviada y bloqueada!')
    } catch (e) {
      setSubmitMsg('Error: ' + (e.response?.data?.error || 'desconocido'))
    }
    setSubmitting(false)
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black">Mis apuestas</h1>
        {locked ? (
          <span className="badge bg-blue-100 text-blue-700 flex items-center gap-1">🔒 Enviada</span>
        ) : (
          <span className="text-xs text-gray-500">{predCount}/{groupMatchIds.length} grupos</span>
        )}
      </div>

      {/* Submit Final button */}
      {!locked && (
        <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-green-800 text-sm">Enviar Porra Definitiva</p>
              <p className="text-xs text-green-600">Bloquea todas tus predicciones permanentemente</p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || predCount === 0}
              className="btn-primary bg-green-600 hover:bg-green-700 text-sm px-4 py-2 whitespace-nowrap disabled:opacity-50"
            >
              {submitting ? '...' : '🚀 Enviar'}
            </button>
          </div>
          {submitMsg && <p className="text-xs text-green-700 mt-2">{submitMsg}</p>}
        </div>
      )}

      {locked && (
        <div className="card bg-blue-50 border-blue-200 text-center">
          <p className="text-blue-700 font-bold">🔒 Tu porra ha sido enviada</p>
          <p className="text-xs text-blue-500 mt-1">Puedes ver tus predicciones pero ya no puedes modificarlas</p>
        </div>
      )}

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

      {/* Main content — matches + standings side panel */}
      <div className={activePhase === 'groups' ? 'grid grid-cols-1 lg:grid-cols-3 gap-4' : ''}>
        {/* Matches */}
        <div className={`space-y-2 ${activePhase === 'groups' ? 'lg:col-span-2' : ''}`}>
          {filtered.map(m => (
            <MatchRow
              key={m.id}
              match={m}
              pred={myPreds[m.id]}
              onSave={load}
              locked={locked}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">⏳</p>
              <p className="text-sm">Fase no disponible aún</p>
            </div>
          )}
        </div>

        {/* Group standings side panel */}
        {activePhase === 'groups' && (
          <div className="space-y-2">
            <button
              onClick={() => setShowStandings(s => !s)}
              className="text-xs text-gray-500 hover:text-gray-700 font-semibold flex items-center gap-1 lg:hidden"
            >
              {showStandings ? '▲ Ocultar tablas' : '▼ Ver tablas grupo ' + activeGroup}
            </button>
            {(showStandings || window.innerWidth >= 1024) && (
              <>
                <GroupStandingsPanel
                  group={activeGroup}
                  allMatches={allMatches}
                  myPreds={myPreds}
                  qualifying3rds={qualifying3rds}
                />
                <ThirdPlaceRankingPanel allThirds={allThirds} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
