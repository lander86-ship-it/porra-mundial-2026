const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAuth(req, res, next) {
  if (!req.session.playerId) return res.status(401).json({ error: 'No autenticado' });
  next();
}

// Get my predictions + lock status
router.get('/my', requireAuth, (req, res) => {
  const preds = db.prepare('SELECT * FROM predictions WHERE player_id = ?').all(req.session.playerId);
  const player = db.prepare('SELECT predictions_locked FROM players WHERE id=?').get(req.session.playerId);
  const scorerPred = db.prepare(`
    SELECT sp.*, ts.name as scorer_name, ts.team as scorer_team, ts.actual_goals
    FROM scorer_predictions sp
    JOIN top_scorers ts ON sp.scorer_id = ts.id
    WHERE sp.player_id = ?
  `).get(req.session.playerId);
  res.json({
    match: preds,
    locked: player?.predictions_locked === 1,
    scorer: scorerPred || null,
  });
});

// Save match prediction (blocked if locked or match has result)
router.post('/match', requireAuth, (req, res) => {
  const { matchId, homeScore, awayScore, predPenaltyWinner } = req.body;
  if (!matchId) return res.status(400).json({ error: 'matchId requerido' });

  // Check if predictions are locked
  const player = db.prepare('SELECT predictions_locked FROM players WHERE id=?').get(req.session.playerId);
  if (player?.predictions_locked) return res.status(403).json({ error: 'Tus predicciones están bloqueadas' });

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

  // Block group stage predictions if the group is closed
  if (match.phase === 'groups') {
    const closing = db.prepare("SELECT closed FROM group_closings WHERE group_name=?").get(match.group_name);
    if (closing?.closed) return res.status(403).json({ error: 'Las porras de este grupo están cerradas' });
  }

  // For phase 2+ matches, check if phase2 is unlocked
  if (match.phase !== 'groups') {
    const phase2 = db.prepare("SELECT value FROM settings WHERE key='phase2_unlocked'").get();
    if (!phase2 || phase2.value !== '1') {
      return res.status(403).json({ error: 'La fase 2 no está disponible aún' });
    }
  }

  if (match.home_score !== null) return res.status(400).json({ error: 'El partido ya tiene resultado' });

  const hs = homeScore !== undefined && homeScore !== '' ? parseInt(homeScore) : null;
  const as_ = awayScore !== undefined && awayScore !== '' ? parseInt(awayScore) : null;

  // Auto-compute sign from scores
  let sign = null;
  if (hs !== null && as_ !== null) {
    sign = hs > as_ ? '1' : hs < as_ ? '2' : 'X';
  }

  // Only store penalty winner for knockout draws
  const penWinner = (match.phase !== 'groups' && hs !== null && as_ !== null && hs === as_)
    ? (predPenaltyWinner || null)
    : null;

  db.prepare(`
    INSERT INTO predictions (player_id, match_id, sign, home_score, away_score, pred_penalty_winner, points)
    VALUES (?,?,?,?,?,?,0)
    ON CONFLICT(player_id, match_id) DO UPDATE SET
      sign=excluded.sign, home_score=excluded.home_score, away_score=excluded.away_score,
      pred_penalty_winner=excluded.pred_penalty_winner
  `).run(req.session.playerId, matchId, sign, hs, as_, penWinner);

  res.json({ ok: true, sign });
});

// Submit and lock predictions permanently
router.post('/submit', requireAuth, (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id=?').get(req.session.playerId);
  if (!player) return res.status(404).json({ error: 'Jugador no encontrado' });
  if (player.predictions_locked) return res.status(400).json({ error: 'Ya enviaste tu porra' });

  // Check has at least some predictions
  const predCount = db.prepare('SELECT count(*) as c FROM predictions WHERE player_id=? AND home_score IS NOT NULL').get(req.session.playerId).c;
  if (predCount === 0) return res.status(400).json({ error: 'No tienes predicciones guardadas' });

  db.prepare('UPDATE players SET predictions_locked=1 WHERE id=?').run(req.session.playerId);
  res.json({ ok: true });
});

// Save top scorer prediction (blocked if locked)
router.post('/scorer', requireAuth, (req, res) => {
  const { scorerId } = req.body;
  if (!scorerId) return res.status(400).json({ error: 'scorerId requerido' });

  const player = db.prepare('SELECT predictions_locked FROM players WHERE id=?').get(req.session.playerId);
  if (player?.predictions_locked) return res.status(403).json({ error: 'Tus predicciones están bloqueadas' });

  const scorer = db.prepare('SELECT * FROM top_scorers WHERE id=?').get(scorerId);
  if (!scorer) return res.status(404).json({ error: 'Jugador no encontrado' });

  db.prepare(`
    INSERT INTO scorer_predictions (player_id, scorer_id)
    VALUES (?,?)
    ON CONFLICT(player_id) DO UPDATE SET scorer_id=excluded.scorer_id
  `).run(req.session.playerId, scorerId);

  res.json({ ok: true });
});

// Get top scorers list
router.get('/scorers', requireAuth, (req, res) => {
  const scorers = db.prepare('SELECT * FROM top_scorers ORDER BY name').all();
  res.json(scorers);
});

module.exports = router;
