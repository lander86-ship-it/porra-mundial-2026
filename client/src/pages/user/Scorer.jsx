import { useState, useEffect } from 'react'
import { predictions as predApi } from '../../api'

export default function Scorer() {
  const [scorers, setScorers] = useState([])
  const [myPred, setMyPred] = useState(null)
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')

  const load = () => {
    Promise.all([predApi.scorers(), predApi.my()])
      .then(([s, p]) => {
        setScorers(s.data)
        setMyPred(p.data.scorer)
        setLocked(p.data.locked)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSelect = async (scorer) => {
    if (locked) return
    setSaving(scorer.id)
    try {
      await predApi.saveScorer(scorer.id)
      setMyPred({ scorer_id: scorer.id, scorer_name: scorer.name, scorer_team: scorer.team })
      setMsg(`✓ Goleador guardado: ${scorer.name}`)
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      setMsg('Error: ' + (e.response?.data?.error || 'desconocido'))
    }
    setSaving(null)
  }

  const filtered = scorers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.team.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-xl font-black">Máximo Goleador</h1>
        <p className="text-sm text-gray-500 mt-1">
          Elige el jugador que crees que será el máximo goleador del Mundial
        </p>
      </div>

      {/* Scoring info */}
      <div className="card bg-amber-50 border-amber-200">
        <p className="font-bold text-amber-800 text-sm mb-1">⚡ Puntuación</p>
        <p className="text-xs text-amber-700">
          Si aciertas al goleador: <strong>10 pts base + 1 pt por cada gol</strong> que marque en el torneo
        </p>
      </div>

      {/* Current selection */}
      {myPred && (
        <div className={`card border-2 ${locked ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🥅</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase">Tu elección</p>
              <p className="font-black text-lg">{myPred.scorer_name}</p>
              <p className="text-sm text-gray-500">{myPred.scorer_team}</p>
              {myPred.actual_goals > 0 && (
                <p className="text-sm font-semibold text-green-600 mt-1">
                  ⚽ {myPred.actual_goals} goles en el torneo
                </p>
              )}
            </div>
            {locked && <span className="text-blue-600 text-xl">🔒</span>}
          </div>
        </div>
      )}

      {msg && (
        <p className={`text-sm font-semibold text-center ${msg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
          {msg}
        </p>
      )}

      {locked && (
        <div className="card bg-blue-50 border-blue-200 text-center">
          <p className="text-blue-700 text-sm font-semibold">🔒 Tu porra está bloqueada</p>
        </div>
      )}

      {/* Search */}
      {!locked && (
        <input
          type="text"
          placeholder="Buscar jugador o selección..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input w-full"
        />
      )}

      {/* Scorers list */}
      <div className="space-y-2">
        {filtered.map(scorer => {
          const isSelected = myPred?.scorer_id === scorer.id
          const isSaving = saving === scorer.id

          return (
            <button
              key={scorer.id}
              onClick={() => handleSelect(scorer)}
              disabled={locked || isSaving}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'border-green-400 bg-green-50 ring-2 ring-green-200'
                  : locked
                  ? 'border-gray-100 bg-gray-50 opacity-60'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
              } disabled:cursor-default`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚽</span>
                <div className="flex-1">
                  <p className="font-bold text-sm">{scorer.name}</p>
                  <p className="text-xs text-gray-500">{scorer.team}</p>
                </div>
                {scorer.actual_goals > 0 && (
                  <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    {scorer.actual_goals} ⚽
                  </span>
                )}
                {isSelected && <span className="text-green-500 font-bold text-lg">✓</span>}
                {isSaving && <span className="text-gray-400 text-xs">...</span>}
              </div>
            </button>
          )
        })}

        {filtered.length === 0 && (
          <p className="text-center py-8 text-gray-400">No se encontraron jugadores</p>
        )}
      </div>
    </div>
  )
}
