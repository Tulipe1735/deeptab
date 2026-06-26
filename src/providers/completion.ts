import * as vscode from 'vscode'
import { buildContext } from '../context/builder'
import { createPromptGenerator } from '../prompt/generator'
import { ModelClient } from '../models/interface'
import { createDebouncer } from '../utils/debounce'

const DEBOUNCE_MS = 300
const REQUEST_TIMEOUT_MS = 7500

export class DeepTabCompletionProvider
  implements vscode.InlineCompletionItemProvider
{
  private debouncer = createDebouncer(DEBOUNCE_MS)
  private promptGenerator = createPromptGenerator()

  constructor(private getClient: () => ModelClient) {}

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.InlineCompletionItem[]> {
    const cursorLineStart = new vscode.Position(position.line, 0)
    const prefixRange = new vscode.Range(cursorLineStart, position)
    const prefixText = document.getText(prefixRange)

    if (prefixText.trim() === '' && position.line === 0) {
      return []
    }

    const result = await this.debouncer.debounce(async () => {
      if (token.isCancellationRequested) return null

      const ctx = buildContext(document, position)
      const messages = this.promptGenerator.generate(ctx)
      const controller = new AbortController()
      const cancelListener = token.onCancellationRequested(() => {
        controller.abort()
      })
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        const response = await this.getClient().complete({
          messages,
          signal: controller.signal,
        })

        if (!response.text.trim()) return null
        return response.text
      } catch (error: any) {
        if (error?.name === 'AbortError' || controller.signal.aborted) {
          return null
        }

        if (
          error?.message?.includes('401') ||
          error?.message?.includes('403')
        ) {
          vscode.window.showInformationMessage(
            'DeepTab: API Key rejected. Check your API key in settings or .env.',
          )
        }

        return null
      } finally {
        clearTimeout(timeoutId)
        cancelListener.dispose()
      }
    })

    if (!result) return []

    return [new vscode.InlineCompletionItem(result)]
  }
}
