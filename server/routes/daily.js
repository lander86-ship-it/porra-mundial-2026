const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all available match dates
router.get('/dates', (req, res) => {
  const dates = db.prepare(`
    SELECT DISTINCT match_date FROM matches
    WHERE match_date IS NOT NULL
    ORDER BY match_date
  `).all().map(r => r.match_date);
  res.json(dates);
});

// Get daily porra: all matches on a date with all players' predictions
router.get('/:date', (req, res) => {
  const { date } = req.params;

  const dayMatches = db.prepare(`
    SELECT * FROM matches
    WHERE match_date = ?
    ORDER BY match_time, match_order
  `).all(date);

  if (!dayMatches.length) return res.json([]);

  const players = db.prepare(`
    SELECT id, name FROM players WHERE is_admin=0 ORDER BY name
  `).all();

  const matchIds = dayMatches.map(m => m.id);
  const placeholders = matchIds.map(() => '?').join(',');

  const allPreds = db.prepare(`
    SELECT p.*, pl.name as player_name
    FROM predictions p
    JOIN players pl ON p.player_id = pl.id
    WHERE p.match_id IN (${placeholders})
    ORDER BY pl.name
  `).all(...matchIds);

  // Group predictions by match
  const predsByMatch = {};
  for (const pred of allPreds) {
    if (!predsByMatch[pred.match_id]) predsByMatch[pred.match_id] = [];
    predsByMatch[pred.match_id].push(pred);
  }

  const result = dayMatches.map(m => ({
    ...m,
    predictions: players.map(pl => {
      const pred = predsByMatch[m.id]?.find(p => p.player_id === pl.id);
      return {
        player_id: pl.id,
        player_name: pl.name,
        home_score: pred?.home_score ?? null,
        away_score: pred?.away_score ?? null,
        sign: pred?.sign ?? null,
        points: pred?.points ?? null,
      };
    }),
  }));

  res.json(result);
});

module.exports = router;
