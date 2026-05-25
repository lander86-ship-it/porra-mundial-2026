import { useState, useEffect, useMemo } from 'react'
import { matches as matchApi, predictions as predApi } from '../../api'
import { computeStandings } from '../../utils/standings'
import { getFlag } from '../../utils/flags'

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

// FIFA ranking for tiebreaking best thirds (lower = better ranked)
const FIFA_RANKING = {
  'Argentina': 1, 'España': 2, 'Francia': 3, 'Brasil': 4, 'Inglaterra': 5,
  'Portugal': 6, 'Bélgica': 7, 'Países Bajos': 8, 'Alemania': 9, 'Uruguay': 10,
  'Colombia': 11, 'México': 12, 'Estados Unidos': 13, 'Marruecos': 14, 'Croacia': 15,
  'Suiza': 16, 'Japón': 17, 'Senegal': 18, 'Ecuador': 19, 'Corea del Sur': 20,
  'Turquía': 21, 'Austria': 22, 'Australia': 23, 'Canadá': 24, 'Escocia': 25,
  'Paraguay': 26, 'Egipto': 27, 'Noruega': 28, 'República Checa': 29,
  'Costa de Marfil': 30, 'Argelia': 31, 'Suecia': 32, 'Túnez': 33,
  'Arabia Saudita': 34, 'Catar': 35, 'Irán': 36, 'Jordania': 37, 'Irak': 38,
  'RD Congo': 39, 'Ghana': 40, 'Uzbekistán': 41, 'Haití': 42, 'Panamá': 43,
  'Bosnia y Herzegovina': 44, 'Nueva Zelanda': 45, 'Cabo Verde': 46,
  'Curazao': 47, 'Sudáfrica': 48,
}

