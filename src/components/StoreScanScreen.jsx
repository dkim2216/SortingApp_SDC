import { useState, useEffect, useMemo, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { C } from '../theme'
import { Ring, ProgressRow, StatPills, SortCard, ConfirmModal } from './ui'
import { session as sessionAPI } from '../api'

/**
 * StoreScanScreen
 *
 * One user scans one store at a time (they've claimed it).
 * Local Map tracks scanned totes for instant UI feedback;
 * each scan also syncs to the server for live progress bars.
 */
export default function StoreScanScreen({
  sessionId, store, route, storeColor, manifest, storeState,
  currentUser, onScan, onComplete, onBack,
}) {
  const [inputVal, setInputVal]       = useState('')
  const [scanned, setScanned]         = useState(new Map()) // toteId -> count
  const [lastScan, setLastScan]       = useState(null)
  const [log, setLog]                 = useState([])
  const [confirm, setConfirm]         = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [saving, setSaving]           = useState(false)
  const inputRef   = useRef()
  const logRef     = useRef()
  const scannerRef = useRef(null)

  const storeTotes = useMemo(() => manifest.filter(t => t.storeId === store), [manifest, store])
  const toteMap    = useMemo(() => new Map(storeTotes.map(t => [t.toteId, t])), [storeTotes])
  const totalQty   = storeTotes.reduce((s, t) => s + (t.qty || 1), 0)

  const scannedQty = [...scanned.entries()].reduce((s, [id, cnt]) => {
    const t = toteMap.get(id); return s + Math.min(cnt, t?.qty || cnt)
  }, 0)
  const totesDone = [...scanned.entries()].filter(([id, cnt]) => {
    const t = toteMap.get(id); return cnt >= (t?.qty || 1)
  }).length
  const leftQty = totalQty - scannedQty
  const pct = totalQty ? Math.round(scannedQty / totalQty * 100) : 0
  const isComplete = storeState?.status === 'completed'

  // ── On mount: hydrate already-scanned totes (resume support) ──
  useEffect(() => {
    let active = true
    sessionAPI.getStoreScans(sessionId, store)
      .then(scans => {
        if (!active) return
        const m = new Map()
        scans.forEach(s => m.set(s.toteId, s.count))
        setScanned(m)
      })
      .catch(() => {})
    inputRef.current?.focus()
    return () => { active = false }
  }, [sessionId, store])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0
  }, [log])

  // ── Camera (proper mobile-safe pattern) ──────
  useEffect(() => {
    if (!cameraActive) return
    let cancelled = false
    const t = setTimeout(async () => {
      if (cancelled || !document.getElementById('qr-reader')) return
      try {
        const qr = new Html5Qrcode('qr-reader')
        scannerRef.current = qr
        await qr.start(
          { facingMode: { ideal: 'environment' } },
          { fps: 10, qrbox: (w, h) => { const s = Math.min(w, h) * 0.7; return { width: s, height: s } } },
          text => {
            const raw = text.trim().toUpperCase()
            const id = raw.length > 19 ? raw.substring(0, 19) : raw
            doScan(id)
          },
          () => {}
        )
      } catch (err) {
        console.warn('Camera error:', err)
        if (!cancelled) { setCameraActive(false); scannerRef.current = null }
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
      if (scannerRef.current) { scannerRef.current.stop().catch(() => {}); scannerRef.current = null }
    }
  }, [cameraActive])

  // ── Scan logic ───────────────────────────────
  const doScan = (toteId) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false })
    const item = toteMap.get(toteId)
    if (!item) {
      setLog(l => [{ time, msg: `✗ NOT IN ${store}: ${toteId}`, type: 'error' }, ...l])
      return
    }
    setScanned(prev => {
      const maxQty = item.qty || 1
      const cur = prev.get(toteId) || 0
      if (cur >= maxQty) {
        setLog(l => [{ time, msg: `⚠ COMPLETE: ${toteId} [${maxQty}/${maxQty}]`, type: 'warn' }, ...l])
        return prev
      }
      const next = cur + 1
      const done = next >= maxQty
      const m = new Map(prev); m.set(toteId, next)
      setLastScan({ toteId, qty: maxQty, count: next, ts: Date.now() })
      setLog(l => [{ time, msg: `✓ ${toteId}  [${next}/${maxQty}]${done?' ✓ COMPLETE':''}`, type: done?'ok':'scan' }, ...l])
      return m
    })
    // Sync to server (fire-and-forget for live progress on other screens)
    onScan(store, toteId)
  }

  const go = () => {
    const id = inputVal.trim().toUpperCase()
    if (!id) return
    doScan(id)
    setInputVal('')
    inputRef.current?.focus()
  }

  const pressComplete = () => {
    const scannedList = [], missedList = []
    storeTotes.forEach(t => {
      const maxQty = t.qty || 1
      const cnt = scanned.get(t.toteId) || 0
      if (cnt > 0) scannedList.push({ toteId: t.toteId, storeId: t.storeId, qty: cnt })
      const missing = maxQty - cnt
      if (missing > 0) missedList.push({ toteId: t.toteId, storeId: t.storeId, qty: missing, scannedQty: cnt, totalQty: maxQty })
    })
    setConfirm({ scannedList, missedList })
  }

  const doComplete = async () => {
    const { scannedList, missedList } = confirm
    setConfirm(null)
    setSaving(true)
    await onComplete(store, scannedList, missedList)
    setSaving(false)
    onBack()
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%',padding:'12px 14px 0' }}>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
        <button className="btn-tap" onClick={onBack} style={{ background:C.light,border:`1px solid ${C.border}`,
          borderRadius:10,padding:'6px 12px',fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:C.muted }}>‹ {route}</button>
        <div style={{ flex:1,display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ width:9,height:9,borderRadius:'50%',background:storeColor,boxShadow:`0 0 6px ${storeColor}80` }} />
          <span style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:22,color:C.navy }}>{store}</span>
        </div>
        <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.accent }}>🔒 {currentUser}</span>
      </div>

      {/* Progress card */}
      <div style={{ background:C.panel,border:`1px solid ${isComplete?C.green:C.border}`,borderRadius:16,padding:14,marginBottom:10 }}>
        <div style={{ display:'flex',gap:12,alignItems:'center' }}>
          <Ring pct={pct} sz={68} stk={6} col={isComplete?C.green:storeColor} label={pct+'%'} sub={scannedQty+'/'+totalQty} />
          <div style={{ flex:1 }}>
            <ProgressRow label="QTY DONE" current={scannedQty} total={totalQty} color={isComplete?C.green:storeColor} />
            <ProgressRow label="TOTES DONE" current={totesDone} total={storeTotes.length} color={isComplete?C.green:storeColor} />
            <div style={{ marginTop:6 }}>
              <StatPills stats={[
                { l:'QTY LEFT',   v:leftQty,                       c:leftQty?C.red:C.muted },
                { l:'TOTES LEFT', v:storeTotes.length-totesDone,   c:(storeTotes.length-totesDone)?C.amber:C.muted },
                { l:'QTY DONE',   v:scannedQty,                    c:C.green },
                { l:'TOTES DONE', v:totesDone,                     c:C.green },
              ]} />
            </div>
          </div>
        </div>
      </div>

      {/* Last scan card */}
      {lastScan && (
        <SortCard key={lastScan.toteId + '_' + lastScan.ts}
          toteId={lastScan.toteId} storeId={store} route={route}
          qty={lastScan.qty} count={lastScan.count} color={storeColor} />
      )}

      {/* Camera */}
      {cameraActive && (
        <div style={{ position:'relative',marginBottom:10 }}>
          <div id="qr-reader" style={{ borderRadius:12,overflow:'hidden',border:`1px solid ${C.border}`,background:'#000' }} />
          <button className="btn-tap" onClick={() => setCameraActive(false)}
            style={{ position:'absolute',top:8,right:8,zIndex:10,background:'rgba(0,0,0,.55)',
              border:'none',borderRadius:8,color:'#fff',padding:'6px 12px',
              fontFamily:"'Share Tech Mono',monospace",fontSize:11 }}>✕ CLOSE</button>
        </div>
      )}

      {/* Log */}
      <div ref={logRef} style={{ flex:1,overflowY:'auto',marginBottom:8,background:C.light,borderRadius:12,padding:'8px 10px' }}>
        {log.length === 0 && (
          <div style={{ textAlign:'center',paddingTop:20,fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted }}>
            Scan a tote to begin…
          </div>
        )}
        {log.map((entry, i) => (
          <div key={i} style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,
            color:entry.type==='error'?C.red:entry.type==='warn'?C.amber:entry.type==='ok'?C.green:C.navy,
            padding:'3px 0',borderBottom:i<log.length-1?`1px solid ${C.border}`:'none' }}>
            <span style={{ color:C.muted,marginRight:6 }}>{entry.time}</span>{entry.msg}
          </div>
        ))}
      </div>

      {/* Input + complete */}
      <div style={{ display:'flex',gap:8,marginBottom:8 }}>
        <input ref={inputRef} value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
          placeholder="Scan or type tote ID…"
          className="scan-pulse"
          style={{ flex:1,padding:'13px 14px',border:`2px solid ${C.accent}`,borderRadius:14,
            fontFamily:"'Share Tech Mono',monospace",fontSize:14,color:C.navy,background:C.panel }} />
        <button className="btn-tap" onClick={go} style={{ padding:'13px 18px',background:C.accent,border:'none',
          borderRadius:14,color:'#fff',fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16 }}>GO</button>
        <button className="btn-tap" onClick={() => setCameraActive(v => !v)}
          style={{ padding:'13px',background:cameraActive?C.amber:C.light,border:`1px solid ${C.border}`,borderRadius:14,fontSize:18 }}>📷</button>
      </div>
      <button className="btn-tap" onClick={pressComplete} disabled={saving}
        style={{ width:'100%',padding:'14px',border:'none',borderRadius:14,fontFamily:"'Rajdhani',sans-serif",
          fontWeight:700,fontSize:18,color:'#fff',marginBottom:4,opacity:saving?0.65:1,
          background:leftQty>0?`linear-gradient(135deg,${C.red},#f97316)`:`linear-gradient(135deg,${C.green},${C.accent})`,
          boxShadow:leftQty>0?`0 4px 16px ${C.red}40`:`0 4px 16px ${C.green}40` }}>
        {saving ? 'SAVING…' : leftQty>0 ? `COMPLETE ${store}  (${leftQty} QTY MISSING)` : `✓ COMPLETE ${store}`}
      </button>

      {confirm && (
        <ConfirmModal storeId={store}
          scannedList={confirm.scannedList} missedList={confirm.missedList}
          onComplete={doComplete} onCancel={() => setConfirm(null)} />
      )}
    </div>
  )
}
