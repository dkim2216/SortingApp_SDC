// ─────────────────────────────────────────────
//  WAREHOUSE APP DESIGN SYSTEM
//  Copy this file into every new warehouse app.
//  Change STORE_COLORS if you want different
//  palette — everything else stays.
// ─────────────────────────────────────────────

export const C = {
  navy:   '#0D1B4B',
  accent: '#00C9A7',
  green:  '#00C9A7',
  amber:  '#F59E0B',
  red:    '#ef4444',
  muted:  '#94a3b8',
  border: '#e2e8f0',
  panel:  '#ffffff',
  bg:     '#f8fafc',
  light:  '#f1f5f9',
}

export const STORE_COLORS = [
  '#6366f1','#ec4899','#f59e0b','#10b981',
  '#3b82f6','#8b5cf6','#ef4444','#14b8a6',
  '#f97316','#06b6d4',
]

export const getStoreColor = (store, allStores) =>
  STORE_COLORS[allStores.indexOf(store) % STORE_COLORS.length] || C.accent

// Global CSS — inject once in main.jsx
export const globalCSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  html { height: 100%; height: 100dvh; height: -webkit-fill-available; }
  body { height: 100%; height: 100dvh; min-height: -webkit-fill-available;
    background: ${C.bg}; color: #1e293b;
    font-family: 'Rajdhani', sans-serif; overflow: hidden; }
  #root { height: 100%; height: 100dvh; min-height: -webkit-fill-available;
    display: flex; flex-direction: column; overflow: hidden; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
  input:focus { outline: none; }

  .btn-tap { transition: transform .1s, filter .1s; cursor: pointer; }
  .btn-tap:active { transform: scale(.95); filter: brightness(.97); }

  .nav-tab { flex: 1; padding: 10px 0; background: none; border: none;
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; position: relative; cursor: pointer; }

  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5);
    display: flex; align-items: flex-end; justify-content: center;
    z-index: 100; backdrop-filter: blur(2px); }
  .modal-sheet { background: #fff; border-radius: 24px 24px 0 0;
    width: 100%; max-width: 480px; padding: 20px 16px 32px;
    max-height: 85vh; overflow-y: auto; }

  .pop-in  { animation: popIn  .22s cubic-bezier(.34,1.56,.64,1) both; }
  .slide-up{ animation: slideUp .25s ease both; }
  .store-flash { animation: sf .3s cubic-bezier(.34,1.56,.64,1) both; }
  .scan-pulse { animation: pulse 1.6s ease-in-out infinite; }

  @keyframes popIn   { from{transform:scale(.65);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes slideUp { from{transform:translateY(12px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes sf      { from{transform:scale(.84) translateY(8px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
  @keyframes pulse   { 0%,100%{box-shadow:0 0 0 0 #00C9A755} 50%{box-shadow:0 0 0 14px #00C9A700} }
`
