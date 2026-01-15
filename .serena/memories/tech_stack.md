# Cognia Tech Stack

## Core Technologies

- **Runtime**: Node.js (via pnpm)
- **Frontend Framework**: Next.js 16.1.1, React 19.2.3
- **Language**: TypeScript 5.9.3 (strict mode)
- **Styling**: Tailwind CSS v4.1.18, shadcn/ui
- **State Management**: Zustand 5.0.9
- **Desktop**: Tauri 2.9.1
- **Build Tool**: Next.js with Turbopack

## Key Dependencies

### AI Integration

- `ai` (Vercel AI SDK) ^5.0.119
- `@ai-sdk/react` ^2.0.121
- Provider SDKs: `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/mistral`, `@ai-sdk/openai`, etc.

### UI Components

- `@radix-ui/*` - UI primitives (dialog, dropdown, tooltip, etc.)
- `lucide-react` - Icons
- `framer-motion` / `motion` - Animations
- `@monaco-editor/react` - Code editor
- `@xyflow/react` - Workflow editor (React Flow)

### Data & Storage

- `dexie` ^4.2.1 - IndexedDB wrapper
- `dexie-react-hooks` - React hooks for Dexie
- `zustand` ^5.0.9 - State management

### Vector & Search

- `@pinecone-database/pinecone` - Vector DB
- `@qdrant/js-client-rest` - Vector DB
- `chromadb` - Vector DB
- `@zilliz/milvus2-sdk-node` - Vector DB
- `@tavily/core` - Search API

### Document Processing

- `pdfjs-dist` - PDF rendering
- `mammoth` - DOCX conversion
- `pptxgenjs` - PPTX generation
- `xlsx` - Excel processing
- `cheerio` - HTML parsing
- `react-markdown` - Markdown rendering

### Observability

- `@opentelemetry/*` - OpenTelemetry tracing and metrics
- `langfuse` - AI observability

### Internationalization

- `next-intl` ^4.7.0 - i18n for Next.js

## Dev Dependencies

- **Testing**: Jest 30.2.0, Playwright 1.57.0, @testing-library/react
- **Linting**: ESLint 9.39.2
- **Git Hooks**: Husky 9.1.7, commitlint, lint-staged
- **Type Checking**: TypeScript 5.9.3
