# LMArena Leaderboard Scraper

Scrapes model rankings from [LMArena](https://lmarena.ai) (Chatbot Arena) leaderboard.

## Data Sources

| Source | Type | Description |
|--------|------|-------------|
| [nakasyou/lmarena-history](https://github.com/nakasyou/lmarena-history) | JSON | Daily updated ELO scores (primary) |
| [lmarena/arena-catalog](https://github.com/lmarena/arena-catalog) | JSON | Model metadata & pricing |
| [HuggingFace](https://huggingface.co/spaces/lmarena-ai/chatbot-arena-leaderboard) | Pickle | Original source (requires Python) |

## Usage

### CLI

```bash
# Scrape latest leaderboard
npx tsx tools/lmarena/cli.ts scrape

# Include historical data
npx tsx tools/lmarena/cli.ts scrape --history

# Show cached data
npx tsx tools/lmarena/cli.ts show
npx tsx tools/lmarena/cli.ts show --category coding

# Export to various formats
npx tsx tools/lmarena/cli.ts export --csv
npx tsx tools/lmarena/cli.ts render --html > leaderboard.html
npx tsx tools/lmarena/cli.ts render --markdown > leaderboard.md

# List HuggingFace pickle files
npx tsx tools/lmarena/cli.ts files
```

### Programmatic

```typescript
import { scrapeLMArena, renderLeaderboard } from './tools/lmarena'

// Scrape latest data
const result = await scrapeLMArena({
  includeHistory: true,
  includeMetadata: true,
})

if (result.success) {
  // Render as markdown
  const md = renderLeaderboard(result.data, { format: 'markdown' })
  console.log(md)

  // Access raw data
  const overallLeaderboard = result.data.text.overall
  console.log(`Top model: ${overallLeaderboard.entries[0].modelName}`)
}
```

## Categories

- `overall` - Overall rankings (default)
- `overall_style_control` - Style-controlled rankings
- `coding` - Coding tasks
- `math` - Math problems
- `hard_prompt` - Difficult prompts
- `creative_writing` - Creative writing
- `if_eval` - Instruction following
- `long_user` - Long conversations
- `english`, `chinese`, `japanese`, `korean`, etc. - Language-specific

## Output Format

```typescript
interface AllLeaderboardsData {
  scrapedAt: string
  sources: string[]
  text: {
    [category: string]: {
      entries: Array<{
        rank: number
        modelId: string
        modelName: string
        score: number
        organization?: string
        license?: string
        inputPrice?: number
        outputPrice?: number
      }>
      totalModels: number
      lastUpdated: string
    }
  }
  vision?: { ... }
  historical?: { [date: string]: ... }
  metadata?: ModelMetadata[]
}
```

## Notes

- **API Access**: `lmarena.ai/api/` is blocked by robots.txt for automated access
- **Primary Source**: Uses `nakasyou/lmarena-history` which converts HuggingFace pickle files to JSON daily via GitHub Actions
- **Historical Data**: Enable with `--history` flag to include score history (increases output size significantly)

## Files

```
tools/lmarena/
├── cli.ts          # CLI entry point
├── index.ts        # Module exports
├── scraper.ts      # Main scraper logic
├── renderer.ts     # Output rendering (terminal/markdown/html)
├── types.ts        # TypeScript type definitions
├── utils/
│   ├── logger.ts   # Logging utilities
│   └── output.ts   # File output utilities
└── output/         # Generated output files
```
