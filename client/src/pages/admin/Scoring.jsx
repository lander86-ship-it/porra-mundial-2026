import { useState, useEffect } from 'react'
import { admin } from '../../api'

const PHASES = [
  { key: 'groups', label: 'Fase de Grupos' },
  { key: 'r16', label: '1/16 de Final' },
  { key: 'r8', label: 'Octavos de Final' },
  { key: 'r4', label: 'Cuartos de Final' },
  { key: 'r2', label: 'Semifinales' },
  { key: 'final', label: 'Final' },
]

const MATCH_FIELDS = [
  { key: 'sign_pts', label: 'Signo 1X2', desc: 'Puntos por acertar local/empate/visitante' },
  { key: 'goal_diff_pts', label: '+ Dif. de goles', desc: 'Pts extra si además la diferencia de goles es correcta (requiere 1X2 correcto)' },
  { key: 'exact_pts', label: '+ Resultado exacto', desc: 'Pts extra si el marcador exacto es correcto (requiere 1X2 correcto)' },
  { key: 'qualify_pts', label: 'Equipo clasificado', desc: 'Pts por acertar un equipo que avanza a esta fase (knockout)' },
]

const GROUP_FIELDS = [
  { key: 'pos1_pts', label: '1er lugar del grupo', desc: 'Aciertas el equipo que queda primero' },
  { key: 'pos2_pts', label: '2º lugar del grupo', desc: 'Aciertas el equipo que queda segundo' },
  { key: 'pos3_pts', label: '3er lugar del grupo', desc: 'Aciertas el equipo que queda tercero' },
  { key: 'pos4_pts', label: '4º lugar del grupo', desc: 'Aciertas el equipo que queda cuarto' },
]

const SPECIAL_FIELDS = [
  { key: 'champion_pts', label: 'Campeón del Mundial', desc: 'Aciertas el ganador de la final' },
  { key: 'runner_up_pts', label: 'Subcampeón', desc: 'Aciertas el equipo que pierde la final' },
  { key: 'third_pts', label: '3er puesto', desc: 'Aciertas el ganador del partido por el 3er puesto' },
  { key: 'fourth_pts', label: '4º puesto', desc: 'Aciertas el perdedor del partido por el 3er puesto' },
  { key: 'scorer_pts_base', label: 'Goleador: pts base', desc: 'Puntos por acertar el máximo goleador' },
  { key: 'scorer_pts_per_goal', label: 'Goleador: pts por gol', desc: 'Puntos adicionales por cada gol que marque el goleador acertado' },
]

function NumInput({ value, onChange }) {
  return (
    <input
      type="number" min="0" max="50"
      value={value ?? 0}
      onChange={e => onChange(parseInt(e.target.value) || 0)}
      className="w-16 text-center border rounded-lg p-1.5 text-sm font-bold"
    />
  )
}

export default function Scoring() {
  const [scoring, setScoring] = useState({})
  const [special, setSpecial] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    admin.scoring().then(r => {
      const map = {}
      r.data.phases.forEach(s => { map[s.phase] = { ...s } })
      setScoring(map)
      setSpecial(r.data.special || {})
    }).finally(() => setLoading(false))
  }, [])

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 2500) }

  const savePhase = async (phase) => {
    setSaving(phase)
    try {
      await admin.updateScoring(phase, scoring[phase])
      flash(`✓ ${PHASES.find(p => p.key === phase)?.label} guardado`)
    } catch {}
    setSaving(null)
  }

  const saveSpecial = async () => {
    setSaving('special')
    try {
      await admin.updateSpecialScoring(special)
      flash('✓ Puntuación especial guardada')
    } catch {}
    setSaving(null)
  }

  const updatePhase = (phase, field, val) => {
    setScoring(prev => ({ ...prev, [phase]: { ...prev[phase], [field]: val } }))
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black">Sistema de puntuación</h1>
        {msg && <span className="text-green-600 text-sm font-semibold">{msg}</span>}
      </div>

      <div className="card bg-blue-50 border-blue-200 text-sm text-blue-700">
        <p><strong>Los puntos se acumulan:</strong> resultado exacto = signo + dif. goles + exacto.</p>
        <p className="mt-1">Las posiciones de grupo se calculan automáticamente a partir de las predicciones de partidos.</p>
      </div>

      {/* Phase scoring */}
      {PHASES.map(({ key, label }) => {
        const s = scoring[key]
        if (!s) return null
        return (
          <div key={key} className="card space-y-3">
            <h2 className="font-bold text-gray-800">{label}</h2>

            {MATCH_FIELDS.map(({ key: fk, label: fl, desc }) => {
              if (fk === 'qualify_pts' && key === 'groups') return null
              return (
                <div key={fk} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{fl}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <NumInput value={s[fk]} onChange={v => updatePhase(key, fk, v)} />
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
                      <p className="text-sm font-semibold">{fl}</p>
                      {desc && <p className="text-xs text-gray-400">{desc}</p>}
                    </div>
                    <NumInput value={s[fk]} onChange={v => updatePhase(key, fk, v)} />
                    <span className="text-xs text-gray-400 w-6">pts</span>
                  </div>
                ))}
              </>
            )}

            <button
              onClick={() => savePhase(key)}
              disabled={saving === key}
              className="btn-primary text-sm w-full"
            >
              {saving === key ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )
      })}

      {/* Special scoring */}
      <div className="card space-y-3 border-2 border-amber-200">
        <div className="flex items-center gap-2">
          <span className="text-xl">⭐</span>
          <h2 className="font-bold text-gray-800">Puntuación especial</h2>
        </div>
        <p className="text-xs text-gray-500">
          Puntos extra por predicciones especiales: campeón, goleador, etc.
        </p>

        {SPECIAL_FIELDS.map(({ key: fk, label: fl, desc }) => (
          <div key={fk} className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold">{fl}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
            <NumInput
              value={special[fk]}
              onChange={v => setSpecial(prev => ({ ...prev, [fk]: v }))}
            />
            <span className="text-xs text-gray-400 w-6">pts</span>
          </div>
        ))}

        <button
          onClick={saveSpecial}
          disabled={saving === 'special'}
          className="btn-primary text-sm w-full bg-amber-500 hover:bg-amber-600"
        >
          {saving === 'special' ? 'Guardando...' : 'Guardar puntuación especial'}
        </button>
      </div>
    </div>
  )
}
