import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DeepSeekClient } from '../../src/models/deepseek'
import { ModelConfig } from '../../src/models/interface'

const config: ModelConfig = {
  endpoint: 'https://api.deepseek.com/v1',
  apiKey: 'sk-test-key',
  model: 'deepseek-chat',
  temperature: 0.2,
  maxTokens: 256,
}

function makeFetchMock(responseBody: object, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(responseBody),
    text: () => Promise.resolve(JSON.stringify(responseBody)),
  })
}

describe('DeepSeekClient', () => {
  let client: DeepSeekClient

  beforeEach(() => {
    client = new DeepSeekClient(config)
    vi.restoreAllMocks()
  })

  it('has id "deepseek"', () => {
    expect(client.id).toBe('deepseek')
  })

  it('sends POST to /v1/chat/completions with correct headers', async () => {
    const mockFetch = makeFetchMock({
      choices: [{ message: { content: 'return a + b' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    })
    vi.stubGlobal('fetch', mockFetch)

    await client.complete({
      messages: [{ role: 'user', content: 'test' }],
      signal: new AbortController().signal,
    })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.deepseek.com/v1/chat/completions')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer sk-test-key',
    })
    expect(init.signal).toBeDefined()
  })

  it('parses completion text from response', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock({
        choices: [{ message: { content: 'return a + b;' } }],
        usage: { prompt_tokens: 10, completion_tokens: 4 },
      }),
    )

    const response = await client.complete({
      messages: [{ role: 'user', content: 'test' }],
      signal: new AbortController().signal,
    })

    expect(response.text).toBe('return a + b;')
    expect(response.usage).toEqual({
      promptTokens: 10,
      completionTokens: 4,
    })
  })

  it('throws on non-200 response', async () => {
    vi.stubGlobal('fetch', makeFetchMock({ error: 'unauthorized' }, 401))

    await expect(
      client.complete({
        messages: [{ role: 'user', content: 'test' }],
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow('401')
  })
})
