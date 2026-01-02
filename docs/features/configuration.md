# Configuration Guide

This guide covers all aspects of configuring Cognia, from environment setup to advanced customization options.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Provider Settings](#provider-settings)
- [Appearance Settings](#appearance-settings)
- [Chat Settings](#chat-settings)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Speech Settings](#speech-settings)
- [Data Management](#data-management)
- [Search Configuration](#search-configuration)
- [Tauri Configuration](#tauri-configuration)
- [Advanced Configuration](#advanced-configuration)

---

## Environment Variables

### Setup

Create a `.env.local` file in the project root:

```bash
# Copy template
cp .env.example .env.local
```

### Available Variables

#### AI Provider Keys

```env
# OpenAI (optional - can also be set in UI)
OPENAI_API_KEY=sk-your-openai-key

# Anthropic (optional)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Google AI (optional)
GOOGLE_API_KEY=your-google-api-key

# DeepSeek (optional)
DEEPSEEK_API_KEY=sk-your-deepseek-key

# Groq (optional)
GROQ_API_KEY=gsk-your-groq-key

# Mistral (optional)
MISTRAL_API_KEY=your-mistral-key
```

#### Application Settings

```env
# Application name (client-accessible)
NEXT_PUBLIC_APP_NAME=Cognia

# API URL (if using external backend)
NEXT_PUBLIC_API_URL=https://api.example.com
```

#### Server-Side Only (Build Time)

```env
# Database (if using server features)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Secret key for server operations
API_SECRET_KEY=your-secret-key
```

### Security Notes

- Never commit `.env.local` to version control
- Provider API keys are stored in localStorage unencrypted
- Keys with `NEXT_PUBLIC_` prefix are exposed to the browser
- Server-side variables remain secure on the server

---

## Provider Settings

### Configuration UI

Navigate to **Settings > Providers** to configure AI providers.

### Provider Dashboard URLs

| Provider | API Key Dashboard |
|----------|-------------------|
| OpenAI | <https://platform.openai.com/api-keys> |
| Anthropic | <https://console.anthropic.com/settings/keys> |
| Google AI | <https://aistudio.google.com/app/apikey> |
| DeepSeek | <https://platform.deepseek.com/api_keys> |
| Groq | <https://console.groq.com/keys> |
| Mistral | <https://console.mistral.ai/api-keys/> |

### Default Configuration

```typescript
{
  openai: {
    providerId: 'openai',
    apiKey: '',
    defaultModel: 'gpt-4o',
    enabled: true,
  },
  anthropic: {
    providerId: 'anthropic',
    apiKey: '',
    defaultModel: 'claude-sonnet-4-20250514',
    enabled: true,
  },
  google: {
    providerId: 'google',
    apiKey: '',
    defaultModel: 'gemini-2.0-flash-exp',
    enabled: true,
  },
  deepseek: {
    providerId: 'deepseek',
    apiKey: '',
    defaultModel: 'deepseek-chat',
    enabled: false,
  },
  groq: {
    providerId: 'groq',
    apiKey: '',
    defaultModel: 'llama-3.3-70b-versatile',
    enabled: false,
  },
  mistral: {
    providerId: 'mistral',
    apiKey: '',
    defaultModel: 'mistral-large-latest',
    enabled: false,
  },
  ollama: {
    providerId: 'ollama',
    baseURL: 'http://localhost:11434',
    defaultModel: 'llama3.2',
    enabled: false,
  },
}
```

### Testing Connection

Each provider has a **Test Connection** button that validates the API key format (10+ characters) and checks basic connectivity.

### Custom Providers

You can add custom OpenAI-compatible providers:

1. Click **Add Custom Provider**
2. Enter provider name
3. Set base URL (e.g., `https://api.example.com/v1`)
4. Enter API key
5. Select default model

---

## Appearance Settings

### Theme Selection

Navigate to **Settings > Appearance**.

#### Theme Options

- **Light** - Light color scheme
- **Dark** - Dark color scheme
- **System** - Follows OS preference

#### Applying Theme

```typescript
import { useSettingsStore } from '@/stores';

const { setTheme } = useSettingsStore();

setTheme('dark'); // or 'light' | 'system'
```

### Font Configuration

#### Available Fonts

- Inter (default)
- Geist Sans
- Geist Mono
- JetBrains Mono
- System UI

#### Font Size

Adjustable via slider (12px - 20px default).

### Custom Theme Editor

For advanced customization, use the built-in theme editor:

1. Navigate to **Settings > Appearance**
2. Click **Theme Editor**
3. Customize colors:
   - Primary
   - Secondary
   - Background
   - Foreground
   - Accent
   - Muted
   - Border
4. Preview changes in real-time
5. Save custom theme

---

## Chat Settings

### Streaming

**Location**: Settings > Chat

- **Stream Responses** - Enable real-time streaming of AI responses
- Default: `enabled`

### Send Behavior

- **Send on Enter** - Press Enter to send, Shift+Enter for new line
- Default: `enabled`

### Default Mode

Set the default chat mode:

- **Chat** - Standard conversation
- **Agent** - Tool-using agent
- **Research** - Web search integrated
- **Learning** - Socratic method

### Model Selection

Choose default model for each provider or use **Auto** mode for intelligent routing.

---

## Keyboard Shortcuts

### Default Shortcuts

| Shortcut | Action | Category |
|----------|--------|----------|
| `Ctrl/Cmd + K` | Command Palette | Navigation |
| `Ctrl/Cmd + /` | Toggle Sidebar | Navigation |
| `Ctrl/Cmd + N` | New Chat | Chat |
| `Ctrl/Cmd + S` | Save Canvas | Editing |
| `Ctrl/Cmd + Enter` | Send Message | Chat |
| `Ctrl/Cmd + Shift + ;` | Keyboard Shortcuts | System |

### Customization

1. Navigate to **Settings > Keyboard**
2. Find the shortcut to customize
3. Click **Edit** button
4. Press new key combination
5. Click **Save**

### Categories

- **Navigation** - App navigation shortcuts
- **Chat** - Chat-specific shortcuts
- **Editing** - Text editing shortcuts
- **System** - System-level shortcuts

### Reset to Defaults

Click **Reset All Shortcuts** to restore default configuration.

---

## Speech Settings

### Speech-to-Text (STT)

**Location**: Settings > Speech

#### Browser STT (Free)

- **Enable** - Toggle browser speech recognition
- **Language** - Select recognition language
- **Continuous** - Continuous listening mode
- **Auto Send** - Automatically send after silence

#### Supported Languages

- English (US)
- English (UK)
- Chinese (Simplified)
- Chinese (Traditional)
- Spanish
- French
- German
- Japanese
- Korean
- And 20+ more

#### OpenAI Whisper API (Requires API Key)

- **Provider** - Select "OpenAI Whisper"
- **Language** - Auto-detect or specific
- **Model** - `whisper-1`

### Text-to-Speech (TTS)

#### Browser TTS (Free)

- **Enable** - Toggle browser speech synthesis
- **Voice** - Select from available system voices
- **Rate** - Adjust speech rate (0.5 - 2.0)
- **Auto Play** - Automatically read responses

#### Test TTS

Click **Test** button to preview selected voice and settings.

---

## Data Management

### Export Data

**Location**: Settings > Data

#### Export Options

1. **Export All Data** - Download complete backup
2. **Export Sessions** - Chat history only
3. **Export Settings** - Configuration only

#### Export Formats

- JSON (recommended)
- Encrypted JSON (with password)

### Import Data

#### Import Options

1. Click **Import Data**
2. Select backup file
3. Choose import strategy:
   - **Merge** - Combine with existing data
   - **Replace** - Replace all data
4. Confirm import

### Clear Data

#### Clear Options

- **Clear Chat History** - Remove all sessions
- **Clear Settings** - Reset to defaults
- **Clear All Data** - Complete reset

#### Storage Locations

| Data Type | Storage |
|-----------|---------|
| Settings | localStorage (`cognia-settings`) |
| Sessions | localStorage (`cognia-sessions`) |
| Artifacts | localStorage (`cognia-artifacts`) |
| Memory | localStorage (`cognia-memory`) |
| Messages | IndexedDB (`cognia_db`) |

---

## Search Configuration

### Default Search Sources

**Location**: Settings > Search

Configure default sources for Research mode:

- **Tavily** - Web search API
- **Wikipedia** - Encyclopedia
- **Custom APIs** - Add your own

### Tavily API

1. Get API key from <https://tavily.com>
2. Add to Settings > Providers
3. Configure search depth:
   - **Basic** - Fast, top results
   - **Advanced** - Comprehensive

### Search Result Limits

Set maximum results per search:

- Minimum: 3
- Maximum: 20
- Default: 10

---

## Tauri Configuration

### Configuration File

**Location**: `src-tauri/tauri.conf.json`

### Basic Settings

```json
{
  "productName": "Cognia",
  "version": "1.0.0",
  "identifier": "com.cognia.app",
  "build": {
    "frontendDist": "../out",
    "devUrl": "http://localhost:3000"
  },
  "app": {
    "windows": [{
      "title": "Cognia",
      "width": 1280,
      "height": 800,
      "resizable": true,
      "fullscreen": false
    }]
  }
}
```

### Window Configuration

```json
{
  "windows": [{
    "title": "Cognia",
    "label": "main",
    "width": 1280,
    "height": 800,
    "minWidth": 800,
    "minHeight": 600,
    "resizable": true,
    "center": true,
    "decorations": true,
    "transparent": false,
    "fullscreen": false,
    "titleBarStyle": "default"
  }]
}
```

### Permissions

**Location**: `src-tauri/capabilities/default.json`

```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "fs:default",
    "shell:default",
    "dialog:default",
    "clipboard-manager:default",
    "global-shortcut:default",
    "notification:default"
  ]
}
```

---

## Advanced Configuration

### Custom Instructions

**Location**: Settings > Custom Instructions

Set global or per-session custom instructions:

#### Global Instructions

Apply to all conversations:

```text
You are a helpful AI assistant. Be concise and accurate.
Always provide code examples when relevant.
```

#### Per-Session Instructions

Override global instructions for specific sessions:

1. Open chat header menu
2. Click **Custom Instructions**
3. Enter session-specific instructions

### Memory System

**Location**: Settings > Memory

Configure cross-session AI memory:

- **Enable Memory** - Toggle memory system
- **Max Memories** - Maximum stored memories (default: 100)
- **Importance Threshold** - Minimum importance score (0-1)

### MCP Configuration

**Location**: Settings > MCP

#### MCP Servers Configuration File

**Location**: `{app_data}/mcp_servers.json`

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
      "env": {},
      "connectionType": "stdio"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your-github-token"
      },
      "connectionType": "stdio"
    }
  }
}
```

#### Quick Install Templates

Built-in templates for:

- Filesystem
- GitHub
- PostgreSQL
- SQLite
- Brave Search
- Memory
- Puppeteer
- Slack

---

## Related Documentation

- [Component API Reference](../api/components.md)
- [Utilities Reference](../api/utilities.md)
- [Settings System](../../llmdoc/feature/settings-system.md)
- [MCP System](../../llmdoc/feature/mcp-system.md)
- [Project Documentation Index](../../llmdoc/index.md)

---

**Last Updated**: December 25, 2025
