const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const matches = db.prepare('SELECT * FROM matches ORDER BY match_order').all();
  res.json(matches);
});

router.get('/groups', (req, res) => {
  const matches = db.prepare(
    "SELECT * FROM matches WHERE phase='groups' ORDER BY match_order"
  ).all();
  const byGroup = {};
  for (const m of matches) {
    if (!byGroup[m.group_name]) byGroup[m.group_name] = { rounds: {}, teams: [] };
    if (!byGroup[m.group_name].rounds[m.round_num]) byGroup[m.group_name].rounds[m.round_num] = [];
    byGroup[m.group_name].rounds[m.round_num].push(m);
  }
  // Add teams per group
  const teams = db.prepare("SELECT * FROM teams ORDER BY seed").all();
  for (const t of teams) {
    if (byGroup[t.group_name]) byGroup[t.group_name].teams.push(t.name);
  }
  res.json(byGroup);
});

router.get('/knockout', (req, res) => {
  const matches = db.prepare(
    "SELECT * FROM matches WHERE phase != 'groups' ORDER BY match_order"
  ).all();
  res.json(matches);
});

router.get('/teams', (req, res) => {
  const teams = db.prepare('SELECT * FROM teams ORDER BY group_name, seed').all();
  res.json(teams);
});

module.exports = router;
