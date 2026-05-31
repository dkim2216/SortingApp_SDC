import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

// ── Run once to create tables ─────────────────
export async function initDB() {
  await pool.query(`
    -- Active/past sessions (one CSV = one session)
    CREATE TABLE IF NOT EXISTS sessions (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      manifest_no VARCHAR(100),
      manifest    JSONB NOT NULL,
      created_by  VARCHAR(100),
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      closed_at   TIMESTAMPTZ,
      status      VARCHAR(20) DEFAULT 'active'
    );

    -- Per-store state within a session
    CREATE TABLE IF NOT EXISTS store_states (
      id           SERIAL PRIMARY KEY,
      session_id   UUID REFERENCES sessions(id) ON DELETE CASCADE,
      store_id     VARCHAR(100) NOT NULL,
      route        VARCHAR(100),
      total_qty    INTEGER DEFAULT 0,
      scanned_qty  INTEGER DEFAULT 0,
      missed_qty   INTEGER DEFAULT 0,
      status       VARCHAR(20) DEFAULT 'pending',
      claimed_by   VARCHAR(100),
      claimed_at   TIMESTAMPTZ,
      completed_by VARCHAR(100),
      completed_at TIMESTAMPTZ,
      UNIQUE(session_id, store_id)
    );

    -- Individual scan events (audit trail)
    CREATE TABLE IF NOT EXISTS scan_events (
      id          SERIAL PRIMARY KEY,
      session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
      store_id    VARCHAR(100),
      tote_id     VARCHAR(200),
      scanned_by  VARCHAR(100),
      scanned_at  TIMESTAMPTZ DEFAULT NOW(),
      tote_qty    INTEGER DEFAULT 1
    );

    -- Legacy jobs table (keep for backward compat)
    CREATE TABLE IF NOT EXISTS jobs (
      id            SERIAL PRIMARY KEY,
      manifest_no   VARCHAR(100),
      label         VARCHAR(200),
      totes         JSONB,
      load_scanned  INTEGER DEFAULT 0,
      load_missed   INTEGER DEFAULT 0,
      offload_scanned INTEGER DEFAULT 0,
      offload_missed  INTEGER DEFAULT 0,
      total_totes   INTEGER DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  console.log('DB schema ready')
}

export default pool
