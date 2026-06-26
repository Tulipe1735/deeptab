import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OpenAIClient } from '../../src/models/openai'
import { ModelConfig } from '../../src/models/interface'

const config: ModelConfig = {
  endpoint: 'https://api.openai.com/v1',
  apiKey: 'sk-openai-test',
  model: 'gpt-4o-mini',
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

describe('OpenAIClient', () => {
  let client: OpenAIClient

  beforeEach(() => {
    client = new OpenAIClient(config)
    vi.restoreAllMocks()
  })

  it('has id "openai"', () => {
    expect(client.id).toBe('openai')
  })

  it('sends POST to /v1/chat/completions', async () => {
    const mockFetch = makeFetchMock({
      choices: [{ message: { content: 'result code' } }],
    })
    vi.stubGlobal('fetch', mockFetch)

    await client.complete({
      messages: [{ role: 'user', content: 'test' }],
      signal: new AbortController().signal,
    })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect(init.headers.Authorization).toBe('Bearer sk-openai-test')
  })

  it('uses custom endpoint when configured', async () => {
    const customClient = new OpenAIClient({
      ...config,
      endpoint: 'https://custom.openai.com/v1',
    })
    const mockFetch = makeFetchMock({
      choices: [{ message: { content: 'test' } }],
    })
    vi.stubGlobal('fetch', mockFetch)

    await customClient.complete({
      messages: [{ role: 'user', content: 'test' }],
      signal: new AbortController().signal,
    })

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://custom.openai.com/v1/chat/completions')
  })
})
