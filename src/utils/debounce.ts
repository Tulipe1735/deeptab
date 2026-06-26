export function createDebouncer(delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let resolvePending: ((value: unknown) => void) | null = null

  return {
    debounce<T>(fn: () => Promise<T>): Promise<T | null> {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }

      if (resolvePending) {
        resolvePending(null)
        resolvePending = null
      }

      return new Promise<T | null>((resolve) => {
        resolvePending = resolve as (value: unknown) => void
        timer = setTimeout(async () => {
          timer = null
          resolvePending = null

          try {
            resolve(await fn())
          } catch {
            resolve(null)
          }
        }, delayMs)
      })
    },
  }
}
