# DeepTab

## 1. 产品概述

### 产品名称
**DeepTab**

### 产品定位
一个 VSCode 智能代码补全插件。允许开发者使用自己的 API Key，通过 DeepSeek、OpenAI、Gemini 等模型获得 Cursor 风格的 Tab 补全能力。

### 愿景
让开发者不再依赖 Cursor Pro 或 GitHub Copilot，而是使用：

- 自己的 API Key
- 自己的模型选择
- 自己的补全策略

---

## 2. 用户画像

### 核心用户

| 类型 | 特点 | 需求 |
|------|------|------|
| **学生开发者** | 没有 Cursor Pro，有 DeepSeek API | 低成本代码补全 |
| **独立开发者** | 使用多个模型 | 补全用 DeepSeek，聊天用 Claude，Agent 用 Gemini |
| **AI 工程师** | 关注成本（Claude $15/1M token vs DeepSeek $0.3/1M token） | 补全走便宜模型 |

---

## 3. MVP 功能

### F1 自动补全
输入代码时自动生成灰色幽灵文本，Tab 接受，Esc 取消。

**验收标准：**
- 延迟 < 800ms
- 支持 Tab 接受
- 支持 Esc 取消

### F2 API Key 配置
```json
{ "deeptab.apiKey": "xxx" }
```
首次安装弹窗引导。

### F3 模型选择
```json
{ "deeptab.model": "deepseek-chat" }
```
支持 DeepSeek V4、GPT-5 Mini、Gemini Flash。

### F4 上下文感知
发送当前文件 + 光标前 200 行 + 光标后 50 行给模型。

---

## 4. V2 功能

### F5 流式补全
从"等待 → 整段返回"升级为"逐字出现"（类似 Cursor）。

### F6 多语言支持
Python / Java / C++ / Go / Rust / JavaScript / TypeScript

### F7 Prompt Cache
缓存文件 Hash + 光标位置，减少 API 调用。

---

## 5. V3 功能

### F8 项目级上下文
扫描 `src/`，构建 Symbol Index，补全时自动引用定义位置。

### F9 RAG
建立项目向量库，补全时检索相关代码。

---

## 6. V4 功能

### F10 多模型路由
```yaml
autocomplete:
  model: deepseek-v4
complex_completion:
  model: gpt-5-mini
```
路由规则：context < 500 行走 DeepSeek，> 4000 行走 GPT-5。

### F11 成本统计
显示每日补全请求数、Token 消耗、成本。

---

## 7. 非功能需求

### 性能
- 首字延迟 < 500ms
- 完整响应 < 2s

### 兼容性
VSCode Stable / VSCode Insiders / VSCodium

---

## 8. 技术架构

```
VSCode Extension
├── Completion Provider
├── Context Builder
├── Prompt Generator
├── Model Router
└── API Client
         ↓
   DeepSeek / OpenAI / Gemini
```

---

## 9. 开发计划

| 阶段 | 内容 | 成果 |
|------|------|------|
| **Week 1** | VSCode Extension、InlineCompletionProvider、DeepSeek API、Tab 接受补全 | 能像 Cursor 一样补全 |
| **Week 2** | Streaming、Cache、多语言支持 | 体验接近 Continue |
| **Week 3-4** | Project Context、RAG、成本统计 | 简历级项目 |
