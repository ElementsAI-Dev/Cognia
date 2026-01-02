# Getting Started with Cognia Development

This guide will help you set up your development environment for the Cognia project, covering both web and desktop application development.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Running Development Servers](#running-development-servers)
- [Verifying Installation](#verifying-installation)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **Disk Space**: At least 2 GB free space
- **Memory**: 4 GB RAM minimum (8 GB recommended)

### Required Software

#### For Web Development

- **Node.js** 20.x or later

  ```bash
  # Check version
  node --version  # Should be v20.x.x or higher
  ```

- **pnpm** 8.x or later (required package manager)

  ```bash
  # Install pnpm globally
  npm install -g pnpm@latest

  # Verify installation
  pnpm --version  # Should be 8.x.x or higher
  ```

#### For Desktop Development (Tauri)

If you plan to build or run the desktop application, you need additional tools:

- **Rust** 1.70 or later

  ```bash
  # Check version
  rustc --version  # Should be 1.70 or higher
  cargo --version
  ```

  **Install Rust**: Visit [rustup.rs](https://rustup.rs/) for installation instructions.

- **Platform-specific dependencies**:

  **Windows**:
  - Microsoft Visual Studio C++ Build Tools
  - [Download here](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
  - Select "Desktop development with C++" during installation

  **macOS**:

  ```bash
  xcode-select --install
  ```

  **Linux** (Ubuntu/Debian):

  ```bash
  sudo apt update
  sudo apt install libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
  ```

### Optional Tools

- **Git**: For version control

  ```bash
  git --version
  ```

- **VS Code**: Recommended IDE with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Rust Analyzer (for Tauri development)

## Installation

### 1. Clone the Repository

```bash
# Using HTTPS
git clone https://github.com/your-username/cognia.git
cd cognia

# Or using SSH
git clone git@github.com:your-username/cognia.git
cd cognia
```

### 2. Install Dependencies

```bash
pnpm install
```

This will:

- Install all Node.js dependencies
- Set up Husky git hooks
- Prepare the development environment

**Expected output**: Installation should complete in 2-5 minutes depending on your internet connection.

### 3. Verify Installation

```bash
# Check if all packages are installed
pnpm list --depth=0
```

## Environment Configuration

### Creating Environment File

Create a `.env.local` file in the project root:

```bash
touch .env.local
```

### Environment Variables

Add the following environment variables to `.env.local`:

```env
# ========================================
# AI Provider API Keys (Optional)
# ========================================
# Add keys for the providers you want to use

# OpenAI (GPT-4o, GPT-4o-mini, o1)
OPENAI_API_KEY=sk-your-openai-key-here

# Anthropic (Claude Sonnet, Claude Opus, Claude Haiku)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Google (Gemini 2.0 Flash, Gemini 1.5 Pro)
GOOGLE_API_KEY=your-google-api-key-here

# DeepSeek (deepseek-chat, deepseek-coder)
DEEPSEEK_API_KEY=sk-your-deepseek-key-here

# Groq (Llama 3.3, Mixtral)
GROQ_API_KEY=gsk-your-groq-key-here

# Mistral (Mistral Large, Mistral Small)
MISTRAL_API_KEY=your-mistral-key-here

# xAI (Grok)
XAI_API_KEY=your-xai-key-here

# Together AI
TOGETHERAI_API_KEY=your-togetherai-key-here

# OpenRouter
OPENROUTER_API_KEY=sk-or-your-openrouter-key-here

# Cohere
COHERE_API_KEY=your-cohere-key-here

# Fireworks
FIREWORKS_API_KEY=your-fireworks-key-here

# Cerebras
CEREBRAS_API_KEY=your-cerebras-key-here

# SambaNova
SAMBANOVA_API_KEY=your-sambanova-key-here

# ========================================
# Search Provider Keys (Optional)
# ========================================

# Tavily Search (Legacy)
TAVILY_API_KEY=tvly-your-tavily-key-here

# Brave Search
BRAVE_SEARCH_API_KEY=your-brave-search-key-here

# Serper (Google Search)
SERPER_API_KEY=your-serper-key-here

# SerpApi
SERPAPI_API_KEY=your-serpapi-key-here

# Bing Search
BING_SEARCH_API_KEY=your-bing-key-here
BING_SEARCH_ENDPOINT=https://api.bing.microsoft.com/v7.0/search

# ========================================
# Optional Configuration
# ========================================

# Application Name (default: Cognia)
NEXT_PUBLIC_APP_NAME=Cognia

# API URL (for external API calls, if needed)
# NEXT_PUBLIC_API_URL=https://api.example.com

# Development Mode
NODE_ENV=development
```

### Security Notes

1. **Never commit** `.env.local` to version control
2. The `.gitignore` file already excludes `.env.local`
3. API keys are stored in browser localStorage (unencrypted)
4. Only add keys for providers you actually use
5. Generate API keys from provider dashboards:
   - [OpenAI Platform](https://platform.openai.com/api-keys)
   - [Anthropic Console](https://console.anthropic.com/)
   - [Google AI Studio](https://makersuite.google.com/app/apikey)
   - [Groq Console](https://console.groq.com/)

## Running Development Servers

### Web Application Development

Start the Next.js development server:

```bash
pnpm dev
```

**Server Details**:

- URL: <http://localhost:3000>
- Hot reload enabled
- Fast refresh supported
- TypeScript checking enabled

**Expected Output**:

```
  ▲ Next.js 16.0.0
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

**Common Development Commands**:

```bash
# Start on different port
pnpm dev -- -p 3001

# Start with Turbopack (faster refresh)
pnpm dev -- --turbo
```

### Desktop Application Development

Start the Tauri development environment:

```bash
pnpm tauri dev
```

**What Happens**:

1. Starts Next.js dev server on port 3001
2. Compiles Rust backend
3. Opens desktop application window
4. Enables hot reload for both frontend and backend

**Expected Output**:

```
Finished dev [unoptimized + debuginfo] target(s) in X.XXs
Running `BeforeDevCommand` (`pnpm dev -p 3001`)
Finished dev [unoptimized + debuginfo] target(s) in X.XXs
```

**Desktop Window**:

- Title: "Cognia"
- Opens automatically
- DevTools available (F12 or Right Click > Inspect)

### Development Workflow

#### Typical Web Development

1. Start dev server: `pnpm dev`
2. Open browser: <http://localhost:3000>
3. Make changes in `app/`, `components/`, `lib/`
4. Browser auto-refreshes with changes
5. Check console for errors

#### Typical Desktop Development

1. Start Tauri dev: `pnpm tauri dev`
2. Desktop window opens
3. Make changes to:
   - Frontend (`app/`, `components/`) - Auto-reloads
   - Backend (`src-tauri/src/`) - Recompiles and restarts
4. Test native features (file system, dialogs, etc.)

## Verifying Installation

### Check Web Development Setup

```bash
# 1. Verify Node.js version
node --version
# Expected: v20.x.x or higher

# 2. Verify pnpm version
pnpm --version
# Expected: 8.x.x or higher

# 3. Verify dependencies installation
pnpm list --depth=0 | head -20
# Expected: List of major dependencies

# 4. Test TypeScript compilation
pnpm exec tsc --noEmit
# Expected: No errors

# 5. Test ESLint
pnpm lint
# Expected: May show warnings, but no critical errors

# 6. Run tests
pnpm test
# Expected: Tests pass
```

### Check Desktop Development Setup

```bash
# 1. Verify Rust installation
rustc --version
# Expected: rustc 1.70 or higher

cargo --version
# Expected: cargo 1.70 or higher

# 2. Check Tauri CLI
pnpm tauri info
# Expected: Environment information displayed

# 3. Test Rust compilation
cd src-tauri
cargo check
# Expected: Compiling successfully

# 4. Build desktop app (debug)
cd ..
pnpm tauri build --debug
# Expected: Build completes successfully
```

### Verify Application Features

Once the dev server is running:

#### Web Interface (<http://localhost:3000>)

1. **Welcome Page Loads**: Application starts successfully
2. **Settings Page**: Navigate to settings, verify provider configuration UI
3. **Start Chat**: Create a new chat session
4. **Test AI Provider**: Add an API key and send a message

#### Desktop Application

1. **Window Opens**: Desktop window displays correctly
2. **Native Features**: Test file operations, dialogs
3. **MCP Settings**: Verify MCP server configuration UI
4. **Console**: Check DevTools for errors

## Troubleshooting

### Port Already in Use

#### Error Message

```
Port 3000 is already in use
```

#### Solution (Windows)

```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace <PID> with actual PID)
taskkill /PID <PID> /F
```

#### Solution (macOS/Linux)

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Alternative: Use different port
pnpm dev -- -p 3001
```

### Module Not Found Errors

#### Error Message

```
Module not found: Can't resolve '@/components/...'
```

#### Solution

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Restart dev server
pnpm dev
```

### TypeScript Errors

#### Error Message

```
TypeScript error: Cannot find module ...
```

#### Solution

```bash
# Rebuild TypeScript
pnpm exec tsc --noEmit

# Check tsconfig.json paths configuration
cat tsconfig.json | grep -A 10 "paths"

# Ensure all imports use @/ alias
# Correct: import { Button } from '@/components/ui/button'
# Wrong: import { Button } from '../../components/ui/button'
```

### Tauri Build Fails

#### Error: Rust Compiler Not Found

```bash
# Verify Rust installation
rustc --version

# If not found, reinstall Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Reload PATH
source $HOME/.cargo/env
```

#### Error: Webkit2GTK Missing (Linux)

```bash
# Install missing dependencies
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

#### Error: MSBuild Tools Missing (Windows)

```bash
# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/

# During installation, select:
# - Desktop development with C++
# - Windows 10/11 SDK
# - C++ CMake tools for Visual Studio
```

### Ollama Connection Fails

#### Error: Cannot Connect to Ollama

```bash
# 1. Ensure Ollama is running
ollama serve

# 2. Verify Ollama is accessible
curl http://localhost:11434/api/tags

# 3. Check if models are downloaded
ollama list

# 4. Download a model if needed
ollama pull llama3.2
```

### MCP Server Not Starting

#### Error: MCP Server Failed to Start

```bash
# 1. Check if Node.js is accessible
which node

# 2. Verify MCP server command
npx @modelcontextprotocol/server-filesystem --help

# 3. Check server logs in DevTools
# Open DevTools (F12) > Console

# 4. Verify environment variables
echo $PATH

# 5. Test server manually
npx @modelcontextprotocol/server-filesystem /tmp
```

### pnpm Installation Issues

#### Error: pnpm Command Not Found

```bash
# Uninstall and reinstall pnpm
npm uninstall -g pnpm
npm install -g pnpm@latest

# Verify installation
pnpm --version
```

#### Error: Lock File Conflicts

```bash
# Update lock file
pnpm install --force

# Or regenerate lock file
rm pnpm-lock.yaml
pnpm install
```

### ESLint Errors

#### Error: ESLint Found Too Many Errors

```bash
# Auto-fix ESLint errors
pnpm lint:fix

# If errors persist, check specific file
pnpm lint path/to/file.tsx

# Temporarily disable rules (not recommended for production)
# Add to file: // eslint-disable-next-line rule-name
```

### Test Failures

#### Error: Tests Fail After Installation

```bash
# Clear Jest cache
pnpm test --clearCache

# Run tests in verbose mode
pnpm test --verbose

# Run specific test file
pnpm test path/to/test.test.ts

# Update snapshots if needed
pnpm test -u
```

### Next.js Build Issues

#### Error: Build Fails in Production Mode

```bash
# Check for static export issues
# next.config.ts must have: output: "export" for production

# Test build locally
pnpm build

# Check output directory
ls out/

# Preview production build
pnpm start
```

## Next Steps

After successful installation and verification:

1. **Read Project Structure**: See [project-structure.md](./project-structure.md)
2. **Review Coding Standards**: See [coding-standards.md](./coding-standards.md)
3. **Set Up Testing**: See [testing.md](./testing.md)
4. **Learn Build Process**: See [building.md](./building.md)
5. **Contribution Guidelines**: See [contributing.md](./contributing.md)

## Getting Help

If you encounter issues not covered here:

1. Check the [main README](../../README.md)
2. Review [project documentation](../../llmdoc/index.md)
3. Search existing GitHub issues
4. Create a new issue with:
   - Operating system and version
   - Node.js and Rust versions
   - Full error message
   - Steps to reproduce

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tauri Documentation](https://tauri.app/v1/guides/getting-started/setup)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [pnpm Documentation](https://pnpm.io/motivation)

---

**Last Updated**: December 25, 2025
