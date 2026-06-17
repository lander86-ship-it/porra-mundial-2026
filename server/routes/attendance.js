const express = require('express');
const router = express.Router();
const db = require('../db');

function requireUser(req, res, next) {
  if (!req.session.playerId) return res.status(401).json({ error: 'No autenticado' });
  next();
}

// Get attendees for a match (includes beer counts)
router.get('/:matchId', (req, res) => {
  const attendees = db.prepare(`
    SELECT ma.player_id, p.name, COALESCE(bc.count, 0) as beers
    FROM match_attendance ma
    JOIN players p ON ma.player_id = p.id
    LEFT JOIN beer_counts bc ON bc.player_id = ma.player_id AND bc.match_id = ma.match_id
    WHERE ma.match_id = ?
    ORDER BY p.name
  `).all(req.params.matchId);
  res.json(attendees);
});

// Toggle attendance for current player
router.post('/:matchId/toggle', requireUser, (req, res) => {
  const { matchId } = req.params;
  const playerId = req.session.playerId;
  const existing = db.prepare(
    'SELECT 1 FROM match_attendance WHERE player_id=? AND match_id=?'
  ).get(playerId, matchId);
  if (existing) {
    db.prepare('DELETE FROM match_attendance WHERE player_id=? AND match_id=?').run(playerId, matchId);
    res.json({ attending: false });
  } else {
    db.prepare('INSERT INTO match_attendance (player_id, match_id) VALUES (?,?)').run(playerId, matchId);
    res.json({ attending: true });
  }
});

// Increment beer count for current player (must be attending)
router.post('/:matchId/beer', requireUser, (req, res) => {
  const { matchId } = req.params;
  const playerId = req.session.playerId;
  const attending = db.prepare('SELECT 1 FROM match_attendance WHERE player_id=? AND match_id=?').get(playerId, matchId);
  if (!attending) return res.status(403).json({ error: 'No estás apuntado a este partido' });
  db.prepare(`
    INSERT INTO beer_counts (player_id, match_id, count) VALUES (?, ?, 1)
    ON CONFLICT(player_id, match_id) DO UPDATE SET count = count + 1
  `).run(playerId, matchId);
  const row = db.prepare('SELECT count FROM beer_counts WHERE player_id=? AND match_id=?').get(playerId, matchId);
  res.json({ ok: true, beers: row.count });
});

// Decrement beer count (min 0)
router.post('/:matchId/beer/remove', requireUser, (req, res) => {
  const { matchId } = req.params;
  const playerId = req.session.playerId;
  const attending = db.prepare('SELECT 1 FROM match_attendance WHERE player_id=? AND match_id=?').get(playerId, matchId);
  if (!attending) return res.status(403).json({ error: 'No estás apuntado a este partido' });
  db.prepare(`
    INSERT INTO beer_counts (player_id, match_id, count) VALUES (?, ?, 0)
    ON CONFLICT(player_id, match_id) DO UPDATE SET count = MAX(0, count - 1)
  `).run(playerId, matchId);
  const row = db.prepare('SELECT count FROM beer_counts WHERE player_id=? AND match_id=?').get(playerId, matchId);
  res.json({ ok: true, beers: row.count });
});

module.exports = router;
