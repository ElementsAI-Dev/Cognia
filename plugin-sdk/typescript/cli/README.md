# Cognia Plugin CLI

Interactive command-line interface for creating, developing, and managing Cognia plugins.

## Features

- 🧙 **Interactive Wizards** - Step-by-step guided project creation with ink-based UI
- 📁 **Template Support** - Basic, Tool, Command, and Full-featured templates
- 🔄 **Hot Reload** - Development server with live reloading
- ✅ **Validation** - Plugin manifest and structure validation
- 📦 **Build Tools** - Production-ready bundling with tsup/esbuild
- 🎨 **Beautiful UI** - React-based terminal UI using Ink

## Installation

```bash
# Via npm
npm install -g @cognia/plugin-sdk

# Via pnpm
pnpm add -g @cognia/plugin-sdk
```

## Commands

### `create [name]`

Create a new plugin project. Launches interactive wizard if name is omitted.

```bash
# Interactive mode (recommended)
cognia-plugin create

# Non-interactive with options
cognia-plugin create my-plugin --template tool --typescript

# Force interactive even with name
cognia-plugin create my-plugin --interactive
```

**Options:**
- `-t, --template <template>` - Template to use (basic, tool, command, full). Default: basic
- `-d, --directory <dir>` - Target directory. Default: current directory
- `--typescript` / `--no-typescript` - Use TypeScript (default: true)
- `--no-git` - Skip git initialization
- `--no-install` - Skip npm install
- `-i, --interactive` - Force interactive wizard mode

**Templates:**

| Template | Description | Files Included |
|----------|-------------|----------------|
| `basic` | Minimal setup | index.ts, plugin.json |
| `tool` | AI agent tools | + tools/index.ts |
| `command` | Slash commands | + commands/index.ts |
| `full` | Full-featured | + hooks, components, everything |

### `init`

Initialize plugin SDK in an existing project.

```bash
# Interactive mode
cognia-plugin init

# Force overwrite existing config
cognia-plugin init --force

# Non-interactive (CI mode)
cognia-plugin init --no-interactive
```

**Options:**
- `-f, --force` - Overwrite existing plugin.json
- `-i, --interactive` - Force interactive mode
- `--no-interactive` - Force non-interactive mode (for CI)

### `dev`

Start development server with hot reload.

```bash
cognia-plugin dev
```

**Options:**
- `-p, --port <port>` - Server port. Default: 3001
- `--no-reload` - Disable hot reload

### `build`

Build plugin for production.

```bash
cognia-plugin build
```

**Options:**
- `-o, --output <dir>` - Output directory. Default: dist
- `--minify` - Minify output
- `--sourcemap` - Generate source maps

### `validate`

Validate plugin manifest and structure.

```bash
cognia-plugin validate
```

**Options:**
- `-s, --strict` - Enable strict validation mode

## Interactive Wizard Flow

The create wizard guides you through:

1. **Plugin Name** - Enter a valid plugin identifier
2. **Template Selection** - Choose from available templates
3. **Capabilities** - Select features (tools, commands, modes, hooks, components, a2ui)
4. **Permissions** - Choose required permissions (storage, network, filesystem, etc.)
5. **Configuration** - TypeScript, Git, npm install, example code
6. **Preview & Confirm** - Review file tree before creation

## Non-Interactive Mode (CI/CD)

For CI/CD pipelines, use command-line flags:

```bash
# Create plugin without prompts
cognia-plugin create my-plugin \
  --template tool \
  --typescript \
  --no-git \
  --no-install

# Initialize without prompts
cognia-plugin init --no-interactive --force
```

## UI Components

The CLI uses custom ink-based React components:

- **TextInput** - Text input with validation
- **Select** - Single-select dropdown with descriptions
- **MultiSelect** - Multi-select with checkboxes
- **Confirm** - Yes/No confirmation
- **Steps** - Progress indicator for multi-step wizards
- **FileTree** - File structure preview
- **Spinner** - Loading indicators
- **Badge** - Status badges (success/warning/error)
- **TaskRunner** - Execute tasks with progress UI
- **Alert** - Important message alerts with variants (via @inkjs/ui)
- **StatusMessage** - Status feedback messages (via @inkjs/ui)
- **ProgressBar** - Progress bar with percentage (via @inkjs/ui)

## Development

```bash
# Clone the repo
git clone https://github.com/cognia/cognia

# Install dependencies
cd plugin-sdk/typescript
pnpm install

# Build
pnpm build

# Run CLI locally
node dist/cli/index.js create
```

## Architecture

```
cli/
├── index.ts              # CLI entry point (Commander.js)
├── commands/
│   ├── create.ts         # Create command + wizard integration
│   ├── init.ts           # Init command + wizard integration
│   ├── dev.ts            # Development server
│   ├── build.ts          # Production build
│   └── validate.ts       # Plugin validation
├── ui/                   # Ink UI components
│   ├── index.ts          # Barrel export
│   ├── theme.ts          # Colors and symbols
│   ├── TextInput.tsx     # Text input component
│   ├── Select.tsx        # Select dropdown
│   ├── MultiSelect.tsx   # Multi-select
│   ├── Confirm.tsx       # Yes/No confirmation
│   ├── Steps.tsx         # Step progress indicator
│   ├── FileTree.tsx      # File tree display
│   ├── Spinner.tsx       # Loading spinner
│   ├── Badge.tsx         # Status badges
│   ├── Header.tsx        # CLI header
│   └── TaskRunner.tsx    # Task execution with progress
└── wizards/              # Interactive wizards
    ├── index.ts          # Barrel export
    ├── CreateWizard.tsx  # Create plugin wizard
    ├── InitWizard.tsx    # Init plugin wizard
    └── hooks/
        └── useWizard.ts  # Wizard state management hook
```

## Dependencies

- **ink** - React for CLI
- **ink-text-input** - Text input component
- **ink-select-input** - Select component
- **ink-spinner** - Spinner component
- **@inkjs/ui** - UI components (Alert, StatusMessage, ProgressBar)
- **commander** - CLI framework
- **chalk** - Terminal colors
- **figures** - Terminal symbols

## License

MIT
