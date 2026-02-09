# Input Completion (Desktop Only)

GitHub Copilot-style AI-powered Tab completion for the chat input, with IME detection for CJK languages.

## Overview

| Feature | Description |
|---------|-------------|
| **Ghost Text** | Inline completion suggestions shown as dimmed text |
| **Tab Accept** | Press Tab to accept the suggestion |
| **Escape Dismiss** | Press Escape to dismiss |
| **IME Awareness** | Disables during IME composition (Chinese, Japanese, Korean) |
| **Multiple Providers** | Ollama (qwen2.5-coder), OpenAI, Groq |
| **Configurable** | Model, trigger delay, and UI settings |

## How It Works

1. User types in the chat input
2. After a configurable delay, a completion request is sent to the configured provider
3. The suggestion appears as ghost text after the cursor
4. Press **Tab** to accept or **Escape** to dismiss
5. If IME is active (composing CJK characters), suggestions are suppressed

## Architecture

```text
components/input-completion/         → UI overlay component
hooks/input-completion/              → Completion logic hooks
stores/input-completion/             → Completion settings and state
src-tauri/src/input_completion/      → Rust backend
  ├── completion_service.rs          → Completion provider integration
  ├── ime_state.rs                   → ImeMonitor for CJK detection
  └── keyboard_monitor.rs           → Global keyboard event handling
```

## Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `input-completion://suggestion` | Backend → Frontend | New suggestion available |
| `input-completion://accept` | Frontend → Backend | User accepted suggestion |
| `input-completion://dismiss` | Frontend → Backend | User dismissed suggestion |
| `input-completion://ime-state-change` | Backend → Frontend | IME state changed |

## Configuration

Configurable via Settings:

- **Provider**: Ollama, OpenAI, or Groq
- **Model**: Model to use for completions (default: qwen2.5-coder:0.5b)
- **Trigger Delay**: Milliseconds to wait before requesting completion
- **Enabled**: Toggle input completion on/off

## Desktop Only

Requires Tauri for global keyboard monitoring and IME state detection. Not available in browser-only mode.