// qualifying3rds: Set of team names that qualify as best thirds
function StandingsTable({ standings, actual, qualifying3rds }) {
  const rowBg = (t, i) => {
    if (i < 2) return 'bg-green-100'
    if (i === 2 && qualifying3rds?.has(t.name)) return 'bg-green-50'
    return ''
  }
  const badgeStyle = (t, i) => {
    if (i < 2) return 'bg-green-600 text-white'
    if (i === 2 && qualifying3rds?.has(t.name)) return 'bg-green-300 text-green-900'
    return 'bg-gray-200 text-gray-500'
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 border-b">
            <th className="text-left py-2 font-medium w-5">#</th>
            <th className="text-left py-2 font-medium">Equipo</th>
            <th className="text-center py-2 font-medium w-8">PJ</th>
            <th className="text-center py-2 font-medium w-8">GF</th>
            <th className="text-center py-2 font-medium w-8">GC</th>
            <th className="text-center py-2 font-medium w-10">GD</th>
            <th className="text-center py-2 font-bold w-10 text-gray-600">PTS</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((t, i) => {
            const actualPos = actual ? actual.findIndex(a => a.name === t.name) : -1
            const moving = actual ? (actualPos < i ? '↑' : actualPos > i ? '↓' : '') : ''
            const movingColor = moving === '↑' ? 'text-green-500' : moving === '↓' ? 'text-red-400' : ''

            return (
              <tr key={t.name} className={`border-b border-gray-50 ${rowBg(t, i)}`}>
                <td className="py-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${badgeStyle(t, i)}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="py-1.5">
                  <span className="font-medium truncate">{getFlag(t.name)} {t.name}</span>
                  {moving && <span className={`ml-1 text-xs ${movingColor}`}>{moving}</span>}
                </td>
                <td className="text-center py-1.5 text-gray-600">{t.played}</td>
                <td className="text-center py-1.5 text-gray-600">{t.gf}</td>
                <td className="text-center py-1.5 text-gray-600">{t.ga}</td>
                <td className={`text-center py-1.5 font-semibold ${t.gd > 0 ? 'text-green-600' : t.gd < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {t.gd > 0 ? '+' : ''}{t.gd}
                </td>
                <td className="text-center py-1.5 font-black text-gray-800">{t.pts}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="mt-2 flex gap-3 text-[10px] text-gray-400">
        <span><span className="inline-block w-3 h-3 rounded-full bg-green-600 align-middle mr-0.5"></span> Clasifica (Top 2)</span>
        {qualifying3rds && qualifying3rds.size > 0 && (
          <span><span className="inline-block w-3 h-3 rounded-full bg-green-300 align-middle mr-0.5"></span> Mejor 3º (actualmente)</span>
        )}
      </div>
    </div>
  )
}

function ThirdPlaceRankingPanel({ allThirds }) {
  return (
    <div className="card">
      <h3 className="font-bold text-gray-700 mb-1 text-sm">
        Clasificación de 3ºs{' '}
        <span className="text-xs text-gray-400 font-normal">(los 8 mejores pasan a 1/16)</span>
      </h3>
      <p className="text-xs text-gray-400 mb-3">
        Calculada según tus predicciones · {allThirds.length}/12 grupos con datos
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b">
              <th className="text-left py-1 font-medium w-5">#</th>
              <th className="text-left py-1 font-medium">Equipo</th>
              <th className="text-center py-1 font-medium w-6">Gr</th>
              <th className="text-center py-1 font-medium w-8">PJ</th>
              <th className="text-center py-1 font-medium w-8">GF</th>
              <th className="text-center py-1 font-medium w-8">GC</th>
              <th className="text-center py-1 font-medium w-10">GD</th>
              <th className="text-center py-1 font-bold w-8 text-gray-600">Pts</th>
            </tr>
          </thead>
          <tbody>
            {allThirds.map((t, i) => {
              const q = i < 8
              return (
                <tr key={t.group} className={`border-b border-gray-50 ${q ? 'bg-green-50' : ''}`}>
                  <td className="py-1">
                    <span className={`text-xs font-bold ${q ? 'text-green-600' : 'text-gray-300'}`}>{i + 1}</span>
                  </td>
                  <td className={`py-1 ${q ? 'font-semibold text-green-700' : 'text-gray-400'}`}>
                    {getFlag(t.name)} {t.name}
                  </td>
                  <td className="text-center py-1 text-gray-400">{t.group}</td>
                  <td className="text-center py-1 text-gray-500">{t.played}</td>
                  <td className="text-center py-1 text-gray-500">{t.gf}</td>
                  <td className="text-center py-1 text-gray-500">{t.ga}</td>
                  <td className={`text-center py-1 font-semibold ${t.gd > 0 ? 'text-green-600' : t.gd < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {t.gd > 0 ? '+' : ''}{t.gd}
                  </td>
                  <td className={`text-center py-1 font-black ${q ? 'text-green-700' : 'text-gray-400'}`}>{t.pts}</td>
                </tr>
              )
            })}
            {allThirds.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-4 text-gray-400 text-xs">
                  Predice partidos para ver la clasificación
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex gap-3 text-[10px] text-gray-400 mb-3">
        <span><span className="inline-block w-3 h-3 rounded-sm bg-green-100 align-middle mr-0.5"></span> Clasifican a 1/16</span>
      </div>

      {/* Tiebreaking rules explanation */}
      <div className="border-t pt-3 text-[11px] text-gray-400 space-y-1">
        <p className="font-semibold text-gray-500 text-xs mb-1">📋 Criterios de desempate (en orden)</p>
        <p><span className="font-medium text-gray-600">1. Puntos</span> — más puntos obtenidos en la fase de grupos</p>
        <p><span className="font-medium text-gray-600">2. Diferencia de goles</span> — mayor diferencia entre goles a favor y en contra</p>
        <p><span className="font-medium text-gray-600">3. Goles a favor</span> — mayor número de goles marcados</p>
        <p><span className="font-medium text-gray-600">4. Fair Play</span> — menor número de tarjetas recibidas (−1 pt por amarilla, −3 pts por roja directa)</p>
        <p><span className="font-medium text-gray-600">5. Ranking FIFA</span> — se aplica el ranking FIFA oficial más reciente de selecciones masculinas</p>
        <p><span className="font-medium text-gray-600">6. Sorteo</span> — si persiste el empate, se resuelve mediante sorteo por la FIFA</p>
      </div>
    </div>
  )
}

export default function GroupPredictions() {
  const [allMatches, setAllMatches] = useState([])
  const [myPreds, setMyPreds] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeGroup, setActiveGroup] = useState('A')

  useEffect(() => {
    Promise.all([matchApi.all(), predApi.my()])
      .then(([m, p]) => {
        setAllMatches(m.data)
        const map = {}
        p.data.match.forEach(pr => { map[pr.match_id] = pr })
        setMyPreds(map)
      })
      .finally(() => setLoading(false))
  }, [])

  const groups = useMemo(() => {
    return [...new Set(allMatches.filter(m => m.phase === 'groups').map(m => m.group_name))].sort()
  }, [allMatches])

  const groupMatches = useMemo(() => {
    return allMatches.filter(m => m.phase === 'groups' && m.group_name === activeGroup)
  }, [allMatches, activeGroup])

  // Predicted standings from user's score predictions
  const predictedStandings = useMemo(() => {
    const predsWithScores = groupMatches.map(m => ({
      home_team: m.home_team,
      away_team: m.away_team,
      home_score: myPreds[m.id]?.home_score ?? null,
      away_score: myPreds[m.id]?.away_score ?? null,
    }))
    return computeStandings(predsWithScores)
  }, [groupMatches, myPreds])

  // Actual standings from real results
  const actualStandings = useMemo(() => {
    const withResults = groupMatches.filter(m => m.home_score !== null)
    if (withResults.length === 0) return null
    return computeStandings(withResults)
  }, [groupMatches])

    // Compute 3rd-place teams across all groups (sorted, from user's predictions)
  const thirdsData = useMemo(() => {
    const thirds = []
    for (const g of GROUPS) {
      const gMatches = allMatches.filter(m => m.phase === 'groups' && m.group_name === g)
      if (gMatches.length === 0) continue
      const predsWithScores = gMatches.map(m => ({
        home_team: m.home_team, away_team: m.away_team,
        home_score: myPreds[m.id]?.home_score ?? null,
        away_score: myPreds[m.id]?.away_score ?? null,
      }))
      const s = computeStandings(predsWithScores)
      // Always include third-place team even with 0 pts (remove played>0 guard)
      if (s && s.length > 2 && s[2]) thirds.push({ ...s[2], group: g })
    }
    thirds.sort((a, b) => {
      // 1. Points
      if (b.pts !== a.pts) return b.pts - a.pts
      // 2. Goal difference
      if (b.gd !== a.gd) return b.gd - a.gd
      // 3. Goals for
      if (b.gf !== a.gf) return b.gf - a.gf
      // 4. Fair Play — not tracked, treat as equal
      // 5. FIFA Ranking (lower number = better ranked)
      const rankA = FIFA_RANKING[a.name] ?? 99
      const rankB = FIFA_RANKING[b.name] ?? 99
      return rankA - rankB
    })
    return { list: thirds, set: new Set(thirds.slice(0, 8).map(t => t.name)) }
  }, [allMatches, myPreds])

  const qualifying3rds = thirdsData.set
  const allThirds = thirdsData.list

  // Progress: how many groups have all 6 matches predicted
  const progressByGroup = useMemo(() => {
    const prog = {}
    for (const g of GROUPS) {
      const gMatches = allMatches.filter(m => m.phase === 'groups' && m.group_name === g)
      const predicted = gMatches.filter(m => myPreds[m.id]?.home_score !== null).length
      prog[g] = { predicted, total: gMatches.length }
    }
    return prog
  }, [allMatches, myPreds])

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-xl font-black">Clasificación de grupos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Calculada automáticamente según tus predicciones de partidos
        </p>
      </div>

      {/* Group selector */}
      <div className="flex gap-1.5 flex-wrap">
        {groups.map(g => {
          const prog = progressByGroup[g]
          const complete = prog?.predicted === prog?.total && prog?.total > 0
          return (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`relative w-10 h-10 rounded-xl font-bold text-sm transition-colors ${
                activeGroup === g ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {g}
              {complete && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full text-[8px] flex items-center justify-center text-white">✓</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Standings card */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Grupo {activeGroup}</h2>
          <div className="flex gap-2 text-xs text-gray-400">
            <span>{progressByGroup[activeGroup]?.predicted}/{progressByGroup[activeGroup]?.total} partidos</span>
          </div>
        </div>

        {predictedStandings.length > 0 ? (
          <>
            <div className="mb-4">
              <p className="text-xs text-blue-600 font-semibold mb-2">TU PREDICCIÓN</p>
              <StandingsTable standings={predictedStandings} actual={null} qualifying3rds={qualifying3rds} />
            </div>

            {actualStandings && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-green-600 font-semibold mb-2">CLASIFICACIÓN REAL</p>
                <StandingsTable standings={actualStandings} actual={null} qualifying3rds={null} />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">⚽</p>
            <p className="text-sm">Empieza a predecir partidos del Grupo {activeGroup}</p>
            <p className="text-xs mt-1">La tabla se actualizará automáticamente</p>
          </div>
        )}
      </div>

      {/* 3rd-place rankings across all groups */}
      <ThirdPlaceRankingPanel allThirds={allThirds} />

      {/* Summary of all groups */}
      <div className="card">
        <h3 className="font-bold text-gray-700 mb-3">Progreso general</h3>
        <div className="grid grid-cols-6 gap-2">
          {GROUPS.map(g => {
            const prog = progressByGroup[g] || { predicted: 0, total: 6 }
            const pct = prog.total ? Math.round((prog.predicted / prog.total) * 100) : 0
            return (
              <button key={g} onClick={() => setActiveGroup(g)} className="text-center">
                <div className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center font-bold text-sm mb-1 ${
                  pct === 100 ? 'bg-green-100 text-green-700' :
                  pct > 0 ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {g}
                </div>
                <div className="text-xs text-gray-400">{prog.predicted}/{prog.total}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
