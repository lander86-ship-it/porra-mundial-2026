const db = require('./db');

function getScoring(phase) {
  return db.prepare('SELECT * FROM scoring WHERE phase = ?').get(phase);
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

  if (exactResult) {
    return scoring.sign_pts + scoring.goal_diff_pts + scoring.exact_pts;
  } else if (signCorrect && diffCorrect) {
    return scoring.sign_pts + scoring.goal_diff_pts;
  } else if (signCorrect) {
    return scoring.sign_pts;
  }
  return 0;
}

function recalcAllPoints() {
  const matches = db.prepare("SELECT * FROM matches WHERE home_score IS NOT NULL").all();
  const allScoring = db.prepare('SELECT * FROM scoring').all();
  const scoringMap = {};
  allScoring.forEach(s => { scoringMap[s.phase] = s; });

  const update = db.prepare(`
    UPDATE predictions SET points = ?
    WHERE player_id = ? AND match_id = ?
  `);

  db.exec('BEGIN');
  try {
    for (const match of matches) {
      const scoring = scoringMap[match.phase];
      if (!scoring) continue;
      const preds = db.prepare('SELECT * FROM predictions WHERE match_id = ?').all(match.id);
      for (const pred of preds) {
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

// Get group position points for a player:
// Compares user's predicted group standings (from their match predictions)
// against actual group standings (from admin-entered results)
function getGroupPositionPoints(playerId, groupName) {
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
function getScorerPoints(playerId) {
  const special = db.prepare('SELECT * FROM scoring_special WHERE id=1').get();
  if (!special) return 0;

  const pred = db.prepare('SELECT * FROM scorer_predictions WHERE player_id=?').get(playerId);
  if (!pred) return 0;

  const scorer = db.prepare('SELECT * FROM top_scorers WHERE id=?').get(pred.scorer_id);
  if (!scorer || scorer.actual_goals === 0) return 0;

  // Find the actual top scorer (most goals)
  const topScorer = db.prepare('SELECT * FROM top_scorers ORDER BY actual_goals DESC LIMIT 1').get();
  if (!topScorer || topScorer.actual_goals === 0) return 0;

  if (scorer.id === topScorer.id) {
    return special.scorer_pts_base + (scorer.actual_goals * special.scorer_pts_per_goal);
  }
  return 0;
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
    const champion = finalMatch.home_score > finalMatch.away_score ? finalMatch.home_team : finalMatch.away_team;
    const runnerUp = finalMatch.home_score > finalMatch.away_score ? finalMatch.away_team : finalMatch.home_team;

    // Check user's prediction for the final
    const finalPred = db.prepare('SELECT * FROM predictions WHERE player_id=? AND match_id=?').get(playerId, finalMatch.id);
    if (finalPred && finalPred.home_score !== null) {
      const predChampion = finalPred.home_score > finalPred.away_score ? finalMatch.home_team : finalMatch.away_team;
      const predRunnerUp = finalPred.home_score > finalPred.away_score ? finalMatch.away_team : finalMatch.home_team;
      if (predChampion === champion) total += special.champion_pts;
      if (predRunnerUp === runnerUp) total += special.runner_up_pts;
    }
  }

  if (thirdMatch && thirdMatch.home_score !== null) {
    const third = thirdMatch.home_score > thirdMatch.away_score ? thirdMatch.home_team : thirdMatch.away_team;
    const fourth = thirdMatch.home_score > thirdMatch.away_score ? thirdMatch.away_team : thirdMatch.home_team;

    const thirdPred = db.prepare('SELECT * FROM predictions WHERE player_id=? AND match_id=?').get(playerId, thirdMatch.id);
    if (thirdPred && thirdPred.home_score !== null) {
      const predThird = thirdPred.home_score > thirdPred.away_score ? thirdMatch.home_team : thirdMatch.away_team;
      const predFourth = thirdPred.home_score > thirdPred.away_score ? thirdMatch.away_team : thirdMatch.home_team;
      if (predThird === third) total += special.third_pts;
      if (predFourth === fourth) total += special.fourth_pts;
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
  getScoring,
};
