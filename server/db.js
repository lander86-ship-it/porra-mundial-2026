const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'porra.db');
const db = new DatabaseSync(dbPath);

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pin TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    predictions_locked INTEGER DEFAULT 0,
    paid INTEGER DEFAULT 0,
    manual_points INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    seed INTEGER
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT,
    phase TEXT NOT NULL,
    group_name TEXT,
    round_num INTEGER,
    home_team TEXT,
    away_team TEXT,
    home_score INTEGER,
    away_score INTEGER,
    match_date TEXT,
    match_time TEXT,
    match_order INTEGER
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    match_id INTEGER NOT NULL,
    sign TEXT,
    home_score INTEGER,
    away_score INTEGER,
    points INTEGER DEFAULT 0,
    UNIQUE(player_id, match_id),
    FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY(match_id) REFERENCES matches(id)
  );

  CREATE TABLE IF NOT EXISTS top_scorers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    team TEXT NOT NULL,
    actual_goals INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS scorer_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    scorer_id INTEGER NOT NULL,
    UNIQUE(player_id),
    FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY(scorer_id) REFERENCES top_scorers(id)
  );

  CREATE TABLE IF NOT EXISTS scoring (
    phase TEXT PRIMARY KEY,
    sign_pts INTEGER DEFAULT 1,
    goal_diff_pts INTEGER DEFAULT 1,
    exact_pts INTEGER DEFAULT 2,
    qualify_pts INTEGER DEFAULT 2,
    pos1_pts INTEGER DEFAULT 4,
    pos2_pts INTEGER DEFAULT 3,
    pos3_pts INTEGER DEFAULT 1,
    pos4_pts INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS scoring_special (
    id INTEGER PRIMARY KEY DEFAULT 1,
    champion_pts INTEGER DEFAULT 10,
    runner_up_pts INTEGER DEFAULT 6,
    third_pts INTEGER DEFAULT 4,
    fourth_pts INTEGER DEFAULT 2,
    scorer_pts_base INTEGER DEFAULT 10,
    scorer_pts_per_goal INTEGER DEFAULT 1
  );
`);

// Safe migrations for existing databases
const migrate = (table, column, definition) => {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`); } catch (_) {}
};
migrate('players', 'predictions_locked', 'INTEGER DEFAULT 0');
migrate('players', 'paid', 'INTEGER DEFAULT 0');
migrate('players', 'manual_points', 'INTEGER DEFAULT 0');
migrate('matches', 'match_date', 'TEXT');
migrate('matches', 'match_time', 'TEXT');

// Default scoring rows
if (!db.prepare("SELECT count(*) as c FROM scoring").get().c) {
  const ins = db.prepare(`INSERT INTO scoring (phase,sign_pts,goal_diff_pts,exact_pts,qualify_pts,pos1_pts,pos2_pts,pos3_pts,pos4_pts) VALUES (?,?,?,?,?,?,?,?,?)`);
  [
    ['groups', 1, 1, 2, 0, 4, 3, 1, 0],
    ['r16',    1, 1, 2, 2, 0, 0, 0, 0],
    ['r8',     2, 1, 3, 3, 0, 0, 0, 0],
    ['r4',     3, 2, 4, 4, 0, 0, 0, 0],
    ['r2',     4, 2, 5, 5, 0, 0, 0, 0],
    ['final',  5, 3, 6, 6, 0, 0, 0, 0],
  ].forEach(row => ins.run(...row));
}

// Default special scoring
if (!db.prepare("SELECT count(*) as c FROM scoring_special").get().c) {
  db.prepare(`INSERT INTO scoring_special (id,champion_pts,runner_up_pts,third_pts,fourth_pts,scorer_pts_base,scorer_pts_per_goal) VALUES (1,10,6,4,2,10,1)`).run();
}

// Default settings
const upsertSetting = (key, value) => {
  if (!db.prepare("SELECT 1 FROM settings WHERE key=?").get(key)) {
    db.prepare("INSERT INTO settings (key,value) VALUES (?,?)").run(key, value);
  }
};
upsertSetting('phase2_unlocked', '0');

module.exports = db;
