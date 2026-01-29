---
description: Generate or improve documentation for code, APIs, and components
---

# Document Workflow

Generate comprehensive documentation for a codebase, module, or component.

## Prerequisites

- Target code path provided
- Understanding of documentation standards (JSDoc, TSDoc, Rustdoc)

## Phase 1: Analysis

1. **Identify documentation targets**

   - Public APIs
   - Exported functions/classes
   - React components (props)
   - Hooks (parameters, return values)
   - Type definitions
   - Configuration options

2. **Check existing documentation**

   - README files
   - Inline comments
   - JSDoc/TSDoc blocks
   - API docs

3. **Identify gaps**

   - Missing function descriptions
   - Undocumented parameters
   - Missing examples
   - Outdated information

## Phase 2: Documentation Types

### 2.1 Inline Documentation (JSDoc/TSDoc)

```typescript
/**
 * Brief description of the function.
 *
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @throws {ErrorType} When this error occurs
 * @example
 * ```ts
 * const result = myFunction('input')
 * ```
 */
```

### 2.2 React Component Props

```typescript
interface ComponentProps {
  /** Description of this prop */
  propName: string
  /** Optional prop with default value */
  optional?: boolean
}
```

### 2.3 README Documentation

Structure:

- Overview/Description
- Installation
- Quick Start
- API Reference
- Examples
- Configuration
- Troubleshooting

### 2.4 Rust Documentation

```rust
/// Brief description.
///
/// # Arguments
///
/// * `param` - Description
///
/// # Returns
///
/// Description of return value
///
/// # Examples
///
/// ```
/// let result = my_function(arg);
/// ```
```

## Phase 3: Generation Process

For each undocumented item:

1. **Read the implementation**

   - Understand what it does
   - Identify edge cases
   - Note side effects

2. **Write documentation**

   - Clear, concise description
   - All parameters documented
   - Return value explained
   - Errors/exceptions listed
   - Usage example provided

3. **Verify accuracy**

   - Test examples work
   - Check parameter types match
   - Ensure description is accurate

## Phase 4: Output Formats

### Option A: Inline Updates

Add documentation directly to source files.

### Option B: Separate Docs

Generate markdown files in `docs/` directory:

- `docs/api/` - API reference
- `docs/guides/` - How-to guides
- `docs/examples/` - Code examples

### Option C: README Updates

Update or create README.md files in each module.

## Phase 5: Quality Checklist

- [ ] All public APIs documented
- [ ] All parameters have descriptions
- [ ] Return values documented
- [ ] Examples are runnable
- [ ] No outdated information
- [ ] Links are valid
- [ ] Consistent formatting
- [ ] Spelling/grammar checked

## Templates

### Function Template

```typescript
/**
 * [What this function does].
 *
 * [Additional context if needed].
 *
 * @param name - [Description]
 * @returns [Description]
 * @example
 * [Runnable example]
 */
```

### Component Template

```typescript
/**
 * [What this component renders/does].
 *
 * @example
 * ```tsx
 * <ComponentName prop="value" />
 * ```
 */
```

### Hook Template

```typescript
/**
 * [What this hook provides].
 *
 * @param options - [Description of options]
 * @returns [Description of return object/tuple]
 * @example
 * ```ts
 * const { data, loading } = useHookName(options)
 * ```
 */
```

## Important Notes

- **Don't state the obvious** - avoid "This function does X" when X is the function name
- **Focus on why** not just what
- **Include edge cases** in documentation
- **Keep examples simple** but realistic
- **Update tests** if examples reveal bugs
