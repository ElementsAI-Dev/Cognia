---
description: Write and run Rust backend unit tests for Tauri modules with mocking, assertions, and coverage.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Parse Arguments**: Extract from user input:
   - Module name (e.g., `sandbox`, `awareness`, `mcp`)
   - Test type: `unit` | `integration`
   - Options: `--run`, `--coverage`, `--specific <test_name>`

2. **Locate Module**:

   ```
   src-tauri/src/
   ├── awareness/          # System awareness
   ├── chat_widget/        # Chat widget
   ├── context/            # Context management
   ├── input_completion/   # Input completion
   ├── mcp/                # MCP server
   ├── process/            # Process management
   ├── sandbox/            # Code sandbox
   ├── screen_recording/   # Screen recording
   ├── selection/          # Text selection
   ├── skill/              # Skill management
   └── skill_seekers/      # Skill generation
   ```

3. **Create Test Module**:

   Add test module at the bottom of the target file (e.g., `mod.rs` or specific file):

   ```rust
   #[cfg(test)]
   mod tests {
       use super::*;

       #[test]
       fn test_basic_functionality() {
           // Arrange
           let input = "test data";

           // Act
           let result = process(input);

           // Assert
           assert!(result.is_ok());
           assert_eq!(result.unwrap(), expected_value);
       }
   }
   ```

4. **Test Patterns**:

   **Basic Unit Test**:

   ```rust
   #[cfg(test)]
   mod tests {
       use super::*;

       #[test]
       fn test_create_config() {
           let config = Config::default();
           assert_eq!(config.timeout, 30);
           assert!(config.enabled);
       }

       #[test]
       fn test_validate_input() {
           assert!(validate("valid input").is_ok());
           assert!(validate("").is_err());
           assert!(validate("a".repeat(10001).as_str()).is_err());
       }
   }
   ```

   **Async Test** (requires `tokio`):

   ```rust
   #[cfg(test)]
   mod tests {
       use super::*;

       #[tokio::test]
       async fn test_async_operation() {
           let result = fetch_data("test-id").await;
           assert!(result.is_ok());

           let data = result.unwrap();
           assert_eq!(data.id, "test-id");
       }

       #[tokio::test]
       async fn test_timeout_handling() {
           let result = tokio::time::timeout(
               std::time::Duration::from_secs(5),
               long_running_operation()
           ).await;

           assert!(result.is_ok());
       }
   }
   ```

   **Error Case Testing**:

   ```rust
   #[test]
   fn test_error_cases() {
       // Test specific error variant
       let result = parse_config("invalid json");
       assert!(matches!(result, Err(ConfigError::ParseError(_))));

       // Test error message
       let err = result.unwrap_err();
       assert!(err.to_string().contains("parse"));
   }

   #[test]
   #[should_panic(expected = "out of bounds")]
   fn test_panic_case() {
       let items = vec![1, 2, 3];
       let _ = items[5]; // Should panic
   }
   ```

   **Test with Setup/Teardown**:

   ```rust
   #[cfg(test)]
   mod tests {
       use super::*;
       use tempfile::TempDir;

       struct TestFixture {
           dir: TempDir,
           db: Database,
       }

       impl TestFixture {
           fn new() -> Self {
               let dir = TempDir::new().unwrap();
               let db = Database::open(dir.path()).unwrap();
               TestFixture { dir, db }
           }
       }

       #[test]
       fn test_with_fixture() {
           let fixture = TestFixture::new();
           fixture.db.insert("key", "value").unwrap();

           let result = fixture.db.get("key").unwrap();
           assert_eq!(result, Some("value".to_string()));
           // TempDir is automatically cleaned up when dropped
       }
   }
   ```

   **Testing Serialization**:

   ```rust
   #[test]
   fn test_serialization() {
       let item = MyStruct {
           name: "test".to_string(),
           value: 42,
       };

       // Serialize
       let json = serde_json::to_string(&item).unwrap();
       assert!(json.contains("\"name\":\"test\""));

       // Deserialize
       let parsed: MyStruct = serde_json::from_str(&json).unwrap();
       assert_eq!(parsed.name, "test");
       assert_eq!(parsed.value, 42);
   }
   ```

   **Testing Collections**:

   ```rust
   #[test]
   fn test_collection_operations() {
       let mut manager = ItemManager::new();

       // Add items
       manager.add(Item::new("a"));
       manager.add(Item::new("b"));
       assert_eq!(manager.len(), 2);

       // Remove item
       manager.remove("a");
       assert_eq!(manager.len(), 1);
       assert!(!manager.contains("a"));
       assert!(manager.contains("b"));
   }
   ```

5. **Run Tests**:

   ```bash
   # Run all Rust tests
   cd src-tauri && cargo test

   # Run tests for specific module
   cd src-tauri && cargo test <module_name>

   # Run specific test function
   cd src-tauri && cargo test <test_function_name>

   # Run tests with output (see println!)
   cd src-tauri && cargo test -- --nocapture

   # Run tests matching pattern
   cd src-tauri && cargo test -- --test-threads=1 <pattern>

   # List all tests without running
   cd src-tauri && cargo test -- --list
   ```

6. **Test Tauri Commands**:

   ```rust
   #[cfg(test)]
   mod tests {
       use super::*;

       // For testing Tauri commands, test the underlying logic
       // rather than the command wrapper itself

       #[test]
       fn test_command_logic() {
           // Test the business logic function directly
           let result = process_data("input");
           assert!(result.is_ok());
       }

       #[tokio::test]
       async fn test_async_command_logic() {
           let state = AppState::default();
           let result = handle_request(&state, "param").await;
           assert!(result.is_ok());
       }
   }
   ```

7. **Common Test Assertions**:

   ```rust
   // Equality
   assert_eq!(actual, expected);
   assert_ne!(actual, unexpected);

   // Boolean
   assert!(condition);
   assert!(!condition);

   // Pattern matching
   assert!(matches!(value, Pattern::Variant(_)));

   // Result checks
   assert!(result.is_ok());
   assert!(result.is_err());

   // Option checks
   assert!(option.is_some());
   assert!(option.is_none());
   assert_eq!(option, Some(expected_value));

   // String contains
   assert!(string.contains("substring"));

   // Float comparison (approximate)
   assert!((actual - expected).abs() < 0.001);

   // Custom message on failure
   assert_eq!(actual, expected, "Expected {} but got {}", expected, actual);
   ```

8. **Verify Results**:

   ```bash
   # Check all tests pass
   cd src-tauri && cargo test 2>&1

   # Check compilation without running tests
   cd src-tauri && cargo test --no-run

   # Check specific module compiles
   cd src-tauri && cargo check
   ```

## Test Organization

| Location | What to Test |
|----------|-------------|
| `mod.rs` | Module-level integration |
| `*.rs` files | Function-level unit tests |
| `tests/` directory | Cross-module integration tests |

## Best Practices

- Test public API, not internal implementation
- Use descriptive test names: `test_<function>_<scenario>_<expected>`
- One assertion per test when possible
- Use `#[ignore]` for slow tests, run with `cargo test -- --ignored`
- Use `tempfile` crate for filesystem tests
- Mock external services, don't make real network calls
- Test error paths, not just happy paths
- Keep tests independent — no shared mutable state between tests

## Notes

- Tauri `State` and `AppHandle` are hard to mock — test business logic directly
- Use `#[cfg(test)]` to keep test code out of production builds
- `cargo test` runs tests in parallel by default, use `--test-threads=1` for sequential
- Add `tokio` with `test` feature for async tests: `tokio = { features = ["test-util"] }`
- Building tests may require significant disk space due to debug symbols
