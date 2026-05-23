import { useCallback, useRef } from 'react'

/**
 * Persist form draft in localStorage so users can resume after closing the page.
 * Keys are prefixed with "draft_" to avoid collisions.
 */
export function useDraft<T>(key: string) {
  const STORAGE_KEY = `draft_${key}`

  // Debounce timer ref
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  }, [STORAGE_KEY])

  /** Debounced save — waits 600 ms after last call before writing */
  const save = useCallback(
    (data: T) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
      }, 600)
    },
    [STORAGE_KEY],
  )

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    localStorage.removeItem(STORAGE_KEY)
  }, [STORAGE_KEY])

  return { load, save, clear }
}
