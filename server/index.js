import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDB } from './db.js'
import sessionRoutes from './routes/session.js'
import jobsRoutes    from './routes/jobs.js'
import reportsRoutes from './routes/reports.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// ── API routes ────────────────────────────────
app.use('/api/session', sessionRoutes)
app.use('/api/jobs',    jobsRoutes)
app.use('/api/reports', reportsRoutes)

// ── Serve built frontend in production ────────
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../dist')
  app.use(express.static(dist))
  app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html')))
}

initDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on :${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1) })
