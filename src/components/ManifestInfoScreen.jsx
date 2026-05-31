import { useRef } from 'react'
import { C, STORE_COLORS } from '../theme'
import { manifests as manifestsAPI } from '../api'

function parseCSV(txt) {
  const lines = txt.trim().split(/\r?\n/).filter(l => l.trim())
  const first = lines[0].toLowerCase()
  const hasHeader = first.includes('tote_id') || first.includes('toteid')
  return (hasHeader ? lines.slice(1) : lines).reduce((a, l) => {
    const [c1='',c2='',c3='',c4=''] = l.split(',').map(s => s.trim())
    const toteId = c1.toUpperCase()
    if (!toteId) return a
    a.push({ toteId, storeId: c2||'Unknown', qty: parseInt(c3)||1, route: c4||'Default' })
    return a
  }, [])
}

export default function ManifestInfoScreen({ sessionData, currentUser, onClose }) {
  const fileRef = useRef()
  const manifest  = sessionData?.manifest || []
  const stores    = sessionData?.stores   || []
  const session   = sessionData?.session

  // ── Derived stats ────────────────────────────
  const allRoutes  = [...new Set(manifest.map(t => t.route))].sort()
  const allStores  = [...new Set(manifest.map(t => t.storeId))]
  const totalTotes = manifest.length
  const totalQty   = manifest.reduce((s, t) => s + (t.qty || 1), 0)

  // Per-route breakdown
  const routeData = allRoutes.map((route, ri) => {
    const totes    = manifest.filter(t => t.route === route)
    const storeIds = [...new Set(totes.map(t => t.storeId))].sort()
    const qty      = totes.reduce((s, t) => s + (t.qty || 1), 0)
    const storeStates = stores.filter(s => storeIds.includes(s.storeId))
    const done     = storeStates.filter(s => s.status === 'completed').length
    const color    = STORE_COLORS[ri % STORE_COLORS.length]
    return { route, storeIds, toteCount: totes.length, qty, done, total: storeIds.length, color }
  })

  // Overall status
  const completedStores = stores.filter(s => s.status === 'completed').length
  const totalStores     = stores.length
  const overallPct      = totalStores ? Math.round(completedStores / totalStores * 100) : 0

  const handleNewCSV = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const txt   = await file.text()
      const totes = parseCSV(txt)
      if (!totes.length) return alert('No valid totes in CSV')
      const label = file.name.replace(/\.csv$/i, '')
      await manifestsAPI.start(label, totes, currentUser)
      window.location.reload()
    } catch { alert('Upload failed') }
    e.target.value = ''
  }

  if (!manifest.length) {
    return (
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:16,padding:24 }}>
        <div style={{ fontSize:48 }}>📋</div>
        <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:20,color:C.navy }}>No manifest loaded</div>
        <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted }}>Go back and select a manifest</div>
      </div>
    )
  }

  return (
    <div style={{ height:'100%',overflowY:'auto',display:'flex',flexDirection:'column' }}>

      {/* ── Dark header with stats ── */}
      <div style={{ background:`linear-gradient(135deg,${C.navy} 0%,#1a3a7c 100%)`,padding:'20px 20px 24px',flexShrink:0 }}>
        <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:'rgba(255,255,255,0.5)',letterSpacing:2,marginBottom:4 }}>
          MANIFEST
        </div>
        <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:26,color:'#fff',marginBottom:4 }}>
          {session?.manifestNo || 'Loaded'}
        </div>
        <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:'rgba(255,255,255,0.5)',marginBottom:16 }}>
          Started by {session?.createdBy} · {session?.createdAt ? new Date(session.createdAt).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'}) : ''}
        </div>

        {/* Stats row */}
        <div style={{ display:'flex',gap:8 }}>
          {[
            { l:'ROUTES',    v:allRoutes.length,  c:'#00C9A7' },
            { l:'STORES',    v:allStores.length,  c:'#FFB300' },
            { l:'TOTES',     v:totalTotes,        c:'#6366f1' },
            { l:'TOTAL QTY', v:totalQty,          c:'#f97316' },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ flex:1,textAlign:'center' }}>
              <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:22,color:c,lineHeight:1 }}>{v}</div>
              <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:'rgba(255,255,255,0.45)',marginTop:2,letterSpacing:.5 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        <div style={{ marginTop:16 }}>
          <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
            <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:'rgba(255,255,255,0.5)' }}>OVERALL PROGRESS</span>
            <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:'#00C9A7' }}>{completedStores}/{totalStores} stores · {overallPct}%</span>
          </div>
          <div style={{ height:5,background:'rgba(255,255,255,0.15)',borderRadius:4,overflow:'hidden' }}>
            <div style={{ height:'100%',width:overallPct+'%',background:overallPct===100?'#00C9A7':'#6366f1',borderRadius:4,transition:'width .5s ease' }} />
          </div>
        </div>
      </div>

      {/* ── Routes breakdown ── */}
      <div style={{ flex:1,overflowY:'auto',padding:'16px 16px 100px' }}>

        <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted,
          letterSpacing:2,marginBottom:12 }}>ROUTES IN MANIFEST</div>

        {routeData.map(({ route, storeIds, toteCount, qty, done, total, color }) => {
          const pct = total ? Math.round(done / total * 100) : 0
          return (
            <div key={route} style={{ background:C.panel,borderRadius:16,padding:'14px',marginBottom:10,
              border:`1.5px solid ${done===total&&total>0?C.green:C.border}`,
              boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <div style={{ width:9,height:9,borderRadius:'50%',background:done===total&&total>0?C.green:color,
                    boxShadow:`0 0 6px ${done===total&&total>0?C.green:color}80` }} />
                  <span style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,color:C.navy }}>{route}</span>
                </div>
                <span style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16,
                  color:done===total&&total>0?C.green:pct>0?color:C.muted }}>{pct}%</span>
              </div>
              <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted,marginBottom:8 }}>
                {total} stores · {toteCount} totes · {qty} qty · {done}/{total} done
              </div>
              {/* Progress bar */}
              <div style={{ height:3,background:C.border,borderRadius:2,overflow:'hidden',marginBottom:8 }}>
                <div style={{ height:'100%',width:pct+'%',background:done===total&&total>0?C.green:color,borderRadius:2,transition:'width .3s' }} />
              </div>
              {/* Store pills */}
              <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
                {storeIds.map(storeId => {
                  const st = stores.find(s => s.storeId === storeId)
                  const isDone = st?.status === 'completed'
                  const isActive = st?.status === 'claimed'
                  return (
                    <span key={storeId} style={{
                      padding:'3px 10px',borderRadius:20,fontSize:11,
                      fontFamily:"'Share Tech Mono',monospace",
                      background:isDone?`${C.green}18`:isActive?`${C.amber}18`:C.light,
                      border:`1px solid ${isDone?C.green:isActive?C.amber:C.border}`,
                      color:isDone?C.green:isActive?C.amber:C.muted,
                    }}>
                      {isDone?'✓ ':isActive?'● ':''}{storeId}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Upload new CSV */}
        <button className="btn-tap" onClick={() => fileRef.current?.click()}
          style={{ width:'100%',padding:'14px',marginTop:8,borderRadius:14,
            background:'transparent',border:`1.5px dashed ${C.accent}`,
            fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,color:C.accent,
            display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
          📂 UPLOAD NEW CSV FILE
        </button>
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleNewCSV} style={{ display:'none' }} />

        {/* Close session */}
        <button className="btn-tap" onClick={() => {
          if (window.confirm('Close this manifest session? All users will be returned to the picker.')) onClose()
        }}
          style={{ width:'100%',padding:'13px',marginTop:10,borderRadius:14,
            background:`${C.red}10`,border:`1px solid ${C.red}30`,
            fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,color:C.red }}>
          CLOSE MANIFEST
        </button>
      </div>
    </div>
  )
}
