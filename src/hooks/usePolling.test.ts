import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePolling } from './usePolling'

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not poll automatically until enabled', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a'])
    renderHook(() => usePolling(fetcher, 1000))

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })

    expect(fetcher).not.toHaveBeenCalled()
  })

  it('polls on the interval once enabled', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a'])
    const { result } = renderHook(() => usePolling(fetcher, 1000))

    act(() => {
      result.current.setEnabled(true)
    })

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('refresh() fetches immediately regardless of enabled state', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a'])
    const { result } = renderHook(() => usePolling(fetcher, 1000))

    await act(async () => {
      await result.current.refresh()
    })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual(['a'])
  })

  it('sets error on a failed refresh and clears it on a subsequent success', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce(['a'])
    const { result } = renderHook(() => usePolling(fetcher, 1000))

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.error).toBe('network down')
    expect(result.current.data).toBeNull()

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.error).toBeNull()
    expect(result.current.data).toEqual(['a'])
  })
})
