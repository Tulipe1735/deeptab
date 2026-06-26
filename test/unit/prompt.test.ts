import { beforeEach, describe, it, expect } from 'vitest'
import { createPromptGenerator, PromptGenerator } from '../../src/prompt/generator'
import { CompletionContext } from '../../src/context/builder'

function makeCtx(overrides: Partial<CompletionContext> = {}): CompletionContext {
  return {
    prefix: 'function add(a, b) {\n  ',
    suffix: '\n}',
    filePath: '/test/add.ts',
    language: 'typescript',
    ...overrides,
  }
}

describe('PromptGenerator', () => {
  let generator: PromptGenerator

  beforeEach(() => {
    generator = createPromptGenerator()
  })

  it('includes system message instructing code-only output', () => {
    const messages = generator.generate(makeCtx())

    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toContain('code completion')
  })

  it('includes prefix and suffix separated by FILL_HOLE marker', () => {
    const messages = generator.generate(makeCtx())
    const userMsg = messages.find((message) => message.role === 'user')

    expect(userMsg).toBeDefined()
    expect(userMsg!.content).toContain('function add(a, b)')
    expect(userMsg!.content).toContain('<FILL_HOLE>')
    expect(userMsg!.content).toContain('\n}')
  })

  it('includes language info in the prompt', () => {
    const messages = generator.generate(makeCtx({ language: 'python' }))
    const userMsg = messages.find((message) => message.role === 'user')

    expect(userMsg!.content).toContain('python')
  })

  it('trims prefix when total context exceeds 60% of max context window', () => {
    const longPrefix = 'x'.repeat(100000)
    const messages = generator.generate(makeCtx({ prefix: longPrefix }), {
      maxContextChars: 10000,
    })
    const userMsg = messages.find((message) => message.role === 'user')

    expect(userMsg!.content.length).toBeLessThanOrEqual(8000)
  })

  it('handles empty suffix gracefully', () => {
    const messages = generator.generate(makeCtx({ suffix: '' }))
    const userMsg = messages.find((message) => message.role === 'user')

    expect(userMsg).toBeDefined()
    expect(userMsg!.content).toContain('<FILL_HOLE>')
  })
})
