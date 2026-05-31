import { Router } from 'express'
import { Resend } from 'resend'

const router = Router()
const resend = new Resend(process.env.RESEND_API_KEY)

// POST /api/reports/route
// Called after completing a route — sends email summary.
router.post('/route', async (req, res) => {
  const { routeName, manifestNo, date, stores } = req.body

  const totalScanned = stores.reduce((s, st) => s + (st.scannedQty || 0), 0)
  const totalMissed  = stores.reduce((s, st) => s + (st.missedQty  || 0), 0)
  const hasMissed    = totalMissed > 0

  const storeRows = stores.map(st => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${st.storeId}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#00C9A7">${st.scannedQty || 0}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:${(st.missedQty||0)>0?'#ef4444':'#00C9A7'}">${st.missedQty || 0}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#94a3b8">${st.completedBy || '—'}</td>
    </tr>
  `).join('')

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0D1B4B;padding:20px 24px;border-radius:12px 12px 0 0">
        <h2 style="color:#fff;margin:0;font-size:20px">${hasMissed?'⚠️ Alert':'✅ Complete'}: ${routeName}</h2>
        <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:13px">Manifest: ${manifestNo} · ${date}</p>
      </div>
      <div style="background:#f8fafc;padding:20px 24px">
        <div style="display:flex;gap:12px;margin-bottom:20px">
          <div style="flex:1;background:#fff;border-radius:10px;padding:14px;text-align:center;border:1px solid #e2e8f0">
            <div style="font-size:28px;font-weight:700;color:#00C9A7">${totalScanned}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">SCANNED QTY</div>
          </div>
          <div style="flex:1;background:#fff;border-radius:10px;padding:14px;text-align:center;border:1px solid ${hasMissed?'#ef444440':'#00C9A740'}">
            <div style="font-size:28px;font-weight:700;color:${hasMissed?'#ef4444':'#00C9A7'}">${totalMissed}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">MISSING QTY</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">
          <thead>
            <tr style="background:#0D1B4B">
              <th style="padding:8px 10px;text-align:left;color:#fff;font-size:12px">STORE</th>
              <th style="padding:8px 10px;text-align:left;color:#00C9A7;font-size:12px">SCANNED</th>
              <th style="padding:8px 10px;text-align:left;color:#FFB300;font-size:12px">MISSING</th>
              <th style="padding:8px 10px;text-align:left;color:rgba(255,255,255,0.5);font-size:12px">BY</th>
            </tr>
          </thead>
          <tbody>${storeRows}</tbody>
        </table>
        ${!hasMissed ? '<p style="color:#00C9A7;font-weight:700;margin-top:16px">✓ All totes accounted for</p>' : ''}
      </div>
    </div>
  `

  const subject = hasMissed
    ? `[SDC] [Alert] ${routeName} — Missed Totes — ${manifestNo}`
    : `[SDC] [Complete] ${routeName} — All Clear — ${manifestNo}`

  try {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_xxxxxxxxxxxx') {
      console.log('Email skipped — no RESEND_API_KEY configured')
      return res.json({ emailSent: false, error: 'Email not configured' })
    }
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to:   process.env.EMAIL_TO,
      subject,
      html,
    })
    res.json({ emailSent: true })
  } catch (e) {
    console.error('Email error:', e)
    res.json({ emailSent: false, error: e.message })
  }
})

export default router
