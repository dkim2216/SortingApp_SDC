import { useMemo, useState } from 'react'
import { C, STORE_COLORS, getStoreColor } from '../theme'
import { ProgressRow } from './ui'
import StoreScanScreen from './StoreScanScreen'
import { reports } from '../api'

// ── Route Report Modal ────────────────────────
function RouteReportModal({ routeName, manifestNo, routeStores, stores, onSend, onCancel, sending }) {
  const storeData = routeStores.map(storeId => {
    const st = stores.find(s => s.storeId === storeId) || {}
    return { storeId, scannedQty: st.scannedQty||0, missedQty: st.missedQty||0, totalQty: st.totalQty||0, completedBy: st.completedBy||'', status: st.status }
  })
  const totalScanned = storeData.reduce((s, st) => s + st.scannedQty, 0)
  const totalMissed  = storeData.reduce((s, st) => s + st.missedQty, 0)
  const hasMissed    = totalMissed > 0

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="modal-sheet pop-in" onClick={e => e.stopPropagation()}>
        <div style={{ textAlign:'center',marginBottom:16 }}>
          <div style={{ fontSize:28,marginBottom:8 }}>{hasMissed?'⚠️':'✅'}</div>
          <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:20,color:C.navy }}>{routeName}</div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted,marginTop:2 }}>
            {hasMissed ? 'Route has missing totes' : 'All stores complete'}
          </div>
        </div>

        <div style={{ display:'flex',gap:8,marginBottom:14 }}>
          <div style={{ flex:1,background:`${C.green}10`,border:`1px solid ${C.green}30`,borderRadius:12,padding:'10px',textAlign:'center' }}>
            <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:22,color:C.green }}>{totalScanned}</div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted }}>SCANNED QTY</div>
          </div>
          <div style={{ flex:1,background:hasMissed?`${C.red}10`:`${C.green}10`,border:`1px solid ${hasMissed?C.red:C.green}30`,borderRadius:12,padding:'10px',textAlign:'center' }}>
            <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:22,color:hasMissed?C.red:C.green }}>{totalMissed}</div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted }}>MISSING QTY</div>
          </div>
        </div>

        {/* Per-store summary */}
        <div style={{ maxHeight:160,overflowY:'auto',marginBottom:14 }}>
          {storeData.map(st => (
            <div key={st.storeId} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:'7px 12px',borderRadius:10,marginBottom:5,
              background:st.missedQty>0?'#fff5f5':C.light,
              border:`1px solid ${st.missedQty>0?C.red+'25':C.border}` }}>
              <span style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,color:C.navy }}>{st.storeId}</span>
              <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:st.missedQty>0?C.red:C.green }}>
                {st.missedQty>0 ? `${st.missedQty} missing` : '✓ clear'}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display:'flex',gap:8 }}>
          <button className="btn-tap" onClick={onCancel}
            style={{ flex:1,padding:'13px',borderRadius:14,background:C.light,border:`1px solid ${C.border}`,
              fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,color:C.muted }}>CANCEL</button>
          <button className="btn-tap" onClick={() => onSend(storeData)} disabled={sending}
            style={{ flex:2,padding:'13px',borderRadius:14,border:'none',color:'#fff',
              background:hasMissed?`linear-gradient(135deg,${C.amber},${C.red})`:`linear-gradient(135deg,${C.green},#059669)`,
              fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,opacity:sending?.65:1 }}>
            {sending ? 'SENDING…' : '📧 SEND REPORT'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main CheckScreen ──────────────────────────
export default function CheckScreen({
  sessionData, loading, currentUser,
  selectedRoute, setSelectedRoute, selectedStore, setSelectedStore,
  onScan, onClaim, onComplete, onRelease, showToast,
}) {
  const [showReportModal, setShowReportModal] = useState(false)
  const [sending, setSending]                 = useState(false)

  const manifest  = sessionData?.manifest || []
  const stores    = sessionData?.stores   || []
  const sessionId = sessionData?.session?.id
  const manifestNo = sessionData?.session?.manifestNo || ''

  const allStores = useMemo(() => [...new Set(manifest.map(t => t.storeId))].sort(), [manifest])
  const allRoutes = useMemo(() => [...new Set(manifest.map(t => t.route))].sort(), [manifest])

  if (loading && !sessionData) return <Centered icon="⏳" text="Loading…" />
  if (!manifest.length)        return <Centered icon="📋" text="No manifest loaded." />

  const storeState = (storeId) => stores.find(s => s.storeId === storeId)

  const handleSendReport = async (storeData) => {
    setSending(true)
    try {
      const res = await reports.sendRoute({
        routeName: selectedRoute,
        manifestNo,
        date: new Date().toLocaleString('en-GB', { dateStyle:'full', timeStyle:'short' }),
        stores: storeData,
      })
      setShowReportModal(false)
      showToast(res.emailSent ? 'Report sent ✓' : 'Email not configured', res.emailSent ? 'ok' : 'warn')
    } catch {
      showToast('Send failed', 'error')
    } finally {
      setSending(false)
    }
  }

  // ── View 3: Store scan ───────────────────────
  if (selectedRoute && selectedStore) {
    const st  = storeState(selectedStore)
    const col = getStoreColor(selectedStore, allStores)
    return (
      <StoreScanScreen
        sessionId={sessionId}
        store={selectedStore}
        route={selectedRoute}
        storeColor={col}
        manifest={manifest}
        storeState={st}
        currentUser={currentUser}
        onScan={onScan}
        onComplete={onComplete}
        onBack={async () => {
          const cur = storeState(selectedStore)
          if (cur?.status !== 'completed') await onRelease(selectedStore)
          setSelectedStore(null)
        }}
      />
    )
  }

  // ── View 2: Store list within route ─────────
  if (selectedRoute) {
    const routeTotes  = manifest.filter(t => t.route === selectedRoute)
    const routeStoreIds = [...new Set(routeTotes.map(t => t.storeId))].sort()
    const allDone     = routeStoreIds.every(id => storeState(id)?.status === 'completed')

    const handleStoreClick = async (storeId) => {
      const st = storeState(storeId)
      if (st?.status === 'completed') { setSelectedStore(storeId); return }
      if (st?.status === 'claimed' && st.claimedBy !== currentUser) {
        showToast(`Locked by ${st.claimedBy}`, 'warn'); return
      }
      const result = await onClaim(storeId)
      if (result?.ok === false && result.conflict) {
        showToast(`Locked by ${result.conflict.claimedBy}`, 'warn'); return
      }
      setSelectedStore(storeId)
    }

    return (
      <div style={{ height:'100%',overflowY:'auto',padding:'12px 14px 80px' }}>
        {/* Back + title */}
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14 }}>
          <button className="btn-tap" onClick={() => setSelectedRoute(null)}
            style={{ background:C.light,border:`1px solid ${C.border}`,borderRadius:10,
              padding:'6px 12px',fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:C.muted }}>‹ ROUTES</button>
          <div style={{ flex:1,fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:20,color:C.navy }}>{selectedRoute}</div>
        </div>

        {routeStoreIds.map(store => {
          const col = getStoreColor(store, allStores)
          const st  = storeState(store) || {}
          const isComplete     = st.status === 'completed'
          const isClaimed      = st.status === 'claimed'
          const claimedByOther = isClaimed && st.claimedBy !== currentUser
          const claimedByMe    = isClaimed && st.claimedBy === currentUser
          const scQty  = st.scannedQty || 0
          const totQty = st.totalQty   || 0
          const pct    = totQty ? Math.round(scQty / totQty * 100) : 0
          const borderCol = isComplete ? C.green : claimedByOther ? C.amber : claimedByMe ? C.accent : C.border
          const statusLabel = isComplete ? '✓ DONE'
            : claimedByOther ? `🔒 ${st.claimedBy}`
            : claimedByMe ? '● YOU'
            : scQty > 0 ? '● PROGRESS' : 'START'

          return (
            <button key={store} className="btn-tap" onClick={() => handleStoreClick(store)}
              disabled={claimedByOther}
              style={{ width:'100%',background:C.panel,border:`1.5px solid ${borderCol}`,
                borderRadius:16,padding:'14px',marginBottom:10,textAlign:'left',opacity:claimedByOther?.7:1,
                boxShadow:isComplete?`0 2px 12px ${C.green}20`:'0 1px 4px rgba(0,0,0,.05)' }}>
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
                <div style={{ width:10,height:10,borderRadius:'50%',background:isComplete?C.green:col,flexShrink:0 }} />
                <span style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:20,color:C.navy,flex:1 }}>{store}</span>
                {/* Percentage */}
                <span style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,
                  color:isComplete?C.green:scQty>0?col:C.muted }}>{pct}%</span>
                <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,
                  color:isComplete?C.green:claimedByOther?C.amber:claimedByMe?C.accent:C.muted }}>
                  {statusLabel}
                </span>
              </div>
              <ProgressRow label="QTY" current={scQty} total={totQty} color={isComplete?C.green:col} />
              <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted,marginTop:3 }}>
                {scQty}/{totQty} qty done
                {isComplete && st.completedBy ? ` · by ${st.completedBy}` : ''}
              </div>
            </button>
          )
        })}

        {/* Send Route Report button */}
        <button className="btn-tap" onClick={() => setShowReportModal(true)}
          style={{ width:'100%',padding:'14px',marginTop:6,border:'none',borderRadius:14,color:'#fff',
            fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:17,
            background:allDone
              ? `linear-gradient(135deg,${C.green},#059669)`
              : `linear-gradient(135deg,${C.navy},#1a3a7c)`,
            boxShadow:allDone?`0 4px 16px ${C.green}40`:`0 4px 16px ${C.navy}40` }}>
          📧 {allDone ? 'SEND ROUTE REPORT' : 'COMPLETE ROUTE & SEND'}
        </button>

        {showReportModal && (
          <RouteReportModal
            routeName={selectedRoute}
            manifestNo={manifestNo}
            routeStores={routeStoreIds}
            stores={stores}
            sending={sending}
            onCancel={() => setShowReportModal(false)}
            onSend={handleSendReport}
          />
        )}
      </div>
    )
  }

  // ── View 1: Route list ───────────────────────
  return (
    <div style={{ height:'100%',overflowY:'auto',padding:'12px 14px 80px' }}>
      <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:20,color:C.navy,marginBottom:14 }}>Routes</div>
      {allRoutes.map((route, ri) => {
        const col = STORE_COLORS[ri % STORE_COLORS.length]
        const routeStoreIds = [...new Set(manifest.filter(t => t.route === route).map(t => t.storeId))]
        const routeStores   = stores.filter(s => routeStoreIds.includes(s.storeId))
        const totalQty      = routeStores.reduce((s, st) => s + (st.totalQty || 0), 0)
        const scannedQty    = routeStores.reduce((s, st) => s + (st.scannedQty || 0), 0)
        const storesDone    = routeStores.filter(s => s.status === 'completed').length
        const allDone       = storesDone === routeStores.length && routeStores.length > 0
        const anyClaimed    = routeStores.some(s => s.status === 'claimed')
        const pct           = routeStores.length ? Math.round(storesDone / routeStores.length * 100) : 0

        return (
          <button key={route} className="btn-tap" onClick={() => setSelectedRoute(route)}
            style={{ width:'100%',background:C.panel,border:`1.5px solid ${allDone?C.green:anyClaimed?col:C.border}`,
              borderRadius:16,padding:'14px',marginBottom:10,textAlign:'left',
              boxShadow:allDone?`0 2px 12px ${C.green}20`:'0 1px 4px rgba(0,0,0,.05)' }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
              <div style={{ width:10,height:10,borderRadius:'50%',background:allDone?C.green:col,flexShrink:0 }} />
              <span style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:20,color:C.navy,flex:1 }}>{route}</span>
              {/* Percentage */}
              <span style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:20,
                color:allDone?C.green:anyClaimed?col:C.muted }}>{pct}%</span>
              <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,
                color:allDone?C.green:anyClaimed?col:C.muted }}>
                {allDone?'✓ DONE':anyClaimed?'● ACTIVE':'START'}
              </span>
            </div>
            <ProgressRow label="QTY" current={scannedQty} total={totalQty} color={allDone?C.green:col} />
            <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted,marginTop:3 }}>
              {storesDone}/{routeStores.length} stores done · {totalQty} qty
            </div>
          </button>
        )
      })}
    </div>
  )
}

function Centered({ icon, text }) {
  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:12,padding:24 }}>
      <div style={{ fontSize:40 }}>{icon}</div>
      <div style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:17,color:C.muted,textAlign:'center' }}>{text}</div>
    </div>
  )
}
