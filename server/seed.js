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

// Group matches with explicit CEST dates and times
// Format: [code, phase, group, round, home, away, date, time]
const groupMatches = [
  // GROUP A – Round 1
  ['A1','groups','A',1,'México','Sudáfrica','2026-06-11','21:00'],
  ['A1','groups','A',1,'Corea del Sur','República Checa','2026-06-12','04:00'],
  // GROUP B – Round 1
  ['B1','groups','B',1,'Canadá','Bosnia y Herzegovina','2026-06-12','21:00'],
  ['B1','groups','B',1,'Catar','Suiza','2026-06-13','21:00'],
  // GROUP C – Round 1
  ['C1','groups','C',1,'Brasil','Marruecos','2026-06-14','00:00'],
  ['C1','groups','C',1,'Haití','Escocia','2026-06-14','03:00'],
  // GROUP D – Round 1
  ['D1','groups','D',1,'Estados Unidos','Paraguay','2026-06-13','03:00'],
  ['D1','groups','D',1,'Australia','Turquía','2026-06-14','06:00'],
  // GROUP E – Round 1
  ['E1','groups','E',1,'Alemania','Curazao','2026-06-14','19:00'],
  ['E1','groups','E',1,'Costa de Marfil','Ecuador','2026-06-15','01:00'],
  // GROUP F – Round 1
  ['F1','groups','F',1,'Países Bajos','Japón','2026-06-14','22:00'],
  ['F1','groups','F',1,'Suecia','Túnez','2026-06-15','04:00'],
  // GROUP G – Round 1
  ['G1','groups','G',1,'Bélgica','Egipto','2026-06-15','21:00'],
  ['G1','groups','G',1,'Irán','Nueva Zelanda','2026-06-16','03:00'],
  // GROUP H – Round 1
  ['H1','groups','H',1,'España','Cabo Verde','2026-06-15','18:00'],
  ['H1','groups','H',1,'Arabia Saudita','Uruguay','2026-06-16','00:00'],
  // GROUP I – Round 1
  ['I1','groups','I',1,'Francia','Senegal','2026-06-16','21:00'],
  ['I1','groups','I',1,'Irak','Noruega','2026-06-17','00:00'],
  // GROUP J – Round 1
  ['J1','groups','J',1,'Argentina','Argelia','2026-06-17','03:00'],
  ['J1','groups','J',1,'Austria','Jordania','2026-06-17','06:00'],
  // GROUP K – Round 1
  ['K1','groups','K',1,'Portugal','RD Congo','2026-06-17','19:00'],
  ['K1','groups','K',1,'Uzbekistán','Colombia','2026-06-18','04:00'],
  // GROUP L – Round 1
  ['L1','groups','L',1,'Inglaterra','Croacia','2026-06-17','22:00'],
  ['L1','groups','L',1,'Ghana','Panamá','2026-06-18','01:00'],
  // GROUP A – Round 2
  ['A2','groups','A',2,'República Checa','Sudáfrica','2026-06-18','18:00'],
  ['A2','groups','A',2,'México','Corea del Sur','2026-06-19','03:00'],
  // GROUP B – Round 2
  ['B2','groups','B',2,'Suiza','Bosnia y Herzegovina','2026-06-18','21:00'],
  ['B2','groups','B',2,'Canadá','Catar','2026-06-19','00:00'],
  // GROUP C – Round 2
  ['C2','groups','C',2,'Escocia','Marruecos','2026-06-20','00:00'],
  ['C2','groups','C',2,'Brasil','Haití','2026-06-20','02:30'],
  // GROUP D – Round 2
  ['D2','groups','D',2,'Estados Unidos','Australia','2026-06-19','21:00'],
  ['D2','groups','D',2,'Turquía','Paraguay','2026-06-20','06:00'],
  // GROUP E – Round 2
  ['E2','groups','E',2,'Alemania','Costa de Marfil','2026-06-20','18:00'],
  ['E2','groups','E',2,'Ecuador','Curazao','2026-06-21','02:00'],
  // GROUP F – Round 2
  ['F2','groups','F',2,'Países Bajos','Suecia','2026-06-20','19:00'],
  ['F2','groups','F',2,'Túnez','Japón','2026-06-21','06:00'],
  // GROUP G – Round 2
  ['G2','groups','G',2,'Bélgica','Irán','2026-06-21','21:00'],
  ['G2','groups','G',2,'Nueva Zelanda','Egipto','2026-06-22','03:00'],
  // GROUP H – Round 2
  ['H2','groups','H',2,'España','Arabia Saudita','2026-06-21','18:00'],
  ['H2','groups','H',2,'Uruguay','Cabo Verde','2026-06-22','00:00'],
  // GROUP I – Round 2
  ['I2','groups','I',2,'Francia','Irak','2026-06-22','23:00'],
  ['I2','groups','I',2,'Noruega','Senegal','2026-06-23','02:00'],
  // GROUP J – Round 2
  ['J2','groups','J',2,'Argentina','Austria','2026-06-22','19:00'],
  ['J2','groups','J',2,'Jordania','Argelia','2026-06-23','05:00'],
  // GROUP K – Round 2
  ['K2','groups','K',2,'Portugal','Uzbekistán','2026-06-23','19:00'],
  ['K2','groups','K',2,'Colombia','RD Congo','2026-06-24','04:00'],
  // GROUP L – Round 2
  ['L2','groups','L',2,'Inglaterra','Ghana','2026-06-23','22:00'],
  ['L2','groups','L',2,'Panamá','Croacia','2026-06-24','01:00'],
  // GROUP A – Round 3 (simultaneous)
  ['A3','groups','A',3,'República Checa','México','2026-06-24','23:00'],
  ['A3','groups','A',3,'Sudáfrica','Corea del Sur','2026-06-24','23:00'],
  // GROUP B – Round 3 (simultaneous)
  ['B3','groups','B',3,'Suiza','Canadá','2026-06-24','23:00'],
  ['B3','groups','B',3,'Bosnia y Herzegovina','Catar','2026-06-24','23:00'],
  // GROUP C – Round 3 (simultaneous)
  ['C3','groups','C',3,'Escocia','Brasil','2026-06-25','00:00'],
  ['C3','groups','C',3,'Marruecos','Haití','2026-06-25','00:00'],
  // GROUP D – Round 3 (simultaneous)
  ['D3','groups','D',3,'Turquía','Estados Unidos','2026-06-26','04:00'],
  ['D3','groups','D',3,'Paraguay','Australia','2026-06-26','04:00'],
  // GROUP E – Round 3 (simultaneous)
  ['E3','groups','E',3,'Curazao','Costa de Marfil','2026-06-25','22:00'],
  ['E3','groups','E',3,'Ecuador','Alemania','2026-06-25','22:00'],
  // GROUP F – Round 3 (simultaneous)
  ['F3','groups','F',3,'Japón','Suecia','2026-06-26','01:00'],
  ['F3','groups','F',3,'Túnez','Países Bajos','2026-06-26','01:00'],
  // GROUP G – Round 3 (simultaneous)
  ['G3','groups','G',3,'Egipto','Irán','2026-06-27','05:00'],
  ['G3','groups','G',3,'Nueva Zelanda','Bélgica','2026-06-27','05:00'],
  // GROUP H – Round 3 (simultaneous)
  ['H3','groups','H',3,'Cabo Verde','Arabia Saudita','2026-06-27','02:00'],
  ['H3','groups','H',3,'Uruguay','España','2026-06-27','02:00'],
  // GROUP I – Round 3 (simultaneous)
  ['I3','groups','I',3,'Noruega','Francia','2026-06-26','21:00'],
  ['I3','groups','I',3,'Senegal','Irak','2026-06-26','21:00'],
  // GROUP J – Round 3 (simultaneous)
  ['J3','groups','J',3,'Argelia','Austria','2026-06-28','04:00'],
  ['J3','groups','J',3,'Jordania','Argentina','2026-06-28','04:00'],
  // GROUP K – Round 3 (simultaneous)
  ['K3','groups','K',3,'Colombia','Portugal','2026-06-28','01:30'],
  ['K3','groups','K',3,'RD Congo','Uzbekistán','2026-06-28','01:30'],
  // GROUP L – Round 3 (simultaneous)
  ['L3','groups','L',3,'Panamá','Inglaterra','2026-06-27','23:00'],
  ['L3','groups','L',3,'Croacia','Ghana','2026-06-27','23:00'],
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
  // Máximos favoritos a pichichi
  ['Kylian Mbappé','Francia'],
  ['Erling Haaland','Noruega'],
  ['Harry Kane','Inglaterra'],
  ['Vinicius Jr.','Brasil'],
  ['Viktor Gyökeres','Suecia'],
  ['Lautaro Martínez','Argentina'],
  ['Julián Álvarez','Argentina'],
  // España
  ['Lamine Yamal','España'],
  ['Nico Williams','España'],
  ['Mikel Oyarzabal','España'],
  ['Álvaro Morata','España'],
  ['Dani Olmo','España'],
  ['Ferran Torres','España'],
  ['Pedri','España'],
  // Alemania
  ['Florian Wirtz','Alemania'],
  ['Jamal Musiala','Alemania'],
  ['Kai Havertz','Alemania'],
  ['Nick Woltemade','Alemania'],
  // Brasil
  ['Richarlison','Brasil'],
  ['Raphinha','Brasil'],
  ['Rodrygo','Brasil'],
  ['Endrick','Brasil'],
  ['João Pedro','Brasil'],
  ['Neymar Jr.','Brasil'],
  // Inglaterra
  ['Bukayo Saka','Inglaterra'],
  ['Cole Palmer','Inglaterra'],
  ['Jude Bellingham','Inglaterra'],
  ['Phil Foden','Inglaterra'],
  ['Ollie Watkins','Inglaterra'],
  // Francia
  ['Ousmane Dembélé','Francia'],
  ['Antoine Griezmann','Francia'],
  // Portugal
  ['Gonçalo Ramos','Portugal'],
  ['Raphael Leão','Portugal'],
  ['João Félix','Portugal'],
  ['Cristiano Ronaldo','Portugal'],
  // Argentina
  ['Lionel Messi','Argentina'],
  // Otros
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

    // Insert group matches with explicit dates/times
    let order = 1;
    for (const m of groupMatches) {
      const [code, phase, group, round, home, away, date, time] = m;
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
