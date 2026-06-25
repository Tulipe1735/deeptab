# DeepTab MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a VSCode extension that provides AI code completion using user-supplied API keys for DeepSeek, OpenAI, and Gemini models.

**Architecture:** Layered TypeScript VSCode extension with a `ModelClient` interface abstracting three LLM providers, an `InlineCompletionItemProvider` for ghost-text rendering, a `ContextBuilder` that reads 200 lines above + 50 lines below the cursor, and a `PromptGenerator` that converts context into chat messages. Config reads from `.env` first, then `settings.json`. Built with Vite, tested with vitest (unit) + VSCode test host (integration).

**Tech Stack:** TypeScript, VSCode Extension API (InlineCompletionItemProvider), Vite 5, vitest 1, dotenv, Node.js fetch API

## Global Constraints

- provideInlineCompletionItems must return within 800ms
- CancellationToken must be converted to AbortSignal for all API calls
- Config priority: .env > settings.json > info-message prompt
- 300ms debounce on completion triggers
- Timeout >7500ms, 5xx, network errors: silent (no completion shown)
- 401/403: showInformationMessage to check API Key
- VSCode engine: ^1.85.0
- Tests use vitest globals; no semi-colons in source

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `.vscode/launch.json`
- Create: `.vscode/tasks.json`
- Create: `.env.example`
- Create: `.gitignore`

**Interfaces:**
- Consumes: none
- Produces: npm scripts (`build`, `dev`, `test`, `test:watch`), VSCode launch configs, TypeScript strict mode, Vite cjs bundle targeting `src/extension.ts` with `vscode` external

- [ ] **Step 1: Write package.json**

```json
{
  "name": "deeptab",
  "displayName": "DeepTab",
  "description": "Bring-your-own-key AI code completion",
  "version": "0.1.0",
  "publisher": "deeptab",
  "engines": {
    "vscode": "^1.85.0"
  },
  "activationEvents": [
    "onLanguage"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "configuration": {
      "title": "DeepTab",
      "properties": {
        "deeptab.apiKey": {
          "type": "string",
          "description": "API Key for the model provider"
        },
        "deeptab.model": {
          "type": "string",
          "default": "deepseek-chat",
          "description": "Model to use for completions"
        },
        "deeptab.endpoint": {
          "type": "string",
          "description": "Override the default API endpoint"
        },
        "deeptab.temperature": {
          "type": "number",
          "default": 0.2,
          "description": "Model temperature (0-2)"
        },
        "deeptab.maxTokens": {
          "type": "number",
          "default": 256,
          "description": "Maximum tokens per completion"
        }
      }
    }
  },
  "scripts": {
    "build": "vite build",
    "dev": "vite build --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "typescript": "^5.3.0",
    "vite": "^5.4.0",
    "vitest": "^1.6.0"
  },
  "dependencies": {
    "dotenv": "^16.4.0"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: Write vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/extension.ts'),
      formats: ['cjs'],
      fileName: () => 'extension.js',
    },
    rollupOptions: {
      external: ['vscode'],
    },
    outDir: 'dist',
    sourcemap: true,
  },
})
```

- [ ] **Step 4: Write vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      vscode: resolve(__dirname, 'test/__mocks__/vscode.ts'),
    },
  },
})
```

- [ ] **Step 5: Write .vscode/launch.json**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/dist/**/*.js"
      ],
      "preLaunchTask": "npm: build"
    },
    {
      "name": "Extension Tests",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/test/integration/index"
      ],
      "outFiles": [
        "${workspaceFolder}/dist/**/*.js"
      ],
      "preLaunchTask": "npm: build"
    }
  ]
}
```

- [ ] **Step 6: Write .vscode/tasks.json**

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "build",
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "label": "npm: build"
    }
  ]
}
```

- [ ] **Step 7: Write .env.example**

```
DEEPTAB_API_KEY=your-api-key-here
DEEPTAB_MODEL=deepseek-chat
DEEPTAB_ENDPOINT=
```

- [ ] **Step 8: Write .gitignore**

```
node_modules/
dist/
.env
*.vsix
```

- [ ] **Step 9: Install dependencies and verify build**

```bash
npm install
```

Expected: installs all deps, no errors.

```bash
npx vitest run
```

Expected: "No test files found" (not an error — verifies vitest is configured).

```bash
npx vite build
```

Expected: creates `dist/extension.js` and `dist/extension.js.map`.

- [ ] **Step 10: Commit**

```bash
git add package.json tsconfig.json vite.config.ts vitest.config.ts .vscode/ .env.example .gitignore
git commit -m "feat: scaffold VSCode extension with Vite and vitest"
```

---

### Task 2: VSCode Mock for Tests

**Files:**
- Create: `test/__mocks__/vscode.ts`

**Interfaces:**
- Consumes: none
- Produces: mock `vscode` module exporting `Position`, `Range`, `workspace` (with `workspaceFolders`, `getConfiguration`), `window` (with `showInformationMessage`)

- [ ] **Step 1: Write the mock file**

```typescript
// test/__mocks__/vscode.ts

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

let _configStore: Record<string, any> = {}

export function __setConfigValues(values: Record<string, any>) {
  _configStore = { ..._configStore, ...values }
}

