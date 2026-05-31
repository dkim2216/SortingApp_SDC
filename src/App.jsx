import { useState, useCallback } from 'react'
import { C } from './theme'
import { useSession } from './hooks/useSession'
import { useToast } from './hooks/useToast'
import { NavBar, Footer, Toast } from './components/ui'
import LoginScreen      from './components/LoginScreen'
import ManifestPicker       from './components/ManifestPicker'
import ManifestInfoScreen   from './components/ManifestInfoScreen'
import CheckScreen      from './components/CheckScreen'
import VerifyScreen     from './components/VerifyScreen'
import HistoryScreen    from './components/HistoryScreen'

const TABS = [
  { id: 'manifest', label: 'MANIFEST',    icon: '📋' },
  { id: 'check',    label: 'STORE CHECK', icon: '✔'  },
  { id: 'verify',   label: 'VERIFY',      icon: '🔍' },
  { id: 'history',  label: 'HISTORY',     icon: '🕐' },
]

export default function App() {
  const [currentUser,     setCurrentUser]     = useState(null)
  const [selectedManifest, setSelectedManifest] = useState(null) // { id, manifest_no }
  const [tab,             setTab]             = useState('check')
  const [selectedRoute,   setSelectedRoute]   = useState(null)
  const [selectedStore,   setSelectedStore]   = useState(null)

  const { toast, showToast, clearToast } = useToast()

  // Poll the selected manifest's session — null sessionId = no polling
  const { sessionData, loading, error, actions } = useSession(
    selectedManifest?.id,
    currentUser
  )

  const handleTabChange = (id) => {
    if (id !== 'check') { setSelectedRoute(null); setSelectedStore(null) }
    if (id === 'manifest') { setSelectedRoute(null); setSelectedStore(null) }
    setTab(id)
  }

  const handleSwitchUser = () => {
    setCurrentUser(null)
    setSelectedManifest(null)
    setTab('check')
    setSelectedRoute(null)
    setSelectedStore(null)
  }

  const handleChangeManifest = useCallback(async () => {
    // Release any store the user has claimed before leaving
    if (selectedStore) {
      await actions.release(selectedStore)
      setSelectedStore(null)
      setSelectedRoute(null)
    }
    setSelectedManifest(null)
    setTab('check')
  }, [selectedStore, actions])

  const handleScan = useCallback(async (storeId, toteId) => {
    const manifest = sessionData?.manifest || []
    const tote = manifest.find(t => t.toteId === toteId && t.storeId === storeId)
    if (!tote) { showToast(`Not in ${storeId}`, 'error'); return }
    await actions.scan(storeId, toteId)
  }, [sessionData, actions, showToast])

  // ── Screen: Login ─────────────────────────────
  if (!currentUser) {
    return (
      <div style={{ height:'100dvh',minHeight:'-webkit-fill-available',background:C.bg }}>
        <LoginScreen onLogin={name => setCurrentUser(name)} />
      </div>
    )
  }

  // ── Screen: Manifest Picker ───────────────────
  if (!selectedManifest) {
    return (
      <div style={{ display:'flex',flexDirection:'column',height:'100dvh',
        minHeight:'-webkit-fill-available',background:C.bg,overflow:'hidden' }}>
        <div style={{ flex:1,overflow:'hidden',display:'flex',flexDirection:'column' }}>
          <ManifestPicker
            currentUser={currentUser}
            onSelect={(manifest) => {
              setSelectedManifest(manifest)
              setTab('check')
            }}
          />
        </div>
        <Footer currentUser={currentUser} onSwitchUser={handleSwitchUser} />
      </div>
    )
  }

  // ── Screen: Main app (inside a manifest) ─────
  const stores     = sessionData?.stores || []
  const anyStarted = stores.some(s => s.status === 'claimed' || s.scannedQty > 0)
  const allDone    = stores.length > 0 && stores.every(s => s.status === 'completed')
  const navBadge   = anyStarted ? { check: allDone ? C.green : C.amber } : {}

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100dvh',
      minHeight:'-webkit-fill-available',background:C.bg,overflow:'hidden' }}>

      {/* Manifest banner — always visible, tap to change */}
      <div style={{ background:C.navy,padding:'6px 16px',display:'flex',
        alignItems:'center',gap:10,flexShrink:0 }}>
        <span style={{ fontSize:13 }}>📋</span>
        <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,
          color:'rgba(255,255,255,0.9)',flex:1,letterSpacing:.5 }}>
          {selectedManifest.manifest_no || selectedManifest.manifestNo}
        </span>
        {/* Live user count */}
        {stores.filter(s => s.claimedBy && s.claimedBy !== currentUser).length > 0 && (
          <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,
            color:C.accent,display:'flex',alignItems:'center',gap:4 }}>
            <span style={{ width:5,height:5,borderRadius:'50%',background:C.accent,
              display:'inline-block',boxShadow:`0 0 5px ${C.accent}` }} />
            {[...new Set(stores.filter(s=>s.claimedBy&&s.claimedBy!==currentUser).map(s=>s.claimedBy))].length} others
          </span>
        )}
        <button onClick={handleChangeManifest}
          style={{ background:'rgba(255,255,255,0.12)',border:'none',borderRadius:8,
            padding:'4px 10px',fontFamily:"'Share Tech Mono',monospace",
            fontSize:10,color:'rgba(255,255,255,0.8)',cursor:'pointer' }}>
          CHANGE
        </button>
      </div>

      {/* Server error bar */}
      {error && (
        <div style={{ background:C.amber,padding:'3px 12px',textAlign:'center',
          fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:'#fff',flexShrink:0 }}>
          ⚠ Connection lost — retrying…
        </div>
      )}

      {/* Tab content */}
      <div style={{ flex:1,overflow:'hidden',display:'flex',flexDirection:'column' }}>
        {tab === 'manifest' && (
          <ManifestInfoScreen
            sessionData={sessionData}
            currentUser={currentUser}
            onClose={async () => { await actions.close(); setSelectedManifest(null) }}
          />
        )}
        {tab === 'check' && (
          <CheckScreen
            sessionData={sessionData}
            loading={loading}
            currentUser={currentUser}
            selectedRoute={selectedRoute}
            setSelectedRoute={setSelectedRoute}
            selectedStore={selectedStore}
            setSelectedStore={setSelectedStore}
            onScan={handleScan}
            onClaim={actions.claim}
            onComplete={actions.complete}
            onRelease={actions.release}
            showToast={showToast}
          />
        )}
        {tab === 'verify'  && <VerifyScreen  sessionData={sessionData} />}
        {tab === 'history' && <HistoryScreen />}
      </div>

      <Footer currentUser={currentUser} onSwitchUser={handleSwitchUser} />
      <NavBar tabs={TABS} activeTab={tab} onSelect={handleTabChange} badge={navBadge} />
      {toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={clearToast} />}
    </div>
  )
}
