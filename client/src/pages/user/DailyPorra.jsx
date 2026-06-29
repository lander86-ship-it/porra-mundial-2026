import { useState, useEffect, useCallback } from 'react'
import { daily, attendance as attendanceApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { getFlag } from '../../utils/flags'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`
}

function phaseLabel(phase) {
  return { groups: 'Grupos', r16: '1/16', r8: '1/8', r4: '1/4', r2: '1/2', final: 'Final' }[phase] || phase
}

function SignChip({ sign, correct }) {
  if (!sign) return <span className="text-gray-300 text-xs">-</span>
  const colors = {
    '1': correct ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700',
    'X': correct ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-700',
    '2': correct ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`inline-flex w-5 h-5 rounded text-xs font-bold items-center justify-center ${colors[sign] || 'bg-gray-100 text-gray-500'}`}>
      {sign}
    </span>
  )
}

function ForecastBar({ predictions }) {
  const withSign = predictions.filter(p => p.sign)
  if (!withSign.length) return null
  const total = withSign.length
  const counts = { '1': 0, 'X': 0, '2': 0 }
  withSign.forEach(p => { counts[p.sign]++ })
  const cfg = [
    { s: '1', bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-400' },
    { s: 'X', bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'bg-yellow-400' },
    { s: '2', bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-400' },
  ]
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-semibold mb-1">🗳️ Pronóstico koadrilla ({total} votos)</p>
      <div className="flex gap-1.5">
        {cfg.map(({ s, bg, text, bar }) => {
          const pct = Math.round((counts[s] / total) * 100)
          return (
            <div key={s} className={`flex-1 rounded-lg px-2 py-1.5 ${bg}`}>
              <div className="flex justify-between items-center">
                <span className={`font-black text-sm ${text}`}>{s}</span>
                <span className={`font-bold text-xs ${text}`}>{pct}%</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-white overflow-hidden">
                <div className={`h-full ${bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AttendanceBar({ matchId, currentUserId }) {
  const [attendees, setAttendees] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [beerLoading, setBeerLoading] = useState(false)

  const load = useCallback(() => {
    attendanceApi.get(matchId)
      .then(r => setAttendees(r.data))
      .finally(() => setLoading(false))
  }, [matchId])

  useEffect(() => { load() }, [load])

  const toggle = async () => {
    setToggling(true)
    try {
      await attendanceApi.toggle(matchId)
      load()
    } finally {
      setToggling(false)
    }
  }

  const addBeer = async () => {
    setBeerLoading(true)
    try {
      await attendanceApi.beer(matchId)
      load()
    } finally {
      setBeerLoading(false)
    }
  }

  const removeBeer = async () => {
    setBeerLoading(true)
    try {
      await attendanceApi.removeBeer(matchId)
      load()
    } finally {
      setBeerLoading(false)
    }
  }

  const attending = attendees.some(a => a.player_id === currentUserId)
  const myBeers = attendees.find(a => a.player_id === currentUserId)?.beers ?? 0
  const totalBeers = attendees.reduce((s, a) => s + (a.beers ?? 0), 0)

  return (
    <div className="border-t pt-2 mt-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-500">
          📍 ¿Quién va a verlo? {attendees.length > 0 && `(${attendees.length})`}
        </span>
        <button
          onClick={toggle}
          disabled={toggling}
          className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-colors ${
            attending
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 border border-gray-200'
          }`}
        >
          {toggling ? '...' : attending ? '✓ Voy' : '+ Apuntarme'}
        </button>
      </div>

      {!loading && attendees.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {attendees.map(a => (
            <span
              key={a.player_id}
              className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                a.player_id === currentUserId
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {a.name}
              {(a.beers ?? 0) > 0 && (
                <span className="text-amber-500">🍺{a.beers > 1 ? `×${a.beers}` : ''}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {!loading && attendees.length === 0 && (
        <p className="text-xs text-gray-300">Nadie apuntado aún</p>
      )}

      {attending && (
        <div className="mt-2 pt-2 border-t border-dashed border-amber-100 flex items-center gap-2">
          <span className="text-xs font-semibold text-amber-600">Cervezómetro</span>
          <button
            onClick={removeBeer}
            disabled={beerLoading || myBeers === 0}
            className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-bold text-lg leading-none flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
            title="Quitar una"
          >
            −
          </button>
          <span className="text-sm font-bold text-amber-600 min-w-[2rem] text-center">
            {myBeers}
          </span>
          <button
            onClick={addBeer}
            disabled={beerLoading}
            className="text-2xl leading-none active:scale-90 transition-transform select-none disabled:opacity-50"
            title="¡Una más!"
          >
            🍺
          </button>
          {totalBeers > 0 && attendees.filter(a => a.beers > 0).length > 1 && (
            <span className="ml-auto text-xs text-amber-400">Grupo: {totalBeers}🍺</span>
          )}
        </div>
      )}
    </div>
  )
}

export default function DailyPorra() {
  const { user } = useAuth()
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [dayData, setDayData] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingDay, setLoadingDay] = useState(false)

  useEffect(() => {
    daily.dates()
      .then(r => {
        const d = r.data
        setDates(d)
        const today = new Date().toISOString().split('T')[0]
        const todayInList = d.find(x => x >= today)
        setSelectedDate(todayInList || d[0] || '')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedDate) return
    setLoadingDay(true)
    daily.byDate(selectedDate)
      .then(r => setDayData(r.data))
      .finally(() => setLoadingDay(false))
  }, [selectedDate])

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="text-xl font-black">Porra Diaria</h1>
        <p className="text-sm text-gray-500 mt-1">Predicciones de todos los jugadores por día</p>
      </div>

      {/* Date selector */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dates.map(d => {
            const parts = d.split('-')
            const day = parseInt(parts[2])
            const months = ['E','F','M','A','M','J','J','A','S','O','N','D']
            const mon = months[parseInt(parts[1]) - 1]
            return (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={`flex-shrink-0 flex flex-col items-center w-14 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                  selectedDate === d
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                <span className="text-base font-black">{day}</span>
                <span className="uppercase">{mon}</span>
              </button>
            )
          })}
        </div>
        {selectedDate && (
          <p className="text-sm font-semibold text-gray-700">{formatDate(selectedDate)}</p>
        )}
      </div>

      {loadingDay ? (
        <div className="text-center py-8 text-gray-400">Cargando partidos...</div>
      ) : dayData.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm">No hay partidos en esta fecha</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dayData.map(match => {
            const isPlayed = match.home_score !== null

            return (
              <div key={match.id} className="card space-y-3">
                {/* Match header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">{match.code}</span>
                    <span className="badge bg-gray-100 text-gray-500 text-xs">{phaseLabel(match.phase)}</span>
                    {match.match_time && (
                      <span className="text-xs text-gray-400">⏰ {match.match_time}</span>
                    )}
                  </div>
                  {isPlayed && (
                    <span className="badge bg-green-100 text-green-700 text-xs font-black">
                      {match.home_score}–{match.away_score}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between px-2">
                  <span className="font-bold text-sm text-right flex-1">{getFlag(match.home_team)} {match.home_team}</span>
                  <span className="text-gray-400 mx-2 font-bold">vs</span>
                  <span className="font-bold text-sm flex-1">{getFlag(match.away_team)} {match.away_team}</span>
                </div>

                {/* Forecast bar — hidden for knockout when preds not yet revealed */}
                {match.preds_hidden ? (
                  <div className="text-center py-2 text-xs text-gray-400 bg-gray-50 rounded-lg">
                    🔒 Las predicciones se revelarán cuando el admin lo indique
                  </div>
                ) : (
                  <ForecastBar predictions={match.predictions} />
                )}

                {/* Predictions table */}
                {match.predictions.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b">
                          <th className="text-left py-1 font-medium">Jugador</th>
                          <th className="text-center py-1 font-medium">Pred.</th>
                          <th className="text-center py-1 font-medium">1X2</th>
                          {isPlayed && <th className="text-center py-1 font-medium">Pts</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {match.predictions.map(pred => {
                          const hasPred = pred.home_score !== null
                          const isOwn = pred.player_id === user?.id
                          const isBracket = pred.teams_match !== null && pred.teams_match !== undefined
                          const matchTeamsDetermined = !!(match.home_team && match.away_team &&
                            !match.home_team.startsWith('Por definir') && !match.away_team.startsWith('Por definir'))
                          const wrongTeams = isBracket && matchTeamsDetermined && pred.teams_match === false &&
                            !!(pred.pred_home_team && pred.pred_away_team)
                          const correct = isPlayed && hasPred && !pred.hidden && !wrongTeams && (
                            (match.home_score > match.away_score ? '1' : match.home_score < match.away_score ? '2' : 'X') === pred.sign
                          )

                          return (
                            <tr key={pred.player_id} className={`border-b border-gray-50 ${
                              isPlayed && hasPred && !pred.hidden && pred.points > 0 ? 'bg-green-50' : ''
                            } ${isOwn ? 'font-semibold' : ''} ${wrongTeams ? 'opacity-60' : ''}`}>
                              <td className="py-1.5 font-medium text-gray-700">
                                <div>
                                  {pred.player_name}
                                  {isOwn && <span className="ml-1 text-[9px] text-blue-400">(tú)</span>}
                                </div>
                                {isBracket && !pred.hidden && pred.pred_home_team && pred.pred_away_team &&
                                  !pred.pred_home_team.startsWith('Por definir') && !pred.pred_away_team.startsWith('Por definir') && (
                                  <div className={`text-[10px] mt-0.5 ${wrongTeams ? 'text-red-400 line-through' : 'text-gray-400'}`}>
                                    {getFlag(pred.pred_home_team)}{pred.pred_home_team} vs {getFlag(pred.pred_away_team)}{pred.pred_away_team}
                                  </div>
                                )}
                              </td>
                              <td className="text-center py-1 font-bold">
                                {pred.hidden ? (
                                  <span className="text-gray-300">🔒</span>
                                ) : hasPred ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className={`${wrongTeams ? 'text-red-400 line-through' : correct ? 'text-green-600' : isPlayed ? 'text-red-400' : 'text-gray-700'}`}>
                                      {pred.home_score}–{pred.away_score}
                                    </span>
                                    {pred.sign === 'X' && pred.pred_penalty_winner && (
                                      <span className={`text-[9px] font-normal leading-tight ${wrongTeams ? 'text-red-300 line-through' : 'text-amber-600'}`}>
                                        P:{getFlag(pred.pred_penalty_winner)}{pred.pred_penalty_winner}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="text-center py-1">
                                <div className="flex justify-center">
                                  {pred.hidden ? (
                                    <span className="text-gray-300 text-xs">—</span>
                                  ) : wrongTeams ? (
                                    <span className="text-red-300 line-through text-xs font-bold">{pred.sign}</span>
                                  ) : (
                                    <SignChip sign={pred.sign} correct={correct} />
                                  )}
                                </div>
                              </td>
                              {isPlayed && (
                                <td className="text-center py-1 font-bold">
                                  {hasPred && !pred.hidden ? (
                                    <span className={pred.points > 0 ? 'text-green-600' : 'text-gray-400'}>
                                      {pred.points || 0}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Attendance section */}
                <AttendanceBar matchId={match.id} currentUserId={user?.id} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
