const express = require('express');
const router = express.Router();
const db = require('../db');
const { getGroupPositionPoints, getScorerPoints, getSpecialPoints, computeGroupStandings } = require('../scoring');

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const PHASES = ['groups','r16','r8','r4','r2','final'];

router.get('/', (req, res) => {
  const players = db.prepare(`
    SELECT id, name, predictions_locked, paid, manual_points
    FROM players WHERE is_admin = 0 ORDER BY name
  `).all();

  const ranking = players.map(p => {
    // Match points by phase (raw match prediction points only)
    const phasePts = {};
    for (const phase of PHASES) {
      phasePts[phase] = db.prepare(`
        SELECT COALESCE(SUM(pr.points),0) as pts
        FROM predictions pr
        JOIN matches m ON pr.match_id = m.id
        WHERE pr.player_id = ? AND m.phase = ?
      `).get(p.id, phase).pts;
    }

    // Group position points (separate, only when group is closed)
    let groupPosPts = 0;
    for (const g of GROUPS) {
      groupPosPts += getGroupPositionPoints(p.id, g);
    }

    // Scorer points
    const scorerPts = getScorerPoints(p.id);

    // Special placement points (champion, runner-up, 3rd, 4th)
    const specialPts = getSpecialPoints(p.id);

    // Manual adjustment
    const manualPts = p.manual_points || 0;

    const groupMatchPts = phasePts.groups; // pure match points for groups
    const matchTotal = PHASES.reduce((sum, ph) => sum + phasePts[ph], 0);
    const total = matchTotal + groupPosPts + scorerPts + specialPts + manualPts;

    return {
      id: p.id,
      name: p.name,
      locked: p.predictions_locked === 1,
      paid: p.paid === 1,
      manual_points: manualPts,
      total,
      scorer_pts: scorerPts,
      special_pts: specialPts,
      groups_match: groupMatchPts,
      groups_pos: groupPosPts,
      // Keep 'groups' as combined for backward compat
      groups: groupMatchPts + groupPosPts,
      r16: phasePts.r16,
      r8: phasePts.r8,
      r4: phasePts.r4,
      r2: phasePts.r2,
      final: phasePts.final,
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

// Simulate ranking with hypothetical results
router.post('/simulate', (req, res) => {
  const { hypotheticalResults } = req.body;
  if (!hypotheticalResults || !Array.isArray(hypotheticalResults)) {
    return res.status(400).json({ error: 'hypotheticalResults array required' });
  }

  // Build hypothetical results map
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
      effectiveResults[m.id] = m;
    } else if (hypoMap[m.id]) {
      effectiveResults[m.id] = { ...m, ...hypoMap[m.id] };
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

  // Group matches for position points simulation
  const allGroupMatches = allMatches.filter(m => m.phase === 'groups');
  const groupTeamsCache = {};
  for (const g of GROUPS) {
    groupTeamsCache[g] = db.prepare("SELECT name FROM teams WHERE group_name=? ORDER BY seed").all(g).map(t => t.name);
  }

  const ranking = players.map(p => {
    let total = 0;

    // Match points for all phases
    for (const [matchIdStr, match] of Object.entries(effectiveResults)) {
      const matchId = parseInt(matchIdStr);
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

    // Group position points — simulate when all 6 group matches have results (real or hypothetical)
    const scoring = scoringMap['groups'];
    if (scoring) {
      for (const g of GROUPS) {
        const gMatches = allGroupMatches.filter(m => m.group_name === g);
        const gEffective = gMatches
          .filter(m => effectiveResults[m.id])
          .map(m => effectiveResults[m.id]);
        if (gEffective.length < 6) continue; // Not all group matches have results

        const groupTeams = groupTeamsCache[g];
        const actualStandings = computeGroupStandings(gEffective, groupTeams);

        const playerPreds = gMatches.map(m => {
          const pred = predMap[p.id]?.[m.id];
          if (!pred || pred.home_score === null) return null;
          return { home_team: m.home_team, away_team: m.away_team, home_score: pred.home_score, away_score: pred.away_score };
        }).filter(Boolean);

        if (playerPreds.length < 6) continue;

        const predictedStandings = computeGroupStandings(playerPreds, groupTeams);
        const posPoints = [scoring.pos1_pts, scoring.pos2_pts, scoring.pos3_pts, scoring.pos4_pts];

        for (let pos = 0; pos < 4; pos++) {
          if (predictedStandings[pos]?.name === actualStandings[pos]?.name) {
            total += posPoints[pos] || 0;
          }
        }
      }
    }

    return { id: p.id, name: p.name, total };
  });

  ranking.sort((a, b) => b.total - a.total);
  ranking.forEach((r, i) => { r.pos = i + 1; });

  res.json(ranking);
});

// Points progression by date per player
router.get('/progression', (req, res) => {
  const players = db.prepare(
    'SELECT id, name FROM players WHERE is_admin=0 ORDER BY name'
  ).all();

  // Daily match points per player (only for matches with results and dates)
  const rows = db.prepare(`
    SELECT p.player_id, m.match_date, SUM(p.points) as day_pts
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
    WHERE m.home_score IS NOT NULL AND m.match_date IS NOT NULL
    GROUP BY p.player_id, m.match_date
    ORDER BY p.player_id, m.match_date
  `).all();

  const result = players.map(pl => {
    const playerRows = rows.filter(r => r.player_id === pl.id);
    let cumulative = 0;
    const data = playerRows.map(r => {
      cumulative += r.day_pts;
      return { date: r.match_date, pts: r.day_pts, cumulative };
    });
    return { id: pl.id, name: pl.name, data };
  });

  res.json(result);
});

module.exports = router;
