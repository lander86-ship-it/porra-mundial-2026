const express = require('express');
const router = express.Router();
const db = require('../db');
const { getGroupPositionPoints, getScorerPoints, getSpecialPoints } = require('../scoring');

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const PHASES = ['groups','r16','r8','r4','r2','final'];

router.get('/', (req, res) => {
  const players = db.prepare(`
    SELECT id, name, predictions_locked, paid, manual_points
    FROM players WHERE is_admin = 0 ORDER BY name
  `).all();

  const ranking = players.map(p => {
    // Match points by phase
    const phasePts = {};
    for (const phase of PHASES) {
      phasePts[phase] = db.prepare(`
        SELECT COALESCE(SUM(pr.points),0) as pts
        FROM predictions pr
        JOIN matches m ON pr.match_id = m.id
        WHERE pr.player_id = ? AND m.phase = ?
      `).get(p.id, phase).pts;
    }

    // Group position points
    let groupPosPts = 0;
    for (const g of GROUPS) {
      groupPosPts += getGroupPositionPoints(p.id, g);
    }
    phasePts.groups += groupPosPts;

    // Scorer points
    const scorerPts = getScorerPoints(p.id);

    // Special placement points (champion, runner-up, 3rd, 4th)
    const specialPts = getSpecialPoints(p.id);

    // Manual adjustment
    const manualPts = p.manual_points || 0;

    const matchTotal = PHASES.reduce((sum, ph) => sum + phasePts[ph], 0);
    const total = matchTotal + scorerPts + specialPts + manualPts;

    return {
      id: p.id,
      name: p.name,
      locked: p.predictions_locked === 1,
      paid: p.paid === 1,
      manual_points: manualPts,
      total,
      scorer_pts: scorerPts,
      special_pts: specialPts,
      ...phasePts,
    };
  });

  ranking.sort((a, b) => b.total - a.total);
  ranking.forEach((r, i) => { r.pos = i + 1; });

  // Prize distribution: 20€ per player, 50%/30%/20%
  const pool = players.length * 20;
  const prizes = {
    pool,
    first: Math.round(pool * 0.50),
    second: Math.round(pool * 0.30),
    third: Math.round(pool * 0.20),
    paid_count: players.filter(p => p.paid).length,
    paid_pool: players.filter(p => p.paid).length * 20,
  };

  res.json({ ranking, prizes });
});

// Get ranking for simulator (with hypothetical results)
router.post('/simulate', (req, res) => {
  const { hypotheticalResults } = req.body; // [{ matchId, homeScore, awayScore }]
  if (!hypotheticalResults || !Array.isArray(hypotheticalResults)) {
    return res.status(400).json({ error: 'hypotheticalResults array required' });
  }

  // Build a map of hypothetical results
  const hypoMap = {};
  for (const r of hypotheticalResults) {
    hypoMap[r.matchId] = { home_score: parseInt(r.homeScore), away_score: parseInt(r.awayScore) };
  }

  // Get all matches
  const allMatches = db.prepare('SELECT * FROM matches').all();

  // Merge hypothetical results with real results (hypothetical takes precedence for unplayed)
  const effectiveResults = {};
  for (const m of allMatches) {
    if (m.home_score !== null) {
      effectiveResults[m.id] = m; // real result
    } else if (hypoMap[m.id]) {
      effectiveResults[m.id] = { ...m, ...hypoMap[m.id] }; // hypothetical
    }
  }

  // Get all scoring configs
  const allScoring = db.prepare('SELECT * FROM scoring').all();
  const scoringMap = {};
  allScoring.forEach(s => { scoringMap[s.phase] = s; });

  // Get all players
  const players = db.prepare('SELECT id, name FROM players WHERE is_admin=0').all();

  // Get all predictions
  const allPreds = db.prepare('SELECT * FROM predictions').all();
  const predMap = {};
  for (const pr of allPreds) {
    if (!predMap[pr.player_id]) predMap[pr.player_id] = {};
    predMap[pr.player_id][pr.match_id] = pr;
  }

  const { computeGroupStandings } = require('../scoring');

  const ranking = players.map(p => {
    let total = 0;

    for (const [matchId, match] of Object.entries(effectiveResults)) {
      const scoring = scoringMap[match.phase];
      if (!scoring) continue;
      const pred = predMap[p.id]?.[matchId];
      if (!pred || pred.home_score === null) continue;

      const actualSign = match.home_score > match.away_score ? '1'
        : match.home_score < match.away_score ? '2' : 'X';
      const predSign = pred.home_score > pred.away_score ? '1'
        : pred.home_score < pred.away_score ? '2' : 'X';

      const exact = match.home_score === pred.home_score && match.away_score === pred.away_score;
      const signOk = actualSign === predSign;
      const diffOk = Math.abs(match.home_score - match.away_score) === Math.abs(pred.home_score - pred.away_score);

      if (exact) total += scoring.sign_pts + scoring.goal_diff_pts + scoring.exact_pts;
      else if (signOk && diffOk) total += scoring.sign_pts + scoring.goal_diff_pts;
      else if (signOk) total += scoring.sign_pts;
    }

    return { id: p.id, name: p.name, total };
  });

  ranking.sort((a, b) => b.total - a.total);
  ranking.forEach((r, i) => { r.pos = i + 1; });

  res.json(ranking);
});

module.exports = router;
