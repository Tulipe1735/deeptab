import { describe, it, expect, beforeEach, vi } from 'vitest'
import { __setConfigValues } from 'vscode'
import { loadConfig, clearConfigCache } from '../../src/config/settings'
import * as fs from 'fs'

vi.mock('fs')
vi.mock('dotenv', () => ({
  default: { parse: vi.fn() },
}))

const dotenv = await import('dotenv')

beforeEach(() => {
  clearConfigCache()
  __setConfigValues({})
  vi.clearAllMocks()
})

describe('loadConfig', () => {
  it('reads apiKey from settings.json when .env is absent', () => {
    __setConfigValues({ 'deeptab.apiKey': 'sk-test-123' })
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const config = loadConfig()

    expect(config.apiKey).toBe('sk-test-123')
  })

  it('prefers .env over settings.json', () => {
    __setConfigValues({ 'deeptab.apiKey': 'settings-key' })
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('DEEPTAB_API_KEY=env-key')
    vi.mocked(dotenv.default.parse).mockReturnValue({ DEEPTAB_API_KEY: 'env-key' })

    const config = loadConfig()

    expect(config.apiKey).toBe('env-key')
  })

  it('returns empty string when no apiKey is configured', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const config = loadConfig()

    expect(config.apiKey).toBe('')
  })

  it('returns default model when not configured', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const config = loadConfig()

    expect(config.model).toBe('deepseek-chat')
  })

  it('returns configured model with temperature and maxTokens', () => {
    __setConfigValues({
      'deeptab.model': 'gpt-4o-mini',
      'deeptab.temperature': 0.5,
      'deeptab.maxTokens': 128,
    })
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const config = loadConfig()

    expect(config.model).toBe('gpt-4o-mini')
    expect(config.temperature).toBe(0.5)
    expect(config.maxTokens).toBe(128)
  })
})
