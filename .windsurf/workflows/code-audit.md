---
description: Comprehensive code audit and optimization planning for a given folder
---

# Code Audit Workflow

Perform thorough code inspection on a folder, identify optimization opportunities, and generate a detailed improvement plan.

## Prerequisites

- Target folder path provided by user
- Understanding of project context (tech stack, conventions)

## Phase 1: Initial Discovery

1. **List folder structure**

   ```bash
   Use list_dir or find_by_name to enumerate all files in the target folder
   ```

2. **Identify file types and count**
   - Source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.rs`, etc.)
   - Test files (`*.test.*`, `*.spec.*`)
   - Configuration files
   - Documentation

3. **Read key files for context**
   - Entry points and main modules
   - Type definitions
   - Configuration files

## Phase 2: Code Quality Analysis

Check each file for the following issues:

### 2.1 Structure & Organization

- [ ] Duplicate code patterns
- [ ] Functions exceeding 50 lines
- [ ] Files exceeding 300 lines
- [ ] Deeply nested logic (>3 levels)
- [ ] Circular dependencies
- [ ] Improper module boundaries

### 2.2 Naming & Readability

- [ ] Inconsistent naming conventions
- [ ] Ambiguous variable/function names
- [ ] Magic numbers without constants
- [ ] Missing or outdated comments for complex logic

### 2.3 Error Handling

- [ ] Empty catch blocks
- [ ] Missing error boundaries
- [ ] Unhandled promise rejections
- [ ] Missing input validation

### 2.4 Performance

- [ ] Inefficient algorithms (O(n²) where O(n) possible)
- [ ] Unnecessary re-renders (React)
- [ ] Missing memoization opportunities
- [ ] Redundant computations
- [ ] Memory leaks (uncleaned subscriptions, listeners)
- [ ] Large bundle imports

### 2.5 Type Safety (TypeScript/Rust)

- [ ] `any` type usage
- [ ] Missing type annotations
- [ ] Unsafe type assertions
- [ ] Incomplete generic constraints

### 2.6 Security

- [ ] Hardcoded secrets
- [ ] SQL injection vulnerabilities
- [ ] XSS attack vectors
- [ ] Missing authentication/authorization checks
- [ ] Insecure data handling

### 2.7 Testing

- [ ] Missing test coverage for critical paths
- [ ] Weak assertions
- [ ] Missing edge case tests
- [ ] Flaky test patterns

## Phase 3: Deep Analysis

Use `mcp0_search_context` to understand:

- Cross-file dependencies
- Data flow patterns
- Integration points
- Shared utilities usage

Use `grep_search` for specific patterns:

- TODO/FIXME comments
- Deprecated API usage
- Console.log statements (production code)
- Disabled linter rules

## Phase 4: Generate Optimization Plan

### Output Format

For each identified issue, document:

```markdown
### [Priority: HIGH/MEDIUM/LOW] Issue Title

**Location**: `@/path/to/file.ts:line-range`

**Current Problem**:
Brief description of the issue

**Suggested Fix**:
Specific recommendation for improvement

**Expected Benefit**:
- Performance: X% improvement / reduced memory
- Maintainability: easier to understand/modify
- Reliability: prevents potential bugs

**Effort Estimate**: Small (< 1hr) / Medium (1-4hr) / Large (> 4hr)
```

### Priority Guidelines

**HIGH Priority**:

- Security vulnerabilities
- Data corruption risks
- Critical performance bottlenecks
- Blocking bugs

**MEDIUM Priority**:

- Code duplication
- Missing error handling
- Performance improvements
- Type safety issues

**LOW Priority**:

- Naming improvements
- Code style consistency
- Documentation gaps
- Minor refactoring

## Phase 5: Summary Report

Provide:
1. Executive summary (2-3 sentences)
2. Total issues found by priority
3. Recommended action order
4. Estimated total effort
5. Quick wins (high impact, low effort)

## Important Notes

- **Do NOT modify code** during audit - analysis only
- **Ask for clarification** if business logic is unclear
- **Consider context** - some patterns may be intentional
- **Check existing issues** - avoid duplicating known problems
- **Verify assumptions** before reporting false positives