export const workspace = {
  workspaceFolders: undefined as Array<{ uri: { fsPath: string } }> | undefined,

  getConfiguration(section: string) {
    return {
      get<T>(key: string, defaultValue?: T): T | undefined {
        const fullKey = `${section}.${key}`
        if (fullKey in _configStore) return _configStore[fullKey] as T
        return defaultValue
      },
    }
  },
}

export const window = {
  showInformationMessage: (_message: string, ..._items: string[]) => {
    return Promise.resolve(undefined)
  },
}

export enum InlineCompletionTriggerKind {
  Invoke = 0,
  Automatic = 1,
}

export class CancellationTokenSource {
  token: CancellationToken = {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => {} }),
  }

  cancel() {
    this.token = {
      isCancellationRequested: true,
      onCancellationRequested: () => ({ dispose: () => {} }),
    }
  }

  dispose() {}
}

export interface CancellationToken {
  isCancellationRequested: boolean
  onCancellationRequested: (listener: () => void) => { dispose(): void }
}

export class InlineCompletionItem {
  constructor(readonly insertText: string, readonly range?: Range) {}
}
```

- [ ] **Step 2: Verify mock resolves in vitest**

Create a temporary smoke test:

```typescript
// test/unit/smoke.test.ts
import { describe, it, expect } from 'vitest'
import { Position } from 'vscode'

describe('vscode mock', () => {
  it('resolves Position from mock', () => {
    const pos = new Position(3, 10)
    expect(pos.line).toBe(3)
    expect(pos.character).toBe(10)
  })
})
```

```bash
npx vitest run
```

Expected: 1 test passes.

- [ ] **Step 3: Remove smoke test and commit**

```bash
rm test/unit/smoke.test.ts
git add test/__mocks__/vscode.ts vitest.config.ts
git commit -m "test: add vscode mock for unit tests"
```

---

### Task 3: ModelClient Interface

**Files:**
- Create: `src/models/interface.ts`

**Interfaces:**
- Consumes: none
- Produces: `ModelConfig`, `CompletionRequest`, `CompletionResponse`, `ModelClient`

- [ ] **Step 1: Write the interface file**

```typescript
// src/models/interface.ts

export interface ModelConfig {
  endpoint: string
  apiKey: string
  model: string
  temperature?: number
  maxTokens?: number
}

export interface CompletionRequest {
  messages: Array<{ role: string; content: string }>
  signal: AbortSignal
}

