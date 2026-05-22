const db = require('./db');

const teams = [
  [1,'México','A',1],[2,'Sudáfrica','A',2],[3,'Corea del Sur','A',3],[4,'República Checa','A',4],
  [5,'Canadá','B',1],[6,'Bosnia y Herzegovina','B',2],[7,'Catar','B',3],[8,'Suiza','B',4],
  [9,'Brasil','C',1],[10,'Marruecos','C',2],[11,'Haití','C',3],[12,'Escocia','C',4],
  [13,'Estados Unidos','D',1],[14,'Paraguay','D',2],[15,'Australia','D',3],[16,'Turquía','D',4],
  [17,'Alemania','E',1],[18,'Curazao','E',2],[19,'Costa de Marfil','E',3],[20,'Ecuador','E',4],
  [21,'Países Bajos','F',1],[22,'Japón','F',2],[23,'Suecia','F',3],[24,'Túnez','F',4],
  [25,'Bélgica','G',1],[26,'Egipto','G',2],[27,'Irán','G',3],[28,'Nueva Zelanda','G',4],
  [29,'España','H',1],[30,'Cabo Verde','H',2],[31,'Arabia Saudita','H',3],[32,'Uruguay','H',4],
  [33,'Francia','I',1],[34,'Senegal','I',2],[35,'Irak','I',3],[36,'Noruega','I',4],
  [37,'Argentina','J',1],[38,'Argelia','J',2],[39,'Austria','J',3],[40,'Jordania','J',4],
  [41,'Portugal','K',1],[42,'RD Congo','K',2],[43,'Uzbekistán','K',3],[44,'Colombia','K',4],
  [45,'Inglaterra','L',1],[46,'Croacia','L',2],[47,'Ghana','L',3],[48,'Panamá','L',4],
];

// Groups ordered A-L (index 0-11)
const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

// Date tables for group stage:
// Round 1: June 11-16 (pairs: A+B=Jun11, C+D=Jun12, E+F=Jun13, G+H=Jun14, I+J=Jun15, K+L=Jun16)
// Round 2: June 17-22 (same pairing)
// Round 3: June 23-28 (simultaneous pairs, all 4 matches same day)
const groupRoundDates = {
  A: { 1: '2026-06-11', 2: '2026-06-17', 3: '2026-06-23' },
  B: { 1: '2026-06-11', 2: '2026-06-17', 3: '2026-06-23' },
  C: { 1: '2026-06-12', 2: '2026-06-18', 3: '2026-06-24' },
  D: { 1: '2026-06-12', 2: '2026-06-18', 3: '2026-06-24' },
  E: { 1: '2026-06-13', 2: '2026-06-19', 3: '2026-06-25' },
  F: { 1: '2026-06-13', 2: '2026-06-19', 3: '2026-06-25' },
  G: { 1: '2026-06-14', 2: '2026-06-20', 3: '2026-06-26' },
  H: { 1: '2026-06-14', 2: '2026-06-20', 3: '2026-06-26' },
  I: { 1: '2026-06-15', 2: '2026-06-21', 3: '2026-06-27' },
  J: { 1: '2026-06-15', 2: '2026-06-21', 3: '2026-06-27' },
  K: { 1: '2026-06-16', 2: '2026-06-22', 3: '2026-06-28' },
  L: { 1: '2026-06-16', 2: '2026-06-22', 3: '2026-06-28' },
};

// For round 3 (simultaneous): first group of pair → 18:00, second → 21:00
// A,C,E,G,I,K are "first" of their pair → 18:00
// B,D,F,H,J,L are "second" of their pair → 21:00

