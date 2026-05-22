const express = require('express');
const router = express.Router();
const db = require('../db');
const { recalcAllPoints, computeGroupStandings } = require('../scoring');

function requireAdmin(req, res, next) {
  if (!req.session.playerId || !req.session.isAdmin) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

// ── R16 BRACKET STRUCTURE ───────────────────────────────────────
// Defines which groups provide teams for each R16 match slot
const R16_SLOTS = [
  { code: '1/16-1',  home: { type: 'runner', group: 'A' }, away: { type: 'runner', group: 'B' } },
  { code: '1/16-2',  home: { type: 'winner', group: 'C' }, away: { type: 'runner', group: 'F' } },
  { code: '1/16-3',  home: { type: 'winner', group: 'E' }, away: { type: 'third',  group: null } },
  { code: '1/16-4',  home: { type: 'winner', group: 'F' }, away: { type: 'runner', group: 'C' } },
  { code: '1/16-5',  home: { type: 'runner', group: 'E' }, away: { type: 'runner', group: 'I' } },
  { code: '1/16-6',  home: { type: 'winner', group: 'I' }, away: { type: 'third',  group: null } },
  { code: '1/16-7',  home: { type: 'winner', group: 'A' }, away: { type: 'third',  group: null } },
  { code: '1/16-8',  home: { type: 'winner', group: 'L' }, away: { type: 'third',  group: null } },
  { code: '1/16-9',  home: { type: 'winner', group: 'G' }, away: { type: 'third',  group: null } },
  { code: '1/16-10', home: { type: 'winner', group: 'D' }, away: { type: 'third',  group: null } },
  { code: '1/16-11', home: { type: 'winner', group: 'H' }, away: { type: 'runner', group: 'J' } },
  { code: '1/16-12', home: { type: 'runner', group: 'K' }, away: { type: 'runner', group: 'L' } },
  { code: '1/16-13', home: { type: 'winner', group: 'B' }, away: { type: 'third',  group: null } },
  { code: '1/16-14', home: { type: 'runner', group: 'D' }, away: { type: 'runner', group: 'G' } },
  { code: '1/16-15', home: { type: 'winner', group: 'J' }, away: { type: 'runner', group: 'H' } },
  { code: '1/16-16', home: { type: 'winner', group: 'K' }, away: { type: 'third',  group: null } },
];

// Knockout bracket tree: which match result feeds into which next match
// Each entry: { feeds_into: matchCode, side: 'home'|'away', type: 'winner'|'loser' }
const BRACKET_TREE = {
  '1/16-1':  { feeds_into: '1/8-1',      side: 'home', type: 'winner' },
  '1/16-2':  { feeds_into: '1/8-1',      side: 'away', type: 'winner' },
  '1/16-3':  { feeds_into: '1/8-2',      side: 'home', type: 'winner' },
  '1/16-4':  { feeds_into: '1/8-2',      side: 'away', type: 'winner' },
  '1/16-5':  { feeds_into: '1/8-3',      side: 'home', type: 'winner' },
  '1/16-6':  { feeds_into: '1/8-3',      side: 'away', type: 'winner' },
  '1/16-7':  { feeds_into: '1/8-4',      side: 'home', type: 'winner' },
  '1/16-8':  { feeds_into: '1/8-4',      side: 'away', type: 'winner' },
  '1/16-9':  { feeds_into: '1/8-5',      side: 'home', type: 'winner' },
  '1/16-10': { feeds_into: '1/8-5',      side: 'away', type: 'winner' },
  '1/16-11': { feeds_into: '1/8-6',      side: 'home', type: 'winner' },
  '1/16-12': { feeds_into: '1/8-6',      side: 'away', type: 'winner' },
  '1/16-13': { feeds_into: '1/8-7',      side: 'home', type: 'winner' },
  '1/16-14': { feeds_into: '1/8-7',      side: 'away', type: 'winner' },
  '1/16-15': { feeds_into: '1/8-8',      side: 'home', type: 'winner' },
  '1/16-16': { feeds_into: '1/8-8',      side: 'away', type: 'winner' },
  '1/8-1':   { feeds_into: '1/4-1',      side: 'home', type: 'winner' },
  '1/8-2':   { feeds_into: '1/4-1',      side: 'away', type: 'winner' },
  '1/8-3':   { feeds_into: '1/4-2',      side: 'home', type: 'winner' },
  '1/8-4':   { feeds_into: '1/4-2',      side: 'away', type: 'winner' },
  '1/8-5':   { feeds_into: '1/4-3',      side: 'home', type: 'winner' },
  '1/8-6':   { feeds_into: '1/4-3',      side: 'away', type: 'winner' },
  '1/8-7':   { feeds_into: '1/4-4',      side: 'home', type: 'winner' },
  '1/8-8':   { feeds_into: '1/4-4',      side: 'away', type: 'winner' },
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
  if (match.home_score === match.away_score) return; // Draw → admin fills manually

  const winner = match.home_score > match.away_score ? match.home_team : match.away_team;
  const loser  = match.home_score > match.away_score ? match.away_team : match.home_team;
  if (!winner || winner.startsWith('Por definir')) return; // Teams not set yet

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
  const { homeScore, awayScore, homeTeam, awayTeam } = req.body;
  const matchId = parseInt(req.params.id);

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

  const hs  = homeScore !== '' && homeScore !== undefined ? parseInt(homeScore) : null;
  const as_ = awayScore !== '' && awayScore !== undefined ? parseInt(awayScore) : null;

  const updates = { home_score: hs, away_score: as_ };
  if (homeTeam !== undefined && homeTeam !== '') updates.home_team = homeTeam;
  if (awayTeam !== undefined && awayTeam !== '') updates.away_team = awayTeam;

  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE matches SET ${sets} WHERE id = ?`).run(...Object.values(updates), matchId);

  if (hs !== null && as_ !== null) {
    recalcAllPoints();

    // Auto-propagate bracket for knockout phases
    if (match.phase !== 'groups') {
      const updatedMatch = db.prepare('SELECT * FROM matches WHERE id=?').get(matchId);
      propagateBracket(updatedMatch);
    }
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

// ── PUBLIC SETTINGS ────────────────────────────────────────────

router.get('/settings/phase2', (req, res) => {
  const setting = db.prepare("SELECT value FROM settings WHERE key='phase2_unlocked'").get();
  res.json({ unlocked: setting?.value === '1' });
});

module.exports = router;