export interface CompletionResponse {
  text: string
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

export interface ModelClient {
  readonly id: string
  complete(req: CompletionRequest): Promise<CompletionResponse>
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx vite build
```

Expected: builds without errors (even though nothing imports this yet).

- [ ] **Step 3: Commit**

```bash
git add src/models/interface.ts
git commit -m "feat: define ModelClient interface"
```

---

### Task 4: Config Module

**Files:**
- Create: `src/config/settings.ts`
- Create: `test/unit/config.test.ts`

**Interfaces:**
- Consumes: `vscode.workspace`, `vscode.window`, `dotenv`
- Produces: `DeepTabConfig` type, `loadConfig()` function

- [ ] **Step 1: Write the failing test**

```typescript
// test/unit/config.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { __setConfigValues, workspace, window } from 'vscode'
import { loadConfig, clearConfigCache } from '../../src/config/settings'
import * as fs from 'fs'
import * as path from 'path'
import { vi } from 'vitest'

// Mock fs and dotenv
vi.mock('fs')
vi.mock('dotenv', () => ({
  default: { parse: vi.fn() },
}))

const dotenv = await import('dotenv')

beforeEach(() => {
  clearConfigCache()
})

describe('loadConfig', () => {
  it('reads apiKey from settings.json when .env is absent', () => {
    __setConfigValues({ 'deeptab.apiKey': 'sk-test-123' })
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const config = loadConfig()

    expect(config.apiKey).toBe('sk-test-123')
  })

  it('prefers .env over settings.json', () => {
    __setConfigValues({ 'deeptab.apiKey': 'settings-key' })
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('DEEPTAB_API_KEY=env-key')
    vi.mocked(dotenv.default.parse).mockReturnValue({ DEEPTAB_API_KEY: 'env-key' })

    const config = loadConfig()

    expect(config.apiKey).toBe('env-key')
  })

  it('returns empty string when no apiKey is configured', () => {
    __setConfigValues({})
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const config = loadConfig()

    expect(config.apiKey).toBe('')
  })

  it('returns default model when not configured', () => {
    __setConfigValues({})
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const config = loadConfig()

    expect(config.model).toBe('deepseek-chat')
  })

  it('returns configured model with temperature and maxTokens', () => {
    __setConfigValues({
      'deeptab.model': 'gpt-4o-mini',
      'deeptab.temperature': 0.5,
      'deeptab.maxTokens': 128,
    })
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const config = loadConfig()

    expect(config.model).toBe('gpt-4o-mini')
    expect(config.temperature).toBe(0.5)
    expect(config.maxTokens).toBe(128)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run test/unit/config.test.ts
```

Expected: FAIL — `loadConfig` and `clearConfigCache` not exported.

- [ ] **Step 3: Write the config implementation**

```typescript
// src/config/settings.ts
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

export function loadConfig(): DeepTabConfig {
  if (cachedConfig) return cachedConfig

  let apiKey = ''
  let endpoint: string | undefined
  let model: string | undefined
  let temperature: number | undefined
  let maxTokens: number | undefined

  // 1. Try .env (highest priority)
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (workspaceFolders && workspaceFolders.length > 0) {
    const envPath = path.join(workspaceFolders[0].uri.fsPath, '.env')
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8')
      const envVars = dotenv.parse(envContent)
      if (envVars.DEEPTAB_API_KEY) apiKey = envVars.DEEPTAB_API_KEY
      if (envVars.DEEPTAB_MODEL) model = envVars.DEEPTAB_MODEL
      if (envVars.DEEPTAB_ENDPOINT) endpoint = envVars.DEEPTAB_ENDPOINT || undefined
    }
  }

  // 2. Try settings.json (fallback)
  const config = vscode.workspace.getConfiguration('deeptab')
  if (!apiKey) apiKey = config.get<string>('apiKey') || ''
  if (!model) model = config.get<string>('model') || 'deepseek-chat'
  if (!endpoint) endpoint = config.get<string>('endpoint') || undefined
  if (temperature === undefined) temperature = config.get<number>('temperature') || 0.2
  if (maxTokens === undefined) maxTokens = config.get<number>('maxTokens') || 256

  cachedConfig = { apiKey, model, endpoint, temperature, maxTokens }
  return cachedConfig
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/unit/config.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/settings.ts test/unit/config.test.ts
git commit -m "feat: add config module with .env > settings.json priority"
```

---

### Task 5: Context Builder

**Files:**
- Create: `src/context/builder.ts`
- Create: `test/unit/context.test.ts`

**Interfaces:**
- Consumes: `vscode.TextDocument`, `vscode.Position`
- Produces: `CompletionContext` type, `buildContext(document, position): CompletionContext`

- [ ] **Step 1: Write the failing test**

```typescript
// test/unit/context.test.ts
import { describe, it, expect } from 'vitest'
import { buildContext, CompletionContext } from '../../src/context/builder'
import { Position, Range } from 'vscode'
import type { TextDocument } from 'vscode'

function makeDocument(
  lines: string[],
  languageId = 'typescript',
): TextDocument {
  const content = lines.join('\n')
  return {
    uri: { fsPath: '/test/file.ts' },
    fileName: '/test/file.ts',
    languageId,
    lineCount: lines.length,
    offsetAt(_pos: Position): number {
      let offset = 0
      for (let i = 0; i < _pos.line && i < lines.length; i++) {
        offset += lines[i].length + 1 // +1 for newline
      }
      return offset + Math.min(_pos.character, (lines[_pos.line] || '').length)
    },
    positionAt(offset: number): Position {
      let remaining = offset
      for (let i = 0; i < lines.length; i++) {
        const lineLen = lines[i].length + 1
        if (remaining <= lines[i].length) return new Position(i, remaining)
        remaining -= lineLen
      }
      return new Position(lines.length - 1, 0)
    },
    lineAt(line: number) {
      const text = lines[line] || ''
      return {
        text,
        range: new Range(new Position(line, 0), new Position(line, text.length)),
        lineNumber: line,
        firstNonWhitespaceCharacterIndex: text.search(/\S|$/) === -1 ? 0 : text.search(/\S|$/),
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

    const prefixLines = ctx.prefix.split('\n')
    expect(prefixLines.length).toBeLessThanOrEqual(201) // 200 + cursor line
  })

  it('caps suffix at 50 lines', () => {
    const lines: string[] = []
    for (let i = 0; i < 500; i++) lines.push(`line ${i}`)
    const doc = makeDocument(lines)
    const pos = new Position(0, 0)

    const ctx = buildContext(doc, pos)

    const suffixLines = ctx.suffix.split('\n')
    expect(suffixLines.length).toBeLessThanOrEqual(51) // 50 + cursor line
  })

  it('handles position at line 0 (empty prefix)', () => {
    const lines = ['first line', 'second line', 'third line']
    const doc = makeDocument(lines)
    const pos = new Position(0, 2)

    const ctx = buildContext(doc, pos)

    expect(ctx.prefix).toBe('fi') // cursor at char 2 on first line
    expect(ctx.suffix).toContain('second line')
  })

  it('handles position at last line (empty suffix)', () => {
    const lines = ['first line', 'second line', 'last line']
    const doc = makeDocument(lines)
    const pos = new Position(2, 4)

    const ctx = buildContext(doc, pos)

    expect(ctx.prefix).toContain('first line')
    expect(ctx.suffix).toBe('last') // cursor at char 4 on last line
  })

  it('detects language from document', () => {
    const doc = makeDocument(['def foo():'], 'python')
    const pos = new Position(0, 4)

    const ctx = buildContext(doc, pos)

    expect(ctx.language).toBe('python')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run test/unit/context.test.ts
```

Expected: FAIL — `buildContext` not exported.

- [ ] **Step 3: Write the context builder implementation**

```typescript
// src/context/builder.ts
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

  // Prefix: cursor line and up to 200 lines above
  const prefixStart = Math.max(0, cursorLine - MAX_PREFIX_LINES)
  const prefixRange = new vscode.Range(
    new vscode.Position(prefixStart, 0),
    new vscode.Position(cursorLine, position.character),
  )
  const prefix = document.getText(prefixRange)

  // Suffix: cursor line (from cursor position) and up to 50 lines below
  const suffixEnd = Math.min(totalLines - 1, cursorLine + MAX_SUFFIX_LINES)
  const suffixRange = new vscode.Range(
    new vscode.Position(cursorLine, position.character),
    new vscode.Position(suffixEnd, document.lineAt(suffixEnd).text.length),
  )
  const suffix = document.getText(suffixRange)

  return {
    prefix,
    suffix,
    filePath: document.fileName,
    language: document.languageId,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/unit/context.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/context/builder.ts test/unit/context.test.ts
git commit -m "feat: add context builder (200 prefix + 50 suffix lines)"
```

---

### Task 6: Prompt Generator

**Files:**
- Create: `src/prompt/generator.ts`
- Create: `test/unit/prompt.test.ts`

**Interfaces:**
- Consumes: `CompletionContext` from `src/context/builder`
- Produces: `PromptGenerator` interface, `createPromptGenerator()` factory

- [ ] **Step 1: Write the failing test**

```typescript
// test/unit/prompt.test.ts
import { describe, it, expect } from 'vitest'
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

    const userMsg = messages.find((m) => m.role === 'user')
    expect(userMsg).toBeDefined()
    expect(userMsg!.content).toContain('function add(a, b)')
    expect(userMsg!.content).toContain('<FILL_HOLE>')
    expect(userMsg!.content).toContain('\n}')
  })

  it('includes language info in the prompt', () => {
    const messages = generator.generate(makeCtx({ language: 'python' }))

    const userMsg = messages.find((m) => m.role === 'user')
    expect(userMsg!.content).toContain('python')
  })

  it('trims prefix when total context exceeds 60% of max context window', () => {
    const longPrefix = 'x'.repeat(100000)
    const ctx = makeCtx({ prefix: longPrefix })

    const messages = generator.generate(ctx, { maxContextChars: 10000 })

    const userMsg = messages.find((m) => m.role === 'user')
    const contentLen = userMsg!.content.length
    expect(contentLen).toBeLessThanOrEqual(8000) // with overhead
  })

  it('handles empty suffix gracefully', () => {
    const messages = generator.generate(makeCtx({ suffix: '' }))

    const userMsg = messages.find((m) => m.role === 'user')
    expect(userMsg).toBeDefined()
    expect(userMsg!.content).toContain('<FILL_HOLE>')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run test/unit/prompt.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the prompt generator implementation**

```typescript
// src/prompt/generator.ts
import { CompletionContext } from '../context/builder'

export interface PromptGenerator {
  generate(
    ctx: CompletionContext,
    options?: { maxContextChars?: number },
  ): Array<{ role: string; content: string }>
}

const DEFAULT_MAX_CONTEXT_CHARS = 12000 // ~60% of gpt-4o-mini context

export function createPromptGenerator(): PromptGenerator {
  return {
    generate(ctx, options) {
      const maxChars = options?.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS

      const systemMsg = {
        role: 'system' as const,
        content:
          'You are a code completion assistant. Output only the code that should appear at the cursor position. Do not repeat existing code. Do not include explanations or markdown fences.',
      }

      let prefix = ctx.prefix
      let suffix = ctx.suffix

      // Trim prefix from head if total exceeds max context
      const overhead = 200 // prompt template overhead
      let total = prefix.length + suffix.length + overhead
      if (total > maxChars) {
        const excess = total - maxChars
        if (prefix.length > excess) {
          prefix = prefix.substring(excess)
        } else {
          prefix = ''
          suffix = suffix.substring(excess - prefix.length)
        }
      }

      const userContent = [
        `Language: ${ctx.language}`,
        `File: ${ctx.filePath}`,
        '',
        'Complete the code at the cursor (<FILL_HOLE>):',
        '',
        '```' + ctx.language,
        prefix + '<FILL_HOLE>' + suffix,
        '```',
        '',
        'Return only the code that replaces <FILL_HOLE>.',
      ].join('\n')

      return [systemMsg, { role: 'user', content: userContent }]
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/unit/prompt.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/prompt/generator.ts test/unit/prompt.test.ts
git commit -m "feat: add prompt generator with FILL_HOLE FIM format"
```

---

### Task 7: Debounce Utility

**Files:**
- Create: `src/utils/debounce.ts`
- Create: `test/unit/debounce.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `createDebouncer(delayMs: number): { debounce(fn): Promise<T> }`

- [ ] **Step 1: Write the failing test**

```typescript
// test/unit/debounce.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createDebouncer } from '../../src/utils/debounce'

describe('createDebouncer', () => {
  it('calls the latest function after the delay', async () => {
    vi.useFakeTimers()
    const debouncer = createDebouncer(300)
    const fn1 = vi.fn().mockResolvedValue('first')
    const fn2 = vi.fn().mockResolvedValue('second')

    const p1 = debouncer.debounce(fn1)
    // Immediately call again, cancelling fn1
    const p2 = debouncer.debounce(fn2)

    await vi.runAllTimersAsync()

    const r1 = await p1
    const r2 = await p2

    expect(fn1).not.toHaveBeenCalled()
    expect(fn2).toHaveBeenCalledTimes(1)
    expect(r1).toBeNull() // cancelled
    expect(r2).toBe('second')
    vi.useRealTimers()
  })

  it('does not cancel if no subsequent call arrives', async () => {
    vi.useFakeTimers()
    const debouncer = createDebouncer(300)
    const fn = vi.fn().mockResolvedValue('result')

    const promise = debouncer.debounce(fn)
    await vi.runAllTimersAsync()

    const result = await promise
    expect(fn).toHaveBeenCalledTimes(1)
    expect(result).toBe('result')
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run test/unit/debounce.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write the debounce implementation**

```typescript
// src/utils/debounce.ts

export function createDebouncer(delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let currentId = 0

  return {
    debounce<T>(fn: () => Promise<T>): Promise<T | null> {
      if (timer !== null) {
        clearTimeout(timer)
        currentId++
      }

      const callId = currentId

      return new Promise((resolve) => {
        timer = setTimeout(async () => {
          timer = null
          if (callId !== currentId) {
            resolve(null) // cancelled by later call
            return
          }
          try {
            const result = await fn()
            resolve(result)
          } catch {
            resolve(null)
          }
        }, delayMs)
      })
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/unit/debounce.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/debounce.ts test/unit/debounce.test.ts
git commit -m "feat: add debounce utility for completion triggers"
```

---

### Task 8: DeepSeek Client

**Files:**
- Create: `src/models/deepseek.ts`
- Create: `test/unit/deepseek.test.ts`

**Interfaces:**
- Consumes: `ModelClient`, `ModelConfig`, `CompletionRequest`, `CompletionResponse` from `src/models/interface`
- Produces: `DeepSeekClient` class implementing `ModelClient`

- [ ] **Step 1: Write the failing test**

```typescript
// test/unit/deepseek.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DeepSeekClient } from '../../src/models/deepseek'
import { ModelConfig } from '../../src/models/interface'

const config: ModelConfig = {
  endpoint: 'https://api.deepseek.com/v1',
  apiKey: 'sk-test-key',
  model: 'deepseek-chat',
  temperature: 0.2,
  maxTokens: 256,
}

function makeFetchMock(responseBody: object, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(responseBody),
    text: () => Promise.resolve(JSON.stringify(responseBody)),
  })
}

describe('DeepSeekClient', () => {
  let client: DeepSeekClient

  beforeEach(() => {
    client = new DeepSeekClient(config)
    vi.restoreAllMocks()
  })

  it('has id "deepseek"', () => {
    expect(client.id).toBe('deepseek')
  })

  it('sends POST to /v1/chat/completions with correct headers', async () => {
    const mockFetch = makeFetchMock({
      choices: [{ message: { content: 'return a + b' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    })
    vi.stubGlobal('fetch', mockFetch)

    await client.complete({
      messages: [{ role: 'user', content: 'test' }],
      signal: new AbortController().signal,
    })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.deepseek.com/v1/chat/completions')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer sk-test-key',
    })
    expect(init.signal).toBeDefined()
  })

  it('parses completion text from response', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock({
        choices: [{ message: { content: 'return a + b;' } }],
        usage: { prompt_tokens: 10, completion_tokens: 4 },
      }),
    )

    const response = await client.complete({
      messages: [{ role: 'user', content: 'test' }],
      signal: new AbortController().signal,
    })

    expect(response.text).toBe('return a + b;')
    expect(response.usage).toEqual({
      promptTokens: 10,
      completionTokens: 4,
    })
  })

  it('throws on non-200 response', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock({ error: 'unauthorized' }, 401),
    )

    await expect(
      client.complete({
        messages: [{ role: 'user', content: 'test' }],
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run test/unit/deepseek.test.ts
```

Expected: FAIL — `DeepSeekClient` not found.

- [ ] **Step 3: Write the DeepSeek client implementation**

```typescript
// src/models/deepseek.ts
import { ModelClient, ModelConfig, CompletionRequest, CompletionResponse } from './interface'

export class DeepSeekClient implements ModelClient {
  readonly id = 'deepseek'
  private config: ModelConfig

  constructor(config: ModelConfig) {
    this.config = config
  }

  get endpoint(): string {
    return this.config.endpoint || 'https://api.deepseek.com/v1'
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const url = `${this.endpoint}/chat/completions`

    const body = {
      model: this.config.model || 'deepseek-chat',
      messages: req.messages,
      temperature: this.config.temperature ?? 0.2,
      max_tokens: this.config.maxTokens ?? 256,
      stream: false,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: req.signal,
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`)
    }

    const data = (await response.json()) as any

    return {
      text: data.choices?.[0]?.message?.content ?? '',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
          }
        : undefined,
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/unit/deepseek.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/models/deepseek.ts test/unit/deepseek.test.ts
git commit -m "feat: add DeepSeek model client"
```

---

### Task 9: OpenAI Client

**Files:**
- Create: `src/models/openai.ts`
- Create: `test/unit/openai.test.ts`

**Interfaces:**
- Consumes: `ModelClient`, `ModelConfig`, `CompletionRequest`, `CompletionResponse` from `src/models/interface`
- Produces: `OpenAIClient` class implementing `ModelClient`

- [ ] **Step 1: Write the failing test**

```typescript
// test/unit/openai.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OpenAIClient } from '../../src/models/openai'
import { ModelConfig } from '../../src/models/interface'

const config: ModelConfig = {
  endpoint: 'https://api.openai.com/v1',
  apiKey: 'sk-openai-test',
  model: 'gpt-4o-mini',
  temperature: 0.2,
  maxTokens: 256,
}

function makeFetchMock(responseBody: object, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(responseBody),
  })
}

describe('OpenAIClient', () => {
  let client: OpenAIClient

  beforeEach(() => {
    client = new OpenAIClient(config)
    vi.restoreAllMocks()
  })

  it('has id "openai"', () => {
    expect(client.id).toBe('openai')
  })

  it('sends POST to /v1/chat/completions', async () => {
    const mockFetch = makeFetchMock({
      choices: [{ message: { content: 'result code' } }],
    })
    vi.stubGlobal('fetch', mockFetch)

    await client.complete({
      messages: [{ role: 'user', content: 'test' }],
      signal: new AbortController().signal,
    })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect(init.headers.Authorization).toBe('Bearer sk-openai-test')
  })

  it('uses custom endpoint when configured', async () => {
    const customClient = new OpenAIClient({ ...config, endpoint: 'https://custom.openai.com/v1' })
    const mockFetch = makeFetchMock({
      choices: [{ message: { content: 'test' } }],
    })
    vi.stubGlobal('fetch', mockFetch)

    await customClient.complete({
      messages: [{ role: 'user', content: 'test' }],
      signal: new AbortController().signal,
    })

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://custom.openai.com/v1/chat/completions')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run test/unit/openai.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write the OpenAI client implementation**

```typescript
// src/models/openai.ts
import { ModelClient, ModelConfig, CompletionRequest, CompletionResponse } from './interface'

export class OpenAIClient implements ModelClient {
  readonly id = 'openai'
  private config: ModelConfig

  constructor(config: ModelConfig) {
    this.config = config
  }

  get endpoint(): string {
    return this.config.endpoint || 'https://api.openai.com/v1'
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const url = `${this.endpoint}/chat/completions`

    const body = {
      model: this.config.model || 'gpt-4o-mini',
      messages: req.messages,
      temperature: this.config.temperature ?? 0.2,
      max_tokens: this.config.maxTokens ?? 256,
      stream: false,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: req.signal,
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = (await response.json()) as any

    return {
      text: data.choices?.[0]?.message?.content ?? '',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
          }
        : undefined,
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/unit/openai.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/models/openai.ts test/unit/openai.test.ts
git commit -m "feat: add OpenAI model client"
```

---

### Task 10: Gemini Client

**Files:**
- Create: `src/models/gemini.ts`
- Create: `test/unit/gemini.test.ts`

**Interfaces:**
- Consumes: `ModelClient`, `ModelConfig`, `CompletionRequest`, `CompletionResponse` from `src/models/interface`
- Produces: `GeminiClient` class implementing `ModelClient`

- [ ] **Step 1: Write the failing test**

```typescript
// test/unit/gemini.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GeminiClient } from '../../src/models/gemini'
import { ModelConfig } from '../../src/models/interface'

const config: ModelConfig = {
  endpoint: 'https://generativelanguage.googleapis.com/v1beta',
  apiKey: 'gemini-test-key',
  model: 'gemini-2.0-flash',
  temperature: 0.2,
  maxTokens: 256,
}

function makeFetchMock(responseBody: object, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(responseBody),
  })
}

describe('GeminiClient', () => {
  let client: GeminiClient

  beforeEach(() => {
    client = new GeminiClient(config)
    vi.restoreAllMocks()
  })

  it('has id "gemini"', () => {
    expect(client.id).toBe('gemini')
  })

  it('sends POST to gemini generateContent endpoint', async () => {
    const mockFetch = makeFetchMock({
      candidates: [{ content: { parts: [{ text: 'result code' }], role: 'model' } }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
    })
    vi.stubGlobal('fetch', mockFetch)

    await client.complete({
      messages: [
        { role: 'system', content: 'You are a code assistant.' },
        { role: 'user', content: 'test prompt' },
      ],
      signal: new AbortController().signal,
    })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('gemini-2.0-flash:generateContent')
    expect(url).toContain('key=gemini-test-key')

    const body = JSON.parse(init.body)
    expect(body.contents).toBeDefined()
    expect(body.contents.length).toBeGreaterThan(0)
  })

  it('translates messages to gemini contents format', async () => {
    const mockFetch = makeFetchMock({
      candidates: [{ content: { parts: [{ text: 'completion text' }], role: 'model' } }],
    })
    vi.stubGlobal('fetch', mockFetch)

    const response = await client.complete({
      messages: [
        { role: 'system', content: 'system instruction' },
        { role: 'user', content: 'user message' },
      ],
      signal: new AbortController().signal,
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    // system message becomes first user content
    expect(body.contents[0].parts[0].text).toContain('system instruction')
    expect(body.contents[1].parts[0].text).toBe('user message')
    expect(body.generationConfig.temperature).toBe(0.2)
    expect(response.text).toBe('completion text')
    expect(response.usage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run test/unit/gemini.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write the Gemini client implementation**

```typescript
// src/models/gemini.ts
import { ModelClient, ModelConfig, CompletionRequest, CompletionResponse } from './interface'

export class GeminiClient implements ModelClient {
  readonly id = 'gemini'
  private config: ModelConfig

  constructor(config: ModelConfig) {
    this.config = config
  }

  get endpoint(): string {
    return (
      this.config.endpoint ||
      'https://generativelanguage.googleapis.com/v1beta'
    )
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const model = this.config.model || 'gemini-2.0-flash'
    const url = `${this.endpoint}/models/${model}:generateContent?key=${encodeURIComponent(this.config.apiKey)}`

    // Translate messages to Gemini contents format
    const contents = req.messages.map((m) => ({
      role: m.role === 'system' ? 'user' : m.role,
      parts: [{ text: m.role === 'system' ? `Instruction: ${m.content}` : m.content }],
    }))

    const body = {
      contents,
      generationConfig: {
        temperature: this.config.temperature ?? 0.2,
        maxOutputTokens: this.config.maxTokens ?? 256,
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: req.signal,
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = (await response.json()) as any

    return {
      text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount ?? 0,
            completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
          }
        : undefined,
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/unit/gemini.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/models/gemini.ts test/unit/gemini.test.ts
git commit -m "feat: add Gemini model client"
```

---

### Task 11: Model Registry

**Files:**
- Create: `src/models/registry.ts`
- Create: `test/unit/registry.test.ts`

**Interfaces:**
- Consumes: `ModelClient` from `src/models/interface`, `DeepTabConfig` from `src/config/settings`
- Produces: `createModelClient(config: DeepTabConfig): ModelClient`

- [ ] **Step 1: Write the failing test**

```typescript
// test/unit/registry.test.ts
import { describe, it, expect } from 'vitest'
import { createModelClient } from '../../src/models/registry'
import { DeepTabConfig } from '../../src/config/settings'

const baseConfig: DeepTabConfig = {
  apiKey: 'test-key',
  model: 'deepseek-chat',
  temperature: 0.2,
  maxTokens: 256,
}

describe('createModelClient', () => {
  it('returns DeepSeekClient for deepseek-chat', () => {
    const client = createModelClient(baseConfig)
    expect(client.id).toBe('deepseek')
  })

  it('returns OpenAIClient for gpt-4o-mini', () => {
    const client = createModelClient({ ...baseConfig, model: 'gpt-4o-mini' })
    expect(client.id).toBe('openai')
  })

  it('returns OpenAIClient for any gpt-prefixed model', () => {
    const client = createModelClient({ ...baseConfig, model: 'gpt-5-mini' })
    expect(client.id).toBe('openai')
  })

  it('returns GeminiClient for gemini-2.0-flash', () => {
    const client = createModelClient({ ...baseConfig, model: 'gemini-2.0-flash' })
    expect(client.id).toBe('gemini')
  })

  it('defaults to DeepSeekClient for unknown models', () => {
    const client = createModelClient({ ...baseConfig, model: 'unknown-model' })
    expect(client.id).toBe('deepseek')
  })

  it('passes custom endpoint to client', async () => {
    const client = createModelClient({
      ...baseConfig,
      model: 'gpt-4o-mini',
      endpoint: 'https://custom.api.com/v1',
    }) as any

    expect(client.endpoint).toBe('https://custom.api.com/v1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run test/unit/registry.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write the registry implementation**

```typescript
// src/models/registry.ts
import { ModelClient } from './interface'
import { DeepTabConfig } from '../config/settings'
import { DeepSeekClient } from './deepseek'
import { OpenAIClient } from './openai'
import { GeminiClient } from './gemini'

export function createModelClient(config: DeepTabConfig): ModelClient {
  const modelLower = config.model.toLowerCase()
  const modelConfig = {
    endpoint: config.endpoint || '',
    apiKey: config.apiKey,
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  }

  if (modelLower.startsWith('gemini')) {
    return new GeminiClient(modelConfig)
  }
  if (modelLower.startsWith('gpt') || modelLower.startsWith('o1') || modelLower.startsWith('o3')) {
    return new OpenAIClient(modelConfig)
  }
  return new DeepSeekClient(modelConfig)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/unit/registry.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/models/registry.ts test/unit/registry.test.ts
git commit -m "feat: add model registry for client resolution"
```

---

### Task 12: CompletionProvider

**Files:**
- Create: `src/providers/completion.ts`

**Interfaces:**
- Consumes: `InlineCompletionItemProvider` from vscode, `buildContext` from context, `createPromptGenerator` from prompt, `createModelClient` from registry, `loadConfig` from config, `createDebouncer` from utils
- Produces: `DeepTabCompletionProvider` class implementing `vscode.InlineCompletionItemProvider`

- [ ] **Step 1: Write the provider implementation**

```typescript
// src/providers/completion.ts
import * as vscode from 'vscode'
import { buildContext } from '../context/builder'
import { createPromptGenerator } from '../prompt/generator'
import { ModelClient } from '../models/interface'
import { createDebouncer } from '../utils/debounce'

const DEBOUNCE_MS = 300
const REQUEST_TIMEOUT_MS = 7500

export class DeepTabCompletionProvider implements vscode.InlineCompletionItemProvider {
  private debouncer = createDebouncer(DEBOUNCE_MS)
  private promptGenerator = createPromptGenerator()

  constructor(private getClient: () => ModelClient) {}

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.InlineCompletionItem[]> {
    // Empty prefix check — skip completion at file start
    const cursorLineStart = new vscode.Position(position.line, 0)
    const prefixRange = new vscode.Range(cursorLineStart, position)
    const prefixText = document.getText(prefixRange)
    if (prefixText.trim() === '' && position.line === 0) {
      return []
    }

    // Debounce: only the last call in a 300ms window proceeds
    const result = await this.debouncer.debounce(async () => {
      // Check cancellation before starting work
      if (token.isCancellationRequested) return null

      const ctx = buildContext(document, position)
      const messages = this.promptGenerator.generate(ctx)

      // Convert VSCode CancellationToken to AbortSignal
      const controller = new AbortController()
      const cancelListener = token.onCancellationRequested(() => {
        controller.abort()
      })
      cancelListener // reference kept for disposal

      // Timeout
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        const client = this.getClient()
        const response = await client.complete({
          messages,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.text.trim()) return null

        return response.text
      } catch (err: any) {
        clearTimeout(timeoutId)

        // AbortError (cancellation or timeout) — silent
        if (err?.name === 'AbortError' || controller.signal.aborted) {
          return null
        }

        // 401/403 — prompt user
        if (err?.message?.includes('401') || err?.message?.includes('403')) {
          vscode.window.showInformationMessage(
            'DeepTab: API Key rejected. Check your API key in settings or .env.',
          )
        }

        // All other errors (5xx, network) — silent
        return null
      }
    })

    if (!result) return []

    const item = new vscode.InlineCompletionItem(result)
    return [item]
  }
}
```

- [ ] **Step 2: Build to verify compilation**

```bash
npx vite build
```

Expected: builds successfully.

- [ ] **Step 3: Commit**

```bash
git add src/providers/completion.ts
git commit -m "feat: add CompletionProvider with debounce, cancel, and error handling"
```

---

### Task 13: Extension Entry Point

**Files:**
- Create: `src/extension.ts`

**Interfaces:**
- Consumes: all modules
- Produces: `activate(context)` and `deactivate()` exported for VSCode

- [ ] **Step 1: Write the extension entry point**

```typescript
// src/extension.ts
import * as vscode from 'vscode'
import { loadConfig, DeepTabConfig, clearConfigCache } from './config/settings'
import { createModelClient } from './models/registry'
import { ModelClient } from './models/interface'
import { DeepTabCompletionProvider } from './providers/completion'

let client: ModelClient | null = null
let configChangeListener: vscode.Disposable | null = null

function getOrCreateClient(): ModelClient {
  clearConfigCache()
  const config = loadConfig()

  if (!config.apiKey) {
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

    // Return a no-op client so the provider doesn't crash
    return {
      id: 'noop',
      async complete() {
        return { text: '' }
      },
    }
  }

  if (!client) {
    client = createModelClient(config)
  }
  return client
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new DeepTabCompletionProvider(() => getOrCreateClient())

  const disposable = vscode.languages.registerInlineCompletionItemProvider(
    { pattern: '**' },
    provider,
  )

  context.subscriptions.push(disposable)

  // Reload client when config changes
  configChangeListener = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('deeptab')) {
      client = null
    }
  })
  context.subscriptions.push(configChangeListener)
}

export function deactivate() {
  client = null
  if (configChangeListener) {
    configChangeListener.dispose()
  }
}
```

- [ ] **Step 2: Build to verify compilation**

```bash
npx vite build
```

Expected: builds `dist/extension.js` without errors.

- [ ] **Step 3: Commit**

```bash
git add src/extension.ts
git commit -m "feat: wire up extension entry point with provider registration"
```

---

### Task 14: Integration Test & Manual Verification

**Files:**
- Create: `test/integration/index.js`

**Interfaces:**
- Consumes: full extension build
- Produces: smoke test verifying extension activation

- [ ] **Step 1: Write the integration test**

```javascript
// test/integration/index.js
const vscode = require('vscode')

async function run() {
  console.log('=== DeepTab Integration Tests ===\n')

  // Test 1: Extension found and activates
  const ext = vscode.extensions.getExtension('deeptab.deeptab')
  if (!ext) {
    throw new Error('Extension not found. Check package.json publisher and name.')
  }
  await ext.activate()
  if (!ext.isActive) {
    throw new Error('Extension did not activate')
  }
  console.log('  PASS: Extension activates')

  // Test 2: Configuration defaults are accessible
  const config = vscode.workspace.getConfiguration('deeptab')
  const model = config.get('model')
  if (model !== 'deepseek-chat') {
    throw new Error(`Expected default model "deepseek-chat", got "${model}"`)
  }
  console.log(`  PASS: Default model is "${model}"`)

  // Test 3: Provider is registered
  // We can't directly test InlineCompletionItemProvider registration,
  // but if the extension activated without errors, it's registered.

  console.log('\nAll integration tests passed!')
}

module.exports = { run }
```

- [ ] **Step 2: Build and run full unit test suite**

```bash
npx vitest run
```

Expected: all unit tests PASS (~28 tests across all modules).

- [ ] **Step 3: Build the extension**

```bash
npx vite build
```

Expected: `dist/extension.js` generated without errors.

- [ ] **Step 4: Manual verification with F5**

In VSCode:
1. Press F5 (select "Run Extension" configuration)
2. In the Extension Development Host, open a `.ts` or `.js` file
3. Create a `.env` file with `DEEPTAB_API_KEY=your-real-key`
4. Type code and observe ghost text completions
5. Press Tab to accept, Esc to dismiss
6. Verify no popups on network errors (disconnect internet briefly and type)

- [ ] **Step 5: Run integration test**

In VSCode: press F5 with "Extension Tests" configuration selected.

Or via CLI (if `@vscode/test-electron` is configured, requires additional setup beyond MVP scope).

- [ ] **Step 6: Commit**

```bash
git add test/integration/
git commit -m "test: add integration smoke test"
```

---

## Summary

14 tasks, each 2-5 minutes of implementation effort. Total: 14 commits, ~28 unit tests, 1 integration test.

**Post-MVP next steps (NOT in this plan):**
- Stream completions (SSE) for better perceived latency
- Prompt cache to reduce API calls
- Project-level context with symbol index
- RAG for codebase-aware completions
- Multi-model routing
- Cost tracking dashboard
