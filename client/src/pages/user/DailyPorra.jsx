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

function AttendanceBar({ matchId, currentUserId }) {
  const [attendees, setAttendees] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

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

  const attending = attendees.some(a => a.player_id === currentUserId)

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
              className={`text-xs px-2 py-0.5 rounded-full ${
                a.player_id === currentUserId
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {a.name}
            </span>
          ))}
        </div>
      )}
      {!loading && attendees.length === 0 && (
        <p className="text-xs text-gray-300">Nadie apuntado aún</p>
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
                          const correct = isPlayed && hasPred && (
                            (match.home_score > match.away_score ? '1' : match.home_score < match.away_score ? '2' : 'X') === pred.sign
                          )

                          return (
                            <tr key={pred.player_id} className={`border-b border-gray-50 ${
                              isPlayed && hasPred && pred.points > 0 ? 'bg-green-50' : ''
                            }`}>
                              <td className="py-1 font-medium text-gray-700">{pred.player_name}</td>
                              <td className="text-center py-1 font-bold">
                                {hasPred ? (
                                  <span className={`${correct ? 'text-green-600' : isPlayed ? 'text-red-400' : 'text-gray-700'}`}>
                                    {pred.home_score}–{pred.away_score}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="text-center py-1">
                                <div className="flex justify-center">
                                  <SignChip sign={pred.sign} correct={correct} />
                                </div>
                              </td>
                              {isPlayed && (
                                <td className="text-center py-1 font-bold">
                                  {hasPred ? (
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
