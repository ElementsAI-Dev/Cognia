# AI Integration Guide

Cognia provides comprehensive AI provider integration with support for 14+ providers, intelligent model routing, and advanced features like tool calling and vision capabilities.

## Supported Providers

### Cloud Providers

#### OpenAI

- **Models**: GPT-4o, GPT-4o Mini, o1, o1 Mini
- **Features**: Tool calling, vision support, streaming
- **Pricing** (per 1M tokens):
  - GPT-4o: $2.50 input / $10.00 output
  - GPT-4o Mini: $0.15 input / $0.60 output
  - o1: $15.00 input / $60.00 output
- **Context Length**: Up to 200K tokens (o1)
- **API Key**: Get from [platform.openai.com](https://platform.openai.com/api-keys)

#### Anthropic

- **Models**: Claude Sonnet 4, Claude Opus 4, Claude 3.5 Haiku
- **Features**: Tool calling, vision support, streaming
- **Pricing** (per 1M tokens):
  - Claude Sonnet 4: $3.00 input / $15.00 output
  - Claude Opus 4: $15.00 input / $75.00 output
  - Claude 3.5 Haiku: $0.80 input / $4.00 output
- **Context Length**: Up to 200K tokens
- **API Key**: Get from [console.anthropic.com](https://console.anthropic.com/settings/keys)

#### Google AI

- **Models**: Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash
- **Features**: Tool calling, vision support, streaming
- **Pricing** (per 1M tokens):
  - Gemini 2.0 Flash: Free (during preview)
  - Gemini 1.5 Pro: $1.25 input / $5.00 output
  - Gemini 1.5 Flash: $0.075 input / $0.30 output
- **Context Length**: Up to 2M tokens (Gemini 1.5 Pro)
- **API Key**: Get from [aistudio.google.com](https://aistudio.google.com/apikey)

#### DeepSeek

- **Models**: DeepSeek Chat, DeepSeek Reasoner
- **Features**: Tool calling (Chat only), streaming
- **Pricing** (per 1M tokens):
  - DeepSeek Chat: $0.14 input / $0.28 output
  - DeepSeek Reasoner: $0.55 input / $2.19 output
- **Context Length**: 64K tokens
- **API Key**: Get from [platform.deepseek.com](https://platform.deepseek.com/api_keys)

#### Groq

- **Models**: Llama 3.3 70B, Mixtral 8x7B
- **Features**: Tool calling, ultra-fast inference, streaming
- **Pricing** (per 1M tokens):
  - Llama 3.3 70B: $0.59 input / $0.79 output
  - Mixtral 8x7B: $0.24 input / $0.24 output
- **Context Length**: Up to 128K tokens
- **API Key**: Get from [console.groq.com](https://console.groq.com/keys)

#### Mistral AI

- **Models**: Mistral Large, Mistral Small
- **Features**: Tool calling, streaming
- **Pricing** (per 1M tokens):
  - Mistral Large: $2.00 input / $6.00 output
  - Mistral Small: $0.20 input / $0.60 output
- **Context Length**: Up to 128K tokens
- **API Key**: Get from [console.mistral.ai](https://console.mistral.ai/api-keys)

#### xAI (Grok)

- **Models**: Grok 3, Grok 3 Mini
- **Features**: Tool calling, vision support (Grok 3), streaming
- **Pricing** (per 1M tokens):
  - Grok 3: $3.00 input / $15.00 output
  - Grok 3 Mini: $0.30 input / $0.50 output
- **Context Length**: 131K tokens
- **API Key**: Get from [x.ai](https://x.ai/api)

#### Together AI

- **Models**: Llama 3.3 70B Turbo, Qwen 2.5 72B Turbo, DeepSeek V3
- **Features**: Tool calling, streaming
- **Pricing** (per 1M tokens): Starting at $0.50-$1.20
- **Context Length**: Up to 131K tokens
- **API Key**: Get from [api.together.xyz](https://api.together.xyz/settings/api-keys)

#### OpenRouter

- **Models**: Access to 200+ models including Claude, GPT-4o, Gemini Flash (free)
- **Features**: OAuth login, tool calling, vision support, streaming
- **Pricing**: Varies by model (some free options available)
- **Context Length**: Varies by model
- **API Key**: Get from [openrouter.ai/keys](https://openrouter.ai/keys)

#### Cohere

- **Models**: Command R+, Command R, Command A
- **Features**: Tool calling, streaming
- **Pricing** (per 1M tokens):
  - Command R+: $2.50 input / $10.00 output
  - Command R: $0.15 input / $0.60 output
- **Context Length**: Up to 256K tokens
- **API Key**: Get from [dashboard.cohere.com](https://dashboard.cohere.com/api-keys)

#### Fireworks AI

- **Models**: Llama 3.3 70B, Qwen 2.5 72B, DeepSeek V3
- **Features**: Tool calling, streaming
- **Pricing** (per 1M tokens): $0.90
- **Context Length**: Up to 131K tokens
- **API Key**: Get from [fireworks.ai](https://fireworks.ai/account/api-keys)

#### Cerebras

- **Models**: Llama 3.3 70B, Llama 3.1 8B
- **Features**: Fastest inference, streaming
- **Pricing** (per 1M tokens):
  - Llama 3.3 70B: $0.85 input / $1.20 output
  - Llama 3.1 8B: $0.10 input / $0.10 output
- **Context Length**: 8K tokens
- **API Key**: Get from [cloud.cerebras.ai](https://cloud.cerebras.ai/platform)

#### SambaNova

- **Models**: Llama 3.3 70B, DeepSeek R1 Distill 70B, Qwen 2.5 72B
- **Features**: Tool calling, streaming, free tier available
- **Pricing**: Free tier available
- **Context Length**: 8K tokens
- **API Key**: Get from [cloud.sambanova.ai](https://cloud.sambanova.ai/apis)

### Local Providers

#### Ollama

- **Models**: Llama 3.2, Qwen 2.5, Mistral, and more
- **Features**: Tool calling, streaming, completely local
- **Context Length**: Varies by model
- **Setup**:
  1. Install Ollama from [ollama.com](https://ollama.com)
  2. Start Ollama service (runs on `http://localhost:11434`)
  3. Pull models: `ollama pull llama3.2`
  4. No API key required

## Provider Configuration

### Adding a Provider

1. Navigate to **Settings** > **Providers**
2. Find the provider you want to configure
3. Click **Edit** or the provider card
4. Enter your API key
5. Select a default model
6. Enable the provider (toggle switch)
7. Click **Save**

### Multi-API Key Support

Cognia supports multiple API keys per provider with automatic rotation:

1. Go to **Settings** > **Providers**
2. Select a provider
3. Under **API Keys**, click **Add Key**
4. Enter additional API keys
5. Enable **API Key Rotation**
6. Choose rotation strategy:
   - **Round Robin**: Cycle through keys sequentially
   - **Random**: Select random key for each request
   - **Least Used**: Select key with lowest usage count

### Custom Providers

Add custom OpenAI-compatible providers:

1. Go to **Settings** > **Providers**
2. Click **Add Custom Provider**
3. Configure:
   - **Name**: Display name
   - **Base URL**: API endpoint URL
   - **API Key**: Your API key
   - **Models**: Comma-separated model IDs
   - **Default Model**: Primary model to use

## Auto-Router System

The Auto-Router intelligently selects models based on task complexity, available providers, and specific requirements.

### How It Works

1. **Task Classification**: Analyzes your input to determine:
   - Complexity level (simple, moderate, complex)
   - Reasoning requirements
   - Tool requirements
   - Vision requirements
   - Estimated token count

2. **Tier Selection**: Routes to appropriate tier:
   - **Fast Tier**: Quick responses for simple tasks
   - **Balanced Tier**: General-purpose tasks
   - **Powerful Tier**: Complex reasoning tasks

3. **Model Selection**: Chooses best available model from tier

### Fast Tier Models

Best for: Quick questions, definitions, translations, summaries

- Groq Llama 3.3 70B
- Google Gemini 2.0 Flash
- OpenAI GPT-4o Mini
- Anthropic Claude 3.5 Haiku
- DeepSeek Chat
- Mistral Small

### Balanced Tier Models

Best for: General chat, explanations, standard tasks

- Google Gemini 1.5 Pro
- OpenAI GPT-4o
- Anthropic Claude Sonnet 4
- Mistral Large

### Powerful Tier Models

Best for: Complex reasoning, debugging, architecture design, analysis

- Anthropic Claude Opus 4
- OpenAI o1
- DeepSeek Reasoner

### Using Auto Mode

1. Click the model selector in the chat header
2. Select **Auto** from the provider list
3. The Auto-Router will automatically select the best model for each query
4. Hover over the "Auto" badge to see why a specific model was chosen

### Task Detection Patterns

The Auto-Router recognizes these patterns:

**Complex Tasks**:

- "Write code", "implement", "create function"
- "Analyze data", "research", "investigate"
- "Explain in detail", "comprehensive"
- "Multi-step", "step by step"
- "Debug", "fix bug", "troubleshoot"

**Reasoning Tasks**:

- "Why", "how does", "explain reasoning"
- "Prove", "derive", "calculate"
- "Logic", "mathematical", "theorem"
- "Think through", "reason about"

**Simple Tasks**:

- "What is", "define", "meaning of"
- "Translate", "convert"
- "Summarize", "brief"
- "Yes or no", "true or false"

## Model Selection Guide

### Choosing the Right Model

#### For Coding

- **Recommended**: Claude Sonnet 4, GPT-4o, DeepSeek Chat
- **Why**: Strong code generation, good explanations
- **Use when**: Writing, debugging, or refactoring code

#### For Writing & Creativity

- **Recommended**: GPT-4o, Claude Sonnet 4, Gemini 1.5 Pro
- **Why**: Creative language capabilities, diverse styles
- **Use when**: Writing articles, stories, marketing copy

#### For Analysis & Research

- **Recommended**: Claude Opus 4, o1, DeepSeek Reasoner
- **Why**: Deep reasoning, systematic analysis
- **Use when**: Complex problems, data analysis, research

#### For Speed & Cost Efficiency

- **Recommended**: Gemini 2.0 Flash, GPT-4o Mini, Groq Llama 3.3
- **Why**: Fast responses, low cost
- **Use when**: Simple queries, quick answers

#### For Vision/Image Tasks

- **Recommended**: GPT-4o, Claude Sonnet 4, Gemini 1.5 Pro
- **Why**: Strong multimodal understanding
- **Use when**: Analyzing images, screenshots, diagrams

### Model Comparison Table

| Model | Context | Tools | Vision | Speed | Cost | Best For |
|-------|---------|-------|--------|-------|------|----------|
| GPT-4o | 128K | Yes | Yes | Fast | Medium | General purpose |
| GPT-4o Mini | 128K | Yes | Yes | Very Fast | Low | Quick tasks |
| o1 | 200K | No | Yes | Slow | High | Complex reasoning |
| Claude Sonnet 4 | 200K | Yes | Yes | Fast | Medium | Coding, analysis |
| Claude Opus 4 | 200K | Yes | Yes | Medium | High | Deep reasoning |
| Gemini 2.0 Flash | 1M | Yes | Yes | Very Fast | Free | General use |
| Gemini 1.5 Pro | 2M | Yes | Yes | Fast | Low | Long contexts |
| DeepSeek Chat | 64K | Yes | No | Fast | Low | Coding |
| DeepSeek Reasoner | 64K | No | No | Slow | Low | Reasoning |
| Groq Llama 3.3 | 128K | Yes | No | Very Fast | Low | Speed |

## Streaming Responses

### Enable Streaming

1. Go to **Settings** > **Chat Behavior**
2. Enable **Stream Responses**
3. Responses will appear in real-time as they're generated

### Benefits

- Faster perceived response time
- Early access to partial answers
- Better user experience for long responses
- Lower perceived latency

All providers support streaming in Cognia.

## Tool Calling Support

Tool calling allows AI models to interact with external services and APIs.

### Supported Tools

- **Web Search**: Tavily, Brave Search, Google Search
- **File Operations**: Read/write local files (via MCP)
- **Code Execution**: Run Python code
- **RAG Search**: Search knowledge bases
- **Calculator**: Mathematical computations
- **MCP Tools**: Custom tools from MCP servers

### Enabling Tools

1. Go to **Settings** > **Tools**
2. Toggle tools you want to enable:
   - **Web Search**: Enable online search capabilities
   - **File Tools**: Access local filesystem (requires MCP)
   - **Document Tools**: Process uploaded documents
   - **Code Execution**: Run code snippets
   - **RAG Search**: Search uploaded knowledge bases
   - **Calculator**: Enable math calculations

### Tool-Calling Models

Not all models support tool calling:

| Provider | Models with Tool Support |
|----------|-------------------------|
| OpenAI | GPT-4o, GPT-4o Mini |
| Anthropic | Claude Sonnet 4, Claude Opus 4, Haiku |
| Google | All Gemini models |
| DeepSeek | DeepSeek Chat (not Reasoner) |
| Groq | All models |
| Mistral | All models |
| xAI | Grok 3, Grok 3 Mini |

The Auto-Router automatically filters out non-tool-capable models when tools are required.

## Vision and Image Support

### Supported Models

Vision capabilities allow models to analyze and understand images.

| Provider | Vision Models |
|----------|--------------|
| OpenAI | GPT-4o, GPT-4o Mini, o1 |
| Anthropic | Claude Sonnet 4, Claude Opus 4, Haiku |
| Google | Gemini 2.0 Flash, Gemini 1.5 Pro/Flash |
| xAI | Grok 3 (not Grok 3 Mini) |

### Using Vision

1. Upload an image using the attachment button or drag-and-drop
2. Ask questions about the image:
   - "What's in this screenshot?"
   - "Explain this diagram"
   - "Transcribe the text from this image"
   - "Analyze this chart"

### Supported Image Formats

- PNG
- JPEG/JPG
- GIF
- WebP
- BMP

## Advanced Features

### Custom Instructions

Set global instructions that apply to all conversations:

1. Go to **Settings** > **Custom Instructions**
2. Add your instructions:
   - **Custom Instructions**: Global prompts for all chats
   - **About User**: Information about yourself
   - **Response Preferences**: How you want responses formatted
3. Enable **Apply Custom Instructions**

### Temperature Control

Adjust randomness in responses:

- **0.0-0.3**: Deterministic, focused responses
- **0.4-0.7**: Balanced creativity and focus
- **0.8-1.0**: Highly creative, diverse responses
- **1.1-2.0**: Very random, experimental

Set in **Settings** > **Chat Behavior** > **Default Temperature**

### Context Length

Control how many previous messages are included:

- **5-10**: Short conversations
- **10-20**: Standard conversations (default)
- **20-50**: Long, detailed conversations
- **50+**: Extended context, higher cost

Set in **Settings** > **Chat Behavior** > **Context Length**

## API Key Security

- Keys are stored in localStorage (browser app) or config file (desktop app)
- Keys are transmitted directly to provider APIs
- Keys are never sent to Cognia servers
- For production use, consider using environment variables or secret management

### Best Practices

1. Rotate API keys regularly
2. Use separate keys for development/production
3. Monitor usage via provider dashboards
4. Set spending limits on provider accounts
5. Use least-privilege keys when possible

## Troubleshooting

### Common Issues

**"API Key Invalid" Error**

- Verify API key is correct
- Check key hasn't been revoked
- Ensure key has required permissions

**Rate Limit Errors**

- Switch to a different provider/model
- Enable API key rotation
- Reduce request frequency

**Model Not Available**

- Check provider account status
- Verify model access tier
- Try alternative model

**Slow Responses**

- Switch to faster tier models
- Check internet connection
- Reduce context length

### Checking Provider Status

View provider health and availability in **Settings** > **Providers**:

- Green indicator: Healthy
- Yellow indicator: Degraded
- Red indicator: Error

### Usage Tracking

Monitor token usage and costs in **Settings** > **Usage**:

- Total tokens by provider
- Cost estimates
- Request counts
- Error rates

## Best Practices

1. **Start with Auto Mode**: Let the Auto-Router select models
2. **Use Fast Tier for Simple Tasks**: Save money and get faster responses
3. **Use Powerful Tier for Complex Tasks**: Better reasoning for difficult problems
4. **Enable Streaming**: Better user experience
5. **Monitor Usage**: Track costs in settings
6. **Set Temperature Appropriately**: Lower for code, higher for creative tasks
7. **Use Vision Models When Needed**: Only for image analysis tasks
8. **Leverage Tool Calling**: Enable tools for enhanced capabilities
