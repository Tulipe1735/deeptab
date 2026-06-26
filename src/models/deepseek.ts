import {
  ModelClient,
  ModelConfig,
  CompletionRequest,
  CompletionResponse,
} from './interface'

export class DeepSeekClient implements ModelClient {
  readonly id = 'deepseek'

  constructor(private config: ModelConfig) {}

  get endpoint(): string {
    return this.config.endpoint || 'https://api.deepseek.com/v1'
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'deepseek-chat',
        messages: req.messages,
        temperature: this.config.temperature ?? 0.2,
        max_tokens: this.config.maxTokens ?? 256,
        stream: false,
      }),
      signal: req.signal,
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`)
    }

    const data = (await response.json()) as any

    return {
      text: data.choices?.[0]?.message?.content ?? '',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
          }
        : undefined,
    }
  }
}
