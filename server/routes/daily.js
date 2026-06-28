const express = require('express');
const router = express.Router();
const db = require('../db');
const { computePlayerBracket } = require('../scoring');

const BRACKET_CHECK_PHASES = new Set(['r8', 'r4', 'r2', 'final']);

// Get all available match dates
router.get('/dates', (req, res) => {
  const dates = db.prepare(`
    SELECT DISTINCT match_date FROM matches
    WHERE match_date IS NOT NULL
    ORDER BY match_date
  `).all().map(r => r.match_date);
  res.json(dates);
});

// Per-group sign accuracy for the whole koadrilla
router.get('/group-stats', (req, res) => {
  const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const result = [];
  for (const group of GROUPS) {
    const played = db.prepare(
      "SELECT id, home_score, away_score FROM matches WHERE phase='groups' AND group_name=? AND home_score IS NOT NULL"
    ).all(group);
    if (!played.length) {
      result.push({ group, playedMatches: 0, totalMatches: 6, signPct: null, exactPct: null });
      continue;
    }
    let total = 0, signOk = 0, exactOk = 0;
    for (const m of played) {
      const actual = m.home_score > m.away_score ? '1' : m.home_score < m.away_score ? '2' : 'X';
      const preds = db.prepare(
        'SELECT home_score, away_score FROM predictions WHERE match_id=? AND home_score IS NOT NULL'
      ).all(m.id);
      for (const p of preds) {
        total++;
        const ps = p.home_score > p.away_score ? '1' : p.home_score < p.away_score ? '2' : 'X';
        if (ps === actual) signOk++;
        if (p.home_score === m.home_score && p.away_score === m.away_score) exactOk++;
      }
    }
    result.push({
      group,
      playedMatches: played.length,
      totalMatches: 6,
      signPct: total > 0 ? Math.round((signOk / total) * 100) : 0,
      exactPct: total > 0 ? Math.round((exactOk / total) * 100) : 0,
    });
  }
  res.json(result);
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

  // Visibility: admins always see all; non-admins see knockout preds only if enabled
  const predsVisibleSetting = db.prepare("SELECT value FROM settings WHERE key='phase2_preds_visible'").get();
  const predsVisible = predsVisibleSetting?.value === '1';
  const isAdmin = req.session?.isAdmin === true;
  const currentPlayerId = req.session?.playerId ?? null;

  // For r8+ matches, compute each player's predicted bracket to show their specific teams
  const hasBracketMatches = dayMatches.some(m => BRACKET_CHECK_PHASES.has(m.phase));
  const playerBrackets = {};
  if (hasBracketMatches) {
    const knockoutMatches = db.prepare(
      "SELECT * FROM matches WHERE phase IN ('r16','r8','r4','r2','final')"
    ).all();
    const koIds = knockoutMatches.map(m => m.id);
    const koPlaceholders = koIds.map(() => '?').join(',');
    const allKoPreds = db.prepare(
      `SELECT * FROM predictions WHERE match_id IN (${koPlaceholders})`
    ).all(...koIds);
    const playerKoPreds = {};
    for (const p of allKoPreds) {
      if (!playerKoPreds[p.player_id]) playerKoPreds[p.player_id] = {};
      playerKoPreds[p.player_id][p.match_id] = p;
    }
    for (const pl of players) {
      playerBrackets[pl.id] = computePlayerBracket(knockoutMatches, playerKoPreds[pl.id] || {});
    }
  }

  const result = dayMatches.map(m => {
    const isKnockout = m.phase !== 'groups';
    const isBracketPhase = BRACKET_CHECK_PHASES.has(m.phase);
    // Hide other players' predictions when knockout AND not visible AND not admin
    const hideOthers = isKnockout && !predsVisible && !isAdmin;

    return {
      ...m,
      preds_hidden: hideOthers,
      predictions: players.map(pl => {
        const pred = predsByMatch[m.id]?.find(p => p.player_id === pl.id);
        const isOwn = pl.id === currentPlayerId;
        const masked = hideOthers && !isOwn;

        // Predicted teams for r8+ phases
        let pred_home_team = null, pred_away_team = null, teams_match = null;
        if (isBracketPhase && !masked && playerBrackets[pl.id]) {
          const eff = playerBrackets[pl.id][m.id];
          pred_home_team = eff?.home_team || null;
          pred_away_team = eff?.away_team || null;
          teams_match = !!(eff?.home_team && eff?.away_team &&
            eff.home_team === m.home_team &&
            eff.away_team === m.away_team);
        }

        return {
          player_id: pl.id,
          player_name: pl.name,
          home_score: masked ? null : (pred?.home_score ?? null),
          away_score: masked ? null : (pred?.away_score ?? null),
          sign: masked ? null : (pred?.sign ?? null),
          pred_penalty_winner: masked ? null : (pred?.pred_penalty_winner ?? null),
          points: pred?.points ?? null,
          hidden: masked,
          pred_home_team,
          pred_away_team,
          teams_match,
        };
      }),
    };
  });

  res.json(result);
});

module.exports = router;
