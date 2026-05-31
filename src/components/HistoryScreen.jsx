import { useState, useEffect } from 'react'
import { C } from '../theme'
import { history as historyAPI } from '../api'

export default function HistoryScreen() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(false)
  const [detail, setDetail]   = useState(null)

  const fmt = (dt) => dt ? new Date(dt).toLocaleString('en-GB',{
    day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
  }) : '—'

  const load = async () => {
    setLoading(true)
    try { setItems(await historyAPI.getAll()) } catch { setItems([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div style={{ height:'100%',overflowY:'auto',padding:'14px 14px 80px' }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
        <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:20,color:C.navy }}>History</div>
        <button className="btn-tap" onClick={load} style={{ background:C.light,border:`1px solid ${C.border}`,
          borderRadius:10,padding:'6px 14px',fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:C.muted }}>
          ↻ REFRESH
        </button>
      </div>

      {loading && (
        <div style={{ textAlign:'center',paddingTop:30,fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted }}>Loading…</div>
      )}
      {!loading && items.length === 0 && (
        <div style={{ textAlign:'center',paddingTop:40,fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted }}>No sessions yet</div>
      )}

      {items.map(s => {
        const total    = parseInt(s.total_stores)    || 0
        const completed = parseInt(s.completed_stores) || 0
        const missed   = parseInt(s.total_missed)    || 0
        const isFullyComplete = completed === total && total > 0
        const isOpen   = s.status === 'open'
        const pct      = total ? Math.round(completed / total * 100) : 0

        return (
          <button key={s.id} className="btn-tap"
            onClick={async () => setDetail(await historyAPI.getDetail(s.id))}
            style={{ width:'100%',background:C.panel,borderRadius:16,padding:'14px',marginBottom:10,
              textAlign:'left',boxShadow:'0 1px 4px rgba(0,0,0,.05)',
              border:`1.5px solid ${isFullyComplete&&!isOpen?C.green:isOpen?C.accent:C.red+'50'}` }}>

            {/* Title + status badge */}
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8 }}>
              <div>
                <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:17,color:C.navy }}>
                  {s.manifest_no || 'Manifest'}
                </div>
                <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted,marginTop:2 }}>
                  {fmt(s.created_at)} · by {s.created_by || '—'}
                </div>
              </div>
              {/* Status badge */}
              <div style={{ padding:'4px 10px',borderRadius:8,flexShrink:0,marginLeft:8,
                background: isOpen ? `${C.accent}15`
                  : isFullyComplete && missed===0 ? `${C.green}15`
                  : isFullyComplete && missed>0 ? `${C.amber}15`
                  : `${C.red}15`,
                border: `1px solid ${isOpen?C.accent:isFullyComplete&&missed===0?C.green:isFullyComplete&&missed>0?C.amber:C.red}30` }}>
                <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:12,
                  color: isOpen ? C.accent
                    : isFullyComplete && missed===0 ? C.green
                    : isFullyComplete && missed>0 ? C.amber
                    : C.red }}>
                  {isOpen ? '● OPEN'
                    : isFullyComplete && missed===0 ? '✓ COMPLETE'
                    : isFullyComplete && missed>0 ? '⚠ COMPLETE (MISSED)'
                    : `✗ INCOMPLETE`}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height:4,background:C.border,borderRadius:2,overflow:'hidden',marginBottom:8 }}>
              <div style={{ height:'100%',width:pct+'%',borderRadius:2,
                background:isFullyComplete&&missed===0?C.green:isFullyComplete&&missed>0?C.amber:C.accent,
                transition:'width .3s' }} />
            </div>

            {/* Stats row */}
            <div style={{ display:'flex',gap:12,alignItems:'center' }}>
              <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted }}>
                <span style={{ color:completed===total?C.green:C.navy,fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14 }}>
                  {completed}
                </span>/{total} stores done
              </span>
              {missed > 0 && (
                <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.red }}>
                  · {missed} qty missing
                </span>
              )}
              {isOpen && (
                <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.accent,marginLeft:'auto',
                  display:'flex',alignItems:'center',gap:4 }}>
                  <span style={{ width:5,height:5,borderRadius:'50%',background:C.accent,display:'inline-block' }} />
                  active
                </span>
              )}
            </div>
          </button>
        )
      })}

      {/* Detail modal */}
      {detail && (
        <div className="overlay" onClick={() => setDetail(null)}>
          <div className="modal-sheet pop-in" onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6 }}>
              <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,color:C.navy }}>
                {detail.manifest_no || 'Manifest'}
              </div>
              <button className="btn-tap" onClick={() => setDetail(null)}
                style={{ background:C.light,border:'none',borderRadius:8,padding:'6px 10px',
                  fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:C.muted }}>✕</button>
            </div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted,marginBottom:14 }}>
              {fmt(detail.created_at)} · {detail.created_by}
              {detail.closed_at ? ` · closed ${fmt(detail.closed_at)}` : ''}
            </div>

            {(detail.stores || []).map(st => {
              const missed = st.missed_qty || 0
              const scanned = st.scanned_qty || 0
              const total = st.total_qty || 0
              const pct = total ? Math.round(scanned / total * 100) : 0
              return (
                <div key={st.store_id} style={{ padding:'9px 12px',borderRadius:10,marginBottom:5,
                  background:st.status==='completed'&&missed===0?`${C.green}08`:missed>0?'#fff5f5':C.light,
                  border:`1px solid ${st.status==='completed'&&missed===0?C.green+'40':missed>0?C.red+'25':C.border}` }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4 }}>
                    <span style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,color:C.navy }}>{st.store_id}</span>
                    <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,
                      color:st.status==='completed'&&missed===0?C.green:missed>0?C.red:C.muted }}>
                      {st.status==='completed'&&missed===0?'✓ Clear':missed>0?`${missed} missing`:st.status}
                    </span>
                  </div>
                  <div style={{ height:3,background:C.border,borderRadius:2,overflow:'hidden' }}>
                    <div style={{ height:'100%',width:pct+'%',background:missed>0?C.red:C.green,borderRadius:2 }} />
                  </div>
                  {st.completed_by && (
                    <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted,marginTop:3 }}>
                      by {st.completed_by}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
