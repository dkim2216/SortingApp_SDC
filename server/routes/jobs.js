import { Router } from 'express'
import pool from '../db.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100`)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM jobs WHERE id=$1`, [req.params.id])
    res.json(rows[0] || null)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', async (req, res) => {
  const { manifest_no, label, totes } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO jobs(manifest_no, label, totes, total_totes) VALUES($1,$2,$3,$4) RETURNING *`,
      [manifest_no, label, JSON.stringify(totes), totes?.length || 0]
    )
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/:id/complete/:mode', async (req, res) => {
  const { id, mode } = req.params
  const { scanned, missed } = req.body
  const scannedQty = scanned?.reduce((s, t) => s + (t.qty || 1), 0) || 0
  const missedQty  = missed?.reduce((s, t) => s + (t.qty || 1), 0) || 0
  const col = mode === 'load' ? 'load' : 'offload'
  try {
    await pool.query(
      `UPDATE jobs SET ${col}_scanned=$1, ${col}_missed=$2 WHERE id=$3`,
      [scannedQty, missedQty, id]
    )
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
