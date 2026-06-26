import { ModelClient, ModelConfig } from './interface'
import { DeepTabConfig } from '../config/settings'
import { DeepSeekClient } from './deepseek'
import { OpenAIClient } from './openai'
import { GeminiClient } from './gemini'

function toModelConfig(config: DeepTabConfig): ModelConfig {
  return {
    endpoint: config.endpoint || '',
    apiKey: config.apiKey,
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  }
}

export function createModelClient(config: DeepTabConfig): ModelClient {
  const modelLower = config.model.toLowerCase()
  const modelConfig = toModelConfig(config)

  if (modelLower.startsWith('gemini')) {
    return new GeminiClient(modelConfig)
  }

  if (
    modelLower.startsWith('gpt') ||
    modelLower.startsWith('o1') ||
    modelLower.startsWith('o3')
  ) {
    return new OpenAIClient(modelConfig)
  }

  return new DeepSeekClient(modelConfig)
}
