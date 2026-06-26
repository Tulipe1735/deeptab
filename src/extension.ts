import * as vscode from 'vscode'
import { clearConfigCache, loadConfig } from './config/settings'
import { createModelClient } from './models/registry'
import { ModelClient } from './models/interface'
import { DeepTabCompletionProvider } from './providers/completion'

let client: ModelClient | null = null
let configChangeListener: vscode.Disposable | null = null
let promptedForApiKey = false

const noopClient: ModelClient = {
  id: 'noop',
  async complete() {
    return { text: '' }
  },
}

function promptForApiKeyOnce() {
  if (promptedForApiKey) return
  promptedForApiKey = true

  vscode.window
    .showInformationMessage(
      'DeepTab: API Key is not configured. Would you like to set it up?',
      'Open Settings',
    )
    .then((choice) => {
      if (choice === 'Open Settings') {
        vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'deeptab.apiKey',
        )
      }
    })
}

function getOrCreateClient(): ModelClient {
  clearConfigCache()
  const config = loadConfig()

  if (!config.apiKey) {
    promptForApiKeyOnce()
    return noopClient
  }

  if (!client) {
    client = createModelClient(config)
  }

  return client
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new DeepTabCompletionProvider(() => getOrCreateClient())
  const completionRegistration =
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: '**' },
      provider,
    )

  configChangeListener = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('deeptab')) {
      client = null
      promptedForApiKey = false
      clearConfigCache()
    }
  })

  context.subscriptions.push(completionRegistration, configChangeListener)
}

export function deactivate() {
  client = null
  promptedForApiKey = false

  if (configChangeListener) {
    configChangeListener.dispose()
    configChangeListener = null
  }
}
