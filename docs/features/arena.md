# Arena - Model Comparison

The Arena is an interactive model comparison system that lets you pit AI models against each other in blind battles to evaluate their relative performance.

## Overview

Arena provides a structured way to compare AI model outputs side-by-side, enabling data-driven model selection through ELO-based rankings and win-rate heatmaps.

| Feature | Description |
|---------|-------------|
| **Quick Battle** | Send a prompt to two random models simultaneously |
| **Leaderboard** | ELO-ranked model performance table |
| **Heatmap** | Win-rate matrix across model pairs |
| **History** | Browse and review past battles |
| **Multi-turn** | Continue conversations within a battle |

## Getting Started

1. Navigate to **Arena** from the sidebar
2. Click **Start Battle** to configure a new comparison
3. Enter a prompt and select models (or use random selection)
4. Review both responses and vote for the winner
5. Check the **Leaderboard** tab for cumulative rankings

## Architecture

```
app/(main)/arena/page.tsx        → Main Arena page with tabs
components/arena/                → UI components
  ├── arena-leaderboard.tsx      → ELO-ranked table
  ├── arena-heatmap.tsx          → Win-rate matrix visualization
  ├── arena-history.tsx          → Battle history browser
  ├── arena-dialog.tsx           → Battle configuration dialog
  ├── arena-battle-view.tsx      → Side-by-side battle view
  └── arena-quick-battle.tsx     → Quick battle launcher
stores/arena/                    → Battle state persistence
hooks/arena/                     → useArena hook for battle logic
```

## Key Components

- **ArenaLeaderboard**: Displays ELO rankings with win/loss/tie statistics
- **ArenaHeatmap**: Visual grid showing head-to-head win rates between models
- **ArenaHistory**: Searchable list of past battles with replay
- **ArenaDialog**: Configuration dialog for selecting models and battle parameters
- **ArenaBattleView**: Split-pane view for reading and judging responses
- **ArenaQuickBattle**: One-click battle with a custom prompt

## Store

The `useArenaStore` persists all battle data including:

- Battle records with model identifiers and responses
- Active battle tracking
- ELO ratings per model
- Win/loss/tie statistics

## Configuration

Arena settings are accessible via **Settings → Arena** and include:

- Default model pool for random selection
- Blind mode toggle (hide model names during voting)
- Battle history retention
