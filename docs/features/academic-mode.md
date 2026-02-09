# Academic Mode

Academic Mode provides a comprehensive research workspace for discovering, managing, and analyzing academic papers with AI-powered assistance.

## Overview

| Feature | Description |
|---------|-------------|
| **Paper Search** | Search across academic databases (Semantic Scholar, arXiv, CrossRef) |
| **Paper Library** | Personal library with tags, notes, and collections |
| **Statistics** | Research analytics and reading progress |
| **Paper Comparison** | Side-by-side paper comparison |
| **Recommendations** | AI-powered paper discovery |
| **Smart Collections** | Auto-categorized paper groups |
| **AI Analysis** | Chat with AI about papers, get summaries, extract key findings |

## Tabs

### Search

Search for papers by keyword, author, DOI, or topic. Results include citation counts, abstracts, and one-click add-to-library.

### Library

Manage your personal paper library with:

- Tag-based organization
- Reading status tracking (unread, reading, completed)
- Notes and annotations
- PDF attachment

### Statistics

Visual analytics including:

- Papers read over time
- Citation network visualization
- Topic distribution
- Reading streak tracking

### Compare

Select two or more papers for side-by-side comparison of methods, results, and conclusions.

### Discover

AI-powered recommendations based on your library and reading history.

### Smart Collections

Automatically generated collections based on topic clustering and citation relationships.

### AI Analysis

Chat panel specialized for academic research:

- Summarize papers
- Extract methodologies
- Generate literature reviews
- Answer questions about paper content

## Architecture

```
app/(main)/academic/page.tsx       → Academic mode page
components/academic/               → 20+ components
  ├── paper-search.tsx             → Search interface
  ├── paper-library.tsx            → Library management
  ├── paper-detail.tsx             → Paper detail sheet
  ├── academic-stats.tsx           → Research analytics
  ├── paper-comparison.tsx         → Side-by-side comparison
  ├── paper-recommendations.tsx    → AI recommendations
  ├── smart-collections.tsx        → Auto-categorization
  └── academic-chat-panel.tsx      → AI research chat
hooks/academic/                    → useAcademic hook
stores/academic/                   → Academic state persistence
lib/academic/                      → Citation network, search logic
```

## State Management

The `useAcademicStore` manages:

- Paper library with metadata
- Active tab state
- Collections and tags
- Search history
- Knowledge map data