const groupMatches = [
  // Round 1
  ['A1','groups','A',1,'México','Sudáfrica'],
  ['A1','groups','A',1,'Corea del Sur','República Checa'],
  ['B1','groups','B',1,'Canadá','Bosnia y Herzegovina'],
  ['B1','groups','B',1,'Catar','Suiza'],
  ['C1','groups','C',1,'Brasil','Marruecos'],
  ['C1','groups','C',1,'Haití','Escocia'],
  ['D1','groups','D',1,'Estados Unidos','Paraguay'],
  ['D1','groups','D',1,'Australia','Turquía'],
  ['E1','groups','E',1,'Alemania','Curazao'],
  ['E1','groups','E',1,'Costa de Marfil','Ecuador'],
  ['F1','groups','F',1,'Países Bajos','Japón'],
  ['F1','groups','F',1,'Suecia','Túnez'],
  ['G1','groups','G',1,'Bélgica','Egipto'],
  ['G1','groups','G',1,'Irán','Nueva Zelanda'],
  ['H1','groups','H',1,'España','Cabo Verde'],
  ['H1','groups','H',1,'Arabia Saudita','Uruguay'],
  ['I1','groups','I',1,'Francia','Senegal'],
  ['I1','groups','I',1,'Irak','Noruega'],
  ['J1','groups','J',1,'Argentina','Argelia'],
  ['J1','groups','J',1,'Austria','Jordania'],
  ['K1','groups','K',1,'Portugal','RD Congo'],
  ['K1','groups','K',1,'Uzbekistán','Colombia'],
  ['L1','groups','L',1,'Inglaterra','Croacia'],
  ['L1','groups','L',1,'Ghana','Panamá'],
  // Round 2
  ['A2','groups','A',2,'República Checa','Sudáfrica'],
  ['A2','groups','A',2,'México','Corea del Sur'],
  ['B2','groups','B',2,'Suiza','Bosnia y Herzegovina'],
  ['B2','groups','B',2,'Canadá','Catar'],
  ['C2','groups','C',2,'Escocia','Marruecos'],
  ['C2','groups','C',2,'Brasil','Haití'],
  ['D2','groups','D',2,'Estados Unidos','Australia'],
  ['D2','groups','D',2,'Turquía','Paraguay'],
  ['E2','groups','E',2,'Alemania','Costa de Marfil'],
  ['E2','groups','E',2,'Ecuador','Curazao'],
  ['F2','groups','F',2,'Países Bajos','Suecia'],
  ['F2','groups','F',2,'Túnez','Japón'],
  ['G2','groups','G',2,'Bélgica','Irán'],
  ['G2','groups','G',2,'Nueva Zelanda','Egipto'],
  ['H2','groups','H',2,'España','Arabia Saudita'],
  ['H2','groups','H',2,'Uruguay','Cabo Verde'],
  ['I2','groups','I',2,'Francia','Irak'],
  ['I2','groups','I',2,'Noruega','Senegal'],
  ['J2','groups','J',2,'Argentina','Austria'],
  ['J2','groups','J',2,'Jordania','Argelia'],
  ['K2','groups','K',2,'Portugal','Uzbekistán'],
  ['K2','groups','K',2,'Colombia','RD Congo'],
  ['L2','groups','L',2,'Inglaterra','Ghana'],
  ['L2','groups','L',2,'Panamá','Croacia'],
  // Round 3 (simultaneous within each group)
  ['A3','groups','A',3,'República Checa','México'],
  ['A3','groups','A',3,'Sudáfrica','Corea del Sur'],
  ['B3','groups','B',3,'Suiza','Canadá'],
  ['B3','groups','B',3,'Bosnia y Herzegovina','Catar'],
  ['C3','groups','C',3,'Escocia','Brasil'],
  ['C3','groups','C',3,'Marruecos','Haití'],
  ['D3','groups','D',3,'Turquía','Estados Unidos'],
  ['D3','groups','D',3,'Paraguay','Australia'],
  ['E3','groups','E',3,'Curazao','Costa de Marfil'],
  ['E3','groups','E',3,'Ecuador','Alemania'],
  ['F3','groups','F',3,'Japón','Suecia'],
  ['F3','groups','F',3,'Túnez','Países Bajos'],
  ['G3','groups','G',3,'Egipto','Irán'],
  ['G3','groups','G',3,'Nueva Zelanda','Bélgica'],
  ['H3','groups','H',3,'Cabo Verde','Arabia Saudita'],
  ['H3','groups','H',3,'Uruguay','España'],
  ['I3','groups','I',3,'Noruega','Francia'],
  ['I3','groups','I',3,'Senegal','Irak'],
  ['J3','groups','J',3,'Argelia','Austria'],
  ['J3','groups','J',3,'Jordania','Argentina'],
  ['K3','groups','K',3,'Colombia','Portugal'],
  ['K3','groups','K',3,'RD Congo','Uzbekistán'],
  ['L3','groups','L',3,'Panamá','Inglaterra'],
  ['L3','groups','L',3,'Croacia','Ghana'],
];

