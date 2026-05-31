// ─────────────────────────────────────────────
//  API — all server calls live here.
//  Components never call fetch() directly.
// ─────────────────────────────────────────────

const BASE = ''

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`)
  return res.json()
}

// ── Manifest Picker ───────────────────────────
export const manifests = {
  // All open manifests shown in picker
  getOpen: () => req('GET', '/api/session/open'),

  // Start a new manifest session
  start: (manifestNo, totes, createdBy) =>
    req('POST', '/api/session/start', { manifestNo, totes, createdBy }),
}

// ── Session (scoped to a specific manifest ID) ─
export const session = {
  // Poll this session's live state
  getState: (sessionId) =>
    req('GET', `/api/session/${sessionId}/state`),

  // Claim a store within this session
  claimStore: (sessionId, storeId, userName) =>
    req('POST', `/api/session/${sessionId}/store/${encodeURIComponent(storeId)}/claim`, { userName }),

  // Record a scan
  scan: (sessionId, storeId, toteId, userName) =>
    req('POST', `/api/session/${sessionId}/store/${encodeURIComponent(storeId)}/scan`, { toteId, userName }),

  // Get already-scanned totes (for resuming a store)
  getStoreScans: (sessionId, storeId) =>
    req('GET', `/api/session/${sessionId}/store/${encodeURIComponent(storeId)}/scans`),

  // Complete a store
  completeStore: (sessionId, storeId, userName, scanned, missed) =>
    req('POST', `/api/session/${sessionId}/store/${encodeURIComponent(storeId)}/complete`, { userName, scanned, missed }),

  // Release a claimed store
  releaseStore: (sessionId, storeId, userName) =>
    req('POST', `/api/session/${sessionId}/store/${encodeURIComponent(storeId)}/release`, { userName }),

  // Close the manifest (manager only)
  close: (sessionId) =>
    req('POST', `/api/session/${sessionId}/close`),
}

// ── History ───────────────────────────────────
export const history = {
  getAll:    ()   => req('GET', '/api/session/history'),
  getDetail: (id) => req('GET', `/api/session/history/${id}`),
}

// ── Email Reports ─────────────────────────────
export const reports = {
  sendRoute: (payload) => req('POST', '/api/reports/route', payload),
}
