import { useCallback, useEffect, useRef, useState } from 'react'

export function usePolling<T>(fetcher: () => Promise<T>, intervalMs = 3000) {
  const [data, setData] = useState<T | null>(null)
  const [enabled, setEnabled] = useState(false)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refresh = useCallback(async () => {
    const result = await fetcherRef.current()
    setData(result)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => {
      void refresh()
    }, intervalMs)
    return () => clearInterval(id)
  }, [enabled, intervalMs, refresh])

  return { data, refresh, enabled, setEnabled }
}
