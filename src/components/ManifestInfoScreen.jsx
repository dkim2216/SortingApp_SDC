import { useState, useEffect, useRef } from 'react'
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

const DEMO_TOTES = [
  { toteId:'DEMO-001', storeId:'Store A', qty:2,  route:'Route 1' },
  { toteId:'DEMO-002', storeId:'Store A', qty:1,  route:'Route 1' },
  { toteId:'DEMO-003', storeId:'Store B', qty:3,  route:'Route 1' },
  { toteId:'DEMO-004', storeId:'Store B', qty:1,  route:'Route 1' },
  { toteId:'DEMO-005', storeId:'Store C', qty:2,  route:'Route 2' },
  { toteId:'DEMO-006', storeId:'Store C', qty:1,  route:'Route 2' },
  { toteId:'DEMO-007', storeId:'Store D', qty:2,  route:'Route 2' },
  { toteId:'DEMO-008', storeId:'Store D', qty:1,  route:'Route 2' },
  { toteId:'DEMO-009', storeId:'Store E', qty:1,  route:'Route 3' },
  { toteId:'DEMO-010', storeId:'Store E', qty:2,  route:'Route 3' },
]

export default function ManifestInfoScreen({ sessionData, selectedManifest, currentUser, onSelect, onClose }) {
  const [openSessions, setOpenSessions] = useState([])
  const [uploading, setUploading]       = useState(false)
  const [error, setError]               = useState('')
  const fileRef = useRef()

  const manifest = sessionData?.manifest || []
  const stores   = sessionData?.stores   || []
  const session  = sessionData?.session
  const isLoaded = manifest.length > 0

  // ── Derived stats ─────────────────────────────
  const allRoutes  = [...new Set(manifest.map(t => t.route))].sort()
  const allStores  = [...new Set(manifest.map(t => t.storeId))]
  const totalTotes = manifest.length
  const totalQty   = manifest.reduce((s, t) => s + (t.qty || 1), 0)

  // ── Load open sessions when no manifest selected ─
  useEffect(() => {
    if (selectedManifest) return
    manifestsAPI.getOpen().then(setOpenSessions).catch(() => {})
  }, [selectedManifest])

  const uploadFile = async (file) => {
    if (!file) return
    setUploading(true); setError('')
    try {
      const txt   = await file.text()
      const totes = parseCSV(txt)
      if (!totes.length) { setError('No valid totes found in CSV'); return }
      const label  = file.name.replace(/\.csv$/i, '')
      const result = await manifestsAPI.start(label, totes, currentUser)
      onSelect({ id: result.sessionId, manifestNo: label })
    } catch { setError('Upload failed — is the server running?') }
    finally { setUploading(false) }
  }

  const loadDemo = async () => {
    setUploading(true); setError('')
    try {
      const label  = 'DEMO-' + new Date().toISOString().slice(11,16).replace(':','')
      const result = await manifestsAPI.start(label, DEMO_TOTES, currentUser)
      onSelect({ id: result.sessionId, manifestNo: label })
    } catch { setError('Demo failed — is the server running?') }
    finally { setUploading(false) }
  }

  // ── Header: dark navy with stats ─────────────
  const Header = () => (
    <div style={{ background:`linear-gradient(135deg, ${C.navy} 0%, #162d6e 100%)`,
      padding:'18px 20px 22px', flexShrink:0, position:'relative', overflow:'hidden' }}>
      {/* Decorative circle */}
      <div style={{ position:'absolute',top:-20,right:-20,width:100,height:100,
        borderRadius:'50%',background:'rgba(99,102,241,0.25)' }} />
      <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,
        color:'rgba(255,255,255,0.5)',letterSpacing:2,marginBottom:4 }}>MANIFEST</div>
      <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:24,
        color:'#fff',marginBottom:isLoaded?14:0,lineHeight:1.1 }}>
        {isLoaded ? (session?.manifestNo || 'Manifest Loaded') : 'No Manifest Loaded'}
      </div>
      {isLoaded && (
        <div style={{ display:'flex',gap:10,marginTop:12 }}>
          {[
            { l:'ROUTES',    v:allRoutes.length,  c:'#00C9A7' },
            { l:'STORES',    v:allStores.length,  c:'#FFB300' },
            { l:'TOTES',     v:totalTotes,        c:'#a78bfa' },
            { l:'TOTAL QTY', v:totalQty,          c:'#f97316' },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ flex:1 }}>
              <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,
                fontSize:22,color:c,lineHeight:1 }}>{v}</div>
              <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:8,
                color:'rgba(255,255,255,0.4)',marginTop:2,letterSpacing:.5 }}>{l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── Route cards (when manifest loaded) ────────
  const RouteList = () => (
    <>
      <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,
        color:C.muted,letterSpacing:2,margin:'16px 0 10px' }}>ROUTES IN MANIFEST</div>
      {allRoutes.map((route, ri) => {
        const col       = STORE_COLORS[ri % STORE_COLORS.length]
        const totes     = manifest.filter(t => t.route === route)
        const storeIds  = [...new Set(totes.map(t => t.storeId))].sort()
        const qty       = totes.reduce((s, t) => s + (t.qty || 1), 0)
        const routeSt   = stores.filter(s => storeIds.includes(s.storeId))
        const done      = routeSt.filter(s => s.status === 'completed').length
        return (
          <div key={route} style={{ paddingBottom:14,marginBottom:14,
            borderBottom:ri < allRoutes.length-1 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,
              fontSize:18,color:C.navy,marginBottom:3 }}>{route}</div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,
              color:C.muted,marginBottom:8 }}>
              {storeIds.length} stores&nbsp;&nbsp;{totes.length} totes&nbsp;&nbsp;{qty} qty
              {done > 0 && <span style={{ color:C.green }}>&nbsp;&nbsp;{done}/{storeIds.length} done</span>}
            </div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
              {storeIds.map(storeId => {
                const st = stores.find(s => s.storeId === storeId)
                const isDone   = st?.status === 'completed'
                const isActive = st?.status === 'claimed'
                return (
                  <span key={storeId} style={{ padding:'4px 12px',borderRadius:20,
                    fontFamily:"'Share Tech Mono',monospace",fontSize:11,
                    background:isDone?`${C.green}15`:isActive?`${C.amber}15`:C.light,
                    border:`1px solid ${isDone?C.green+'60':isActive?C.amber+'60':C.border}`,
                    color:isDone?C.green:isActive?C.amber:C.muted }}>
                    {isDone?'✓ ':isActive?'● ':''}{storeId}
                  </span>
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )

  // ── Open sessions list (when no manifest) ─────
  const OpenSessionsList = () => openSessions.length === 0 ? null : (
    <>
      <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,
        color:C.muted,letterSpacing:2,margin:'16px 0 10px' }}>OPEN MANIFESTS</div>
      {openSessions.map(m => {
        const done  = parseInt(m.completed_stores) || 0
        const total = parseInt(m.total_stores) || 0
        const pct   = total ? Math.round(done/total*100) : 0
        return (
          <button key={m.id} className="btn-tap" onClick={() => onSelect(m)}
            style={{ width:'100%',background:C.panel,borderRadius:14,padding:'12px 14px',
              marginBottom:8,textAlign:'left',border:`1px solid ${C.border}`,
              boxShadow:'0 1px 4px rgba(0,0,0,.05)',display:'flex',alignItems:'center',gap:12 }}>
            <span style={{ fontSize:18 }}>📋</span>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16,color:C.navy }}>
                {m.manifest_no}
              </div>
              <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted,marginTop:1 }}>
                {done}/{total} stores done · {pct}%
                {parseInt(m.active_users)>0 && <span style={{ color:C.accent }}> · {m.active_users} active</span>}
              </div>
            </div>
            <span style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,
              color:pct===100?C.green:pct>0?C.accent:C.muted }}>{pct}%</span>
          </button>
        )
      })}
    </>
  )

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%' }}>
      <Header />

      <div style={{ flex:1,overflowY:'auto',padding:'0 16px 100px' }}>
        {error && (
          <div style={{ background:`${C.red}10`,border:`1px solid ${C.red}30`,borderRadius:12,
            padding:'10px 14px',margin:'12px 0',fontFamily:"'Share Tech Mono',monospace",
            fontSize:11,color:C.red }}>{error}</div>
        )}

        {/* CSV format hint */}
        <div style={{ marginTop:16,marginBottom:14,padding:'12px 14px',background:C.panel,
          border:`1px solid ${C.border}`,borderRadius:12 }}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,
            color:C.muted,letterSpacing:1,marginBottom:6 }}>CSV FORMAT</div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.navy,lineHeight:1.7 }}>
            tote_id, store_id, qty, Routes<br/>
            TOTE-001, Store A, 24, Route 1
          </div>
        </div>

        {/* Upload CSV */}
        <button className="btn-tap" onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ width:'100%',padding:'15px',borderRadius:14,
            background:'transparent',border:`1.5px solid ${C.accent}`,
            fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16,color:C.accent,
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,
            opacity:uploading?.65:1,marginBottom:10 }}>
          📄 {uploading ? 'UPLOADING…' : 'UPLOAD CSV FILE'}
        </button>
        <input ref={fileRef} type="file" accept=".csv,.txt"
          onChange={e => { uploadFile(e.target.files[0]); e.target.value='' }}
          style={{ display:'none' }} />

        {/* Demo button */}
        <button className="btn-tap" onClick={loadDemo} disabled={uploading}
          style={{ width:'100%',padding:'12px',borderRadius:14,background:'transparent',
            border:`1px solid ${C.border}`,fontFamily:"'Rajdhani',sans-serif",
            fontWeight:600,fontSize:13,color:C.muted,opacity:uploading?.65:1,marginBottom:4 }}>
          LOAD DEMO (10 totes · 3 routes · 5 stores)
        </button>

        {/* Open sessions (when none selected) */}
        {!isLoaded && <OpenSessionsList />}

        {/* Route breakdown (when manifest loaded) */}
        {isLoaded && <RouteList />}

        {/* Clear / close manifest */}
        {isLoaded && (
          <button className="btn-tap" onClick={() => {
            if (window.confirm('Close this manifest? All users will return to the manifest page.')) onClose()
          }}
            style={{ width:'100%',padding:'13px',marginTop:8,borderRadius:14,
              background:`${C.red}08`,border:`1px solid ${C.red}40`,
              fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,color:C.red }}>
            CLEAR MANIFEST
          </button>
        )}

        {/* Footer credit */}
        <div style={{ textAlign:'center',marginTop:20,fontFamily:"'Share Tech Mono',monospace",
          fontSize:10,color:C.muted,letterSpacing:1 }}>
          MADE BY KIM.JONGWON
        </div>
      </div>
    </div>
  )
}
