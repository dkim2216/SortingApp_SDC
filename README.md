# Warehouse App Template

Standard structure for all SDC warehouse apps.  
Uses **Vite + React** (frontend) + **Express + PostgreSQL** (backend).

---

## Quick Start

```bash
cp .env.example .env          # fill in your values
npm install
npm run dev                   # starts both client (5173) and server (3001)
```

For production:
```bash
npm run build                 # builds React into /dist
npm run server                # Express serves /dist + API
```

---

## Project Structure

```
├── index.html                 ← Vite entry
├── src/                       ← React (client)
│   ├── main.jsx               ← mounts app, injects global CSS
│   ├── App.jsx                ← root: routing, session wiring
│   ├── theme.js               ← 🎨 DESIGN SYSTEM — colors, fonts, global CSS
│   ├── api.js                 ← all fetch() calls live here
│   ├── hooks/
│   │   ├── useSession.js      ← multi-user live state (polls every 3s)
│   │   └── useToast.js        ← toast notification helper
│   └── components/
│       ├── ui/index.jsx       ← Ring, Toast, SearchBar, NavBar, Footer, etc.
│       ├── LoginScreen.jsx
│       ├── ManifestScreen.jsx
│       ├── CheckScreen.jsx
│       ├── StoreScanScreen.jsx
│       ├── VerifyScreen.jsx
│       └── HistoryScreen.jsx
├── server/
│   ├── index.js               ← Express entry
│   ├── db.js                  ← PostgreSQL pool + schema
│   └── routes/
│       ├── session.js         ← 🔑 multi-user session API
│       ├── jobs.js            ← legacy jobs (backward compat)
│       └── reports.js        ← email reports via Resend
└── .env.example
```

---

## Multi-User Flow

```
Manager uploads CSV
    → POST /api/session/start
    → Session created in DB with all stores as "pending"

All users poll GET /api/session/active every 3 seconds
    → See live store statuses

User A taps "Store 01"
    → POST /api/session/store/Store01/claim
    → Store 01 shows "🔒 Kim" for everyone

User A scans totes
    → POST /api/session/store/Store01/scan (each scan)
    → scanned_qty increments on server
    → Everyone sees progress bar update within 3s

User A completes Store 01
    → POST /api/session/store/Store01/complete
    → Store turns green for everyone

User B meanwhile is scanning Store 02 — no conflict
```

---

## Creating a New Warehouse App

1. Copy this template
2. In `src/theme.js` — update `APP_NAME` only if needed (colors stay same)
3. In `src/components/LoginScreen.jsx` — update `PRESET_USERS`
4. In `index.html` — update `<title>` and `apple-mobile-web-app-title`
5. In `.env` — update `APP_NAME` and email settings
6. Add/replace screens in `src/components/` as needed
7. Add routes in `server/routes/` for any new API endpoints
8. Update DB schema in `server/db.js` if new tables needed

**Keep these files identical across all apps:**
- `src/theme.js`
- `src/components/ui/index.jsx`
- `src/components/LoginScreen.jsx`
- `src/hooks/useToast.js`
- `server/db.js` (add tables, never remove)
- `server/routes/reports.js`

---

## Database Tables

| Table | Purpose |
|---|---|
| `sessions` | One per CSV upload. Has manifest JSON. |
| `store_states` | One per store per session. Tracks claim/complete status. |
| `scan_events` | Audit trail of every scan. |
| `jobs` | Legacy — kept for backward compat. |

---

## Environment Variables

```
PORT=3001
DATABASE_URL=postgresql://...
RESEND_API_KEY=re_...
EMAIL_FROM=warehouse@domain.com
EMAIL_TO=manager@domain.com
APP_NAME=7ESortVerification
```

---

## Adding Camera Support

In `StoreScanScreen.jsx`, the camera uses `html5-qrcode` (installed as npm package now, not CDN):

```jsx
import { Html5Qrcode } from 'html5-qrcode'
```

The key pattern (works on mobile):
```jsx
useEffect(() => {
  if (!cameraActive) return
  let cancelled = false
  const t = setTimeout(async () => {
    if (cancelled || !document.getElementById('qr-reader')) return
    const qr = new Html5Qrcode('qr-reader')
    scannerRef.current = qr
    await qr.start(
      { facingMode: { ideal: 'environment' } },
      { fps: 10, qrbox: (w, h) => { const s = Math.min(w,h) * 0.7; return { width: s, height: s } } },
      text => {
        const raw = text.trim().toUpperCase()
        const id = raw.length > 19 ? raw.substring(0, 19) : raw  // truncate to 19 chars
        onScan(storeId, id)
      },
      () => {}
    )
  }, 300)  // wait for React to paint div
  return () => {
    cancelled = true
    clearTimeout(t)
    if (scannerRef.current) { scannerRef.current.stop().catch(() => {}); scannerRef.current = null }
  }
}, [cameraActive])
```
