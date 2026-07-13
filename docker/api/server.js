'use strict';

const express = require('express');
const { Pool } = require('pg');
const helmet = require('helmet');
const path = require('path');
const { Transform } = require('stream');

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change_me';

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

// ── Geo cache ──────────────────────────────────────────────────────────────
const geoCache = new Map();

async function geoFromIp(ip) {
  if (!ip) return nullGeo();
  const clean = ip.replace(/^::ffff:/, '');
  if (geoCache.has(clean)) return geoCache.get(clean);
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$)/.test(clean)) return nullGeo();
  try {
    const res = await fetch(`http://ip-api.com/json/${clean}?fields=country,countryCode,city,lat,lon,status`);
    const data = await res.json();
    const geo = data.status === 'success'
      ? { country: data.country, country_code: data.countryCode, city: data.city, lat: data.lat, lon: data.lon }
      : nullGeo();
    geoCache.set(clean, geo);
    if (geoCache.size > 50000) geoCache.delete(geoCache.keys().next().value);
    return geo;
  } catch {
    return nullGeo();
  }
}

function nullGeo() {
  return { country: null, country_code: null, city: null, lat: null, lon: null };
}

// ── Rate limit (sliding window per IP) ────────────────────────────────────
const rateLimits = new Map();
function rateLimit(req, res, next) {
  const ip = req.socket.remoteAddress;
  const now = Date.now();
  const w = rateLimits.get(ip) ?? { count: 0, reset: now + 60000 };
  if (now > w.reset) { w.count = 0; w.reset = now + 60000; }
  w.count++;
  rateLimits.set(ip, w);
  if (w.count > 60) return res.status(429).end();
  next();
}

// ── Auth middleware ────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.query.token;
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Express setup ──────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '16kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Telemetry endpoint (public) ────────────────────────────────────────────
app.post('/api/ping', rateLimit, async (req, res) => {
  res.status(202).end();

  try {
    const { machine_id, session_id, app_version, os_version,
            event, session_duration_minutes, platforms_used } = req.body || {};

    if (!machine_id || !session_id || !event) return;

    const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
                     || req.socket.remoteAddress;
    const geo = await geoFromIp(clientIp);

    if (event === 'startup') {
      const { rows } = await pool.query(
        'SELECT 1 FROM sessions WHERE machine_id = $1 LIMIT 1', [machine_id]
      );
      const first_seen = rows.length === 0;

      await pool.query(`
        INSERT INTO sessions
          (session_id, machine_id, app_version, os_version,
           country, country_code, city, lat, lon, ip,
           platforms_used, started_at, first_seen)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12)
        ON CONFLICT (session_id) DO NOTHING
      `, [session_id, machine_id, app_version, os_version,
          geo.country, geo.country_code, geo.city, geo.lat, geo.lon,
          clientIp, platforms_used ?? [], first_seen]);

    } else if (event === 'heartbeat') {
      await pool.query(
        'UPDATE sessions SET last_heartbeat_at = NOW() WHERE session_id = $1',
        [session_id]
      );

    } else if (event === 'shutdown') {
      await pool.query(
        `UPDATE sessions
         SET ended_at = NOW(),
             session_duration_minutes = $2,
             platforms_used = COALESCE($3, platforms_used)
         WHERE session_id = $1`,
        [session_id, session_duration_minutes ?? null, platforms_used ?? null]
      );
    }

    await pool.query(
      'INSERT INTO events (session_id, machine_id, event, app_version) VALUES ($1,$2,$3,$4)',
      [session_id, machine_id, event, app_version]
    );
  } catch (err) {
    console.error('[ping]', err.message);
  }
});

// ── Dashboard API (protected) ──────────────────────────────────────────────
app.get('/api/dashboard/summary', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(DISTINCT machine_id) AS total_installs,
        COUNT(DISTINCT CASE WHEN last_heartbeat_at > NOW() - INTERVAL '5 minutes'
                            THEN session_id END) AS active_now,
        COUNT(DISTINCT CASE WHEN started_at > NOW() - INTERVAL '1 day'
                            THEN session_id END) AS active_today,
        COUNT(DISTINCT CASE WHEN started_at > NOW() - INTERVAL '30 days'
                            THEN session_id END) AS active_month,
        COUNT(DISTINCT CASE WHEN first_seen AND started_at > NOW() - INTERVAL '1 day'
                            THEN machine_id END) AS new_today,
        COUNT(DISTINCT CASE WHEN first_seen AND started_at > NOW() - INTERVAL '30 days'
                            THEN machine_id END) AS new_month,
        ROUND(AVG(session_duration_minutes)::numeric, 1) AS avg_session_min
      FROM sessions
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/countries', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT country, country_code, COUNT(DISTINCT machine_id) AS users
      FROM sessions
      WHERE country IS NOT NULL
      GROUP BY country, country_code
      ORDER BY users DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/versions', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT app_version, COUNT(DISTINCT machine_id) AS users
      FROM sessions
      WHERE app_version IS NOT NULL
      GROUP BY app_version
      ORDER BY users DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/active-map', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT lat, lon, city, country
      FROM sessions
      WHERE last_heartbeat_at > NOW() - INTERVAL '5 minutes'
        AND lat IS NOT NULL AND lon IS NOT NULL
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/recent', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT session_id, machine_id, app_version, country, city,
             platforms_used, started_at, ended_at, session_duration_minutes, first_seen
      FROM sessions
      ORDER BY started_at DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/daily', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DATE(started_at) AS day,
             COUNT(DISTINCT session_id) AS sessions,
             COUNT(DISTINCT machine_id) AS users
      FROM sessions
      WHERE started_at > NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Export endpoints ───────────────────────────────────────────────────────
app.get('/api/export/json', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM sessions ORDER BY started_at DESC');
    res.setHeader('Content-Disposition', 'attachment; filename="sessions.json"');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export/csv', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM sessions ORDER BY started_at DESC');
    if (rows.length === 0) return res.send('No data');

    const headers = Object.keys(rows[0]);
    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = Array.isArray(v) ? v.join('|') : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    res.setHeader('Content-Disposition', 'attachment; filename="sessions.csv"');
    res.setHeader('Content-Type', 'text/csv');
    res.write(headers.join(',') + '\n');
    rows.forEach(row => res.write(headers.map(h => escape(row[h])).join(',') + '\n'));
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.listen(PORT, () => console.log(`[telemetry] listening on :${PORT}`));
