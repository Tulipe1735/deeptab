import {
  ModelClient,
  ModelConfig,
  CompletionRequest,
  CompletionResponse,
} from './interface'

export class GeminiClient implements ModelClient {
  readonly id = 'gemini'

  constructor(private config: ModelConfig) {}

  get endpoint(): string {
    return (
      this.config.endpoint ||
      'https://generativelanguage.googleapis.com/v1beta'
    )
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const model = this.config.model || 'gemini-2.0-flash'
    const url = `${this.endpoint}/models/${model}:generateContent?key=${encodeURIComponent(this.config.apiKey)}`
    const contents = req.messages.map((message) => ({
      role: message.role === 'system' ? 'user' : message.role,
      parts: [
        {
          text:
            message.role === 'system'
              ? `Instruction: ${message.content}`
              : message.content,
        },
      ],
    }))

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: this.config.temperature ?? 0.2,
          maxOutputTokens: this.config.maxTokens ?? 256,
        },
      }),
      signal: req.signal,
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = (await response.json()) as any

    return {
      text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount ?? 0,
            completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
          }
        : undefined,
    }
  }
}
