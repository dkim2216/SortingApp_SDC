import { useState, useRef } from 'react'
import { C } from '../theme'

// ─────────────────────────────────────────────
//  Edit PRESET_USERS per app.
//  Custom users pick their own passcode on
//  first login — it's saved in localStorage.
// ─────────────────────────────────────────────
const PRESET_USERS = [
  { name: 'Example-Kim', passcode: '0000' },
]

function getPasscodeKey(name) { return `wh_pass_${name.trim().toLowerCase()}` }
function getStoredPasscode(name) { try { return localStorage.getItem(getPasscodeKey(name)) } catch { return null } }
function storePasscode(name, pass) { try { localStorage.setItem(getPasscodeKey(name), pass) } catch {} }

export default function LoginScreen({ onLogin }) {
  const [activePreset, setActivePreset] = useState(null)
  const [presetPass, setPresetPass]     = useState('')
  const [presetError, setPresetError]   = useState('')
  const [customName, setCustomName]     = useState('')
  const [customPass, setCustomPass]     = useState('')
  const [customError, setCustomError]   = useState('')
  const passRef = useRef()

  const selectPreset = (user) => {
    setActivePreset(user); setPresetPass(''); setPresetError('')
    setTimeout(() => passRef.current?.focus(), 80)
  }

  const submitPreset = () => {
    if (!activePreset) return
    if (presetPass === activePreset.passcode) { onLogin(activePreset.name) }
    else { setPresetError('Wrong passcode'); setPresetPass('') }
  }

  const submitCustom = () => {
    const name = customName.trim()
    if (!name) return setCustomError('Enter your name')
    if (!customPass) return setCustomError('Enter a passcode')
    if (PRESET_USERS.some(u => u.name.toLowerCase() === name.toLowerCase()))
      return setCustomError('That name is reserved')
    const stored = getStoredPasscode(name)
    if (!stored) { storePasscode(name, customPass); onLogin(name) }
    else if (stored === customPass) { onLogin(name) }
    else { setCustomError('Wrong passcode'); setCustomPass('') }
  }

  const isReturning = customName.trim()
    && getStoredPasscode(customName.trim()) !== null
    && !PRESET_USERS.some(u => u.name.toLowerCase() === customName.trim().toLowerCase())

  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'flex-start',minHeight:'100dvh',background:C.bg,
      padding:'max(24px,env(safe-area-inset-top)) 20px 24px',overflowY:'auto' }}>

      <div style={{ textAlign:'center',marginBottom:28,marginTop:16 }}>
        <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:30,color:C.navy,letterSpacing:2 }}>
          TOTE SCANNER
        </div>
        <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:C.muted,marginTop:4,letterSpacing:2 }}>
          SDC — SIGN IN
        </div>
      </div>

      <div style={{ width:'100%',maxWidth:360 }}>

        {/* Preset users */}
        {PRESET_USERS.map(user => {
          const isOpen = activePreset?.name === user.name
          return (
            <div key={user.name} style={{ marginBottom: 12 }}>
              <button className="btn-tap"
                onClick={() => isOpen ? setActivePreset(null) : selectPreset(user)}
                style={{ width:'100%',padding:'15px 18px',background:isOpen?`${C.navy}08`:C.panel,
                  border:`1.5px solid ${isOpen?C.navy:C.border}`,
                  borderRadius:isOpen?'14px 14px 0 0':14,
                  fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:19,color:C.navy,
                  display:'flex',alignItems:'center',gap:12,boxShadow:isOpen?'none':'0 1px 4px rgba(0,0,0,.06)' }}>
                <span style={{ width:36,height:36,borderRadius:'50%',background:`${C.navy}12`,
                  border:`1.5px solid ${C.navy}20`,display:'flex',alignItems:'center',
                  justifyContent:'center',fontSize:15,flexShrink:0 }}>⭐</span>
                <span style={{ flex:1,textAlign:'left' }}>{user.name}</span>
                <span style={{ fontSize:14,color:C.muted }}>{isOpen?'▲':'▼'}</span>
              </button>
              {isOpen && (
                <div style={{ background:C.panel,border:`1.5px solid ${C.navy}`,borderTop:'none',
                  borderRadius:'0 0 14px 14px',padding:'14px 16px 16px',
                  boxShadow:'0 4px 12px rgba(0,0,0,.08)' }}>
                  <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted,marginBottom:8,letterSpacing:1 }}>ENTER PASSCODE</div>
                  <div style={{ display:'flex',gap:8 }}>
                    <input ref={passRef} type="password" inputMode="numeric" maxLength={8}
                      value={presetPass}
                      onChange={e => { setPresetPass(e.target.value); setPresetError('') }}
                      onKeyDown={e => e.key === 'Enter' && submitPreset()}
                      placeholder="••••"
                      style={{ flex:1,padding:'12px 14px',borderRadius:12,
                        border:`1.5px solid ${presetError?C.red:presetPass?C.navy:C.border}`,
                        fontFamily:"'Share Tech Mono',monospace",fontSize:18,color:C.navy,
                        background:C.bg,letterSpacing:4 }} />
                    <button className="btn-tap" onClick={submitPreset}
                      style={{ padding:'12px 20px',background:`linear-gradient(135deg,${C.navy},#1a3a7c)`,
                        border:'none',borderRadius:12,color:'#fff',
                        fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16 }}>GO</button>
                  </div>
                  {presetError && <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.red,marginTop:6 }}>{presetError}</div>}
                </div>
              )}
            </div>
          )
        })}

        {/* Divider */}
        <div style={{ display:'flex',alignItems:'center',gap:10,margin:'16px 0' }}>
          <div style={{ flex:1,height:1,background:C.border }} />
          <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1 }}>OTHER USER</span>
          <div style={{ flex:1,height:1,background:C.border }} />
        </div>

        {/* Custom user */}
        <div style={{ background:C.panel,border:`1.5px solid ${C.border}`,borderRadius:16,padding:'16px' }}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted,letterSpacing:1,marginBottom:6 }}>YOUR NAME</div>
          <input value={customName}
            onChange={e => { setCustomName(e.target.value); setCustomError('') }}
            onKeyDown={e => e.key === 'Enter' && submitCustom()}
            placeholder="Type your name"
            style={{ width:'100%',padding:'11px 14px',borderRadius:12,marginBottom:12,
              border:`1.5px solid ${customName?C.accent:C.border}`,
              fontFamily:"'Rajdhani',sans-serif",fontSize:17,color:C.navy,background:C.bg }} />
          <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted,letterSpacing:1,marginBottom:4 }}>
            {isReturning ? 'YOUR PASSCODE' : 'CHOOSE A PASSCODE'}
          </div>
          {isReturning && (
            <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.accent,marginBottom:6 }}>
              Welcome back, {customName.trim()} — enter your passcode
            </div>
          )}
          <div style={{ display:'flex',gap:8 }}>
            <input type="password" inputMode="numeric" maxLength={8}
              value={customPass}
              onChange={e => { setCustomPass(e.target.value); setCustomError('') }}
              onKeyDown={e => e.key === 'Enter' && submitCustom()}
              placeholder={isReturning ? '••••' : 'set your passcode'}
              style={{ flex:1,padding:'11px 14px',borderRadius:12,
                border:`1.5px solid ${customError?C.red:customPass?C.accent:C.border}`,
                fontFamily:"'Share Tech Mono',monospace",fontSize:16,color:C.navy,
                background:C.bg,letterSpacing:3 }} />
            <button className="btn-tap" onClick={submitCustom}
              style={{ padding:'11px 20px',background:`linear-gradient(135deg,${C.accent},#059669)`,
                border:'none',borderRadius:12,color:'#fff',
                fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16 }}>
              {isReturning ? 'LOGIN' : 'START'}
            </button>
          </div>
          {customError && <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.red,marginTop:8 }}>{customError}</div>}
          {!isReturning && customName.trim() && !customError && (
            <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted,marginTop:8 }}>
              First time? Your passcode will be saved for next login.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
