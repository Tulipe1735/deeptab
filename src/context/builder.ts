import * as vscode from 'vscode'

export interface CompletionContext {
  prefix: string
  suffix: string
  filePath: string
  language: string
}

const MAX_PREFIX_LINES = 200
const MAX_SUFFIX_LINES = 50

export function buildContext(
  document: vscode.TextDocument,
  position: vscode.Position,
): CompletionContext {
  const cursorLine = position.line
  const totalLines = document.lineCount

  const prefixStart = Math.max(0, cursorLine - MAX_PREFIX_LINES)
  const prefixRange = new vscode.Range(
    new vscode.Position(prefixStart, 0),
    new vscode.Position(cursorLine, position.character),
  )

  const suffixEnd = Math.min(totalLines - 1, cursorLine + MAX_SUFFIX_LINES)
  const suffixRange = new vscode.Range(
    new vscode.Position(cursorLine, position.character),
    new vscode.Position(suffixEnd, document.lineAt(suffixEnd).text.length),
  )

  return {
    prefix: document.getText(prefixRange),
    suffix: document.getText(suffixRange),
    filePath: document.fileName,
    language: document.languageId,
  }
}
