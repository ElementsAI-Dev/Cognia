---
description: Tauri development workflow for Rust backend commands, events, and native integrations.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Parse Arguments**: Determine task type:
   - `command` - Add new Tauri command
   - `event` - Add event emitter/listener
   - `plugin` - Integrate Tauri plugin
   - `build` - Build desktop app
   - `debug` - Debug native code

2. **Environment Check**:

   ```bash
   # Verify Rust installation (requires 1.77+)
   rustc --version
   
   # Check Tauri CLI
   pnpm tauri --version
   
   # Verify project setup
   cd src-tauri && cargo check
   ```

3. **Add Tauri Command**:

   **Rust Command** (`src-tauri/src/commands/<module>.rs`):

   ```rust
   use tauri::State;
   use crate::state::AppState;
   
   #[tauri::command]
   pub async fn command_name(
       state: State<'_, AppState>,
       param: String,
   ) -> Result<ResponseType, String> {
       // Implementation
       Ok(result)
   }
   ```

   **Register in `lib.rs`**:

   ```rust
   .invoke_handler(tauri::generate_handler![
       commands::module::command_name,
   ])
   ```

   **TypeScript Wrapper** (`lib/native/<feature>.ts`):

   ```typescript
   import { invoke } from '@tauri-apps/api/core'
   import { isTauri } from '@/lib/utils'
   
   export async function commandName(param: string): Promise<ResponseType> {
     if (!isTauri()) {
       throw new Error('This feature requires desktop app')
     }
     return invoke<ResponseType>('command_name', { param })
   }
   ```

4. **Add Event System**:

   **Rust Emitter**:

   ```rust
   use tauri::{AppHandle, Emitter};
   
   pub fn emit_event(app: &AppHandle, payload: PayloadType) {
       app.emit("event-name", payload).ok();
   }
   ```

   **TypeScript Listener**:

   ```typescript
   import { listen, type UnlistenFn } from '@tauri-apps/api/event'
   
   export function onEventName(
     callback: (payload: PayloadType) => void
   ): Promise<UnlistenFn> {
     return listen<PayloadType>('event-name', (event) => {
       callback(event.payload)
     })
   }
   ```

   **React Hook**:

   ```typescript
   export function useEventName(callback: (payload: PayloadType) => void) {
     useEffect(() => {
       let unlisten: UnlistenFn | undefined
       
       onEventName(callback).then((fn) => {
         unlisten = fn
       })
       
       return () => unlisten?.()
     }, [callback])
   }
   ```

5. **Development Commands**:

   ```bash
   # Run development server
   pnpm tauri dev
   
   # Run with debug logging
   RUST_LOG=debug pnpm tauri dev
   
   # Check Rust code
   cd src-tauri && cargo check
   
   # Run Rust tests
   cd src-tauri && cargo test
   
   # Build release
   pnpm tauri build
   ```

6. **Project Structure**:

   ```
   src-tauri/
   ├── src/
   │   ├── lib.rs              # Main entry, command registration
   │   ├── state.rs            # App state
   │   ├── commands/           # Tauri commands
   │   │   ├── mod.rs
   │   │   ├── awareness/
   │   │   ├── context/
   │   │   ├── sandbox/
   │   │   └── ...
   │   ├── awareness/          # Feature modules
   │   ├── context/
   │   ├── mcp/
   │   ├── sandbox/
   │   └── ...
   ├── Cargo.toml
   └── tauri.conf.json
   ```

## Type Mapping

| Rust Type | TypeScript Type |
|-----------|-----------------|
| `String` | `string` |
| `i32`, `i64` | `number` |
| `bool` | `boolean` |
| `Vec<T>` | `T[]` |
| `Option<T>` | `T \| null` |
| `HashMap<K, V>` | `Record<K, V>` |
| `Result<T, E>` | Promise resolves or rejects |

## Error Handling

**Rust**:

```rust
#[derive(Debug, thiserror::Error)]
pub enum CommandError {
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Invalid input: {0}")]
    InvalidInput(String),
}

impl serde::Serialize for CommandError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
```

**TypeScript**:

```typescript
try {
  const result = await commandName(param)
} catch (error) {
  console.error('Command failed:', error)
}
```

## Plugin Integration

```rust
// tauri.conf.json plugins
{
  "plugins": {
    "shell": { "open": true }
  }
}

// Rust usage
use tauri_plugin_shell::ShellExt;

app.shell().open("https://example.com", None)?;
```

## Debugging Tips

- Use `RUST_LOG=debug` for verbose logging
- Add `println!` or `dbg!` for quick debugging
- Check DevTools console for frontend errors
- Use `cargo check` before full build
- Test commands with Tauri CLI: `pnpm tauri dev`

## Notes

- Always use `isTauri()` guard in frontend code
- Register all commands in `lib.rs`
- Keep commands thin, put logic in modules
- Use `State` for shared app state
- Emit events for long-running operations
- Test Rust code with `cargo test`
