import { useEffect } from 'react'
import { C } from '../../theme'

// ── Ring ─────────────────────────────────────
export function Ring({ pct, sz = 72, stk = 6, col = C.accent, label, sub }) {
  const r = (sz - stk) / 2
  const ci = 2 * Math.PI * r
  const off = ci * (1 - pct / 100)
  return (
    <div style={{ position: 'relative', width: sz, height: sz, flexShrink: 0 }}>
      <svg width={sz} height={sz} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={C.border} strokeWidth={stk} />
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={col} strokeWidth={stk}
          strokeLinecap="round" strokeDasharray={ci} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset .5s ease' }} />
      </svg>
      <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
        <span style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:sz>70?22:sz>45?16:13,color:C.navy,lineHeight:1 }}>{label}</span>
        {sub && <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted,marginTop:1 }}>{sub}</span>}
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────
export function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t) }, [])
  const bg = type === 'error' ? C.red : type === 'warn' ? C.amber : C.green
  return (
    <div style={{ position:'fixed',bottom:90,left:'50%',transform:'translateX(-50%)',
      zIndex:9999,background:bg,color:'#fff',borderRadius:12,padding:'10px 20px',
      fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,
      boxShadow:'0 4px 20px rgba(0,0,0,.25)',whiteSpace:'nowrap',
      animation:'slideUp .25s ease both',maxWidth:'90vw',textAlign:'center' }}>
      {msg}
    </div>
  )
}

// ── SearchBar ─────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div style={{ background:C.panel,border:`1.5px solid ${value?C.accent:C.border}`,
      borderRadius:14,padding:'10px 14px',marginBottom:12,
      display:'flex',alignItems:'center',gap:10,transition:'border-color .2s',
      boxShadow:value?`0 0 0 3px ${C.accent}18`:'none' }}>
      <span style={{ color:C.muted,fontSize:14 }}>🔍</span>
      <input value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ flex:1,border:'none',background:'transparent',
          fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:C.navy }} />
      {value && <button onClick={() => onChange('')}
        style={{ background:'none',border:'none',color:C.muted,fontSize:16,cursor:'pointer',padding:0 }}>✕</button>}
    </div>
  )
}

// ── ProgressRow ───────────────────────────────
export function ProgressRow({ label, current, total, color }) {
  const pct = total ? Math.round(current / total * 100) : 0
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:2 }}>
        <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1 }}>{label}</span>
        <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color }}>{current}/{total}</span>
      </div>
      <div style={{ height:4,background:C.border,borderRadius:2,overflow:'hidden' }}>
        <div style={{ height:'100%',width:pct+'%',background:color,borderRadius:2,transition:'width .3s ease' }} />
      </div>
    </div>
  )
}

// ── StatPills ─────────────────────────────────
export function StatPills({ stats }) {
  return (
    <div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>
      {stats.map(({ l, v, c }, i) => (
        <div key={i} style={{ background:`${c}15`,border:`1px solid ${c}30`,borderRadius:6,
          padding:'2px 8px',display:'flex',flexDirection:'column',alignItems:'center',minWidth:52 }}>
          <span style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,color:c,lineHeight:1.2 }}>{v}</span>
          <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:C.muted,letterSpacing:.5,textAlign:'center' }}>{l}</span>
        </div>
      ))}
    </div>
  )
}

// ── NavBar ────────────────────────────────────
export function NavBar({ tabs, activeTab, onSelect, badge }) {
  return (
    <div style={{ display:'flex',background:C.panel,borderTop:`1px solid ${C.border}`,
      paddingBottom:'calc(8px + env(safe-area-inset-bottom))',paddingTop:4,
      boxShadow:'0 -1px 6px rgba(0,0,0,.06)',flexShrink:0 }}>
      {tabs.map(n => {
        const on = activeTab === n.id
        return (
          <button key={n.id} onClick={() => onSelect(n.id)} className="nav-tab"
            style={{ color: on ? C.accent : C.muted }}>
            {badge?.[n.id] && (
              <div style={{ position:'absolute',top:6,right:'calc(50% - 12px)',
                width:6,height:6,borderRadius:'50%',background:badge[n.id],
                boxShadow:`0 0 5px ${badge[n.id]}` }} />
            )}
            <div style={{ fontSize: 13 }}>{n.icon}</div>
            <div style={{ fontSize: 11, letterSpacing: .3 }}>{n.label}</div>
            {on && <div style={{ position:'absolute',bottom:0,left:'50%',
              transform:'translateX(-50%)',width:20,height:3,
              borderRadius:2,background:C.accent }} />}
          </button>
        )
      })}
    </div>
  )
}

