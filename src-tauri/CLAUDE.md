[根目录](../CLAUDE.md) > **src-tauri**

---

# src-tauri Module Documentation

## Module Responsibility

Tauri Rust backend for native capabilities. This module provides desktop-specific features including MCP process management, file system access, clipboard, screenshots, system monitoring, and code execution.

## Directory Structure

- `awareness/` — System awareness (activity tracker, focus tracker, system monitor, smart suggestions)
- `chat_widget/` — Chat widget window management
- `assistant_bubble/` — Assistant bubble window management
- `commands/` — Tauri commands (API, clipboard, Ollama, port, local provider, vector, selection, screenshot, OCR, context, awareness, sandbox, model download, environment, Jupyter, proxy, screen recording, chat widget, assistant bubble, window diagnostics, Git, process, academic, plugin, skill)
- `context/` — Context detection (app context, browser context, editor context, file context, screen content, window info)
- `jupyter/` — Jupyter integration (kernel, session, protocol)
- `mcp/` — MCP support (client, config, error, manager, protocol, transport, types)
- `plugin/` — Plugin system
- `process/` — Process management
- `sandbox/` — Code execution sandbox (db, docker, languages, native, podman, runtime)
- `screen_recording/` — Screen recording (history, recorder, video processor)
- `screenshot/` — Screenshot system (annotator, capture, OCR, providers, region selector, window manager, history, Windows OCR)
- `selection/` — Selection system (analyzer, clipboard context, clipboard history, detector, expander, extractor, history, mouse hook, smart selection, toolbar window, types)
- `skill/` — Skill service
- `tray/` — System tray

## Entry Points

- `src/main.rs` — Application entry point
- `src/lib.rs` — Library initialization and setup

## Key Files

- `Cargo.toml` — Rust dependencies and configuration
- `tauri.conf.json` — Tauri configuration (windows, plugins)
- `build.rs` — Build script

## Key Dependencies

### Tauri Plugins

- `tauri-plugin-log` — Logging
- `tauri-plugin-shell` — Shell commands
- `tauri-plugin-fs` — File system access
- `tauri-plugin-dialog` — Dialogs
- `tauri-plugin-notification` — Notifications
- `tauri-plugin-global-shortcut` — Global shortcuts
- `tauri-plugin-process` — Process info
- `tauri-plugin-os` — OS info
- `tauri-plugin-clipboard-manager` — Clipboard
- `tauri-plugin-geolocation` — Location
- `tauri-plugin-single-instance` — Single instance
- `tauri-plugin-devtools` — DevTools
- `tauri-plugin-opener` — URL opening
- `tauri-plugin-deep-link` — Deep links
- `tauri-plugin-stronghold` — Secure credentials
- `tauri-plugin-autostart` — Autostart (desktop)

### Rust Crates

- `tokio` — Async runtime
- `serde` — Serialization
- `reqwest` — HTTP client
- `arboard` — Clipboard
- `rdev` — Input capture
- `regex` — Pattern matching
- `dirs` — Directories
- `rusqlite` — SQLite
- `quick-xml` — XML parsing
- `nanoid` — Unique IDs
- `which` — Command detection

## Windows Configuration

The application defines 5 windows:

1. **main** — Main application window (1200x800)
2. **splashscreen** — Splash screen (400x300)
3. **selection-toolbar** — Selection toolbar (560x400, transparent, always on top)
4. **chat-widget** — Chat widget (420x600, always on top)
5. **region-selector** — Region selector (1920x1080, transparent, always on top)

## Command Categories

### MCP Commands

- Server management (get, add, remove, update, connect, disconnect)
- Tool calling (call_tool, get_all_tools)
- Resource access (read_resource, subscribe, unsubscribe)
- Prompts (get_prompt)
- Installation (install_npm_package, install_pip_package)
- Connection testing (ping, test)

### Selection Commands

- Detection (start, stop, trigger, get_status)
- Text retrieval (get_text, get_enhanced, analyze_current)
- Expansion (expand_to_word, sentence, line, paragraph)
- History (get_history, search_history, clear_history, export)
- Clipboard (get_history, search, pin, unpin, delete, copy)
- Smart actions (smart_expand, auto_expand, ai_process)

### Screenshot Commands

- Capture (fullscreen, window, region)
- OCR (ocr, ocr_windows, multi-provider)
- History (get_history, search, pin, unpin, delete)
- Window management (get_windows, capture_by_hwnd)

### Context Commands

- Get context (full, window, app, file, browser, editor)
- Cache management (clear_cache)
- Window search (find_by_title, find_by_process)

### Awareness Commands

- State (get_state, get_system_state)
- Activity (record_activity, get_recent_activities)
- Monitoring (start, stop, clear_history)
- Focus tracking (start, stop, get_current, get_stats)

### Sandbox Commands

- Execution (execute, quick_execute, execute_with_stdin)
- Configuration (get_config, update_config, set_runtime, set_timeout)
- Sessions (start, get, end, list, delete)
- Execution history (get, query, delete, toggle_favorite)
- Snippets (create, get, update, delete, execute)
- Statistics (get_language_stats, get_stats)

### Other Commands

- Jupyter (session management, execution, variables)
- Proxy (detect, test, get_system)
- Screen recording (start, stop, pause, resume, history)
- Chat widget (show, hide, toggle, minimize)
- Assistant bubble (show, hide, toggle, minimize)
- Git (init, clone, status, commit, push, pull, branches)
- Process (list, get, start, terminate)
- Academic (search, papers, library, collections)
- Plugin (scan, install, Python integration)
- Skill (repos, discover, install, enable, disable)

## Global Shortcuts

- `Ctrl+Shift+Space` — Toggle chat widget
- `Alt+Space` — Trigger selection toolbar
- `Ctrl+Shift+T` — Quick translate
- `Ctrl+Shift+E` — Quick explain
- `Alt+B` — Toggle bubble visibility
- `Alt+M` — Toggle bubble minimize

## Platform Support

### Windows

- Full support for all features
- Windows OCR for screenshots
- Battery monitoring
- Browser/editor context detection

### macOS

- Partial support
- Basic OCR
- Limited battery monitoring
- No browser/editor context

### Linux

- Partial support
- Basic OCR
- No battery monitoring
- No browser/editor context

## Common Patterns

### Creating Commands

```rust
// src-tauri/src/commands/my_commands.rs
use tauri::State;

#[tauri::command]
pub async fn my_command(input: String) -> Result<String, String> {
    // Command logic
    Ok(format!("Processed: {}", input))
}

// Register in lib.rs
.invoke_handler(tauri::generate_handler![
    commands::my_commands::my_command,
    // ... other commands
])
```

### State Management

```rust
// Create state type
pub struct MyState {
    data: Arc<Mutex<Vec<String>>>,
}

// Initialize in setup
app.manage(MyState {
    data: Arc::new(Mutex::new(Vec::new())),
});

// Use in command
#[tauri::command]
pub async fn get_data(state: State<'_, MyState>) -> Result<Vec<String>, String> {
    let data = state.data.lock().unwrap();
    Ok(data.clone())
}
```

## Testing

- **Framework**: None (Rust tests not configured)
- **Coverage**: Partial

## Related Files

- `lib/native/` — Native bridges in frontend
- `hooks/native/` — Native hooks
- `stores/system/` — System state

## Changelog

### 2025-01-14
- Initial module documentation created
- Indexed 15+ Rust modules
- Documented 100+ Tauri commands
- Documented platform support
