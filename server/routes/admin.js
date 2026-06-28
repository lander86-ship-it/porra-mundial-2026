const express = require('express');
const router = express.Router();
const db = require('../db');
const { recalcAllPoints, computeGroupStandings } = require('../scoring');
const { sendNotificationToAll } = require('./notifications');

function requireAdmin(req, res, next) {
  if (!req.session.playerId || !req.session.isAdmin) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

// ── R16 BRACKET STRUCTURE ───────────────────────────────────────
// Defines which groups provide teams for each R16 match slot
// Source: 2026 FIFA World Cup knockout bracket (Wikipedia / ESPN / FIFA.com)
const R16_SLOTS = [
  { code: '1/16-1',  home: { type: 'runner', group: 'A' }, away: { type: 'runner', group: 'B' } }, // M73: 2A-2B
  { code: '1/16-2',  home: { type: 'winner', group: 'E' }, away: { type: 'third',  group: null } }, // M74: 1E-3rd
  { code: '1/16-3',  home: { type: 'winner', group: 'F' }, away: { type: 'runner', group: 'C' } }, // M75: 1F-2C
  { code: '1/16-4',  home: { type: 'winner', group: 'C' }, away: { type: 'runner', group: 'F' } }, // M76: 1C-2F
  { code: '1/16-5',  home: { type: 'winner', group: 'I' }, away: { type: 'third',  group: null } }, // M77: 1I-3rd
  { code: '1/16-6',  home: { type: 'runner', group: 'E' }, away: { type: 'runner', group: 'I' } }, // M78: 2E-2I
  { code: '1/16-7',  home: { type: 'winner', group: 'A' }, away: { type: 'third',  group: null } }, // M79: 1A-3rd
  { code: '1/16-8',  home: { type: 'winner', group: 'L' }, away: { type: 'third',  group: null } }, // M80: 1L-3rd
  { code: '1/16-9',  home: { type: 'winner', group: 'D' }, away: { type: 'third',  group: null } }, // M81: 1D-3rd
  { code: '1/16-10', home: { type: 'winner', group: 'G' }, away: { type: 'third',  group: null } }, // M82: 1G-3rd
  { code: '1/16-11', home: { type: 'runner', group: 'K' }, away: { type: 'runner', group: 'L' } }, // M83: 2K-2L
  { code: '1/16-12', home: { type: 'winner', group: 'H' }, away: { type: 'runner', group: 'J' } }, // M84: 1H-2J
  { code: '1/16-13', home: { type: 'winner', group: 'B' }, away: { type: 'third',  group: null } }, // M85: 1B-3rd
  { code: '1/16-14', home: { type: 'winner', group: 'J' }, away: { type: 'runner', group: 'H' } }, // M86: 1J-2H
  { code: '1/16-15', home: { type: 'winner', group: 'K' }, away: { type: 'third',  group: null } }, // M87: 1K-3rd
  { code: '1/16-16', home: { type: 'runner', group: 'D' }, away: { type: 'runner', group: 'G' } }, // M88: 2D-2G
];

// Knockout bracket tree: which match result feeds into which next match
// Each entry: { feeds_into: matchCode, side: 'home'|'away', type: 'winner'|'loser' }
// Source: 2026 FIFA World Cup knockout bracket (Wikipedia / ESPN / FIFA.com)
const BRACKET_TREE = {
  // Round of 32 → Round of 16
  // Source: ESPN / FIFA official match numbers (M89=Houston M90=Philadelphia)
  '1/16-1':  { feeds_into: '1/8-1',      side: 'home', type: 'winner' }, // M73→M89
  '1/16-2':  { feeds_into: '1/8-2',      side: 'home', type: 'winner' }, // M74→M90
  '1/16-3':  { feeds_into: '1/8-1',      side: 'away', type: 'winner' }, // M75→M89
  '1/16-4':  { feeds_into: '1/8-3',      side: 'home', type: 'winner' }, // M76→M91
  '1/16-5':  { feeds_into: '1/8-2',      side: 'away', type: 'winner' }, // M77→M90
  '1/16-6':  { feeds_into: '1/8-3',      side: 'away', type: 'winner' }, // M78→M91
  '1/16-7':  { feeds_into: '1/8-4',      side: 'home', type: 'winner' }, // M79→M92
  '1/16-8':  { feeds_into: '1/8-4',      side: 'away', type: 'winner' }, // M80→M92
  '1/16-9':  { feeds_into: '1/8-6',      side: 'home', type: 'winner' }, // M81→M94
  '1/16-10': { feeds_into: '1/8-6',      side: 'away', type: 'winner' }, // M82→M94
  '1/16-11': { feeds_into: '1/8-5',      side: 'home', type: 'winner' }, // M83→M93
  '1/16-12': { feeds_into: '1/8-5',      side: 'away', type: 'winner' }, // M84→M93
  '1/16-13': { feeds_into: '1/8-8',      side: 'home', type: 'winner' }, // M85→M96
  '1/16-14': { feeds_into: '1/8-7',      side: 'home', type: 'winner' }, // M86→M95
  '1/16-15': { feeds_into: '1/8-8',      side: 'away', type: 'winner' }, // M87→M96
  '1/16-16': { feeds_into: '1/8-7',      side: 'away', type: 'winner' }, // M88→M95
  // Round of 16 → Quarterfinals
  '1/8-1':   { feeds_into: '1/4-1',      side: 'home', type: 'winner' }, // M89→M97
  '1/8-2':   { feeds_into: '1/4-1',      side: 'away', type: 'winner' }, // M90→M97
  '1/8-3':   { feeds_into: '1/4-3',      side: 'home', type: 'winner' }, // M91→M99
  '1/8-4':   { feeds_into: '1/4-3',      side: 'away', type: 'winner' }, // M92→M99
  '1/8-5':   { feeds_into: '1/4-2',      side: 'home', type: 'winner' }, // M93→M98
  '1/8-6':   { feeds_into: '1/4-2',      side: 'away', type: 'winner' }, // M94→M98
  '1/8-7':   { feeds_into: '1/4-4',      side: 'home', type: 'winner' }, // M95→M100
  '1/8-8':   { feeds_into: '1/4-4',      side: 'away', type: 'winner' }, // M96→M100
  '1/4-1':   { feeds_into: '1/2-1',      side: 'home', type: 'winner' },
  '1/4-2':   { feeds_into: '1/2-1',      side: 'away', type: 'winner' },
  '1/4-3':   { feeds_into: '1/2-2',      side: 'home', type: 'winner' },
  '1/4-4':   { feeds_into: '1/2-2',      side: 'away', type: 'winner' },
  // Semis feed both Final (winners) and 3rd place (losers)
  '1/2-1': [
    { feeds_into: 'Final',      side: 'home', type: 'winner' },
    { feeds_into: '3er Puesto', side: 'home', type: 'loser'  },
  ],
  '1/2-2': [
    { feeds_into: 'Final',      side: 'away', type: 'winner' },
    { feeds_into: '3er Puesto', side: 'away', type: 'loser'  },
  ],
};

// Get standings for a group based on entered results
function getGroupStandings(groupName) {
  const groupMatches = db.prepare(
    "SELECT * FROM matches WHERE phase='groups' AND group_name=? AND home_score IS NOT NULL"
  ).all(groupName);
  const groupTeams = db.prepare("SELECT name FROM teams WHERE group_name=? ORDER BY seed")
    .all(groupName).map(t => t.name);
  return computeGroupStandings(groupMatches, groupTeams);
}

// Update R16 bracket slots when a group closes
function updateR16AfterGroupClose(groupName) {
  const standings = getGroupStandings(groupName);
  const winner   = standings[0]?.name;
  const runnerUp = standings[1]?.name;
  if (!winner || !runnerUp) return;

  for (const slot of R16_SLOTS) {
    if (slot.home.type !== 'third' && slot.home.group === groupName) {
      const team = slot.home.type === 'winner' ? winner : runnerUp;
      db.prepare("UPDATE matches SET home_team=? WHERE code=? AND phase='r16'").run(team, slot.code);
    }
    if (slot.away.type !== 'third' && slot.away.group === groupName) {
      const team = slot.away.type === 'winner' ? winner : runnerUp;
      db.prepare("UPDATE matches SET away_team=? WHERE code=? AND phase='r16'").run(team, slot.code);
    }
  }

  // Check if all 12 groups are now closed → assign 3rd-place teams
  const closedCount = db.prepare("SELECT count(*) as c FROM group_closings WHERE closed=1").get().c;
  if (closedCount === 12) {
    assign3rdPlaceTeams();
  }
}

// Assign the 8 best 3rd-place teams to R16 slots (avoiding same-group matchups)
function assign3rdPlaceTeams() {
  const GROUPS_ALL = ['A','B','C','D','E','F','G','H','I','J','K','L'];

  // Collect 3rd-place teams from all groups
  const allThirds = [];
  for (const g of GROUPS_ALL) {
    const standings = getGroupStandings(g);
    if (standings[2]) {
      allThirds.push({ name: standings[2].name, group: g, pts: standings[2].pts, gd: standings[2].gd, gf: standings[2].gf });
    }
  }

  // Sort: pts desc, gd desc, gf desc
  allThirds.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  const qualifying = allThirds.slice(0, 8);

  // R16 slots that await a 3rd-place team (always the away side)
  const thirdSlots = R16_SLOTS
    .filter(s => s.away.type === 'third')
    .map(s => ({ code: s.code, opponentGroup: s.home.group }));

  // Assign via backtracking to avoid same-group matchups
  const assignments = [];
  function backtrack(teamIdx, availSlots) {
    if (teamIdx === qualifying.length) return true;
    const team = qualifying[teamIdx];
    for (let i = 0; i < availSlots.length; i++) {
      if (availSlots[i].opponentGroup !== team.group) {
        assignments.push({ code: availSlots[i].code, team: team.name });
        const rest = availSlots.filter((_, j) => j !== i);
        if (backtrack(teamIdx + 1, rest)) return true;
        assignments.pop();
      }
    }
    return false;
  }
  backtrack(0, thirdSlots);

  for (const { code, team } of assignments) {
    db.prepare("UPDATE matches SET away_team=? WHERE code=? AND phase='r16'").run(team, code);
  }
}

// Propagate winner/loser to the next round when a knockout result is entered
function propagateBracket(match) {
  if (match.home_score === null || match.away_score === null) return;

  let winner, loser;
  if (match.home_score > match.away_score) {
    winner = match.home_team; loser = match.away_team;
  } else if (match.away_score > match.home_score) {
    winner = match.away_team; loser = match.home_team;
  } else {
    // Draw in knockout → use penalty winner (set by admin)
    if (!match.penalty_winner) return;
    winner = match.penalty_winner;
    loser  = winner === match.home_team ? match.away_team : match.home_team;
  }
  if (!winner || winner.startsWith('Por definir')) return;

  let progressions = BRACKET_TREE[match.code];
  if (!progressions) return;
  if (!Array.isArray(progressions)) progressions = [progressions];

  for (const prog of progressions) {
    const team  = prog.type === 'winner' ? winner : loser;
    const field = prog.side === 'home' ? 'home_team' : 'away_team';
    db.prepare(`UPDATE matches SET ${field}=? WHERE code=?`).run(team, prog.feeds_into);
  }
}

// ── MATCH RESULTS ──────────────────────────────────────────────

// Enter/update match result
router.put('/result/:id', requireAdmin, (req, res) => {
  const { homeScore, awayScore, homeTeam, awayTeam, penaltyWinner } = req.body;
  const matchId = parseInt(req.params.id);

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

  const hs  = homeScore !== '' && homeScore !== undefined ? parseInt(homeScore) : null;
  const as_ = awayScore !== '' && awayScore !== undefined ? parseInt(awayScore) : null;

  const updates = { home_score: hs, away_score: as_ };
  if (homeTeam !== undefined && homeTeam !== '') updates.home_team = homeTeam;
  if (awayTeam !== undefined && awayTeam !== '') updates.away_team = awayTeam;
  // penalty_winner: only meaningful for knockout draws; store null otherwise
  if (match.phase !== 'groups') {
    updates.penalty_winner = (hs !== null && as_ !== null && hs === as_)
      ? (penaltyWinner || null)
      : null;
  }

  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE matches SET ${sets} WHERE id = ?`).run(...Object.values(updates), matchId);

  if (hs !== null && as_ !== null) {
    recalcAllPoints();

    // Auto-propagate bracket for knockout phases
    if (match.phase !== 'groups') {
      const updatedMatch = db.prepare('SELECT * FROM matches WHERE id=?').get(matchId);
      propagateBracket(updatedMatch);
    }

    // Push notification to all subscribers
    const upd = db.prepare('SELECT home_team, away_team FROM matches WHERE id=?').get(matchId);
    sendNotificationToAll(
      `⚽ ${upd.home_team} ${hs}–${as_} ${upd.away_team}`,
      '¡Nuevo resultado! Comprueba tu porra 🎯'
    ).catch(() => {});
  }

  res.json({ ok: true });
});

// Clear match result
router.delete('/result/:id', requireAdmin, (req, res) => {
  db.prepare('UPDATE matches SET home_score = NULL, away_score = NULL WHERE id = ?').run(req.params.id);
  recalcAllPoints();
  res.json({ ok: true });
});

// ── GROUP CLOSING ──────────────────────────────────────────────

// Get status of all groups (closed/open)
router.get('/groups/status', requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT group_name, closed FROM group_closings ORDER BY group_name").all();
  const status = {};
  for (const r of rows) {
    status[r.group_name] = r.closed === 1;
  }
  res.json(status);
});

// Close a group (triggers bracket update + position points)
router.post('/group/:group/close', requireAdmin, (req, res) => {
  const g = req.params.group.toUpperCase();
  const VALID = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  if (!VALID.includes(g)) return res.status(400).json({ error: 'Grupo inválido' });

  // Verify all 6 matches have results
  const done = db.prepare(
    "SELECT count(*) as c FROM matches WHERE phase='groups' AND group_name=? AND home_score IS NOT NULL"
  ).get(g).c;
  if (done < 6) return res.status(400).json({ error: 'Faltan resultados en el grupo' });

  db.prepare("UPDATE group_closings SET closed=1 WHERE group_name=?").run(g);
  updateR16AfterGroupClose(g);
  recalcAllPoints(); // recalc to include position pts now that group is closed

  res.json({ ok: true });
});

// Reopen a group (reset position points)
router.post('/group/:group/open', requireAdmin, (req, res) => {
  const g = req.params.group.toUpperCase();
  db.prepare("UPDATE group_closings SET closed=0 WHERE group_name=?").run(g);
  recalcAllPoints();
  res.json({ ok: true });
});

// Public endpoint: get group status (for user display)
router.get('/groups/status/public', (req, res) => {
  const rows = db.prepare("SELECT group_name, closed FROM group_closings ORDER BY group_name").all();
  const status = {};
  for (const r of rows) {
    status[r.group_name] = r.closed === 1;
  }
  res.json(status);
});

// ── PHASE 2 ────────────────────────────────────────────────────

router.post('/phase2/unlock', requireAdmin, (req, res) => {
  db.prepare("UPDATE settings SET value='1' WHERE key='phase2_unlocked'").run();
  res.json({ ok: true });
});

router.post('/phase2/lock', requireAdmin, (req, res) => {
  db.prepare("UPDATE settings SET value='0' WHERE key='phase2_unlocked'").run();
  res.json({ ok: true });
});

router.get('/phase2', requireAdmin, (req, res) => {
  const setting = db.prepare("SELECT value FROM settings WHERE key='phase2_unlocked'").get();
  res.json({ unlocked: setting?.value === '1' });
});

// ── PLAYERS ────────────────────────────────────────────────────

router.get('/players', requireAdmin, (req, res) => {
  const players = db.prepare(`
    SELECT id, name, is_admin, predictions_locked, paid, manual_points, created_at
    FROM players WHERE is_admin = 0 ORDER BY name
  `).all();
  res.json(players);
});

router.delete('/players/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM players WHERE id = ? AND is_admin = 0').run(req.params.id);
  res.json({ ok: true });
});

router.put('/players/:id/pin', requireAdmin, (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length < 4) return res.status(400).json({ error: 'PIN inválido' });
  db.prepare('UPDATE players SET pin = ? WHERE id = ? AND is_admin = 0').run(pin, req.params.id);
  res.json({ ok: true });
});

router.put('/players/:id/paid', requireAdmin, (req, res) => {
  const { paid } = req.body;
  db.prepare('UPDATE players SET paid = ? WHERE id = ? AND is_admin = 0').run(paid ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

router.put('/players/:id/manual_points', requireAdmin, (req, res) => {
  const { manual_points } = req.body;
  const pts = parseInt(manual_points) || 0;
  db.prepare('UPDATE players SET manual_points = ? WHERE id = ? AND is_admin = 0').run(pts, req.params.id);
  res.json({ ok: true });
});

router.put('/players/:id/unlock', requireAdmin, (req, res) => {
  db.prepare('UPDATE players SET predictions_locked = 0 WHERE id = ? AND is_admin = 0').run(req.params.id);
  res.json({ ok: true });
});

// ── SCORING CONFIG ─────────────────────────────────────────────

// Public endpoint — no auth required, read-only
router.get('/scoring/public', (req, res) => {
  const scoring = db.prepare('SELECT * FROM scoring ORDER BY phase').all();
  const special = db.prepare('SELECT * FROM scoring_special WHERE id=1').get();
  res.json({ phases: scoring, special });
});

router.get('/scoring', requireAdmin, (req, res) => {
  const scoring  = db.prepare('SELECT * FROM scoring ORDER BY phase').all();
  const special  = db.prepare('SELECT * FROM scoring_special WHERE id=1').get();
  res.json({ phases: scoring, special });
});

router.put('/scoring/:phase', requireAdmin, (req, res) => {
  const { sign_pts, goal_diff_pts, exact_pts, qualify_pts, pos1_pts, pos2_pts, pos3_pts, pos4_pts } = req.body;
  db.prepare(`
    UPDATE scoring SET sign_pts=?, goal_diff_pts=?, exact_pts=?, qualify_pts=?,
    pos1_pts=?, pos2_pts=?, pos3_pts=?, pos4_pts=? WHERE phase=?
  `).run(sign_pts, goal_diff_pts, exact_pts, qualify_pts, pos1_pts, pos2_pts, pos3_pts, pos4_pts, req.params.phase);
  recalcAllPoints();
  res.json({ ok: true });
});

router.put('/scoring/special/update', requireAdmin, (req, res) => {
  const { champion_pts, runner_up_pts, third_pts, fourth_pts, scorer_pts_base, scorer_pts_per_goal } = req.body;
  db.prepare(`
    UPDATE scoring_special SET
      champion_pts=?, runner_up_pts=?, third_pts=?, fourth_pts=?,
      scorer_pts_base=?, scorer_pts_per_goal=?
    WHERE id=1
  `).run(champion_pts, runner_up_pts, third_pts, fourth_pts, scorer_pts_base, scorer_pts_per_goal);
  res.json({ ok: true });
});

// ── TOP SCORER MANAGEMENT ──────────────────────────────────────

router.get('/scorers', requireAdmin, (req, res) => {
  const scorers = db.prepare('SELECT * FROM top_scorers ORDER BY actual_goals DESC, name').all();
  res.json(scorers);
});

router.put('/scorers/:id/goals', requireAdmin, (req, res) => {
  const { goals } = req.body;
  const g = parseInt(goals) || 0;
  db.prepare('UPDATE top_scorers SET actual_goals=? WHERE id=?').run(g, req.params.id);
  res.json({ ok: true });
});

// ── PREDICTIONS VIEW/EDIT ──────────────────────────────────────

router.get('/predictions/:matchId', requireAdmin, (req, res) => {
  const preds = db.prepare(`
    SELECT p.*, pl.name as player_name
    FROM predictions p
    JOIN players pl ON p.player_id = pl.id
    WHERE p.match_id = ?
    ORDER BY pl.name
  `).all(req.params.matchId);
  res.json(preds);
});

router.get('/player/:playerId/predictions', requireAdmin, (req, res) => {
  const preds = db.prepare(`
    SELECT p.*, m.code, m.phase, m.group_name, m.home_team, m.away_team,
           m.home_score as result_home, m.away_score as result_away,
           m.match_date, m.match_time
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
    WHERE p.player_id = ?
    ORDER BY m.match_order
  `).all(req.params.playerId);
  const scorer = db.prepare(`
    SELECT sp.*, ts.name as scorer_name, ts.team as scorer_team
    FROM scorer_predictions sp
    JOIN top_scorers ts ON sp.scorer_id = ts.id
    WHERE sp.player_id = ?
  `).get(req.params.playerId);
  const player = db.prepare('SELECT id, name, predictions_locked, paid, manual_points FROM players WHERE id=?').get(req.params.playerId);
  res.json({ player, predictions: preds, scorer: scorer || null });
});

router.put('/player/:playerId/predictions/:matchId', requireAdmin, (req, res) => {
  const { homeScore, awayScore } = req.body;
  const { playerId, matchId } = req.params;

  const hs  = homeScore !== '' && homeScore !== undefined ? parseInt(homeScore) : null;
  const as_ = awayScore !== '' && awayScore !== undefined ? parseInt(awayScore) : null;
  const sign = (hs !== null && as_ !== null) ? (hs > as_ ? '1' : hs < as_ ? '2' : 'X') : null;

  db.prepare(`
    INSERT INTO predictions (player_id, match_id, sign, home_score, away_score, points)
    VALUES (?,?,?,?,?,0)
    ON CONFLICT(player_id, match_id) DO UPDATE SET
      sign=excluded.sign, home_score=excluded.home_score, away_score=excluded.away_score
  `).run(playerId, matchId, sign, hs, as_);

  recalcAllPoints();
  res.json({ ok: true });
});

// ── ADMIN PIN ──────────────────────────────────────────────────

router.put('/pin', requireAdmin, (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length < 4) return res.status(400).json({ error: 'PIN inválido' });
  db.prepare('UPDATE players SET pin = ? WHERE id = ?').run(pin, req.session.playerId);
  res.json({ ok: true });
});

// ── DELETE GROUP RESULTS ───────────────────────────────────────

router.delete('/group/:group/results', requireAdmin, (req, res) => {
  const { group } = req.params;
  db.prepare(
    "UPDATE matches SET home_score=NULL, away_score=NULL WHERE phase='groups' AND group_name=?"
  ).run(group);
  recalcAllPoints();
  res.json({ ok: true });
});

// ── FULL DATA BACKUP ───────────────────────────────────────────

router.get('/backup', requireAdmin, (req, res) => {
  const players        = db.prepare('SELECT * FROM players ORDER BY id').all();
  const predictions    = db.prepare(`
    SELECT p.id, p.player_id, pl.name as player_name,
           p.match_id, m.code, m.phase, m.group_name, m.round_num,
           m.home_team, m.away_team,
           p.sign, p.home_score, p.away_score, p.points
    FROM predictions p
    JOIN players pl ON pl.id = p.player_id
    JOIN matches  m  ON m.id  = p.match_id
    ORDER BY p.player_id, m.id
  `).all();
  const scorerPreds    = db.prepare(`
    SELECT sp.id, sp.player_id, pl.name as player_name,
           sp.scorer_id, ts.name as scorer_name, ts.team as scorer_team
    FROM scorer_predictions sp
    JOIN players    pl ON pl.id  = sp.player_id
    JOIN top_scorers ts ON ts.id = sp.scorer_id
  `).all();
  const matchResults   = db.prepare(
    'SELECT * FROM matches WHERE home_score IS NOT NULL ORDER BY phase, id'
  ).all();
  const scoring        = db.prepare('SELECT * FROM scoring ORDER BY phase').all();
  const scoringSpecial = db.prepare('SELECT * FROM scoring_special WHERE id=1').get();
  const settings       = db.prepare('SELECT * FROM settings').all();
  const topScorers     = db.prepare('SELECT * FROM top_scorers ORDER BY id').all();

  res.json({
    backup_date: new Date().toISOString(),
    players,
    predictions,
    scorer_predictions: scorerPreds,
    match_results: matchResults,
    scoring,
    scoring_special: scoringSpecial,
    settings,
    top_scorers: topScorers,
  });
});

// ── CSV EXPORT ─────────────────────────────────────────────────

router.get('/export/predictions.csv', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT
      pl.name        AS jugador,
      pl.paid        AS pagado,
      pl.predictions_locked AS porra_enviada,
      m.phase        AS fase,
      m.group_name   AS grupo,
      m.round_num    AS jornada,
      m.home_team    AS local,
      m.away_team    AS visitante,
      p.home_score   AS goles_local,
      p.away_score   AS goles_visitante,
      p.sign         AS signo,
      p.points       AS puntos
    FROM predictions p
    JOIN players pl ON pl.id  = p.player_id
    JOIN matches  m  ON m.id  = p.match_id
    WHERE p.home_score IS NOT NULL
    ORDER BY pl.name, m.phase, m.id
  `).all();

  const scorers = db.prepare(`
    SELECT pl.name AS jugador, ts.name AS goleador, ts.team AS equipo_goleador
    FROM scorer_predictions sp
    JOIN players     pl ON pl.id  = sp.player_id
    JOIN top_scorers ts ON ts.id  = sp.scorer_id
  `).all();

  const escCsv = v => (v == null ? '' : String(v).includes(',') ? `"${v}"` : String(v));

  const lines = ['jugador,pagado,porra_enviada,fase,grupo,jornada,local,visitante,goles_local,goles_visitante,signo,puntos'];
  for (const r of rows) {
    lines.push([
      r.jugador, r.pagado ? 'SI' : 'NO', r.porra_enviada ? 'SI' : 'NO',
      r.fase, r.grupo ?? '', r.jornada ?? '',
      r.local, r.visitante, r.goles_local, r.goles_visitante, r.signo, r.points ?? r.puntos ?? 0
    ].map(escCsv).join(','));
  }

  lines.push('');
  lines.push('--- GOLEADORES ---');
  lines.push('jugador,goleador,equipo_goleador');
  for (const s of scorers) {
    lines.push([s.jugador, s.goleador, s.equipo_goleador].map(escCsv).join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="porras-mundial-2026.csv"');
  res.send('﻿' + lines.join('\n')); // BOM para que Excel abra bien los acentos
});

// ── DATA RESTORE ───────────────────────────────────────────────
// One-shot endpoint to restore players + predictions from CSV backup

router.post('/restore', requireAdmin, (req, res) => {
  const { players, predictions, scorerPicks } = req.body;
  if (!players || !predictions) return res.status(400).json({ error: 'Missing data' });

  const results = { players_created: 0, predictions_inserted: 0, scorers_inserted: 0, errors: [] };

  db.exec('BEGIN');
  try {
    // 1. Create players
    const insertPlayer = db.prepare(
      "INSERT OR IGNORE INTO players (name, pin, is_admin, predictions_locked, paid, manual_points) VALUES (?,?,0,?,?,0)"
    );
    for (const p of players) {
      insertPlayer.run(p.name, p.pin || '1234', p.locked ? 1 : 0, p.paid ? 1 : 0);
      results.players_created++;
    }

    // 2. Build lookup maps
    const playerMap = {};
    db.prepare("SELECT id, name FROM players WHERE is_admin=0").all()
      .forEach(p => { playerMap[p.name] = p.id; });

    const matchMap = {};
    db.prepare("SELECT id, home_team, away_team, phase FROM matches").all()
      .forEach(m => { matchMap[`${m.home_team}|${m.away_team}|${m.phase}`] = m.id; });

    // 3. Insert predictions
    const insertPred = db.prepare(
      "INSERT OR REPLACE INTO predictions (player_id, match_id, sign, home_score, away_score, points) VALUES (?,?,?,?,?,?)"
    );
    for (const p of predictions) {
      const playerId = playerMap[p.jugador];
      const matchId  = matchMap[`${p.local}|${p.visitante}|${p.fase}`];
      if (!playerId || !matchId) {
        results.errors.push(`No encontrado: ${p.jugador} / ${p.local} vs ${p.visitante}`);
        continue;
      }
      insertPred.run(playerId, matchId, p.signo, parseInt(p.pred_local), parseInt(p.pred_visitante), parseInt(p.puntos) || 0);
      results.predictions_inserted++;
    }

    // 4. Insert scorer picks
    if (scorerPicks) {
      const scorerMap = {};
      db.prepare("SELECT id, name FROM top_scorers").all()
        .forEach(s => { scorerMap[s.name] = s.id; });

      const insertScorer = db.prepare(
        "INSERT OR REPLACE INTO scorer_predictions (player_id, scorer_id) VALUES (?,?)"
      );
      for (const s of scorerPicks) {
        const playerId = playerMap[s.jugador];
        const scorerId = scorerMap[s.goleador];
        if (!playerId || !scorerId) {
          results.errors.push(`Goleador no encontrado: ${s.jugador} / ${s.goleador}`);
          continue;
        }
        insertScorer.run(playerId, scorerId);
        results.scorers_inserted++;
      }
    }

    db.exec('COMMIT');
    res.json({ ok: true, ...results });
  } catch (e) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: e.message });
  }
});

// ── RECALC ALL POINTS ──────────────────────────────────────────
// Zeroes all prediction points and recalculates from actual match results.
// Safe to call any time; idempotent.

router.post('/recalc', requireAdmin, (req, res) => {
  try {
    recalcAllPoints();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PHASE 2 PREDICTION VISIBILITY ──────────────────────────────

router.get('/phase2/preds-visible', requireAdmin, (req, res) => {
  const s = db.prepare("SELECT value FROM settings WHERE key='phase2_preds_visible'").get();
  res.json({ visible: s?.value === '1' });
});

router.post('/phase2/preds-visible/toggle', requireAdmin, (req, res) => {
  const s = db.prepare("SELECT value FROM settings WHERE key='phase2_preds_visible'").get();
  const newVal = s?.value === '1' ? '0' : '1';
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('phase2_preds_visible', ?)").run(newVal);
  res.json({ visible: newVal === '1' });
});

// ── PUBLIC SETTINGS ────────────────────────────────────────────

router.get('/settings/phase2', (req, res) => {
  const setting = db.prepare("SELECT value FROM settings WHERE key='phase2_unlocked'").get();
  res.json({ unlocked: setting?.value === '1' });
});

module.exports = router;