// Knockout matches with approximate dates
// 1/16: July 1-8 (2 per day), 1/8: July 10-13, 1/4: July 15-16, 1/2: July 18-19, 3rd: July 22, F: July 23
const knockoutMatches = [
  ['1/16-1','r16',null,null,'Por definir (2A)','Por definir (2B)','2026-07-01','18:00'],
  ['1/16-2','r16',null,null,'Por definir (1C)','Por definir (2F)','2026-07-01','21:00'],
  ['1/16-3','r16',null,null,'Por definir (1E)','Por definir (3º)','2026-07-02','18:00'],
  ['1/16-4','r16',null,null,'Por definir (1F)','Por definir (2C)','2026-07-02','21:00'],
  ['1/16-5','r16',null,null,'Por definir (2E)','Por definir (2I)','2026-07-03','18:00'],
  ['1/16-6','r16',null,null,'Por definir (1I)','Por definir (3º)','2026-07-03','21:00'],
  ['1/16-7','r16',null,null,'Por definir (1A)','Por definir (3º)','2026-07-04','18:00'],
  ['1/16-8','r16',null,null,'Por definir (1L)','Por definir (3º)','2026-07-04','21:00'],
  ['1/16-9','r16',null,null,'Por definir (1G)','Por definir (3º)','2026-07-05','18:00'],
  ['1/16-10','r16',null,null,'Por definir (1D)','Por definir (3º)','2026-07-05','21:00'],
  ['1/16-11','r16',null,null,'Por definir (1H)','Por definir (2J)','2026-07-06','18:00'],
  ['1/16-12','r16',null,null,'Por definir (2K)','Por definir (2L)','2026-07-06','21:00'],
  ['1/16-13','r16',null,null,'Por definir (1B)','Por definir (3º)','2026-07-07','18:00'],
  ['1/16-14','r16',null,null,'Por definir (2D)','Por definir (2G)','2026-07-07','21:00'],
  ['1/16-15','r16',null,null,'Por definir (1J)','Por definir (2H)','2026-07-08','18:00'],
  ['1/16-16','r16',null,null,'Por definir (1K)','Por definir (3º)','2026-07-08','21:00'],
  ['1/8-1','r8',null,null,'Por definir','Por definir','2026-07-10','18:00'],
  ['1/8-2','r8',null,null,'Por definir','Por definir','2026-07-10','21:00'],
  ['1/8-3','r8',null,null,'Por definir','Por definir','2026-07-11','18:00'],
  ['1/8-4','r8',null,null,'Por definir','Por definir','2026-07-11','21:00'],
  ['1/8-5','r8',null,null,'Por definir','Por definir','2026-07-12','18:00'],
  ['1/8-6','r8',null,null,'Por definir','Por definir','2026-07-12','21:00'],
  ['1/8-7','r8',null,null,'Por definir','Por definir','2026-07-13','18:00'],
  ['1/8-8','r8',null,null,'Por definir','Por definir','2026-07-13','21:00'],
  ['1/4-1','r4',null,null,'Por definir','Por definir','2026-07-15','18:00'],
  ['1/4-2','r4',null,null,'Por definir','Por definir','2026-07-15','21:00'],
  ['1/4-3','r4',null,null,'Por definir','Por definir','2026-07-16','18:00'],
  ['1/4-4','r4',null,null,'Por definir','Por definir','2026-07-16','21:00'],
  ['1/2-1','r2',null,null,'Por definir','Por definir','2026-07-19','21:00'],
  ['1/2-2','r2',null,null,'Por definir','Por definir','2026-07-20','21:00'],
  ['3er Puesto','r2',null,null,'Por definir (3er puesto)','Por definir (3er puesto)','2026-07-22','18:00'],
  ['Final','final',null,null,'Por definir','Por definir','2026-07-23','21:00'],
];

