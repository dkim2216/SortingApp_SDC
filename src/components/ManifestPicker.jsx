import { useState, useEffect, useRef } from 'react'
import { C } from '../theme'
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


// Sample data for testing — 2 routes, 4 stores, 10 totes
function makeDemoTotes() {
  return [
    { toteId: 'DEMO-001', storeId: 'Store A', qty: 2, route: 'Route 1' },
    { toteId: 'DEMO-002', storeId: 'Store A', qty: 1, route: 'Route 1' },
    { toteId: 'DEMO-003', storeId: 'Store B', qty: 3, route: 'Route 1' },
    { toteId: 'DEMO-004', storeId: 'Store B', qty: 1, route: 'Route 1' },
    { toteId: 'DEMO-005', storeId: 'Store C', qty: 2, route: 'Route 2' },
    { toteId: 'DEMO-006', storeId: 'Store C', qty: 1, route: 'Route 2' },
    { toteId: 'DEMO-007', storeId: 'Store C', qty: 2, route: 'Route 2' },
    { toteId: 'DEMO-008', storeId: 'Store D', qty: 1, route: 'Route 2' },
    { toteId: 'DEMO-009', storeId: 'Store D', qty: 1, route: 'Route 2' },
    { toteId: 'DEMO-010', storeId: 'Store D', qty: 2, route: 'Route 2' },
  ]
}

