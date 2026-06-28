const db = require('./db');

function getScoring(phase) {
  return db.prepare('SELECT * FROM scoring WHERE phase = ?').get(phase);
}

// Mirror of admin.js BRACKET_TREE — used to simulate each player's predicted bracket
const BRACKET_TREE = {
  '1/16-1':  { feeds_into: '1/8-1',      side: 'home', type: 'winner' },
  '1/16-2':  { feeds_into: '1/8-2',      side: 'home', type: 'winner' },
  '1/16-3':  { feeds_into: '1/8-1',      side: 'away', type: 'winner' },
  '1/16-4':  { feeds_into: '1/8-3',      side: 'home', type: 'winner' },
  '1/16-5':  { feeds_into: '1/8-2',      side: 'away', type: 'winner' },
  '1/16-6':  { feeds_into: '1/8-3',      side: 'away', type: 'winner' },
  '1/16-7':  { feeds_into: '1/8-4',      side: 'home', type: 'winner' },
  '1/16-8':  { feeds_into: '1/8-4',      side: 'away', type: 'winner' },
  '1/16-9':  { feeds_into: '1/8-6',      side: 'home', type: 'winner' },
  '1/16-10': { feeds_into: '1/8-6',      side: 'away', type: 'winner' },
  '1/16-11': { feeds_into: '1/8-5',      side: 'home', type: 'winner' },
  '1/16-12': { feeds_into: '1/8-5',      side: 'away', type: 'winner' },
  '1/16-13': { feeds_into: '1/8-8',      side: 'home', type: 'winner' },
  '1/16-14': { feeds_into: '1/8-7',      side: 'home', type: 'winner' },
  '1/16-15': { feeds_into: '1/8-8',      side: 'away', type: 'winner' },
  '1/16-16': { feeds_into: '1/8-7',      side: 'away', type: 'winner' },
  '1/8-1':   { feeds_into: '1/4-1',      side: 'home', type: 'winner' },
  '1/8-2':   { feeds_into: '1/4-1',      side: 'away', type: 'winner' },
  '1/8-3':   { feeds_into: '1/4-3',      side: 'home', type: 'winner' },
  '1/8-4':   { feeds_into: '1/4-3',      side: 'away', type: 'winner' },
  '1/8-5':   { feeds_into: '1/4-2',      side: 'home', type: 'winner' },
  '1/8-6':   { feeds_into: '1/4-2',      side: 'away', type: 'winner' },
  '1/8-7':   { feeds_into: '1/4-4',      side: 'home', type: 'winner' },
  '1/8-8':   { feeds_into: '1/4-4',      side: 'away', type: 'winner' },
  '1/4-1':   { feeds_into: '1/2-1',      side: 'home', type: 'winner' },
  '1/4-2':   { feeds_into: '1/2-1',      side: 'away', type: 'winner' },
  '1/4-3':   { feeds_into: '1/2-2',      side: 'home', type: 'winner' },
  '1/4-4':   { feeds_into: '1/2-2',      side: 'away', type: 'winner' },
  '1/2-1': [
    { feeds_into: 'Final',      side: 'home', type: 'winner' },
    { feeds_into: '3er Puesto', side: 'home', type: 'loser'  },
  ],
  '1/2-2': [
    { feeds_into: 'Final',      side: 'away', type: 'winner' },
    { feeds_into: '3er Puesto', side: 'away', type: 'loser'  },
  ],
};

