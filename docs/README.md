# Cognia Documentation

Welcome to the official Cognia documentation. This section provides comprehensive guides and references for understanding, developing, and using the Cognia AI chat application.

## Quick Navigation

### For Users
- [Features Overview](features/) - User guides for all Cognia features
  - [AI Integration](features/ai-integration.md) - Provider setup and model selection
  - [Chat Features](features/chat-features.md) - Chat modes, branching, and advanced features
  - [Artifacts System](features/artifacts-system.md) - AI-generated content and canvas editor
  - [Projects Management](features/projects-management.md) - Organize conversations with knowledge bases
  - [MCP Guide](features/mcp-guide.md) - Model Context Protocol usage
  - [Agent Guide](features/agent-guide.md) - Autonomous AI agents with tools and planning
  - [Configuration](features/configuration.md) - Settings and customization options
  - **Native Tools** - Desktop-exclusive features (requires desktop app)
    - [Native Tools Overview](features/native-tools.md) - Introduction to all native tools
    - [Native Selection](features/native-selection.md) - Smart text selection and clipboard
    - [Native Awareness](features/native-awareness.md) - System monitoring and productivity
    - [Native Context & Screenshot](features/native-context-screenshot.md) - Context detection and screenshots

### For Developers
- [Getting Started](development/getting-started.md) - Installation and setup
- [Architecture Overview](architecture/overview.md) - System design and technology choices
- [Project Structure](development/project-structure.md) - Directory organization and file conventions
- [API Reference](api/) - Complete API documentation
- [Coding Standards](development/coding-standards.md) - Development guidelines and best practices
- [Testing](development/testing.md) - Testing strategy and examples
- [Building](development/building.md) - Build and deployment guide
- [Contributing](development/contributing.md) - Contribution workflow

## Documentation Structure

```
docs/
├── README.md                    # This file - documentation index
├── architecture/                # System architecture documentation
│   ├── overview.md              # Architecture overview and design patterns
│   ├── tech-stack.md            # Technology stack details
│   ├── data-flow.md             # Data flow and state management
│   └── mcp-architecture.md      # MCP system architecture
├── api/                         # API reference documentation
│   ├── overview.md              # API introduction and conventions
│   ├── routes.md                # API routes reference
│   ├── hooks.md                 # Custom React hooks reference
│   ├── stores.md                # Zustand stores reference
│   ├── components.md            # Component API reference
│   └── utilities.md             # Utility functions reference
├── development/                 # Development guides
│   ├── getting-started.md       # Setup and installation
│   ├── project-structure.md     # Directory structure
│   ├── coding-standards.md      # Code style and conventions
│   ├── testing.md               # Testing strategy
│   ├── building.md              # Build and deployment
│   └── contributing.md          # Contribution guidelines
└── features/                    # Feature documentation
    ├── ai-integration.md        # AI provider integration
    ├── artifacts-system.md      # Artifacts and canvas editor
    ├── chat-features.md         # Chat modes and features
    ├── projects-management.md   # Projects and knowledge bases
    ├── mcp-guide.md             # MCP usage guide
    ├── advanced-features.md     # Advanced features
    └── configuration.md         # Configuration options
```

## Key Concepts

### Architecture
Cognia uses a hybrid web/desktop architecture:
- **Web**: Next.js 16 with React 19.2, deployed as static HTML
- **Desktop**: Tauri 2.9 wrapper with Rust backend for native capabilities
- **State**: Zustand stores organized in modular directories with localStorage persistence
- **Hooks**: Custom hooks organized in modular directories by feature
- **Database**: Dexie (IndexedDB wrapper) for message storage

### AI Integration

- **Providers**: Support for 14 AI providers (OpenAI, Anthropic, Google, DeepSeek, Groq, xAI, Together AI, OpenRouter, Cohere, Fireworks, Cerebras, SambaNova, Mistral, Ollama)
- **Auto-Router**: Intelligent model selection based on task complexity
- **Streaming**: Real-time response streaming with proper error handling
- **Tool Calling**: Function calling and MCP tool support

### Key Features

- **Artifacts**: AI-generated standalone content (code, documents, charts)
- **Canvas Editor**: Monaco editor with AI suggestions and version history
- **Agent System**: Autonomous AI agents with tool calling, planning, and background execution
- **MCP**: Full Model Context Protocol support for extended capabilities
- **Workflow Editor**: Visual workflow editor with React Flow for creating automation workflows
- **Skills System**: Custom skill framework for extending AI capabilities
- **Projects**: Organize conversations with knowledge bases
- **Multi-Mode**: Chat, Agent, and Research modes
- **Native Tools** (Desktop Only): Smart selection, system monitoring, screenshots with OCR, context awareness

## Getting Started

### Prerequisites
- Node.js 20.x or later
- pnpm 8.x or later
- Rust 1.70+ (for desktop development)

### Installation

```bash
# Clone repository
git clone https://github.com/your-username/cognia.git
cd cognia

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

### Desktop Development

```bash
# Start Tauri desktop app
pnpm tauri dev

# Build desktop application
pnpm tauri build
```

## Documentation Guide

### Audience
This documentation serves different audiences:

**Users**: Focus on the [Features](features/) section for guides on using Cognia's capabilities.

**Developers**: Start with [Getting Started](development/getting-started.md), then explore [Architecture](architecture/) and [API Reference](api/).

**Contributors**: Read [Contributing](development/contributing.md) to understand the workflow and standards.

### Conventions
- All code examples use TypeScript
- File paths are relative to project root
- Code blocks include proper syntax highlighting
- All examples are production-ready with error handling
- Package manager commands use pnpm

### Contributing to Documentation
To improve the documentation:
1. Edit the relevant markdown file in `docs/`
2. Follow the existing format and structure
3. Include code examples for any API changes
4. Update cross-references if adding new sections
5. Test all code examples before submitting

## Additional Resources

- [Main README](../README.md) - Project overview and quick start
- [CLAUDE.md](../CLAUDE.md) - Development guidelines for AI assistants
- [llmdoc/](../llmdoc/) - Internal implementation documentation
- [GitHub Repository](https://github.com/your-username/cognia) - Source code

## Support

For questions, issues, or contributions:
- Open an issue on GitHub
- Check existing documentation first
- Review the [Contributing Guide](development/contributing.md)

---

**Last Updated**: January 2, 2026
