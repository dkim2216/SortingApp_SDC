import { useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)
  const showToast = (msg, type = 'ok') =>
    setToast({ msg, type, key: Date.now() })
  const clearToast = () => setToast(null)
  return { toast, showToast, clearToast }
}