export default function ManifestPicker({ currentUser, onSelect }) {
  const [openManifests, setOpenManifests] = useState([])
  const [loading, setLoading]             = useState(true)
  const [uploading, setUploading]         = useState(false)
  const [showUpload, setShowUpload]       = useState(false)
  const [manifestNo, setManifestNo]       = useState('')
  const [error, setError]                 = useState('')
  const fileRef = useRef()

  const load = async () => {
    try {
      const data = await manifestsAPI.getOpen()
      setOpenManifests(data)
    } catch {
      setError('Could not load manifests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const txt = await file.text()
    const totes = parseCSV(txt)
    if (!totes.length) { setError('No valid totes in CSV'); return }
    const label = manifestNo.trim() || file.name.replace(/\.csv$/i, '')
    setUploading(true)
    try {
      const result = await manifestsAPI.start(label, totes, currentUser)
      await load() // refresh list
      setShowUpload(false)
      setManifestNo('')
      // Auto-select the new manifest
      onSelect({ id: result.sessionId, manifestNo: label })
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }


  const loadDemo = async () => {
    setUploading(true)
    setError('')
    try {
      const label = 'DEMO-' + new Date().toISOString().slice(11,16).replace(':','')
      const result = await manifestsAPI.start(label, makeDemoTotes(), currentUser)
      await load()
      onSelect({ id: result.sessionId, manifestNo: label })
    } catch {
      setError('Demo failed — is the server running?')
    } finally {
      setUploading(false)
    }
  }

  const allDone = (m) => parseInt(m.completed_stores) === parseInt(m.total_stores) && parseInt(m.total_stores) > 0
  const pct     = (m) => m.total_stores > 0 ? Math.round(m.completed_stores / m.total_stores * 100) : 0

  return (
    <div style={{ height:'100%',overflowY:'auto',padding:'16px 16px 40px' }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:24,color:C.navy }}>
          Choose Manifest
        </div>
        <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted,marginTop:2 }}>
          👤 {currentUser} — pick a manifest to work on
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background:`${C.red}10`,border:`1px solid ${C.red}30`,borderRadius:12,
          padding:'10px 14px',marginBottom:12,fontFamily:"'Share Tech Mono',monospace",
          fontSize:11,color:C.red }}>
          {error}
        </div>
      )}

      {/* Open manifests */}
      {loading && (
        <div style={{ textAlign:'center',paddingTop:40,fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted }}>
          Loading manifests…
        </div>
      )}

      {!loading && openManifests.length === 0 && !showUpload && (
        <div style={{ textAlign:'center',padding:'40px 20px',
          fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:C.muted }}>
          No open manifests.<br/>Upload a CSV to start.
        </div>
      )}

      {openManifests.map(m => {
        const done = allDone(m)
        const progress = pct(m)
        const activeUsers = parseInt(m.active_users) || 0
        return (
          <button key={m.id} className="btn-tap" onClick={() => onSelect(m)}
            style={{ width:'100%',background:C.panel,borderRadius:16,padding:'16px',
              marginBottom:10,textAlign:'left',border:`1.5px solid ${done?C.green:C.border}`,
              boxShadow:done?`0 2px 12px ${C.green}20`:'0 1px 4px rgba(0,0,0,.05)' }}>

            {/* Title row */}
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
              <span style={{ fontSize:18 }}>📋</span>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,color:C.navy }}>
                  {m.manifest_no}
                </div>
                <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted,marginTop:1 }}>
                  Started by {m.created_by} · {new Date(m.created_at).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'})}
                </div>
              </div>
              <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:20,
                color:done?C.green:progress>0?C.accent:C.muted }}>
                {progress}%
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height:5,background:C.border,borderRadius:4,overflow:'hidden',marginBottom:10 }}>
              <div style={{ height:'100%',width:progress+'%',borderRadius:4,
                background:done?C.green:C.accent,transition:'width .3s ease' }} />
            </div>

            {/* Stats row */}
            <div style={{ display:'flex',gap:16,alignItems:'center' }}>
              <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted }}>
                <span style={{ color:C.navy,fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14 }}>
                  {m.completed_stores}
                </span>/{m.total_stores} stores
              </span>
              {activeUsers > 0 && (
                <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,
                  color:C.accent,display:'flex',alignItems:'center',gap:4 }}>
                  <span style={{ width:6,height:6,borderRadius:'50%',background:C.accent,
                    display:'inline-block',boxShadow:`0 0 5px ${C.accent}` }} />
                  {activeUsers} active
                </span>
              )}
              {done && (
                <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.green }}>
                  ✓ All done
                </span>
              )}
            </div>
          </button>
        )
      })}

      {/* Upload new manifest */}
      {!showUpload ? (
        <button className="btn-tap" onClick={() => setShowUpload(true)}
          style={{ width:'100%',padding:'14px',marginTop:8,borderRadius:14,
            border:`2px dashed ${C.border}`,background:'transparent',
            fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16,color:C.muted,
            display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
          <span style={{ fontSize:18 }}>＋</span> Upload New Manifest
        </button>
      ) : (
        <div style={{ background:C.panel,border:`1.5px solid ${C.accent}`,borderRadius:16,
          padding:'16px',marginTop:8,boxShadow:`0 2px 12px ${C.accent}15` }}>
          <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:17,
            color:C.navy,marginBottom:12 }}>New Manifest</div>

          <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted,
            letterSpacing:1,marginBottom:6 }}>MANIFEST NUMBER (optional)</div>
          <input value={manifestNo} onChange={e => setManifestNo(e.target.value.toUpperCase())}
            placeholder="e.g. MF-2024-001"
            style={{ width:'100%',padding:'10px 14px',borderRadius:12,marginBottom:12,
              border:`1.5px solid ${manifestNo?C.accent:C.border}`,
              fontFamily:"'Share Tech Mono',monospace",fontSize:14,color:C.navy,background:C.bg }} />

          <div style={{ display:'flex',gap:8 }}>
            <button className="btn-tap" onClick={() => { setShowUpload(false); setManifestNo(''); setError('') }}
              style={{ flex:1,padding:'12px',borderRadius:12,background:C.light,
                border:`1px solid ${C.border}`,fontFamily:"'Rajdhani',sans-serif",
                fontWeight:700,fontSize:15,color:C.muted }}>
              CANCEL
            </button>
            <button className="btn-tap" onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ flex:2,padding:'12px',borderRadius:12,border:'none',
                background:`linear-gradient(135deg,${C.accent},#059669)`,color:'#fff',
                fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,
                opacity:uploading?0.65:1 }}>
              {uploading ? 'UPLOADING…' : '📂 CHOOSE CSV'}
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display:'none' }} />
        </div>
      )}

      {/* Demo button */}
      <button className="btn-tap" onClick={loadDemo} disabled={uploading}
        style={{ width:'100%',padding:'12px',marginTop:10,borderRadius:14,
          background:`${C.accent}12`,border:`1px solid ${C.accent}40`,
          fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,color:C.accent,
          opacity:uploading?0.6:1 }}>
        ⚡ Load Demo Manifest (10 totes)
      </button>

      {/* Refresh */}
      <button className="btn-tap" onClick={load}
        style={{ width:'100%',padding:'10px',marginTop:16,borderRadius:12,
          background:'transparent',border:'none',fontFamily:"'Share Tech Mono',monospace",
          fontSize:11,color:C.muted }}>
        ↻ Refresh
      </button>
    </div>
  )
}
