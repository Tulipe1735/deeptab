import { describe, it, expect, vi } from 'vitest'
import { createDebouncer } from '../../src/utils/debounce'

describe('createDebouncer', () => {
  it('calls the latest function after the delay', async () => {
    vi.useFakeTimers()
    const debouncer = createDebouncer(300)
    const fn1 = vi.fn().mockResolvedValue('first')
    const fn2 = vi.fn().mockResolvedValue('second')

    const p1 = debouncer.debounce(fn1)
    const p2 = debouncer.debounce(fn2)

    await vi.runAllTimersAsync()

    await expect(p1).resolves.toBeNull()
    await expect(p2).resolves.toBe('second')
    expect(fn1).not.toHaveBeenCalled()
    expect(fn2).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('does not cancel if no subsequent call arrives', async () => {
    vi.useFakeTimers()
    const debouncer = createDebouncer(300)
    const fn = vi.fn().mockResolvedValue('result')

    const promise = debouncer.debounce(fn)
    await vi.runAllTimersAsync()

    await expect(promise).resolves.toBe('result')
    expect(fn).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