// Simulate which teams a player predicts for each knockout match.
// Uses real results for already-played matches; falls back to player's prediction otherwise.
// Returns map: match_id → { home_team, away_team }
function computePlayerBracket(knockoutMatches, playerPredsById) {
  const matchByCode = {};
  for (const m of knockoutMatches) matchByCode[m.code] = m;

  const effective = {};
  for (const m of knockoutMatches) {
    effective[m.id] = { home_team: m.home_team || '', away_team: m.away_team || '' };
  }

  for (const phase of ['r16', 'r8', 'r4', 'r2']) {
    const srcs = knockoutMatches
      .filter(m => m.phase === phase)
      .sort((a, b) => (a.match_order || 0) - (b.match_order || 0));

    for (const s of srcs) {
      let winner, loser;

      if (s.home_score !== null) {
        if (s.home_score > s.away_score) { winner = s.home_team; loser = s.away_team; }
        else if (s.away_score > s.home_score) { winner = s.away_team; loser = s.home_team; }
        else if (s.penalty_winner) { winner = s.penalty_winner; loser = winner === s.home_team ? s.away_team : s.home_team; }
        else continue;
      } else {
        const pred = playerPredsById[s.id];
        if (!pred || pred.home_score === null) continue;
        const home = effective[s.id]?.home_team;
        const away = effective[s.id]?.away_team;
        if (!home || !away || home.startsWith('Por definir') || away.startsWith('Por definir')) continue;
        if (pred.home_score > pred.away_score) { winner = home; loser = away; }
        else if (pred.away_score > pred.home_score) { winner = away; loser = home; }
        else {
          const pw = pred.pred_penalty_winner;
          if (!pw) continue;
          if (pw === home) { winner = home; loser = away; }
          else if (pw === away) { winner = away; loser = home; }
          else continue;
        }
      }

      const entries = Array.isArray(BRACKET_TREE[s.code])
        ? BRACKET_TREE[s.code]
        : (BRACKET_TREE[s.code] ? [BRACKET_TREE[s.code]] : []);

      for (const e of entries) {
        const next = matchByCode[e.feeds_into];
        if (!next) continue;
        const team = e.type === 'loser' ? loser : winner;
        if (e.side === 'home' && (!effective[next.id].home_team || effective[next.id].home_team.startsWith('Por definir'))) {
          effective[next.id].home_team = team;
        }
        if (e.side === 'away' && (!effective[next.id].away_team || effective[next.id].away_team.startsWith('Por definir'))) {
          effective[next.id].away_team = team;
        }
      }
    }
  }

  return effective;
}

// Compute group standings from an array of matches/predictions with home_score/away_score
function computeGroupStandings(matchesWithScores, teams) {
  const standings = {};
  // Initialize all teams (even if they have 0 matches predicted)
  if (teams) {
    for (const t of teams) {
      standings[t] = { pts: 0, gf: 0, ga: 0, gd: 0, played: 0 };
    }
  }

  for (const m of matchesWithScores) {
    const hs = m.home_score;
    const as_ = m.away_score;
    if (hs === null || hs === undefined || as_ === null || as_ === undefined) continue;

    const home = m.home_team;
    const away = m.away_team;
    if (!standings[home]) standings[home] = { pts: 0, gf: 0, ga: 0, gd: 0, played: 0 };
    if (!standings[away]) standings[away] = { pts: 0, gf: 0, ga: 0, gd: 0, played: 0 };

    standings[home].gf += hs;
    standings[home].ga += as_;
    standings[home].gd = standings[home].gf - standings[home].ga;
    standings[home].played++;

    standings[away].gf += as_;
    standings[away].ga += hs;
    standings[away].gd = standings[away].gf - standings[away].ga;
    standings[away].played++;

    if (hs > as_) {
      standings[home].pts += 3;
    } else if (hs < as_) {
      standings[away].pts += 3;
    } else {
      standings[home].pts += 1;
      standings[away].pts += 1;
    }
  }

  return Object.entries(standings)
    .sort((a, b) => {
      if (b[1].pts !== a[1].pts) return b[1].pts - a[1].pts;
      if (b[1].gd !== a[1].gd) return b[1].gd - a[1].gd;
      return b[1].gf - a[1].gf;
    })
    .map(([name, stats]) => ({ name, ...stats }));
}

