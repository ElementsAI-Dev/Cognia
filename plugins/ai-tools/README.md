# AI Tools Plugin

AI model pricing scraper, provider status monitoring, and rankings tools for Cognia.

## Features

### 🔧 Agent Tools

| Tool | Description |
|------|-------------|
| `ai_pricing_scraper` | Scrape AI model pricing from various providers (OpenAI, Anthropic, DeepSeek, etc.) |
| `provider_status_checker` | Check health and availability status of AI providers |
| `openrouter_rankings` | Get model rankings and usage statistics from OpenRouter |
| `lmarena_leaderboard` | Get LMArena (Chatbot Arena) model leaderboard and ELO ratings |

### 📋 Commands

- **Scrape AI Pricing** - Scrape pricing data from AI providers
- **Check Provider Status** - Check health status of AI providers
- **View OpenRouter Rankings** - View model rankings from OpenRouter
- **View LMArena Leaderboard** - View LMArena chatbot arena leaderboard
- **Clear AI Tools Cache** - Clear cached data

## Supported Providers

### Pricing Scraper

**US Providers:**
- OpenAI, Anthropic, Google AI, Mistral AI, Cohere, Groq, Together AI, Fireworks AI

**CN Providers:**
- DeepSeek, Zhipu (智谱), Moonshot (月之暗面), Baichuan (百川), Qwen (通义千问), MiniMax, SiliconFlow

### Status Checker

**US Providers:**
- OpenAI, Anthropic, Google AI, Mistral AI, Cohere, Groq, Together AI

**CN Providers:**
- DeepSeek, Zhipu, Moonshot, Qwen (DashScope)

## Installation

```bash
# From the project root
cd plugins/ai-tools
pnpm install
pnpm build
```

## Usage

### As Agent Tools

The tools are automatically available to the AI agent when the plugin is activated:

```
User: What are the current pricing rates for DeepSeek models?
Agent: [Uses ai_pricing_scraper tool with provider: "deepseek"]

User: Is OpenAI's API working right now?
Agent: [Uses provider_status_checker tool with provider: "openai"]

User: What are the top models on OpenRouter this week?
Agent: [Uses openrouter_rankings tool with timeRange: "week"]

User: Show me the LMArena leaderboard for coding
Agent: [Uses lmarena_leaderboard tool with category: "coding"]
```

### Tool Parameters

#### ai_pricing_scraper

```typescript
{
  provider?: string;    // Provider ID (e.g., "openai", "deepseek")
  region?: 'US' | 'CN'; // Filter by region
  all?: boolean;        // Scrape all providers
  export?: 'json' | 'csv'; // Export format
}
```

#### provider_status_checker

```typescript
{
  provider?: string;           // Provider ID
  region?: 'US' | 'CN' | 'EU'; // Filter by region
  timeout?: number;            // Request timeout in ms
}
```

#### openrouter_rankings

```typescript
{
  timeRange?: 'week' | 'month' | 'all'; // Time range
  export?: 'json' | 'csv' | 'html' | 'markdown'; // Export format
}
```

#### lmarena_leaderboard

```typescript
{
  category?: LeaderboardCategory; // Specific category
  includeHistory?: boolean;       // Include historical data
  max?: number;                   // Max models to return
}
```

**Available Categories:**
- `overall`, `overall_style_control`, `coding`, `hard_prompt`, `math`
- `creative_writing`, `if_eval`, `long_user`
- `english`, `chinese`, `japanese`, `korean`, `spanish`, `french`, `german`, `portuguese`, `russian`

## Configuration

The plugin can be configured via the manifest:

```json
{
  "config": {
    "defaultOutputDir": "ai-tools-output",
    "defaultTimeout": 30000,
    "headlessMode": true,
    "enableScreenshots": false,
    "cacheExpiry": 3600000
  }
}
```

## Data Sources

| Tool | Source |
|------|--------|
| Pricing | Provider official pricing pages (web scraping) |
| Status | Provider API endpoints (health checks) |
| Rankings | https://openrouter.ai/rankings |
| LMArena | https://github.com/nakasyou/lmarena-history, https://github.com/lmarena/arena-catalog |

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test

# Lint
pnpm lint
```

## Architecture

```
plugins/ai-tools/
├── manifest.json       # Plugin manifest
├── package.json        # Package configuration
├── tsconfig.json       # TypeScript configuration
└── src/
    ├── index.ts        # Plugin entry point
    ├── types/          # Type definitions
    │   └── index.ts
    ├── tools/          # Agent tools
    │   ├── pricing.ts
    │   ├── status.ts
    │   ├── rankings.ts
    │   └── lmarena.ts
    ├── commands/       # Command palette commands
    │   └── index.ts
    └── utils/          # Shared utilities
        ├── providers.ts
        └── output.ts
```

## License

MIT
