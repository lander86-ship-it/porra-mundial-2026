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

  CREATE TABLE IF NOT EXISTS group_closings (
    group_name TEXT PRIMARY KEY,
    closed INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS match_attendance (
    player_id INTEGER NOT NULL,
    match_id INTEGER NOT NULL,
    PRIMARY KEY (player_id, match_id),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS side_bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    resolved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (creator_id) REFERENCES players(id) ON DELETE CASCADE
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

// Ensure all 12 groups have a row in group_closings
const GROUPS_LIST = ['A','B','C','D','E','F','G','H','I','J','K','L'];
GROUPS_LIST.forEach(g => {
  db.prepare("INSERT OR IGNORE INTO group_closings (group_name, closed) VALUES (?, 0)").run(g);
});

// Migration: update top scorers list for 2026 WC
// Remove Phil Foden (not called up to England) if no one has predicted him
{
  const hasFoden = db.prepare("SELECT id FROM top_scorers WHERE name='Phil Foden'").get();
  if (hasFoden) {
    const fodenPreds = db.prepare("SELECT count(*) as c FROM scorer_predictions WHERE scorer_id=?").get(hasFoden.id).c;
    if (!fodenPreds) db.prepare("DELETE FROM top_scorers WHERE id=?").run(hasFoden.id);
  }
  // Add missing 2026 betting favorites (INSERT OR IGNORE via name check)
  const toAdd = [
    ['Lautaro Martínez', 'Argentina'],
    ['Nick Woltemade', 'Alemania'],
    ['Raphinha', 'Brasil'],
    ['Mikel Oyarzabal', 'España'],
    ['Julián Álvarez', 'Argentina'],
    ['Álvaro Morata', 'España'],
    ['João Pedro', 'Brasil'],
    ['Cody Gakpo', 'Países Bajos'],
  ];
  for (const [name, team] of toAdd) {
    const exists = db.prepare("SELECT id FROM top_scorers WHERE name=?").get(name);
    if (!exists) db.prepare("INSERT INTO top_scorers (name, team) VALUES (?,?)").run(name, team);
  }
}

// Migration: expand top scorers list to 50 players
{
  const allScorers = [
    ['Kylian Mbappé','Francia'],
    ['Erling Haaland','Noruega'],
    ['Harry Kane','Inglaterra'],
    ['Vinicius Jr.','Brasil'],
    ['Viktor Gyökeres','Suecia'],
    ['Lautaro Martínez','Argentina'],
    ['Julián Álvarez','Argentina'],
    ['Lamine Yamal','España'],
    ['Nico Williams','España'],
    ['Mikel Oyarzabal','España'],
    ['Álvaro Morata','España'],
    ['Dani Olmo','España'],
    ['Ferran Torres','España'],
    ['Pedri','España'],
    ['Florian Wirtz','Alemania'],
    ['Jamal Musiala','Alemania'],
    ['Kai Havertz','Alemania'],
    ['Nick Woltemade','Alemania'],
    ['Richarlison','Brasil'],
    ['Raphinha','Brasil'],
    ['Rodrygo','Brasil'],
    ['Endrick','Brasil'],
    ['João Pedro','Brasil'],
    ['Neymar Jr.','Brasil'],
    ['Bukayo Saka','Inglaterra'],
    ['Cole Palmer','Inglaterra'],
    ['Jude Bellingham','Inglaterra'],
    ['Phil Foden','Inglaterra'],
    ['Ollie Watkins','Inglaterra'],
    ['Ousmane Dembélé','Francia'],
    ['Antoine Griezmann','Francia'],
    ['Gonçalo Ramos','Portugal'],
    ['Raphael Leão','Portugal'],
    ['João Félix','Portugal'],
    ['Cristiano Ronaldo','Portugal'],
    ['Lionel Messi','Argentina'],
    ['Jonathan David','Canadá'],
    ['Son Heung-min','Corea del Sur'],
    ['Mohamed Salah','Egipto'],
    ['Darwin Núñez','Uruguay'],
    ['Luis Díaz','Colombia'],
    ['Christian Pulisic','Estados Unidos'],
    ['Cody Gakpo','Países Bajos'],
    ['Memphis Depay','Países Bajos'],
    ['Santiago Giménez','México'],
    ['Hirving Lozano','México'],
    ['Youssef En-Nesyri','Marruecos'],
    ['Sadio Mané','Senegal'],
    ['Takumi Minamino','Japón'],
    ['Romelu Lukaku','Bélgica'],
  ];
  const ins = db.prepare("INSERT OR IGNORE INTO top_scorers (name, team) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM top_scorers WHERE name=?)");
  for (const [name, team] of allScorers) {
    ins.run(name, team, name);
  }
}

// Migration: fix group stage match dates and times (CEST)
{
  const check = db.prepare("SELECT match_date FROM matches WHERE home_team='España' AND away_team='Cabo Verde'").get();
  if (!check || check.match_date !== '2026-06-15') {
    const upd = db.prepare("UPDATE matches SET match_date=?, match_time=? WHERE home_team=? AND away_team=? AND phase='groups'");
    const fixes = [
      // GROUP A
      ['2026-06-11','21:00','México','Sudáfrica'],
      ['2026-06-12','04:00','Corea del Sur','República Checa'],
      ['2026-06-18','18:00','República Checa','Sudáfrica'],
      ['2026-06-19','03:00','México','Corea del Sur'],
      ['2026-06-24','23:00','República Checa','México'],
      ['2026-06-24','23:00','Sudáfrica','Corea del Sur'],
      // GROUP B
      ['2026-06-12','21:00','Canadá','Bosnia y Herzegovina'],
      ['2026-06-13','21:00','Catar','Suiza'],
      ['2026-06-18','21:00','Suiza','Bosnia y Herzegovina'],
      ['2026-06-19','00:00','Canadá','Catar'],
      ['2026-06-24','23:00','Suiza','Canadá'],
      ['2026-06-24','23:00','Bosnia y Herzegovina','Catar'],
      // GROUP C
      ['2026-06-14','00:00','Brasil','Marruecos'],
      ['2026-06-14','03:00','Haití','Escocia'],
      ['2026-06-20','00:00','Escocia','Marruecos'],
      ['2026-06-20','02:30','Brasil','Haití'],
      ['2026-06-25','00:00','Escocia','Brasil'],
      ['2026-06-25','00:00','Marruecos','Haití'],
      // GROUP D
      ['2026-06-13','03:00','Estados Unidos','Paraguay'],
      ['2026-06-14','06:00','Australia','Turquía'],
      ['2026-06-19','21:00','Estados Unidos','Australia'],
      ['2026-06-20','06:00','Turquía','Paraguay'],
      ['2026-06-26','04:00','Turquía','Estados Unidos'],
      ['2026-06-26','04:00','Paraguay','Australia'],
      // GROUP E
      ['2026-06-14','19:00','Alemania','Curazao'],
      ['2026-06-15','01:00','Costa de Marfil','Ecuador'],
      ['2026-06-20','18:00','Alemania','Costa de Marfil'],
      ['2026-06-21','02:00','Ecuador','Curazao'],
      ['2026-06-25','22:00','Curazao','Costa de Marfil'],
      ['2026-06-25','22:00','Ecuador','Alemania'],
      // GROUP F
      ['2026-06-14','22:00','Países Bajos','Japón'],
      ['2026-06-15','04:00','Suecia','Túnez'],
      ['2026-06-20','19:00','Países Bajos','Suecia'],
      ['2026-06-21','06:00','Túnez','Japón'],
      ['2026-06-26','01:00','Japón','Suecia'],
      ['2026-06-26','01:00','Túnez','Países Bajos'],
      // GROUP G
      ['2026-06-15','21:00','Bélgica','Egipto'],
      ['2026-06-16','03:00','Irán','Nueva Zelanda'],
      ['2026-06-21','21:00','Bélgica','Irán'],
      ['2026-06-22','03:00','Nueva Zelanda','Egipto'],
      ['2026-06-27','05:00','Egipto','Irán'],
      ['2026-06-27','05:00','Nueva Zelanda','Bélgica'],
      // GROUP H
      ['2026-06-15','18:00','España','Cabo Verde'],
      ['2026-06-16','00:00','Arabia Saudita','Uruguay'],
      ['2026-06-21','18:00','España','Arabia Saudita'],
      ['2026-06-22','00:00','Uruguay','Cabo Verde'],
      ['2026-06-27','02:00','Cabo Verde','Arabia Saudita'],
      ['2026-06-27','02:00','Uruguay','España'],
      // GROUP I
      ['2026-06-16','21:00','Francia','Senegal'],
      ['2026-06-17','00:00','Irak','Noruega'],
      ['2026-06-22','23:00','Francia','Irak'],
      ['2026-06-23','02:00','Noruega','Senegal'],
      ['2026-06-26','21:00','Noruega','Francia'],
      ['2026-06-26','21:00','Senegal','Irak'],
      // GROUP J
      ['2026-06-17','03:00','Argentina','Argelia'],
      ['2026-06-17','06:00','Austria','Jordania'],
      ['2026-06-22','19:00','Argentina','Austria'],
      ['2026-06-23','05:00','Jordania','Argelia'],
      ['2026-06-28','04:00','Argelia','Austria'],
      ['2026-06-28','04:00','Jordania','Argentina'],
      // GROUP K
      ['2026-06-17','19:00','Portugal','RD Congo'],
      ['2026-06-18','04:00','Uzbekistán','Colombia'],
      ['2026-06-23','19:00','Portugal','Uzbekistán'],
      ['2026-06-24','04:00','Colombia','RD Congo'],
      ['2026-06-28','01:30','Colombia','Portugal'],
      ['2026-06-28','01:30','RD Congo','Uzbekistán'],
      // GROUP L
      ['2026-06-17','22:00','Inglaterra','Croacia'],
      ['2026-06-18','01:00','Ghana','Panamá'],
      ['2026-06-23','22:00','Inglaterra','Ghana'],
      ['2026-06-24','01:00','Panamá','Croacia'],
      ['2026-06-27','23:00','Panamá','Inglaterra'],
      ['2026-06-27','23:00','Croacia','Ghana'],
    ];
    for (const [date, time, home, away] of fixes) {
      upd.run(date, time, home, away);
    }
    console.log('Migration: group stage dates/times corrected.');
  }
}

module.exports = db;