const topScorers = [
  ['Kylian Mbappé','Francia'],
  ['Erling Haaland','Noruega'],
  ['Vinicius Jr.','Brasil'],
  ['Harry Kane','Inglaterra'],
  ['Lionel Messi','Argentina'],
  ['Cristiano Ronaldo','Portugal'],
  ['Lamine Yamal','España'],
  ['Bukayo Saka','Inglaterra'],
  ['Leroy Sané','Alemania'],
  ['Kai Havertz','Alemania'],
  ['Romelu Lukaku','Bélgica'],
  ['Sadio Mané','Senegal'],
  ['Memphis Depay','Países Bajos'],
  ['Christian Pulisic','Estados Unidos'],
  ['Carlos Vela','México'],
  ['Richarlison','Brasil'],
  ['Ferran Torres','España'],
  ['Ousmane Dembélé','Francia'],
  ['Bernardo Silva','Portugal'],
  ['Phil Foden','Inglaterra'],
  ['Alexis Mac Allister','Argentina'],
  ['Hirving Lozano','México'],
  ['Pedri','España'],
  ['Takumi Minamino','Japón'],
  ['Luis Díaz','Colombia'],
];

function seed() {
  const existingTeams = db.prepare('SELECT count(*) as c FROM teams').get().c;
  if (existingTeams > 0) {
    console.log('DB already seeded, skipping.');
    return;
  }

  const insertTeam = db.prepare('INSERT OR IGNORE INTO teams (id, name, group_name, seed) VALUES (?,?,?,?)');
  const insertMatch = db.prepare(`
    INSERT INTO matches (code, phase, group_name, round_num, home_team, away_team, match_date, match_time, match_order)
    VALUES (?,?,?,?,?,?,?,?,?)
  `);
  const insertScorer = db.prepare('INSERT INTO top_scorers (name, team) VALUES (?,?)');

  db.exec('BEGIN');
  try {
    // Insert teams
    teams.forEach(t => insertTeam.run(...t));

    // Insert group matches with computed dates/times
    let order = 1;
    const groupRoundCount = {}; // { 'A:1': 0, 'A:2': 0, ... }
    for (const m of groupMatches) {
      const [code, phase, group, round, home, away] = m;
      const key = `${group}:${round}`;
      groupRoundCount[key] = (groupRoundCount[key] || 0) + 1;
      const matchNum = groupRoundCount[key]; // 1 or 2

      const date = groupRoundDates[group][round];
      let time;
      if (round === 3) {
        // Round 3: simultaneous — time by group position (first/second of pair)
        // A,C,E,G,I,K = 18:00; B,D,F,H,J,L = 21:00
        time = 'ACEGIK'.includes(group) ? '18:00' : '21:00';
      } else {
        // Rounds 1 & 2: first match 18:00, second 21:00
        time = matchNum === 1 ? '18:00' : '21:00';
      }

      insertMatch.run(code, phase, group, round, home, away, date, time, order++);
    }

    // Insert knockout matches
    for (const m of knockoutMatches) {
      const [code, phase, group, round, home, away, date, time] = m;
      insertMatch.run(code, phase, group, round, home, away, date, time, order++);
    }

    // Insert default admin
    const adminExists = db.prepare("SELECT count(*) as c FROM players WHERE is_admin=1").get().c;
    if (!adminExists) {
      db.prepare("INSERT INTO players (name, pin, is_admin) VALUES (?,?,1)").run('Admin', '1234');
    }

    // Insert top scorers
    const scorersExist = db.prepare("SELECT count(*) as c FROM top_scorers").get().c;
    if (!scorersExist) {
      topScorers.forEach(([name, team]) => insertScorer.run(name, team));
    }

    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  console.log('DB seeded successfully.');
}

module.exports = seed;
