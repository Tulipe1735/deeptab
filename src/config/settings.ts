import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

export interface DeepTabConfig {
  apiKey: string
  model: string
  endpoint?: string
  temperature?: number
  maxTokens?: number
}

let cachedConfig: DeepTabConfig | null = null

export function clearConfigCache(): void {
  cachedConfig = null
}

function getEnvPath(): string {
  const workspaceFolders = vscode.workspace.workspaceFolders
  const root = workspaceFolders?.[0]?.uri.fsPath ?? process.cwd()
  return path.join(root, '.env')
}

export function loadConfig(): DeepTabConfig {
  if (cachedConfig) return cachedConfig

  let apiKey = ''
  let endpoint: string | undefined
  let model: string | undefined

  const envPath = getEnvPath()
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const envVars = dotenv.parse(envContent)
    apiKey = envVars.DEEPTAB_API_KEY || ''
    model = envVars.DEEPTAB_MODEL || undefined
    endpoint = envVars.DEEPTAB_ENDPOINT || undefined
  }

  const config = vscode.workspace.getConfiguration('deeptab')
  apiKey = apiKey || config.get<string>('apiKey') || ''
  model = model || config.get<string>('model') || 'deepseek-chat'
  endpoint = endpoint || config.get<string>('endpoint') || undefined
  const temperature = config.get<number>('temperature') ?? 0.2
  const maxTokens = config.get<number>('maxTokens') ?? 256

  cachedConfig = { apiKey, model, endpoint, temperature, maxTokens }
  return cachedConfig
}
