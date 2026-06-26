export interface ModelConfig {
  endpoint: string
  apiKey: string
  model: string
  temperature?: number
  maxTokens?: number
}

export interface CompletionRequest {
  messages: Array<{ role: string; content: string }>
  signal: AbortSignal
}

export interface CompletionResponse {
  text: string
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

export interface ModelClient {
  readonly id: string
  complete(req: CompletionRequest): Promise<CompletionResponse>
}
