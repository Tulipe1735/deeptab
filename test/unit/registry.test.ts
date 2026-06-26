import { describe, it, expect } from 'vitest'
import { createModelClient } from '../../src/models/registry'
import { DeepTabConfig } from '../../src/config/settings'

const baseConfig: DeepTabConfig = {
  apiKey: 'test-key',
  model: 'deepseek-chat',
  temperature: 0.2,
  maxTokens: 256,
}

describe('createModelClient', () => {
  it('returns DeepSeekClient for deepseek-chat', () => {
    const client = createModelClient(baseConfig)
    expect(client.id).toBe('deepseek')
  })

  it('returns OpenAIClient for gpt-4o-mini', () => {
    const client = createModelClient({ ...baseConfig, model: 'gpt-4o-mini' })
    expect(client.id).toBe('openai')
  })

  it('returns OpenAIClient for any gpt-prefixed model', () => {
    const client = createModelClient({ ...baseConfig, model: 'gpt-5-mini' })
    expect(client.id).toBe('openai')
  })

  it('returns GeminiClient for gemini-2.0-flash', () => {
    const client = createModelClient({ ...baseConfig, model: 'gemini-2.0-flash' })
    expect(client.id).toBe('gemini')
  })

  it('defaults to DeepSeekClient for unknown models', () => {
    const client = createModelClient({ ...baseConfig, model: 'unknown-model' })
    expect(client.id).toBe('deepseek')
  })

  it('passes custom endpoint to client', () => {
    const client = createModelClient({
      ...baseConfig,
      model: 'gpt-4o-mini',
      endpoint: 'https://custom.api.com/v1',
    }) as any

    expect(client.endpoint).toBe('https://custom.api.com/v1')
  })
})
