const express = require('express');
const router = express.Router();
const db = require('../db');

function requireUser(req, res, next) {
  if (!req.session.playerId) return res.status(401).json({ error: 'No autenticado' });
  next();
}

// Get all side bets
router.get('/', requireUser, (req, res) => {
  const bets = db.prepare(`
    SELECT sb.*, p.name as creator_name
    FROM side_bets sb
    JOIN players p ON sb.creator_id = p.id
    ORDER BY sb.resolved ASC, sb.created_at DESC
  `).all();
  res.json(bets);
});

// Create a side bet
router.post('/', requireUser, (req, res) => {
  const { description } = req.body;
  if (!description?.trim()) return res.status(400).json({ error: 'Descripción requerida' });
  const result = db.prepare(
    'INSERT INTO side_bets (creator_id, description) VALUES (?,?)'
  ).run(req.session.playerId, description.trim());
  res.json({ id: result.lastInsertRowid, ok: true });
});

// Toggle resolved status
router.put('/:id/resolve', requireUser, (req, res) => {
  const bet = db.prepare('SELECT * FROM side_bets WHERE id=?').get(req.params.id);
  if (!bet) return res.status(404).json({ error: 'Apuesta no encontrada' });
  const isAdmin = req.session.isAdmin;
  const isCreator = bet.creator_id === req.session.playerId;
  if (!isAdmin && !isCreator) return res.status(403).json({ error: 'Sin permiso' });
  db.prepare('UPDATE side_bets SET resolved=? WHERE id=?').run(bet.resolved ? 0 : 1, bet.id);
  res.json({ ok: true, resolved: !bet.resolved });
});

// Delete a side bet
router.delete('/:id', requireUser, (req, res) => {
  const bet = db.prepare('SELECT * FROM side_bets WHERE id=?').get(req.params.id);
  if (!bet) return res.status(404).json({ error: 'Apuesta no encontrada' });
  const isAdmin = req.session.isAdmin;
  const isCreator = bet.creator_id === req.session.playerId;
  if (!isAdmin && !isCreator) return res.status(403).json({ error: 'Sin permiso' });
  db.prepare('DELETE FROM side_bets WHERE id=?').run(bet.id);
  res.json({ ok: true });
});

module.exports = router;