function calculateMatchPoints(prediction, result, scoring) {
  if (!result || result.home_score === null || result.away_score === null) return 0;
  if (!prediction || prediction.home_score === null || prediction.away_score === null) return 0;

  const actualSign = result.home_score > result.away_score ? '1'
    : result.home_score < result.away_score ? '2' : 'X';

  // Auto-derive sign from prediction scores
  const predSign = prediction.home_score > prediction.away_score ? '1'
    : prediction.home_score < prediction.away_score ? '2' : 'X';

  const exactResult = result.home_score === prediction.home_score
    && result.away_score === prediction.away_score;
  const signCorrect = actualSign === predSign;
  const actualDiff = Math.abs(result.home_score - result.away_score);
  const predDiff = Math.abs(prediction.home_score - prediction.away_score);
  const diffCorrect = actualDiff === predDiff;

  let pts = 0;
  if (exactResult) {
    pts = scoring.sign_pts + scoring.goal_diff_pts + scoring.exact_pts;
  } else if (signCorrect && diffCorrect) {
    pts = scoring.sign_pts + scoring.goal_diff_pts;
  } else if (signCorrect) {
    pts = scoring.sign_pts;
  }

  // qualify_pts: acertar el equipo clasificado (aplica en fases eliminatorias)
  if (scoring.qualify_pts && result.home_team && result.away_team) {
    const actualClassifier =
      actualSign === '1' ? result.home_team :
      actualSign === '2' ? result.away_team :
      (result.penalty_winner || null);
    const predClassifier =
      predSign === '1' ? result.home_team :
      predSign === '2' ? result.away_team :
      (prediction.pred_penalty_winner || null);
    if (actualClassifier && predClassifier && actualClassifier === predClassifier) {
      pts += scoring.qualify_pts;
    }
  }

  return pts;
}

// Phases where the player must have predicted the correct teams to score
const BRACKET_CHECK_PHASES = new Set(['r8', 'r4', 'r2', 'final']);

