export class Position {
  constructor(
    readonly line: number,
    readonly character: number,
  ) {}
}

export class Range {
  constructor(
    readonly start: Position,
    readonly end: Position,
  ) {}
}

export interface TextLine {
  readonly text: string
  readonly range: Range
  readonly lineNumber: number
  readonly firstNonWhitespaceCharacterIndex: number
  readonly isEmptyOrWhitespace: boolean
}

export interface TextDocument {
  readonly uri: { fsPath: string }
  readonly fileName: string
  readonly languageId: string
  readonly lineCount: number
  lineAt(line: number): TextLine
  getText(range?: Range): string
  positionAt(offset: number): Position
  offsetAt(position: Position): number
}

export interface Disposable {
  dispose(): void
}

let configStore: Record<string, unknown> = {}

export function __setConfigValues(values: Record<string, unknown>) {
  configStore = { ...values }
}

export const workspace = {
  workspaceFolders: undefined as Array<{ uri: { fsPath: string } }> | undefined,

  getConfiguration(section: string) {
    return {
      get<T>(key: string, defaultValue?: T): T | undefined {
        const fullKey = `${section}.${key}`
        if (fullKey in configStore) return configStore[fullKey] as T
        return defaultValue
      },
    }
  },

  onDidChangeConfiguration: (
    _listener: (event: { affectsConfiguration(section: string): boolean }) => void,
  ): Disposable => ({ dispose() {} }),
}

export const window = {
  showInformationMessage: (_message: string, ..._items: string[]) => {
    return Promise.resolve(undefined)
  },
}

export const commands = {
  executeCommand: (_command: string, ..._args: unknown[]) => {
    return Promise.resolve(undefined)
  },
}

export const languages = {
  registerInlineCompletionItemProvider: (
    _selector: unknown,
    _provider: InlineCompletionItemProvider,
  ): Disposable => ({ dispose() {} }),
}

export enum InlineCompletionTriggerKind {
  Invoke = 0,
  Automatic = 1,
}

export interface CancellationToken {
  isCancellationRequested: boolean
  onCancellationRequested: (listener: () => void) => Disposable
}

export class CancellationTokenSource {
  private listeners: Array<() => void> = []

  token: CancellationToken = {
    isCancellationRequested: false,
    onCancellationRequested: (listener) => {
      this.listeners.push(listener)
      return { dispose: () => {} }
    },
  }

  cancel() {
    this.token.isCancellationRequested = true
    for (const listener of this.listeners) listener()
  }

  dispose() {}
}

export interface InlineCompletionContext {
  triggerKind: InlineCompletionTriggerKind
  selectedCompletionInfo?: unknown
}

export interface InlineCompletionItemProvider {
  provideInlineCompletionItems(
    document: TextDocument,
    position: Position,
    context: InlineCompletionContext,
    token: CancellationToken,
  ): Promise<InlineCompletionItem[]>
}

export class InlineCompletionItem {
  constructor(
    readonly insertText: string,
    readonly range?: Range,
  ) {}
}

export interface ExtensionContext {
  subscriptions: Disposable[]
}
