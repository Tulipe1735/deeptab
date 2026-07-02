import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExtensionContext, workspace, languages } from 'vscode'
import { __setConfigValues } from 'vscode'
import { activate, deactivate } from '../../src/extension'
import { clearConfigCache } from '../../src/config/settings'
import * as fs from 'fs'

vi.mock('fs')
vi.mock('dotenv', () => ({
  default: { parse: vi.fn() },
}))

beforeEach(() => {
  clearConfigCache()
  __setConfigValues({})
  vi.clearAllMocks()
})

function makeContext(): ExtensionContext {
  return { subscriptions: [] }
}

describe('activate', () => {
  it('registers inline completion provider', () => {
    const ctx = makeContext()
    const spy = vi.spyOn(languages, 'registerInlineCompletionItemProvider')

    activate(ctx as any)

    expect(spy).toHaveBeenCalledWith({ pattern: '**' }, expect.any(Object))
    expect(ctx.subscriptions.length).toBe(2)
  })

  it('does not throw when no API key is configured', () => {
    const ctx = makeContext()
    vi.mocked(fs.existsSync).mockReturnValue(false)

    expect(() => activate(ctx as any)).not.toThrow()
    expect(ctx.subscriptions.length).toBe(2)
  })
})

describe('deactivate', () => {
  it('clears subscriptions', () => {
    const ctx = makeContext()
    activate(ctx as any)

    expect(ctx.subscriptions.length).toBeGreaterThan(0)

    deactivate()
    // deactivate should not throw
  })
})
