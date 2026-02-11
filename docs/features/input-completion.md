# Input Completion

GitHub Copilot-style AI-powered Tab completion for the chat input, with IME detection for CJK languages. Available on both **desktop** (Tauri) and **web** environments.

## Overview

| Feature | Description |
|---------|-------------|
| **Ghost Text** | Inline completion suggestions shown as dimmed text |
| **Tab Accept** | Press Tab to accept the full suggestion |
| **Partial Accept** | Ctrl+→ (word-by-word), Ctrl+↓ (line-by-line) |
| **Escape Dismiss** | Press Escape to dismiss |
| **Ctrl+Space** | Manual trigger for AI completion |
| **IME Awareness** | Disables during IME composition (Chinese, Japanese, Korean) — desktop only |
| **Multiple Providers** | Ollama (qwen2.5-coder), OpenAI, Groq, Custom |
| **Unified System** | Combines @mention, /slash, :emoji, and AI ghost text completion |
| **Configurable** | Model, trigger delay, UI settings, API key/endpoint |
| **Caching** | LRU cache reduces redundant API calls (web provider) |
| **Adaptive Debounce** | Adjusts trigger delay based on typing speed (desktop) |

## How It Works

1. User types in the chat input
2. After a configurable delay, a completion request is sent to the configured provider
3. The suggestion appears as ghost text after the cursor
4. Press **Tab** to accept, **Ctrl+→** for word-by-word, or **Escape** to dismiss
5. If IME is active (composing CJK characters), suggestions are suppressed (desktop only)
6. Quality feedback is automatically submitted (accept/dismiss timing) for analytics

## Architecture

```text
components/input-completion/              → CompletionOverlay, CompletionSettings
components/chat/ghost-text-overlay.tsx     → Inline ghost text rendering
hooks/chat/use-input-completion-unified.ts → Unified hook (web + desktop)
hooks/input-completion/                    → Native Tauri completion hook
stores/input-completion/                   → Runtime state (running, IME, suggestion)
stores/settings/completion-settings-store  → Persistent settings (providers, UI)
lib/ai/completion/web-completion-provider  → Web AI completion via fetch
lib/ai/completion/completion-cache         → LRU cache for web completions
lib/native/input-completion.ts             → Tauri invoke wrappers
types/input-completion/                    → Native completion types
types/chat/input-completion.ts             → Unified completion types
src-tauri/src/input_completion/            → Rust backend (desktop only)
  ├── completion_service.rs                → AI provider integration + retry + prefix cache
  ├── config.rs                            → Configuration with adaptive debounce
  ├── ime_state.rs                         → ImeMonitor for CJK detection
  ├── keyboard_monitor.rs                  → Global keyboard event handling
  └── types.rs                             → Shared types and events
```

## Events (Desktop only)

All events use a unified channel: `input-completion://event` with `InputCompletionEvent` payload.

| Event Type | Direction | Description |
|------------|-----------|-------------|
| `Suggestion` | Backend → Frontend | New suggestion available |
| `Accept` | Backend → Frontend | User accepted suggestion |
| `Dismiss` | Backend → Frontend | User dismissed suggestion |
| `ImeStateChanged` | Backend → Frontend | IME state changed |
| `Error` | Backend → Frontend | Completion error occurred |
| `Started` | Backend → Frontend | System started |
| `Stopped` | Backend → Frontend | System stopped |

## Configuration

Configurable via Settings:

- **Provider**: Ollama, OpenAI, Groq, or Auto (tries Ollama first, falls back to Groq)
- **Model**: Model to use for completions (default: qwen2.5-coder:0.5b)
- **API Key / Endpoint**: Required for OpenAI/Groq on web
- **Trigger Delay**: Milliseconds to wait before requesting completion
- **Min Context Length**: Minimum characters before triggering
- **Ghost Text Opacity**: Visual opacity of suggestions (0.1–1.0)
- **Auto-dismiss**: Timeout for automatic suggestion dismissal
- **Partial Accept**: Enable word-by-word and line-by-line accept
- **Enabled**: Toggle input completion on/off

## Platform Support

| Feature | Desktop (Tauri) | Web |
|---------|----------------|-----|
| AI Ghost Text | ✅ Native Rust service | ✅ Via web-completion-provider |
| IME Detection | ✅ Global keyboard hooks | ❌ |
| Adaptive Debounce | ✅ Typing speed analysis | ❌ |
| @mention | ✅ | ✅ |
| /slash commands | ✅ | ✅ |
| :emoji | ✅ | ✅ |
| Partial Accept | ✅ | ✅ |
| Completion Cache | ✅ Rust-side LFU cache | ✅ JS-side LRU cache |
| Quality Feedback | ✅ Native feedback | ❌ |
