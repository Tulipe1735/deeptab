# DeepTab MVP 技术设计

## 概述

DeepTab 是一个 VSCode 智能代码补全插件，允许开发者使用自己的 API Key 调用 DeepSeek、OpenAI、Gemini 等模型。MVP 聚焦技术链路验证——用最少的代码把补全跑通，后续迭代再打磨体验。

## 选型决策

| 维度 | 选择 | 理由 |
|------|------|------|
| 目标 | 技术验证 | 先把链路跑通 |
| 模型层 | 抽象 ModelClient 接口 | 各 Provider 独立实现，加模型只需一个文件 |
| 补全渲染 | VSCode 原生 InlineCompletionItemProvider | 开发量最小，幽灵文本/Tab/Esc 开箱即用 |
| 上下文 | 当前文件 + 光标前 200 行 + 光标后 50 行 | PRD 原始方案 |
| 构建 | Vite | 构建快，HMR 开发体验好 |
| 测试 | 完整测试（单元 + 集成） | 从第一天覆盖核心逻辑 |
| 配置 | .env > settings.json | 不用 SecretStorage |

## 架构：方案 B 分层架构

```
extension.ts              ← 注册入口，组装依赖
    │
src/
├── providers/
│   └── completion.ts     ← InlineCompletionItemProvider 实现
├── context/
│   └── builder.ts        ← 读取编辑器上下文（前200行+后50行）
├── prompt/
│   └── generator.ts      ← 上下文 → messages[] 转换
├── models/
│   ├── interface.ts      ← ModelClient 接口定义
│   ├── deepseek.ts       ← DeepSeek 实现
│   ├── openai.ts         ← OpenAI 实现
│   └── gemini.ts         ← Gemini 实现
├── config/
│   └── settings.ts       ← 读取配置（.env > settings.json）
└── utils/
    └── ...               ← 防抖、日志等
```

每层有明确接口，依赖方向单一（Provider → Context → Prompt → Model），每层可独立单测。

## 数据流

```
VSCode API 触发
    │
    ▼
CompletionProvider.provideInlineCompletionItems(document, position, token)
    │
    ├── ContextBuilder.build(document, position) → { prefix, suffix, filePath, language }
    ├── PromptGenerator.generate(context)        → messages[]
    ├── Config.getModel(id)                      → ModelClient
    └── ModelClient.complete(messages, signal)   → string
    │
    ▼
VSCode 渲染幽灵文本
```

1. VSCode 触发补全
2. Provider 调 ContextBuilder 读取上下文
3. Provider 调 PromptGenerator 构建 messages
4. Provider 从 Config 拿到当前 ModelClient，发起请求
5. 返回字符串包装成 InlineCompletionItem
6. VSCode 渲染幽灵文本，Tab 接受 / Esc 取消

### 硬约束

- provideInlineCompletionItems 必须在 800ms 内返回，超时 VSCode 丢弃结果
- CancellationToken 必须传递到 ModelClient，用户移动光标时取消飞行中的请求
- ModelClient 不做提示词工程，提示词是 PromptGenerator 的事

## ModelClient 接口

```typescript
export interface ModelConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionRequest {
  messages: Array<{ role: string; content: string }>;
  signal: AbortSignal;
}

export interface CompletionResponse {
  text: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface ModelClient {
  readonly id: string;
  complete(req: CompletionRequest): Promise<CompletionResponse>;
}
```

- id + complete，极简接口
- signal 必传，用于取消
- messages 数组，预留 system message 和多轮对话
- usage 可选，为 V2 成本统计预留

### 默认 endpoint / model

| Provider | endpoint | model |
|----------|----------|-------|
| DeepSeek | https://api.deepseek.com/v1 | deepseek-chat |
| OpenAI | https://api.openai.com/v1 | gpt-4o-mini |
| Gemini | https://generativelanguage.googleapis.com/v1beta | gemini-2.0-flash |

用户可通过 settings 覆盖 endpoint 和 model。

## Config & Settings

```typescript
export interface DeepTabConfig {
  apiKey: string;
  model: string;
  endpoint?: string;
  temperature?: number;
  maxTokens?: number;
}
```

读取优先级：.env (DEEPTAB_API_KEY) > settings.json (deeptab.apiKey) > 弹窗引导。

- dotenv 读 .env，值缓存在内存里
- package.json contributes 注册配置项
- 首次未配置 apiKey 时弹窗引导

## Context Builder

```typescript
export interface CompletionContext {
  prefix: string;   // 光标前至多 200 行
  suffix: string;   // 光标后至多 50 行
  filePath: string;
  language: string;
}
```

- 以换行符分行，两端都包含光标所在行
- prefix 为空（文件开头）时跳过补全，不调 API

## Prompt Generator

```typescript
export interface PromptGenerator {
  generate(ctx: CompletionContext): Array<{ role: string; content: string }>;
}
```

- system message: "You are a code completion assistant. Output only code."
- Fill-in-the-Middle: prefix + <FILL_HOLE> + suffix
- 不支持 FIM 的模型降级为只发 prefix
- 总字符数超过上下文窗口 60% 时从 prefix 头部裁剪

## CompletionProvider

### 防抖

300ms 防抖——连续按键只发最后一次请求。

### 取消

- CancellationToken → AbortSignal 传入 ModelClient
- AbortError 静默吞掉
- 防抖期间被覆盖的请求直接废弃，不调 API

### 错误处理

| 错误类型 | 行为 |
|----------|------|
| 超时（>7500ms） | 静默，不返回补全 |
| 5xx | 静默 |
| 4xx（401/403） | 弹窗提示检查 API Key |
| 网络错误 | 静默 |
| 空内容 | 不返回补全 |

核心原则：宁可静默少补，不要弹窗骚扰。

## 测试策略

| 层 | 类型 | 工具 |
|---|---|---|
| ModelClient | 单元（FakeModelClient） | vitest |
| ContextBuilder | 单元（mock TextDocument） | vitest |
| PromptGenerator | 单元（固定输入断言输出） | vitest |
| Config | 单元（mock workspace + dotenv） | vitest |
| CompletionProvider | 集成（@vscode/test-electron） | vitest + @vscode/test-electron |
| E2E | 手动冒烟 | F5 启动验证 |

### FakeModelClient

```typescript
class FakeModelClient implements ModelClient {
  id = "fake";
  private handler: (req: CompletionRequest) => CompletionResponse;
  complete(req: CompletionRequest): Promise<CompletionResponse> {
    if (req.signal?.aborted) throw new DOMException("aborted", "AbortError");
    return Promise.resolve(this.handler(req));
  }
}
```

## 项目文件树

```
deeptab/
├── .vscode/
│   ├── launch.json
│   └── tasks.json
├── src/
│   ├── extension.ts
│   ├── providers/
│   │   └── completion.ts
│   ├── context/
│   │   └── builder.ts
│   ├── prompt/
│   │   └── generator.ts
│   ├── models/
│   │   ├── interface.ts
│   │   ├── deepseek.ts
│   │   ├── openai.ts
│   │   └── gemini.ts
│   ├── config/
│   │   └── settings.ts
│   └── utils/
│       └── ...
├── test/
│   ├── unit/
│   │   ├── context.test.ts
│   │   ├── prompt.test.ts
│   │   ├── models.test.ts
│   │   └── config.test.ts
│   └── integration/
│       └── completion.test.ts
├── package.json
├── vite.config.ts
├── tsconfig.json
├── vitest.config.ts
├── .env.example
└── PRD.md
```
