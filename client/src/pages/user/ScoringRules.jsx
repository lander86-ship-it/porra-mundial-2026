import { useState, useEffect } from 'react'
import { scoring as scoringApi } from '../../api'

const PHASES = [
  { key: 'groups', label: 'Fase de Grupos' },
  { key: 'r16',    label: '1/16 de Final' },
  { key: 'r8',     label: 'Octavos de Final' },
  { key: 'r4',     label: 'Cuartos de Final' },
  { key: 'r2',     label: 'Semifinales' },
  { key: 'final',  label: 'Final' },
]

const MATCH_FIELDS = [
  { key: 'sign_pts',      label: 'Signo 1X2',          desc: 'Puntos por acertar victoria local / empate / victoria visitante' },
  { key: 'goal_diff_pts', label: '+ Diferencia de goles', desc: 'Pts extra si además la diferencia de goles es correcta (requiere signo correcto)' },
  { key: 'exact_pts',     label: '+ Resultado exacto', desc: 'Pts extra si el marcador exacto es correcto (requiere signo correcto)' },
  { key: 'qualify_pts',   label: 'Equipo clasificado',  desc: 'Pts por acertar el equipo que avanza a esta fase (solo eliminatorias)' },
]

const GROUP_FIELDS = [
  { key: 'pos1_pts', label: '1er lugar del grupo', desc: 'Aciertas el equipo que queda primero en su grupo' },
  { key: 'pos2_pts', label: '2º lugar del grupo',  desc: 'Aciertas el equipo que queda segundo en su grupo' },
  { key: 'pos3_pts', label: '3er lugar del grupo', desc: 'Aciertas el equipo que queda tercero en su grupo' },
  { key: 'pos4_pts', label: '4º lugar del grupo',  desc: 'Aciertas el equipo que queda cuarto (último) en su grupo' },
]

const SPECIAL_FIELDS = [
  { key: 'champion_pts',       label: 'Campeón del Mundial',   desc: 'Aciertas el equipo que gana la final' },
  { key: 'runner_up_pts',      label: 'Subcampeón',            desc: 'Aciertas el equipo que pierde la final' },
  { key: 'third_pts',          label: '3er puesto',            desc: 'Aciertas el ganador del partido por el 3er puesto' },
  { key: 'fourth_pts',         label: '4º puesto',             desc: 'Aciertas el equipo que pierde el partido por el 3er puesto' },
  { key: 'scorer_pts_base',    label: 'Goleador: bonus de líder', desc: 'Bonus extra solo si tu elegido termina siendo el máximo goleador del torneo' },
  { key: 'scorer_pts_per_goal',label: 'Goleador: pts por gol',   desc: 'Pts por cada gol que marque tu elegido aunque no sea el líder goleador — todos los que eligen a alguien que marca, puntúan' },
]

function PtsBadge({ value }) {
  return (
    <span className={`inline-flex items-center justify-center min-w-[36px] h-7 rounded-lg px-2 font-black text-sm
      ${value > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
      {value}
    </span>
  )
}

export default function ScoringRules() {
  const [scoring, setScoring] = useState({})
  const [special, setSpecial] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    scoringApi.public().then(r => {
      const map = {}
      r.data.phases.forEach(s => { map[s.phase] = { ...s } })
      setScoring(map)
      setSpecial(r.data.special || {})
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-xl font-black">⭐ Sistema de puntuación</h1>
        <p className="text-sm text-gray-500 mt-1">Así se calculan los puntos de la porra</p>
      </div>

      <div className="card bg-blue-50 border-blue-200 text-sm text-blue-700 space-y-1">
        <p><strong>Los puntos se acumulan:</strong> acertar el signo da los puntos base. Si además aciertas la diferencia de goles, sumas más. Si aciertas el marcador exacto, sumas el máximo.</p>
        <p className="text-xs text-blue-500 mt-1">Ejemplo: si el signo vale 1 pt, la dif. de goles +1 pt y el resultado exacto +2 pts, un marcador exacto da <strong>1+1+2 = 4 pts</strong>.</p>
      </div>

      {/* Phase scoring */}
      {PHASES.map(({ key, label }) => {
        const s = scoring[key]
        if (!s) return null
        return (
          <div key={key} className="card space-y-2">
            <h2 className="font-bold text-gray-800 text-base">{label}</h2>

            {MATCH_FIELDS.map(({ key: fk, label: fl, desc }) => {
              if (fk === 'qualify_pts' && key === 'groups') return null
              const val = s[fk] ?? 0
              return (
                <div key={fk} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-700">{fl}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <PtsBadge value={val} />
                  <span className="text-xs text-gray-400 w-6">pts</span>
                </div>
              )
            })}

            {key === 'groups' && (
              <>
                <p className="text-xs font-semibold text-gray-500 pt-1 border-t">Posición en el grupo</p>
                {GROUP_FIELDS.map(({ key: fk, label: fl, desc }) => (
                  <div key={fk} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-700">{fl}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    <PtsBadge value={s[fk] ?? 0} />
                    <span className="text-xs text-gray-400 w-6">pts</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )
      })}

      {/* Special scoring */}
      <div className="card space-y-2 border-2 border-amber-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">⭐</span>
          <h2 className="font-bold text-gray-800">Predicciones especiales</h2>
        </div>
        <p className="text-xs text-gray-500">
          Puntos extra por predicciones adicionales al inicio de la porra: campeón, goleador, etc.
        </p>

        {SPECIAL_FIELDS.map(({ key: fk, label: fl, desc }) => (
          <div key={fk} className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-700">{fl}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
            <PtsBadge value={special[fk] ?? 0} />
            <span className="text-xs text-gray-400 w-6">pts</span>
          </div>
        ))}
      </div>

      <div className="card bg-gray-50 text-xs text-gray-400 text-center">
        <p>Solo el administrador puede modificar la puntuación.</p>
        <p className="mt-0.5">Esta es la configuración actual de la porra.</p>
      </div>
    </div>
  )
}
