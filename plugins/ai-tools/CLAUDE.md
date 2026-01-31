# AI Tools Plugin

## Overview

This plugin provides AI model-related tools as agent-callable functions:

- **ai_pricing_scraper** - Scrapes pricing from 15+ AI providers (US & CN)
- **provider_status_checker** - Checks health/availability of AI APIs
- **openrouter_rankings** - Fetches model rankings from OpenRouter
- **lmarena_leaderboard** - Fetches ELO rankings from LMArena/Chatbot Arena

## Directory Structure

```
plugins/ai-tools/
├── manifest.json       # Plugin manifest
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
└── src/
    ├── index.ts        # Plugin entry (definePlugin)
    ├── types/          # Shared type definitions
    ├── tools/          # Tool implementations
    │   ├── pricing.ts  # ai_pricing_scraper
    │   ├── status.ts   # provider_status_checker
    │   ├── rankings.ts # openrouter_rankings
    │   └── lmarena.ts  # lmarena_leaderboard
    ├── commands/       # Command palette commands
    └── utils/          # Provider registry, output helpers
```

## Key Dependencies

- `@cognia/plugin-sdk` - Plugin SDK with tool(), definePlugin(), context APIs
- `playwright` - Browser automation for web scraping

## Development

```bash
cd plugins/ai-tools
pnpm install
pnpm build
```

## Tool Parameters

### ai_pricing_scraper
- `provider?: string` - Provider ID (openai, anthropic, deepseek, etc.)
- `region?: 'US' | 'CN'` - Filter by region
- `all?: boolean` - Scrape all providers

### provider_status_checker
- `provider?: string` - Provider ID
- `region?: 'US' | 'CN' | 'EU'` - Filter by region
- `timeout?: number` - Request timeout ms

### openrouter_rankings
- `timeRange?: 'week' | 'month' | 'all'` - Time period

### lmarena_leaderboard
- `category?: string` - Leaderboard category (overall, coding, math, etc.)
- `max?: number` - Max results per category

## Notes

- All tools use caching with configurable expiry
- Browser-based scraping requires headless Chromium
- Status checks work without browser (HTTP requests only)
- LMArena uses GitHub-hosted JSON data (no scraping needed)
