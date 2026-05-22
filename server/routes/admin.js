const express = require('express');
const router = express.Router();
const db = require('../db');
const { recalcAllPoints } = require('../scoring');

function requireAdmin(req, res, next) {
  if (!req.session.playerId || !req.session.isAdmin) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

// ── MATCH RESULTS ──────────────────────────────────────────────

// Enter/update match result
router.put('/result/:id', requireAdmin, (req, res) => {
  const { homeScore, awayScore, homeTeam, awayTeam } = req.body;
  const matchId = parseInt(req.params.id);

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

  const hs = homeScore !== '' && homeScore !== undefined ? parseInt(homeScore) : null;
  const as_ = awayScore !== '' && awayScore !== undefined ? parseInt(awayScore) : null;

  const updates = { home_score: hs, away_score: as_ };
  if (homeTeam !== undefined && homeTeam !== '') updates.home_team = homeTeam;
  if (awayTeam !== undefined && awayTeam !== '') updates.away_team = awayTeam;

  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE matches SET ${sets} WHERE id = ?`).run(...Object.values(updates), matchId);

  if (hs !== null && as_ !== null) recalcAllPoints();

  res.json({ ok: true });
});

// Clear match result
router.delete('/result/:id', requireAdmin, (req, res) => {
  db.prepare('UPDATE matches SET home_score = NULL, away_score = NULL WHERE id = ?').run(req.params.id);
  recalcAllPoints();
  res.json({ ok: true });
});

// ── PHASE 2 ────────────────────────────────────────────────────

// Unlock Phase 2 (1/16 and beyond)
router.post('/phase2/unlock', requireAdmin, (req, res) => {
  db.prepare("UPDATE settings SET value='1' WHERE key='phase2_unlocked'").run();
  res.json({ ok: true });
});

// Lock Phase 2
router.post('/phase2/lock', requireAdmin, (req, res) => {
  db.prepare("UPDATE settings SET value='0' WHERE key='phase2_unlocked'").run();
  res.json({ ok: true });
});

// Get phase2 status
router.get('/phase2', requireAdmin, (req, res) => {
  const setting = db.prepare("SELECT value FROM settings WHERE key='phase2_unlocked'").get();
  res.json({ unlocked: setting?.value === '1' });
});

// ── PLAYERS ────────────────────────────────────────────────────

// List players
router.get('/players', requireAdmin, (req, res) => {
  const players = db.prepare(`
    SELECT id, name, is_admin, predictions_locked, paid, manual_points, created_at
    FROM players WHERE is_admin = 0 ORDER BY name
  `).all();
  res.json(players);
});

// Delete player
router.delete('/players/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM players WHERE id = ? AND is_admin = 0').run(req.params.id);
  res.json({ ok: true });
});

// Reset player PIN
router.put('/players/:id/pin', requireAdmin, (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length < 4) return res.status(400).json({ error: 'PIN inválido' });
  db.prepare('UPDATE players SET pin = ? WHERE id = ? AND is_admin = 0').run(pin, req.params.id);
  res.json({ ok: true });
});

// Toggle paid status
router.put('/players/:id/paid', requireAdmin, (req, res) => {
  const { paid } = req.body;
  db.prepare('UPDATE players SET paid = ? WHERE id = ? AND is_admin = 0').run(paid ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

// Set manual points adjustment
router.put('/players/:id/manual_points', requireAdmin, (req, res) => {
  const { manual_points } = req.body;
  const pts = parseInt(manual_points) || 0;
  db.prepare('UPDATE players SET manual_points = ? WHERE id = ? AND is_admin = 0').run(pts, req.params.id);
  res.json({ ok: true });
});

// Unlock predictions for a player (admin override)
router.put('/players/:id/unlock', requireAdmin, (req, res) => {
  db.prepare('UPDATE players SET predictions_locked = 0 WHERE id = ? AND is_admin = 0').run(req.params.id);
  res.json({ ok: true });
});

// ── SCORING CONFIG ─────────────────────────────────────────────

// Get scoring config
router.get('/scoring', requireAdmin, (req, res) => {
  const scoring = db.prepare('SELECT * FROM scoring ORDER BY phase').all();
  const special = db.prepare('SELECT * FROM scoring_special WHERE id=1').get();
  res.json({ phases: scoring, special });
});

// Update phase scoring
router.put('/scoring/:phase', requireAdmin, (req, res) => {
  const { sign_pts, goal_diff_pts, exact_pts, qualify_pts, pos1_pts, pos2_pts, pos3_pts, pos4_pts } = req.body;
  db.prepare(`
    UPDATE scoring SET sign_pts=?, goal_diff_pts=?, exact_pts=?, qualify_pts=?,
    pos1_pts=?, pos2_pts=?, pos3_pts=?, pos4_pts=? WHERE phase=?
  `).run(sign_pts, goal_diff_pts, exact_pts, qualify_pts, pos1_pts, pos2_pts, pos3_pts, pos4_pts, req.params.phase);
  recalcAllPoints();
  res.json({ ok: true });
});

// Update special scoring
router.put('/scoring/special/update', requireAdmin, (req, res) => {
  const { champion_pts, runner_up_pts, third_pts, fourth_pts, scorer_pts_base, scorer_pts_per_goal } = req.body;
  db.prepare(`
    UPDATE scoring_special SET
      champion_pts=?, runner_up_pts=?, third_pts=?, fourth_pts=?,
      scorer_pts_base=?, scorer_pts_per_goal=?
    WHERE id=1
  `).run(champion_pts, runner_up_pts, third_pts, fourth_pts, scorer_pts_base, scorer_pts_per_goal);
  res.json({ ok: true });
});

// ── TOP SCORER MANAGEMENT ──────────────────────────────────────

// Get all top scorers with goal counts
router.get('/scorers', requireAdmin, (req, res) => {
  const scorers = db.prepare('SELECT * FROM top_scorers ORDER BY actual_goals DESC, name').all();
  res.json(scorers);
});

// Update goals for a scorer
router.put('/scorers/:id/goals', requireAdmin, (req, res) => {
  const { goals } = req.body;
  const g = parseInt(goals) || 0;
  db.prepare('UPDATE top_scorers SET actual_goals=? WHERE id=?').run(g, req.params.id);
  res.json({ ok: true });
});

// ── PREDICTIONS VIEW/EDIT ──────────────────────────────────────

// Get all predictions for a match (admin view)
router.get('/predictions/:matchId', requireAdmin, (req, res) => {
  const preds = db.prepare(`
    SELECT p.*, pl.name as player_name
    FROM predictions p
    JOIN players pl ON p.player_id = pl.id
    WHERE p.match_id = ?
    ORDER BY pl.name
  `).all(req.params.matchId);
  res.json(preds);
});

// Get all predictions for a specific player
router.get('/player/:playerId/predictions', requireAdmin, (req, res) => {
  const preds = db.prepare(`
    SELECT p.*, m.code, m.phase, m.group_name, m.home_team, m.away_team,
           m.home_score as result_home, m.away_score as result_away,
           m.match_date, m.match_time
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
    WHERE p.player_id = ?
    ORDER BY m.match_order
  `).all(req.params.playerId);
  const scorer = db.prepare(`
    SELECT sp.*, ts.name as scorer_name, ts.team as scorer_team
    FROM scorer_predictions sp
    JOIN top_scorers ts ON sp.scorer_id = ts.id
    WHERE sp.player_id = ?
  `).get(req.params.playerId);
  const player = db.prepare('SELECT id, name, predictions_locked, paid, manual_points FROM players WHERE id=?').get(req.params.playerId);
  res.json({ player, predictions: preds, scorer: scorer || null });
});

// Edit a player's prediction (admin override)
router.put('/player/:playerId/predictions/:matchId', requireAdmin, (req, res) => {
  const { homeScore, awayScore } = req.body;
  const { playerId, matchId } = req.params;

  const hs = homeScore !== '' && homeScore !== undefined ? parseInt(homeScore) : null;
  const as_ = awayScore !== '' && awayScore !== undefined ? parseInt(awayScore) : null;
  const sign = (hs !== null && as_ !== null) ? (hs > as_ ? '1' : hs < as_ ? '2' : 'X') : null;

  db.prepare(`
    INSERT INTO predictions (player_id, match_id, sign, home_score, away_score, points)
    VALUES (?,?,?,?,?,0)
    ON CONFLICT(player_id, match_id) DO UPDATE SET
      sign=excluded.sign, home_score=excluded.home_score, away_score=excluded.away_score
  `).run(playerId, matchId, sign, hs, as_);

  recalcAllPoints();
  res.json({ ok: true });
});

// Change admin PIN
router.put('/pin', requireAdmin, (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length < 4) return res.status(400).json({ error: 'PIN inválido' });
  db.prepare('UPDATE players SET pin = ? WHERE id = ?').run(pin, req.session.playerId);
  res.json({ ok: true });
});

// Get phase2 status (public endpoint for users)
router.get('/settings/phase2', (req, res) => {
  const setting = db.prepare("SELECT value FROM settings WHERE key='phase2_unlocked'").get();
  res.json({ unlocked: setting?.value === '1' });
});

module.exports = router;
