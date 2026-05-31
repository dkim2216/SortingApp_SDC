import { Router } from 'express'
import pool from '../db.js'

const router = Router()

// ── GET /api/session/open ─────────────────────
// All open manifests — shown in the Manifest Picker.
router.get('/open', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        s.id, s.manifest_no, s.created_by, s.created_at,
        COUNT(ss.id)                                          AS total_stores,
        SUM(CASE WHEN ss.status='completed' THEN 1 ELSE 0 END) AS completed_stores,
        SUM(CASE WHEN ss.status='claimed'   THEN 1 ELSE 0 END) AS active_stores,
        COUNT(DISTINCT ss.claimed_by) FILTER (WHERE ss.status='claimed') AS active_users
      FROM sessions s
      LEFT JOIN store_states ss ON ss.session_id = s.id
      WHERE s.status = 'open'
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `)
    res.json(rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/session/:id/state ────────────────
// Polled every 3s by clients inside a manifest.
router.get('/:id/state', async (req, res) => {
  try {
    const { rows: [session] } = await pool.query(
      `SELECT * FROM sessions WHERE id = $1`,
      [req.params.id]
    )
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const { rows: stores } = await pool.query(`
      SELECT
        store_id       AS "storeId",
        route,
        status,
        total_qty      AS "totalQty",
        scanned_qty    AS "scannedQty",
        missed_qty     AS "missedQty",
        claimed_by     AS "claimedBy",
        completed_by   AS "completedBy",
        completed_at   AS "completedAt"
      FROM store_states
      WHERE session_id = $1
      ORDER BY route, store_id
    `, [req.params.id])

    res.json({
      session: {
        id:         session.id,
        manifestNo: session.manifest_no,
        createdBy:  session.created_by,
        createdAt:  session.created_at,
        status:     session.status,
      },
      stores,
      manifest: session.manifest,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/session/start ───────────────────
// Creates a new manifest session — does NOT close others.
router.post('/start', async (req, res) => {
  const { manifestNo, totes, createdBy } = req.body
  if (!totes?.length) return res.status(400).json({ error: 'No totes provided' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `INSERT INTO sessions(manifest_no, manifest, created_by)
       VALUES($1, $2, $3) RETURNING *`,
      [manifestNo, JSON.stringify(totes), createdBy]
    )
    const session = rows[0]

    // Build store summary map
    const storeMap = {}
    for (const tote of totes) {
      if (!storeMap[tote.storeId]) {
        storeMap[tote.storeId] = { route: tote.route, totalQty: 0 }
      }
      storeMap[tote.storeId].totalQty += tote.qty || 1
    }

    for (const [storeId, { route, totalQty }] of Object.entries(storeMap)) {
      await client.query(
        `INSERT INTO store_states(session_id, store_id, route, total_qty)
         VALUES($1, $2, $3, $4)`,
        [session.id, storeId, route, totalQty]
      )
    }

    await client.query('COMMIT')
    res.json({ ok: true, sessionId: session.id, manifestNo })
  } catch (e) {
    await client.query('ROLLBACK')
    console.error(e)
    res.status(500).json({ error: e.message })
  } finally {
    client.release()
  }
})

// ── POST /api/session/:id/store/:storeId/claim ─
router.post('/:id/store/:storeId/claim', async (req, res) => {
  const { id: sessionId, storeId } = req.params
  const { userName } = req.body
  try {
    const { rowCount } = await pool.query(`
      UPDATE store_states
      SET status='claimed', claimed_by=$1, claimed_at=NOW()
      WHERE session_id=$2 AND store_id=$3 AND status='pending'
    `, [userName, sessionId, storeId])

    if (!rowCount) {
      const { rows } = await pool.query(
        `SELECT claimed_by AS "claimedBy", status
         FROM store_states WHERE session_id=$1 AND store_id=$2`,
        [sessionId, storeId]
      )
      return res.json({ ok: false, conflict: rows[0] })
    }
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/session/:id/store/:storeId/scan ──
router.post('/:id/store/:storeId/scan', async (req, res) => {
  const { id: sessionId, storeId } = req.params
  const { toteId, userName } = req.body
  try {
    // Get tote qty from manifest
    const { rows: [sessionRow] } = await pool.query(
      `SELECT manifest FROM sessions WHERE id=$1`, [sessionId]
    )
    const manifest = sessionRow?.manifest || []
    const tote = manifest.find(t => t.toteId === toteId && t.storeId === storeId)
    const toteQty = tote?.qty || 1

    await pool.query(
      `INSERT INTO scan_events(session_id, store_id, tote_id, scanned_by, tote_qty)
       VALUES($1,$2,$3,$4,$5)`,
      [sessionId, storeId, toteId, userName, toteQty]
    )

    await pool.query(`
      UPDATE store_states
      SET scanned_qty = LEAST(scanned_qty + 1, total_qty)
      WHERE session_id=$1 AND store_id=$2
    `, [sessionId, storeId])

    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/session/:id/store/:storeId/complete
router.post('/:id/store/:storeId/complete', async (req, res) => {
  const { id: sessionId, storeId } = req.params
  const { userName, scanned, missed } = req.body
  const scannedQty = scanned?.reduce((s, t) => s + (t.qty || 1), 0) || 0
  const missedQty  = missed?.reduce((s, t) => s + (t.qty || 1), 0)  || 0
  try {
    await pool.query(`
      UPDATE store_states
      SET status='completed', completed_by=$1, completed_at=NOW(),
          scanned_qty=$2, missed_qty=$3
      WHERE session_id=$4 AND store_id=$5
    `, [userName, scannedQty, missedQty, sessionId, storeId])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/session/:id/store/:storeId/release
router.post('/:id/store/:storeId/release', async (req, res) => {
  const { id: sessionId, storeId } = req.params
  const { userName } = req.body
  try {
    await pool.query(`
      UPDATE store_states
      SET status='pending', claimed_by=NULL, claimed_at=NULL
      WHERE session_id=$1 AND store_id=$2 AND claimed_by=$3 AND status='claimed'
    `, [sessionId, storeId, userName])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/session/:id/close ───────────────
router.post('/:id/close', async (req, res) => {
  try {
    await pool.query(
      `UPDATE sessions SET status='closed', closed_at=NOW() WHERE id=$1`,
      [req.params.id]
    )
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/session/history ──────────────────
router.get('/history', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        s.id, s.manifest_no, s.created_by, s.created_at, s.closed_at, s.status,
        COUNT(ss.id)                                          AS total_stores,
        SUM(CASE WHEN ss.status='completed' THEN 1 ELSE 0 END) AS completed_stores,
        SUM(ss.missed_qty)                                    AS total_missed
      FROM sessions s
      LEFT JOIN store_states ss ON ss.session_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT 50
    `)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/history/:id', async (req, res) => {
  try {
    const { rows: [session] } = await pool.query(
      `SELECT * FROM sessions WHERE id=$1`, [req.params.id]
    )
    const { rows: stores } = await pool.query(
      `SELECT * FROM store_states WHERE session_id=$1 ORDER BY route, store_id`,
      [req.params.id]
    )
    res.json({ ...session, stores })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/session/:id/store/:storeId/scans ─
// Returns already-scanned totes so a user can resume a store.
router.get('/:id/store/:storeId/scans', async (req, res) => {
  const { id: sessionId, storeId } = req.params
  try {
    const { rows } = await pool.query(`
      SELECT tote_id, COUNT(*) AS count
      FROM scan_events
      WHERE session_id=$1 AND store_id=$2
      GROUP BY tote_id
    `, [sessionId, storeId])
    res.json(rows.map(r => ({ toteId: r.tote_id, count: parseInt(r.count) })))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
