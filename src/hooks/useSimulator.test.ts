import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSimulator } from './useSimulator'
import * as api from '../api/client'

vi.mock('../api/client')

describe('useSimulator', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('appends a log entry on successful inquiry', async () => {
    vi.mocked(api.inquiry).mockResolvedValue({ status: 200, data: { status: 'ACTIVE' } })
    const { result } = renderHook(() => useSimulator())

    await act(async () => {
      await result.current.runInquiry({ vaAcctNo: 'VA123' })
    })

    expect(result.current.log).toHaveLength(1)
    expect(result.current.log[0]).toMatchObject({
      endpoint: 'inquiry',
      request: { vaAcctNo: 'VA123' },
      response: { status: 'ACTIVE' },
      status: 200,
    })
  })

  it('appends an error log entry and rethrows on failure', async () => {
    vi.mocked(api.payment).mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useSimulator())

    let thrownError
    await act(async () => {
      try {
        await result.current.runPayment({ vaAcctNo: 'VA123', amount: 1000 })
      } catch (err) {
        thrownError = err
      }
    })

    expect(thrownError).toBeInstanceOf(Error)
    expect((thrownError as Error).message).toBe('network down')
    expect(result.current.log[0]).toMatchObject({
      endpoint: 'payment',
      status: 'error',
      response: 'network down',
    })
  })

  it('persists the log to localStorage and reloads it on next mount', async () => {
    vi.mocked(api.inquiry).mockResolvedValue({ status: 200, data: { status: 'ACTIVE' } })
    const first = renderHook(() => useSimulator())
    await act(async () => {
      await first.result.current.runInquiry({ vaAcctNo: 'VA123' })
    })

    const second = renderHook(() => useSimulator())
    expect(second.result.current.log).toHaveLength(1)
  })

  it('clearLog empties the log', async () => {
    vi.mocked(api.inquiry).mockResolvedValue({ status: 200, data: { status: 'ACTIVE' } })
    const { result } = renderHook(() => useSimulator())
    await act(async () => {
      await result.current.runInquiry({ vaAcctNo: 'VA123' })
    })
    act(() => {
      result.current.clearLog()
    })
    expect(result.current.log).toHaveLength(0)
  })
})