function recalcAllPoints() {
  const matches = db.prepare("SELECT * FROM matches WHERE home_score IS NOT NULL").all();
  const allScoring = db.prepare('SELECT * FROM scoring').all();
  const scoringMap = {};
  allScoring.forEach(s => { scoringMap[s.phase] = s; });

  const update = db.prepare(`
    UPDATE predictions SET points = ?
    WHERE player_id = ? AND match_id = ?
  `);

  // Load all knockout matches (needed for bracket simulation)
  const knockoutMatches = db.prepare(
    "SELECT * FROM matches WHERE phase IN ('r16','r8','r4','r2','final')"
  ).all();
  const knockoutMatchIds = knockoutMatches.map(m => m.id);

  // Pre-load all knockout predictions grouped by player
  // Map: player_id → { match_id → prediction }
  const playerKoPreds = {};
  if (knockoutMatchIds.length > 0) {
    const placeholders = knockoutMatchIds.map(() => '?').join(',');
    const allKoPreds = db.prepare(
      `SELECT * FROM predictions WHERE match_id IN (${placeholders})`
    ).all(...knockoutMatchIds);
    for (const p of allKoPreds) {
      if (!playerKoPreds[p.player_id]) playerKoPreds[p.player_id] = {};
      playerKoPreds[p.player_id][p.match_id] = p;
    }
  }

  // Cache bracket simulation per player (computed once per recalc)
  const playerBracketCache = {};
  function getPlayerBracket(playerId) {
    if (!playerBracketCache[playerId]) {
      playerBracketCache[playerId] = computePlayerBracket(
        knockoutMatches,
        playerKoPreds[playerId] || {}
      );
    }
    return playerBracketCache[playerId];
  }

  db.exec('BEGIN');
  try {
    db.prepare('UPDATE predictions SET points = 0').run();

    for (const match of matches) {
      const scoring = scoringMap[match.phase];
      if (!scoring) continue;
      const preds = db.prepare('SELECT * FROM predictions WHERE match_id = ?').all(match.id);

      for (const pred of preds) {
        // For r8 and beyond, only score if the player predicted the correct teams
        if (BRACKET_CHECK_PHASES.has(match.phase)) {
          const bracket = getPlayerBracket(pred.player_id);
          const effMatch = bracket[match.id];
          const teamsMatch = effMatch &&
            effMatch.home_team === match.home_team &&
            effMatch.away_team === match.away_team;
          if (!teamsMatch) {
            update.run(0, pred.player_id, match.id);
            continue;
          }
        }

        const pts = calculateMatchPoints(pred, match, scoring);
        update.run(pts, pred.player_id, match.id);
      }
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// Check if a group has been officially closed by admin
function isGroupClosed(groupName) {
  const row = db.prepare("SELECT closed FROM group_closings WHERE group_name=?").get(groupName);
  return row?.closed === 1;
}

// Get group position points for a player:
// Compares user's predicted group standings (from their match predictions)
// against actual group standings (from admin-entered results)
// Only counts when admin has officially closed the group
function getGroupPositionPoints(playerId, groupName) {
  // Only count position points when group is officially closed
  if (!isGroupClosed(groupName)) return 0;

  const scoring = getScoring('groups');
  if (!scoring) return 0;

  // Get group matches
  const groupMatchList = db.prepare(`
    SELECT * FROM matches WHERE phase='groups' AND group_name=? ORDER BY match_order
  `).all(groupName);
  if (groupMatchList.length < 6) return 0;

  // Check if all actual results are in
  const actualWithResults = groupMatchList.filter(m => m.home_score !== null);
  if (actualWithResults.length < 6) return 0; // Group not finished yet

  // Get user's predictions for group matches
  const matchIds = groupMatchList.map(m => m.id);
  const placeholders = matchIds.map(() => '?').join(',');
  const userPreds = db.prepare(`
    SELECT m.home_team, m.away_team, p.home_score, p.away_score
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
    WHERE p.player_id = ? AND p.match_id IN (${placeholders})
      AND p.home_score IS NOT NULL AND p.away_score IS NOT NULL
  `).all(playerId, ...matchIds);

  if (userPreds.length < 6) return 0; // User hasn't predicted all matches

  // Get teams in this group
  const groupTeams = db.prepare('SELECT name FROM teams WHERE group_name=?').all(groupName).map(t => t.name);

  // Compute predicted standings
  const predictedStandings = computeGroupStandings(userPreds, groupTeams);

  // Compute actual standings
  const actualStandings = computeGroupStandings(actualWithResults, groupTeams);

  // Award points per position
  const posPoints = [scoring.pos1_pts, scoring.pos2_pts, scoring.pos3_pts, scoring.pos4_pts];
  let total = 0;
  for (let pos = 0; pos < 4; pos++) {
    const predicted = predictedStandings[pos]?.name;
    const actual = actualStandings[pos]?.name;
    if (predicted && actual && predicted === actual) {
      total += posPoints[pos] || 0;
    }
  }
  return total;
}

// Get predicted group standings for a player (for display purposes)
function getPlayerGroupStandings(playerId, groupName) {
  const groupMatchList = db.prepare(`
    SELECT * FROM matches WHERE phase='groups' AND group_name=? ORDER BY match_order
  `).all(groupName);

  const matchIds = groupMatchList.map(m => m.id);
  const placeholders = matchIds.map(() => '?').join(',');

  const userPreds = db.prepare(`
    SELECT m.home_team, m.away_team, p.home_score, p.away_score
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
    WHERE p.player_id = ? AND p.match_id IN (${placeholders})
  `).all(playerId, ...matchIds);

  const groupTeams = db.prepare('SELECT name FROM teams WHERE group_name=? ORDER BY seed').all(groupName).map(t => t.name);
  return computeGroupStandings(userPreds, groupTeams);
}

// Get scorer points for a player
// Rules:
//   - 1 pt per goal scored by your chosen player (always, regardless of ranking)
//   - +scorer_pts_base bonus only if your chosen player IS the top scorer
function getScorerPoints(playerId) {
  const special = db.prepare('SELECT * FROM scoring_special WHERE id=1').get();
  if (!special) return 0;

  const pred = db.prepare('SELECT * FROM scorer_predictions WHERE player_id=?').get(playerId);
  if (!pred) return 0;

  const scorer = db.prepare('SELECT * FROM top_scorers WHERE id=?').get(pred.scorer_id);
  if (!scorer || scorer.actual_goals === 0) return 0;

  // Per-goal bonus always applies for every goal the chosen scorer has
  const goalPts = scorer.actual_goals * special.scorer_pts_per_goal;

  // Base bonus only if the chosen scorer is the current top scorer
  const topScorer = db.prepare('SELECT * FROM top_scorers ORDER BY actual_goals DESC LIMIT 1').get();
  const isTopScorer = topScorer && topScorer.actual_goals > 0 && scorer.id === topScorer.id;

  return isTopScorer ? special.scorer_pts_base + goalPts : goalPts;
}

// Get special placement points for a player (champion, runner-up, 3rd, 4th)
function getSpecialPoints(playerId) {
  const special = db.prepare('SELECT * FROM scoring_special WHERE id=1').get();
  if (!special) return 0;

  // Final match result
  const finalMatch = db.prepare("SELECT * FROM matches WHERE code='Final' AND phase='final'").get();
  // 3rd place match
  const thirdMatch = db.prepare("SELECT * FROM matches WHERE phase='r2' AND code='3er Puesto'").get();

  let total = 0;

  if (finalMatch && finalMatch.home_score !== null) {
    const champion = finalMatch.home_score > finalMatch.away_score ? finalMatch.home_team
      : finalMatch.home_score < finalMatch.away_score ? finalMatch.away_team
      : (finalMatch.penalty_winner || null);
    const runnerUp = champion ? (champion === finalMatch.home_team ? finalMatch.away_team : finalMatch.home_team) : null;

    if (champion && runnerUp) {
      const finalPred = db.prepare('SELECT * FROM predictions WHERE player_id=? AND match_id=?').get(playerId, finalMatch.id);
      if (finalPred && finalPred.home_score !== null) {
        const predChampion = finalPred.home_score > finalPred.away_score ? finalMatch.home_team
          : finalPred.home_score < finalPred.away_score ? finalMatch.away_team
          : (finalPred.pred_penalty_winner || null);
        if (predChampion) {
          const predRunnerUp = predChampion === finalMatch.home_team ? finalMatch.away_team : finalMatch.home_team;
          if (predChampion === champion) total += special.champion_pts;
          if (predRunnerUp === runnerUp) total += special.runner_up_pts;
        }
      }
    }
  }

  if (thirdMatch && thirdMatch.home_score !== null) {
    const third = thirdMatch.home_score > thirdMatch.away_score ? thirdMatch.home_team
      : thirdMatch.home_score < thirdMatch.away_score ? thirdMatch.away_team
      : (thirdMatch.penalty_winner || null);
    const fourth = third ? (third === thirdMatch.home_team ? thirdMatch.away_team : thirdMatch.home_team) : null;

    if (third && fourth) {
      const thirdPred = db.prepare('SELECT * FROM predictions WHERE player_id=? AND match_id=?').get(playerId, thirdMatch.id);
      if (thirdPred && thirdPred.home_score !== null) {
        const predThird = thirdPred.home_score > thirdPred.away_score ? thirdMatch.home_team
          : thirdPred.home_score < thirdPred.away_score ? thirdMatch.away_team
          : (thirdPred.pred_penalty_winner || null);
        if (predThird) {
          const predFourth = predThird === thirdMatch.home_team ? thirdMatch.away_team : thirdMatch.home_team;
          if (predThird === third) total += special.third_pts;
          if (predFourth === fourth) total += special.fourth_pts;
        }
      }
    }
  }

  return total;
}

module.exports = {
  calculateMatchPoints,
  recalcAllPoints,
  getGroupPositionPoints,
  getPlayerGroupStandings,
  getScorerPoints,
  getSpecialPoints,
  computeGroupStandings,
  computePlayerBracket,
  getScoring,
  isGroupClosed,
};
