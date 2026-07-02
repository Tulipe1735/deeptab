import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Position, Range, window, CancellationTokenSource } from 'vscode'
import { DeepTabCompletionProvider } from '../../src/providers/completion'
import type { ModelClient, CompletionResponse } from '../../src/models/interface'

function makeDoc(lines: string[], languageId = 'typescript') {
  const joined = lines.join('\n')
  return {
    uri: { fsPath: '/test/index.ts' },
    fileName: '/test/index.ts',
    languageId,
    lineCount: lines.length,
    getText(range?: { start: Position; end: Position }) {
      if (!range) return joined
      let text = ''
      for (let i = range.start.line; i <= range.end.line; i++) {
        if (i >= 0 && i < lines.length) {
          const line = lines[i]
          if (i === range.start.line && i === range.end.line) {
            text += line.slice(range.start.character, range.end.character)
          } else if (i === range.start.line) {
            text += line.slice(range.start.character)
          } else if (i === range.end.line) {
            text += line.slice(0, range.end.character)
          } else {
            text += line
          }
          if (i < range.end.line) text += '\n'
        }
      }
      return text
    },
    lineAt(line: number) {
      const text = lines[line] ?? ''
      return {
        text,
        range: new Range(new Position(line, 0), new Position(line, text.length)),
        lineNumber: line,
        firstNonWhitespaceCharacterIndex: text.length - text.trimStart().length,
        isEmptyOrWhitespace: text.trim() === '',
      }
    },
    positionAt(_offset: number) {
      return new Position(0, 0)
    },
    offsetAt(_position: Position) {
      return 0
    },
  }
}

function makeClient(
  responseText = 'completion',
  throwError?: Error,
): ModelClient {
  return {
    id: 'test-client',
    async complete(_req): Promise<CompletionResponse> {
      if (throwError) throw throwError
      return { text: responseText }
    },
  }
}

function waitForDebounce(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('DeepTabCompletionProvider', () => {
  it('returns empty for empty prefix on line 0', async () => {
    const client = makeClient('code')
    const provider = new DeepTabCompletionProvider(() => client)
    const doc = makeDoc([''])
    const pos = new Position(0, 0)
    const src = new CancellationTokenSource()

    const result = await provider.provideInlineCompletionItems(
      doc as any,
      pos,
      { triggerKind: 1 },
      src.token as any,
    )

    expect(result).toEqual([])
  })

  it('returns empty when cancelled via token', async () => {
    const client = makeClient('code')
    const provider = new DeepTabCompletionProvider(() => client)
    const doc = makeDoc(['const x = '])
    const pos = new Position(0, 11)
    const src = new CancellationTokenSource()
    src.cancel()

    const result = await provider.provideInlineCompletionItems(
      doc as any,
      pos,
      { triggerKind: 1 },
      src.token as any,
    )

    expect(result).toEqual([])
  })

  it('shows info message on 401/403 error', async () => {
    const err = new Error('401 Unauthorized')
    const client = makeClient('', err)
    const provider = new DeepTabCompletionProvider(() => client)
    const doc = makeDoc(['const x = '])
    const pos = new Position(0, 11)
    const src = new CancellationTokenSource()
    const spy = vi.spyOn(window, 'showInformationMessage')

    const result = await provider.provideInlineCompletionItems(
      doc as any,
      pos,
      { triggerKind: 1 },
      src.token as any,
    )

    await waitForDebounce()
    expect(result).toEqual([])
    expect(spy).toHaveBeenCalled()
  })

  it('shows info message on 403 error', async () => {
    const err = new Error('403 Forbidden')
    const client = makeClient('', err)
    const provider = new DeepTabCompletionProvider(() => client)
    const doc = makeDoc(['const x = '])
    const pos = new Position(0, 11)
    const src = new CancellationTokenSource()
    const spy = vi.spyOn(window, 'showInformationMessage')

    const result = await provider.provideInlineCompletionItems(
      doc as any,
      pos,
      { triggerKind: 1 },
      src.token as any,
    )

    await waitForDebounce()
    expect(result).toEqual([])
    expect(spy).toHaveBeenCalled()
  })

  it('returns InlineCompletionItem with text on success', async () => {
    const client = makeClient('42;')
    const provider = new DeepTabCompletionProvider(() => client)
    const doc = makeDoc(['const answer = '])
    const pos = new Position(0, 15)
    const src = new CancellationTokenSource()

    const result = await provider.provideInlineCompletionItems(
      doc as any,
      pos,
      { triggerKind: 1 },
      src.token as any,
    )

    await waitForDebounce()
    expect(result).toHaveLength(1)
    expect(result[0].insertText).toBe('42;')
  })

  it('returns empty when response text is blank', async () => {
    const client = makeClient('  ')
    const provider = new DeepTabCompletionProvider(() => client)
    const doc = makeDoc(['const x = '])
    const pos = new Position(0, 11)
    const src = new CancellationTokenSource()

    const result = await provider.provideInlineCompletionItems(
      doc as any,
      pos,
      { triggerKind: 1 },
      src.token as any,
    )

    await waitForDebounce()
    expect(result).toEqual([])
  })

  it('succeeds on non-empty line > 0', async () => {
    const client = makeClient('bar')
    const provider = new DeepTabCompletionProvider(() => client)
    const doc = makeDoc(['const foo =', '', ''])
    const pos = new Position(1, 0)
    const src = new CancellationTokenSource()

    const result = await provider.provideInlineCompletionItems(
      doc as any,
      pos,
      { triggerKind: 1 },
      src.token as any,
    )

    await waitForDebounce()
    expect(result).toHaveLength(1)
    expect(result[0].insertText).toBe('bar')
  })

  it('does not show error message for non-auth errors', async () => {
    const err = new Error('500 Internal Server Error')
    const client = makeClient('', err)
    const provider = new DeepTabCompletionProvider(() => client)
    const doc = makeDoc(['const x = '])
    const pos = new Position(0, 11)
    const src = new CancellationTokenSource()
    const spy = vi.spyOn(window, 'showInformationMessage')

    const result = await provider.provideInlineCompletionItems(
      doc as any,
      pos,
      { triggerKind: 1 },
      src.token as any,
    )

    await waitForDebounce()
    expect(result).toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })
})
