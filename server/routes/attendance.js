const express = require('express');
const router = express.Router();
const db = require('../db');

function requireUser(req, res, next) {
  if (!req.session.playerId) return res.status(401).json({ error: 'No autenticado' });
  next();
}

// Get attendees for a match
router.get('/:matchId', (req, res) => {
  const attendees = db.prepare(`
    SELECT ma.player_id, p.name
    FROM match_attendance ma
    JOIN players p ON ma.player_id = p.id
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

module.exports = router;
