const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/login', (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) return res.status(400).json({ error: 'Nombre y PIN requeridos' });

  const player = db.prepare('SELECT * FROM players WHERE name = ? AND pin = ?').get(name.trim(), pin.trim());
  if (!player) return res.status(401).json({ error: 'Nombre o PIN incorrectos' });

  req.session.playerId = player.id;
  req.session.isAdmin = player.is_admin === 1;
  res.json({ id: player.id, name: player.name, isAdmin: player.is_admin === 1 });
});

router.post('/register', (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) return res.status(400).json({ error: 'Nombre y PIN requeridos' });
  if (pin.length < 4) return res.status(400).json({ error: 'El PIN debe tener al menos 4 dígitos' });

  const existing = db.prepare('SELECT id FROM players WHERE name = ?').get(name.trim());
  if (existing) return res.status(409).json({ error: 'Ese nombre ya está en uso' });

  const playerCount = db.prepare('SELECT count(*) as c FROM players WHERE is_admin = 0').get().c;
  if (playerCount >= 30) return res.status(400).json({ error: 'Máximo de jugadores alcanzado (30)' });

  const result = db.prepare('INSERT INTO players (name, pin, is_admin) VALUES (?,?,0)').run(name.trim(), pin.trim());
  req.session.playerId = result.lastInsertRowid;
  req.session.isAdmin = false;
  res.json({ id: result.lastInsertRowid, name: name.trim(), isAdmin: false });
});

router.post('/change-pin', (req, res) => {
  if (!req.session.playerId) return res.status(401).json({ error: 'No autenticado' });
  const { currentPin, newPin } = req.body;
  if (!currentPin || !newPin) return res.status(400).json({ error: 'Faltan datos' });
  if (newPin.length < 4) return res.status(400).json({ error: 'El PIN debe tener al menos 4 caracteres' });

  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.session.playerId);
  if (!player) return res.status(401).json({ error: 'Sesión inválida' });
  if (player.pin !== currentPin.trim()) return res.status(403).json({ error: 'PIN actual incorrecto' });

  db.prepare('UPDATE players SET pin = ? WHERE id = ?').run(newPin.trim(), player.id);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.session.playerId) return res.status(401).json({ error: 'No autenticado' });
  const player = db.prepare('SELECT id, name, is_admin FROM players WHERE id = ?').get(req.session.playerId);
  if (!player) return res.status(401).json({ error: 'Sesión inválida' });
  res.json({ id: player.id, name: player.name, isAdmin: player.is_admin === 1 });
});

module.exports = router;
