CREATE TABLE IF NOT EXISTS sessions (
  session_id               UUID PRIMARY KEY,
  machine_id               TEXT NOT NULL,
  app_version              TEXT,
  os_version               TEXT,
  country                  TEXT,
  country_code             CHAR(2),
  city                     TEXT,
  lat                      FLOAT,
  lon                      FLOAT,
  ip                       TEXT,
  platforms_used           TEXT[],
  started_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat_at        TIMESTAMPTZ,
  ended_at                 TIMESTAMPTZ,
  session_duration_minutes INT,
  first_seen               BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS events (
  id          BIGSERIAL PRIMARY KEY,
  session_id  UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  machine_id  TEXT NOT NULL,
  event       TEXT NOT NULL,
  app_version TEXT,
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_machine   ON sessions (machine_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started   ON sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_heartbeat ON sessions (last_heartbeat_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_country   ON sessions (country_code);
CREATE INDEX IF NOT EXISTS idx_events_ts          ON events (ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_machine     ON events (machine_id);
