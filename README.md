# DeepTab

Bring-your-own-key AI code completion for VS Code. Use your own API keys with DeepSeek, OpenAI, or Gemini for private, zero-cost-while-idle inline completions.

## Features

- **Ghost-text inline completions** — like Copilot, but with your own keys
- **Multi-provider** — DeepSeek, OpenAI (GPT-4o, o1, o3), and Gemini
- **Privacy-first** — your code goes directly to the model provider you choose, no intermediate server
- **Configurable** — model, temperature, max tokens, custom endpoints

## Setup

1. Get an API key from your preferred provider:
   - [DeepSeek](https://platform.deepseek.com/api_keys)
   - [OpenAI](https://platform.openai.com/api-keys)
   - [Google AI](https://aistudio.google.com/apikey)
2. Open VS Code settings and set `deeptab.apiKey`, or create a `.env` file with `DEEPTAB_API_KEY=your-key`
3. Optionally change `deeptab.model` (default: `deepseek-chat`)

## Configuration

| Setting | Default | Description |
|---|---|---|
| `deeptab.apiKey` | — | API key for your model provider |
| `deeptab.model` | `deepseek-chat` | Model ID (auto-detects provider) |
| `deeptab.endpoint` | — | Custom API endpoint override |
| `deeptab.temperature` | `0.2` | Model temperature (0–2) |
| `deeptab.maxTokens` | `256` | Max tokens per completion |

## Model Routing

DeepTab detects the provider from your model name:

- Starts with `gpt-`, `o1`, `o3` → OpenAI API
- Starts with `gemini` → Google Gemini API
- Everything else → DeepSeek API

## Requirements

- VS Code 1.85.0 or later

## License

MIT
