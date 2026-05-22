import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ranking, predictions as predApi } from '../../api'

export default function Dashboard() {
  const { user } = useAuth()
  const [rankData, setRankData] = useState({ ranking: [], prizes: null })
  const [myPreds, setMyPreds] = useState({ match: [], locked: false, scorer: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([ranking.get(), predApi.my()])
      .then(([r, p]) => {
        setRankData(r.data)
        setMyPreds(p.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const myRank = rankData.ranking?.find(r => r.id === user?.id)
  const predictedCount = myPreds.match.filter(p => p.home_score !== null).length
  const totalMatches = 72 // group stage
  const locked = myPreds.locked

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-5 pb-4">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-fifa-blue to-blue-700 rounded-2xl p-5 text-white">
        <p className="text-blue-200 text-sm">Bienvenido</p>
        <h1 className="text-2xl font-black">{user?.name} 👋</h1>
        <p className="text-blue-200 text-sm mt-1">Mundial USA · México · Canadá 2026</p>
        {locked && (
          <div className="mt-3 bg-white/20 rounded-xl px-3 py-2 flex items-center gap-2">
            <span>🔒</span>
            <span className="text-sm font-semibold">Porra enviada y bloqueada</span>
          </div>
        )}
      </div>

      {/* Stats */}
      {myRank && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center">
            <p className="text-3xl font-black text-fifa-gold">#{myRank.pos}</p>
            <p className="text-xs text-gray-500 mt-1">Posición</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-black text-fifa-blue">{myRank.total}</p>
            <p className="text-xs text-gray-500 mt-1">Puntos</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-black text-green-600">{predictedCount}</p>
            <p className="text-xs text-gray-500 mt-1">Apuestas</p>
          </div>
        </div>
      )}

      {/* Prize info */}
      {rankData.prizes && rankData.prizes.pool > 0 && (
        <div className="card bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🏆</span>
            <p className="font-bold text-amber-800">Bote total: {rankData.prizes.pool}€</p>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="flex-1 text-center bg-white rounded-lg py-2">
              <p className="font-black text-amber-600">🥇 {rankData.prizes.first}€</p>
              <p className="text-xs text-gray-500">1er lugar</p>
            </div>
            <div className="flex-1 text-center bg-white rounded-lg py-2">
              <p className="font-black text-gray-500">🥈 {rankData.prizes.second}€</p>
              <p className="text-xs text-gray-500">2º lugar</p>
            </div>
            <div className="flex-1 text-center bg-white rounded-lg py-2">
              <p className="font-black text-orange-600">🥉 {rankData.prizes.third}€</p>
              <p className="text-xs text-gray-500">3er lugar</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="space-y-2">
        <h2 className="font-bold text-gray-700">Acciones rápidas</h2>

        <Link to="/user/predictions" className="card flex items-center gap-4 hover:bg-blue-50 transition-colors">
          <span className="text-3xl">⚽</span>
          <div className="flex-1">
            <p className="font-bold">Mis apuestas</p>
            <p className="text-sm text-gray-500">{predictedCount}/{totalMatches} partidos apostados</p>
          </div>
          {locked
            ? <span className="text-blue-600 text-sm">🔒</span>
            : <span className="text-gray-400">→</span>
          }
        </Link>

        <Link to="/user/groups" className="card flex items-center gap-4 hover:bg-blue-50 transition-colors">
          <span className="text-3xl">📊</span>
          <div className="flex-1">
            <p className="font-bold">Tabla de grupos</p>
            <p className="text-sm text-gray-500">Calculada de tus predicciones</p>
          </div>
          <span className="text-gray-400">→</span>
        </Link>

        <Link to="/user/scorer" className="card flex items-center gap-4 hover:bg-blue-50 transition-colors">
          <span className="text-3xl">🥅</span>
          <div className="flex-1">
            <p className="font-bold">Máximo goleador</p>
            <p className="text-sm text-gray-500">
              {myPreds.scorer ? `✓ ${myPreds.scorer.scorer_name}` : 'Elige tu goleador'}
            </p>
          </div>
          {locked ? <span className="text-blue-600 text-sm">🔒</span> : <span className="text-gray-400">→</span>}
        </Link>

        <Link to="/user/daily" className="card flex items-center gap-4 hover:bg-blue-50 transition-colors">
          <span className="text-3xl">📅</span>
          <div className="flex-1">
            <p className="font-bold">Porra diaria</p>
            <p className="text-sm text-gray-500">Ver predicciones de todos por día</p>
          </div>
          <span className="text-gray-400">→</span>
        </Link>

        <Link to="/user/simulator" className="card flex items-center gap-4 hover:bg-blue-50 transition-colors">
          <span className="text-3xl">🔮</span>
          <div className="flex-1">
            <p className="font-bold">Simulador</p>
            <p className="text-sm text-gray-500">Simula resultados hipotéticos</p>
          </div>
          <span className="text-gray-400">→</span>
        </Link>
      </div>

      {/* Mini ranking */}
      {rankData.ranking?.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-gray-700 mb-3">Top 5</h2>
          <div className="space-y-2">
            {rankData.ranking.slice(0, 5).map(r => (
              <div key={r.id} className={`flex items-center gap-3 py-1 ${r.id === user?.id ? 'font-bold text-fifa-blue' : ''}`}>
                <span className="w-7 text-center text-sm font-bold text-gray-400">
                  {r.pos === 1 ? '🥇' : r.pos === 2 ? '🥈' : r.pos === 3 ? '🥉' : `#${r.pos}`}
                </span>
                <span className="flex-1 text-sm">{r.name}</span>
                {r.locked && <span className="text-xs text-blue-400">🔒</span>}
                <span className="font-bold text-sm">{r.total} pts</span>
              </div>
            ))}
          </div>
          <Link to="/user/ranking" className="text-xs text-fifa-blue font-semibold mt-3 block text-right">
            Ver ranking completo →
          </Link>
        </div>
      )}
    </div>
  )
}
