import { CompletionContext } from '../context/builder'

export interface PromptGenerator {
  generate(
    ctx: CompletionContext,
    options?: { maxContextChars?: number },
  ): Array<{ role: string; content: string }>
}

const DEFAULT_MAX_CONTEXT_CHARS = 12000
const CONTEXT_WINDOW_RATIO = 0.6

function trimContext(
  prefix: string,
  suffix: string,
  maxContextChars: number,
): { prefix: string; suffix: string } {
  const budget = Math.floor(maxContextChars * CONTEXT_WINDOW_RATIO)
  const total = prefix.length + suffix.length
  if (total <= budget) return { prefix, suffix }

  const suffixBudget = Math.min(suffix.length, Math.floor(budget * 0.35))
  const prefixBudget = Math.max(0, budget - suffixBudget)

  return {
    prefix: prefix.slice(Math.max(0, prefix.length - prefixBudget)),
    suffix: suffix.slice(0, suffixBudget),
  }
}

export function createPromptGenerator(): PromptGenerator {
  return {
    generate(ctx, options) {
      const maxContextChars = options?.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS
      const trimmed = trimContext(ctx.prefix, ctx.suffix, maxContextChars)

      const systemMessage = {
        role: 'system',
        content:
          'You are a code completion assistant. Output only the code that should appear at the cursor position. Do not repeat existing code. Do not include explanations or markdown fences.',
      }

      const userContent = [
        `Language: ${ctx.language}`,
        `File: ${ctx.filePath}`,
        '',
        'Complete the code at the cursor (<FILL_HOLE>):',
        '',
        '```' + ctx.language,
        trimmed.prefix + '<FILL_HOLE>' + trimmed.suffix,
        '```',
        '',
        'Return only the code that replaces <FILL_HOLE>.',
      ].join('\n')

      return [systemMessage, { role: 'user', content: userContent }]
    },
  }
}
