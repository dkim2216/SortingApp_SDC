import { useMemo } from 'react'
import { C, STORE_COLORS } from '../theme'
import { Ring, ProgressRow } from './ui'

export default function VerifyScreen({ sessionData }) {
  const manifest = sessionData?.manifest || []
  const stores   = sessionData?.stores   || []

  const allRoutes = useMemo(() => [...new Set(manifest.map(t => t.route))].sort(), [manifest])

  if (!manifest.length) {
    return (
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:12,padding:24 }}>
        <div style={{ fontSize:40 }}>🔍</div>
        <div style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:17,color:C.muted }}>No manifest loaded</div>
      </div>
    )
  }

  // ── Overall stats ────────────────────────────
  const totalStores     = stores.length
  const completedStores = stores.filter(s => s.status === 'completed').length
  const activeStores    = stores.filter(s => s.status === 'claimed').length
  const pendingStores   = stores.filter(s => s.status === 'pending').length
  const totalQty        = stores.reduce((s, st) => s + (st.totalQty || 0), 0)
  const scannedQty      = stores.reduce((s, st) => s + (st.scannedQty || 0), 0)
  const missedQty       = stores.reduce((s, st) => s + (st.missedQty || 0), 0)
  const overallPct      = totalStores ? Math.round(completedStores / totalStores * 100) : 0
  const qtyPct          = totalQty ? Math.round(scannedQty / totalQty * 100) : 0

  return (
    <div style={{ height:'100%',overflowY:'auto',padding:'16px 16px 80px' }}>

      {/* ── Dashboard header ── */}
      <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:20,color:C.navy,marginBottom:16 }}>Overview</div>

      {/* Big status card */}
      <div style={{ background:C.panel,borderRadius:20,padding:'20px',marginBottom:14,
        border:`1.5px solid ${overallPct===100?C.green:C.border}`,
        boxShadow:overallPct===100?`0 4px 20px ${C.green}20`:'0 2px 8px rgba(0,0,0,.06)' }}>
        <div style={{ display:'flex',gap:16,alignItems:'center',marginBottom:16 }}>
          <Ring pct={overallPct} sz={84} stk={7} col={overallPct===100?C.green:C.accent}
            label={overallPct+'%'} sub="stores" />
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:22,color:C.navy,marginBottom:8 }}>
              {overallPct===100 ? '✓ All Complete' : 'In Progress'}
            </div>
            <ProgressRow label="STORES" current={completedStores} total={totalStores} color={overallPct===100?C.green:C.accent} />
            <ProgressRow label="QTY"    current={scannedQty}      total={totalQty}    color={qtyPct===100?C.green:C.accent} />
          </div>
        </div>

        {/* Status pills */}
        <div style={{ display:'flex',gap:8 }}>
          {[
            { l:'COMPLETE',    v:completedStores, c:C.green },
            { l:'IN PROGRESS', v:activeStores,    c:C.amber },
            { l:'PENDING',     v:pendingStores,   c:C.muted },
            { l:'QTY MISSING', v:missedQty,       c:missedQty>0?C.red:C.muted },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ flex:1,textAlign:'center',background:`${c}12`,
              border:`1px solid ${c}30`,borderRadius:10,padding:'8px 4px' }}>
              <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,color:c,lineHeight:1 }}>{v}</div>
              <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:C.muted,marginTop:2,letterSpacing:.3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Route breakdown ── */}
      <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted,letterSpacing:2,marginBottom:10 }}>
        ROUTE BREAKDOWN
      </div>

      {allRoutes.map((route, ri) => {
        const col = STORE_COLORS[ri % STORE_COLORS.length]
        const routeStoreIds = [...new Set(manifest.filter(t => t.route === route).map(t => t.storeId))]
        const routeStores   = stores.filter(s => routeStoreIds.includes(s.storeId))
        const done          = routeStores.filter(s => s.status === 'completed').length
        const active        = routeStores.filter(s => s.status === 'claimed').length
        const totalQ        = routeStores.reduce((s, st) => s + (st.totalQty || 0), 0)
        const scannedQ      = routeStores.reduce((s, st) => s + (st.scannedQty || 0), 0)
        const missed        = routeStores.reduce((s, st) => s + (st.missedQty || 0), 0)
        const pct           = routeStores.length ? Math.round(done / routeStores.length * 100) : 0
        const allDone       = done === routeStores.length && routeStores.length > 0

        return (
          <div key={route} style={{ background:C.panel,borderRadius:16,padding:'14px',marginBottom:10,
            border:`1.5px solid ${allDone?C.green:active>0?col:C.border}`,
            boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
              <div style={{ width:9,height:9,borderRadius:'50%',background:allDone?C.green:col }} />
              <span style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:17,color:C.navy,flex:1 }}>{route}</span>
              <span style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:17,
                color:allDone?C.green:active>0?col:C.muted }}>{pct}%</span>
            </div>

            <ProgressRow label="STORES" current={done} total={routeStores.length} color={allDone?C.green:col} />
            <ProgressRow label="QTY"    current={scannedQ} total={totalQ} color={allDone?C.green:col} />

            {/* Store status summary */}
            <div style={{ display:'flex',gap:6,marginTop:8,flexWrap:'wrap' }}>
              {done > 0 && <Chip label={`✓ ${done} done`} color={C.green} />}
              {active > 0 && <Chip label={`● ${active} active`} color={C.amber} />}
              {(routeStores.length - done - active) > 0 && (
                <Chip label={`${routeStores.length-done-active} pending`} color={C.muted} />
              )}
              {missed > 0 && <Chip label={`${missed} missing`} color={C.red} />}
            </div>
          </div>
        )
      })}

      {/* ── Missing totes summary ── */}
      {missedQty > 0 && (() => {
        const missedStores = stores.filter(s => s.missedQty > 0)
        return (
          <div style={{ background:`${C.red}08`,border:`1px solid ${C.red}30`,borderRadius:16,padding:'14px',marginTop:4 }}>
            <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.red,letterSpacing:2,marginBottom:10 }}>
              ✗ MISSING SUMMARY
            </div>
            {missedStores.map(st => (
              <div key={st.storeId} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'7px 0',borderBottom:`1px solid ${C.red}15` }}>
                <span style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,color:C.navy }}>{st.storeId}</span>
                <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.red }}>{st.missedQty} missing</span>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

function Chip({ label, color }) {
  return (
    <span style={{ padding:'2px 8px',borderRadius:20,fontFamily:"'Share Tech Mono',monospace",fontSize:10,
      color,background:`${color}15`,border:`1px solid ${color}30` }}>{label}</span>
  )
}
