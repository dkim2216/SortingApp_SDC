import { useState, useEffect, useCallback, useRef } from 'react'
import { session as sessionAPI } from '../api'

const POLL_INTERVAL = 3000

/**
 * useSession(sessionId, currentUser)
 *
 * Polls a specific manifest session every 3 seconds.
 * sessionId comes from the Manifest Picker — not a global "active" session.
 */
export function useSession(sessionId, currentUser) {
  const [sessionData, setSessionData] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const pollRef   = useRef(null)
  const mountedRef = useRef(true)

  const fetchState = useCallback(async (quiet = false) => {
    if (!sessionId) return
    try {
      const data = await sessionAPI.getState(sessionId)
      if (!mountedRef.current) return
      setSessionData(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      if (!mountedRef.current) return
      if (!quiet) setError('Could not reach server')
    } finally {
      if (!mountedRef.current) return
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    mountedRef.current = true
    setLoading(true)
    setSessionData(null)
    fetchState()
    pollRef.current = setInterval(() => fetchState(true), POLL_INTERVAL)
    return () => {
      mountedRef.current = false
      clearInterval(pollRef.current)
    }
  }, [fetchState])

  const actions = {
    claim: async (storeId) => {
      // Optimistic update
      setSessionData(prev => prev
        ? updateStore(prev, storeId, { status: 'claimed', claimedBy: currentUser })
        : prev)
      const result = await sessionAPI.claimStore(sessionId, storeId, currentUser)
      if (!result.ok) {
        // Another user claimed it — rollback and show their name
        await fetchState()
      }
      return result
    },

    scan: async (storeId, toteId) => {
      setSessionData(prev => prev ? incrementScan(prev, storeId) : prev)
      try {
        await sessionAPI.scan(sessionId, storeId, toteId, currentUser)
      } catch {
        await fetchState()
      }
    },

    complete: async (storeId, scanned, missed) => {
      setSessionData(prev => prev
        ? updateStore(prev, storeId, { status: 'completed', completedBy: currentUser })
        : prev)
      try {
        await sessionAPI.completeStore(sessionId, storeId, currentUser, scanned, missed)
        await fetchState()
      } catch {
        await fetchState()
      }
    },

    release: async (storeId) => {
      setSessionData(prev => prev
        ? updateStore(prev, storeId, { status: 'pending', claimedBy: null })
        : prev)
      await sessionAPI.releaseStore(sessionId, storeId, currentUser)
    },

    close: async () => {
      await sessionAPI.close(sessionId)
      // Caller (App) handles navigating back to Manifest Picker
    },

    refresh: () => fetchState(),
  }

  return { sessionData, loading, error, lastUpdated, actions }
}

// ── Optimistic update helpers ─────────────────

function updateStore(data, storeId, patch) {
  return {
    ...data,
    stores: data.stores.map(s =>
      s.storeId === storeId ? { ...s, ...patch } : s
    ),
  }
}

function incrementScan(data, storeId) {
  return {
    ...data,
    stores: data.stores.map(s =>
      s.storeId === storeId
        ? { ...s, scannedQty: Math.min((s.scannedQty || 0) + 1, s.totalQty) }
        : s
    ),
  }
}
