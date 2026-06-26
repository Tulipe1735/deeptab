import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GeminiClient } from '../../src/models/gemini'
import { ModelConfig } from '../../src/models/interface'

const config: ModelConfig = {
  endpoint: 'https://generativelanguage.googleapis.com/v1beta',
  apiKey: 'gemini-test-key',
  model: 'gemini-2.0-flash',
  temperature: 0.2,
  maxTokens: 256,
}

function makeFetchMock(responseBody: object, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(responseBody),
  })
}

describe('GeminiClient', () => {
  let client: GeminiClient

  beforeEach(() => {
    client = new GeminiClient(config)
    vi.restoreAllMocks()
  })

  it('has id "gemini"', () => {
    expect(client.id).toBe('gemini')
  })

  it('sends POST to gemini generateContent endpoint', async () => {
    const mockFetch = makeFetchMock({
      candidates: [{ content: { parts: [{ text: 'result code' }], role: 'model' } }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
    })
    vi.stubGlobal('fetch', mockFetch)

    await client.complete({
      messages: [
        { role: 'system', content: 'You are a code assistant.' },
        { role: 'user', content: 'test prompt' },
      ],
      signal: new AbortController().signal,
    })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('gemini-2.0-flash:generateContent')
    expect(url).toContain('key=gemini-test-key')
    expect(JSON.parse(init.body).contents.length).toBeGreaterThan(0)
  })

  it('translates messages to gemini contents format', async () => {
    const mockFetch = makeFetchMock({
      candidates: [{ content: { parts: [{ text: 'completion text' }], role: 'model' } }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
    })
    vi.stubGlobal('fetch', mockFetch)

    const response = await client.complete({
      messages: [
        { role: 'system', content: 'system instruction' },
        { role: 'user', content: 'user message' },
      ],
      signal: new AbortController().signal,
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.contents[0].parts[0].text).toContain('system instruction')
    expect(body.contents[1].parts[0].text).toBe('user message')
    expect(body.generationConfig.temperature).toBe(0.2)
    expect(response.text).toBe('completion text')
    expect(response.usage).toEqual({
      promptTokens: 5,
      completionTokens: 3,
    })
  })
})
