const express = require('express');
const router = express.Router();
const db = require('../db');
const webpush = require('web-push');

function initVapid() {
  let pub = db.prepare("SELECT value FROM settings WHERE key='vapid_public'").get();
  let priv = db.prepare("SELECT value FROM settings WHERE key='vapid_private'").get();
  if (!pub || !priv) {
    const keys = webpush.generateVAPIDKeys();
    db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('vapid_public',?)").run(keys.publicKey);
    db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('vapid_private',?)").run(keys.privateKey);
    pub = { value: keys.publicKey };
    priv = { value: keys.privateKey };
    console.log('VAPID keys generated and stored.');
  }
  webpush.setVapidDetails('mailto:lander86@gmail.com', pub.value, priv.value);
  return pub.value;
}

const VAPID_PUBLIC_KEY = initVapid();

// GET /api/notifications/vapid-key — public key for the frontend
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// POST /api/notifications/subscribe
router.post('/subscribe', (req, res) => {
  if (!req.session.playerId) return res.status(401).json({ error: 'No autenticado' });
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Suscripción inválida' });
  }
  db.prepare(`
    INSERT INTO push_subscriptions (player_id, endpoint, p256dh, auth)
    VALUES (?,?,?,?)
    ON CONFLICT(player_id, endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth
  `).run(req.session.playerId, endpoint, keys.p256dh, keys.auth);
  res.json({ ok: true });
});

// POST /api/notifications/unsubscribe
router.post('/unsubscribe', (req, res) => {
  if (!req.session.playerId) return res.status(401).json({ error: 'No autenticado' });
  const { endpoint } = req.body;
  if (endpoint) {
    db.prepare('DELETE FROM push_subscriptions WHERE player_id=? AND endpoint=?')
      .run(req.session.playerId, endpoint);
  } else {
    db.prepare('DELETE FROM push_subscriptions WHERE player_id=?')
      .run(req.session.playerId);
  }
  res.json({ ok: true });
});

async function sendNotificationToAll(title, body) {
  const subs = db.prepare('SELECT * FROM push_subscriptions').all();
  if (!subs.length) return;
  const payload = JSON.stringify({ title, body });
  const expired = [];
  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) expired.push(sub.id);
      })
    )
  );
  if (expired.length) {
    db.prepare(`DELETE FROM push_subscriptions WHERE id IN (${expired.map(() => '?').join(',')})`)
      .run(...expired);
  }
}

module.exports = { router, sendNotificationToAll };