// ── Footer ────────────────────────────────────
export function Footer({ currentUser, onSwitchUser }) {
  return (
    <div style={{ textAlign:'center',padding:'3px 8px',background:C.panel,
      borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'center',
      alignItems:'center',gap:10,flexShrink:0 }}>
      <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1 }}>
        SDC WAREHOUSE
      </span>
      <span style={{ color:C.border }}>·</span>
      <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.accent,fontWeight:700 }}>
        👤 {currentUser}
      </span>
      <span style={{ color:C.border }}>·</span>
      <button onClick={onSwitchUser}
        style={{ background:'none',border:'none',fontFamily:"'Share Tech Mono',monospace",
          fontSize:10,color:C.muted,cursor:'pointer',textDecoration:'underline',padding:0 }}>
        SWITCH USER
      </button>
    </div>
  )
}

// ── SortCard (shown after each scan) ──────────
export function SortCard({ toteId, storeId, route, qty, count, color }) {
  const pct = qty ? Math.round((count / qty) * 100) : 0
  const done = count >= qty
  return (
    <div className="store-flash" style={{ background:`linear-gradient(135deg,${color}18,${color}05)`,
      border:`2.5px solid ${done?C.green:color}`,borderRadius:16,padding:'12px 16px',marginBottom:10,textAlign:'center' }}>
      <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:C.muted,letterSpacing:3,marginBottom:2 }}>SORT TO</div>
      <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:56,color:done?C.green:color,lineHeight:1,marginBottom:3 }}>{storeId}</div>
      {route && <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted,marginBottom:4 }}>{route}</div>}
      <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:14,color:C.muted,marginBottom:6 }}>{toteId}</div>
      <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:30,color:done?C.green:color,lineHeight:1,marginBottom:4 }}>
        {count} <span style={{ fontSize:14,color:C.muted }}>/ {qty}</span>
      </div>
      <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:done?C.green:C.muted,letterSpacing:2,marginBottom:6 }}>
        {done ? '✓ TOTE COMPLETE' : 'SCANS DONE'}
      </div>
      <div style={{ height:5,background:C.border,borderRadius:4,overflow:'hidden' }}>
        <div style={{ height:'100%',width:pct+'%',borderRadius:4,background:done?C.green:color,transition:'width .3s ease' }} />
      </div>
    </div>
  )
}

// ── ConfirmModal (store completion) ───────────
export function ConfirmModal({ storeId, scannedList, missedList, onComplete, onCancel }) {
  const scQty = scannedList.reduce((s, t) => s + (t.qty || 1), 0)
  const msQty = missedList.reduce((s, t) => s + (t.qty || 1), 0)
  const hasMissed = missedList.length > 0
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="modal-sheet pop-in" onClick={e => e.stopPropagation()}>
        <div style={{ textAlign:'center',marginBottom:16 }}>
          <div style={{ width:52,height:52,borderRadius:'50%',background:hasMissed?`${C.red}15`:`${C.green}15`,
            border:`2px solid ${hasMissed?C.red:C.green}`,display:'flex',alignItems:'center',
            justifyContent:'center',margin:'0 auto 10px',fontSize:22 }}>{hasMissed?'⚠️':'✅'}</div>
          <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:20,color:C.navy }}>{storeId}</div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted }}>
            {hasMissed ? 'Missing totes detected' : 'All totes scanned'}
          </div>
        </div>
        <div style={{ display:'flex',gap:8,marginBottom:14 }}>
          <div style={{ flex:1,background:`${C.green}10`,border:`1px solid ${C.green}30`,borderRadius:12,padding:'10px',textAlign:'center' }}>
            <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:22,color:C.green }}>{scQty}</div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted }}>SCANNED QTY</div>
          </div>
          <div style={{ flex:1,background:hasMissed?`${C.red}10`:`${C.green}10`,border:`1px solid ${hasMissed?C.red:C.green}30`,borderRadius:12,padding:'10px',textAlign:'center' }}>
            <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:22,color:hasMissed?C.red:C.green }}>{msQty}</div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted }}>MISSING QTY</div>
          </div>
        </div>
        {hasMissed && (
          <div style={{ maxHeight:160,overflowY:'auto',marginBottom:12 }}>
            {missedList.map(t => (
              <div key={t.toteId} style={{ background:'#fff5f5',padding:'8px 12px',borderRadius:10,
                border:`1px solid ${C.red}25`,marginBottom:5,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:C.red }}>{t.toteId}</span>
                <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted }}>{t.scannedQty||0}/{t.totalQty||t.qty||1}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display:'flex',gap:8 }}>
          <button className="btn-tap" onClick={onCancel} style={{ flex:1,background:C.light,border:`1px solid ${C.border}`,
            borderRadius:14,padding:'12px',fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16,color:C.muted }}>CANCEL</button>
          <button className="btn-tap" onClick={onComplete} style={{ flex:2,background:hasMissed?C.red:C.green,border:'none',
            borderRadius:14,padding:'12px',fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16,color:'#fff' }}>
            {hasMissed ? 'COMPLETE (MISSING)' : '✓ COMPLETE STORE'}
          </button>
        </div>
      </div>
    </div>
  )
}
