import { describe, it, expect } from 'vitest'
import { buildContext } from '../../src/context/builder'
import { Position, Range } from 'vscode'
import type { TextDocument } from 'vscode'

function makeDocument(lines: string[], languageId = 'typescript'): TextDocument {
  const content = lines.join('\n')
  return {
    uri: { fsPath: '/test/file.ts' },
    fileName: '/test/file.ts',
    languageId,
    lineCount: lines.length,
    offsetAt(position: Position): number {
      let offset = 0
      for (let i = 0; i < position.line && i < lines.length; i++) {
        offset += lines[i].length + 1
      }
      return offset + Math.min(position.character, (lines[position.line] || '').length)
    },
    positionAt(offset: number): Position {
      let remaining = offset
      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1
        if (remaining <= lines[i].length) return new Position(i, remaining)
        remaining -= lineLength
      }
      return new Position(lines.length - 1, 0)
    },
    lineAt(line: number) {
      const text = lines[line] || ''
      return {
        text,
        range: new Range(new Position(line, 0), new Position(line, text.length)),
        lineNumber: line,
        firstNonWhitespaceCharacterIndex: text.search(/\S|$/),
        isEmptyOrWhitespace: text.trim() === '',
      }
    },
    getText(range?: Range): string {
      if (!range) return content
      const result: string[] = []
      for (let i = range.start.line; i <= range.end.line && i < lines.length; i++) {
        const line = lines[i]
        if (i === range.start.line && i === range.end.line) {
          result.push(line.substring(range.start.character, range.end.character))
        } else if (i === range.start.line) {
          result.push(line.substring(range.start.character))
        } else if (i === range.end.line) {
          result.push(line.substring(0, range.end.character))
        } else {
          result.push(line)
        }
      }
      return result.join('\n')
    },
  } as TextDocument
}

describe('buildContext', () => {
  it('returns prefix and suffix split at cursor line', () => {
    const lines: string[] = []
    for (let i = 0; i < 100; i++) lines.push(`line ${i}`)
    const doc = makeDocument(lines)
    const pos = new Position(50, 3)

    const ctx = buildContext(doc, pos)

    expect(ctx.prefix).toContain('line 0')
    expect(ctx.prefix).toContain('line 49')
    expect(ctx.prefix).not.toContain('line 51')
    expect(ctx.suffix).toContain('line 51')
    expect(ctx.language).toBe('typescript')
    expect(ctx.filePath).toBe('/test/file.ts')
  })

  it('caps prefix at 200 lines', () => {
    const lines: string[] = []
    for (let i = 0; i < 500; i++) lines.push(`line ${i}`)
    const doc = makeDocument(lines)
    const pos = new Position(400, 0)

    const ctx = buildContext(doc, pos)

    expect(ctx.prefix.split('\n').length).toBeLessThanOrEqual(201)
  })

  it('caps suffix at 50 lines', () => {
    const lines: string[] = []
    for (let i = 0; i < 500; i++) lines.push(`line ${i}`)
    const doc = makeDocument(lines)
    const pos = new Position(0, 0)

    const ctx = buildContext(doc, pos)

    expect(ctx.suffix.split('\n').length).toBeLessThanOrEqual(51)
  })

  it('handles position at line 0', () => {
    const doc = makeDocument(['first line', 'second line', 'third line'])
    const pos = new Position(0, 2)

    const ctx = buildContext(doc, pos)

    expect(ctx.prefix).toBe('fi')
    expect(ctx.suffix).toContain('second line')
  })

  it('handles position at last line', () => {
    const doc = makeDocument(['first line', 'second line', 'last line'])
    const pos = new Position(2, 4)

    const ctx = buildContext(doc, pos)

    expect(ctx.prefix).toContain('last')
    expect(ctx.suffix).toBe(' line')
  })

  it('detects language from document', () => {
    const doc = makeDocument(['def foo():'], 'python')
    const pos = new Position(0, 4)

    const ctx = buildContext(doc, pos)

    expect(ctx.language).toBe('python')
  })
})
