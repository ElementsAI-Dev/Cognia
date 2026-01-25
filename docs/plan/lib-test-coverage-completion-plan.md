# Lib Directory Test Coverage Completion Plan

**Date**: January 25, 2026
**Status**: Active Planning
**Overall Coverage**: 81.6% (302/370 files tested)
**Target**: 90%+ coverage

---

## Executive Summary

This plan details the comprehensive test coverage analysis and completion roadmap for the `lib/` directory. The analysis identified **68 files without tests** across 62 subdirectories, categorized by priority and implementation phases.

### Key Metrics

| Metric | Value |
|--------|-------|
| Total Source Files | 370 |
| Files with Tests | 302 (81.6%) |
| Files without Tests | 68 (18.4%) |
| High Priority Gaps | 18 files |
| Medium Priority Gaps | 17 files |
| Low Priority Gaps | 33+ files |

---

## Critical Gaps (High Priority)

### 1. SpeedPass Learning Module - 0% Coverage

**Location**: `lib/learning/`
**Impact**: Critical - Core educational feature
**Files**: 6 files, 520+ lines

| File | Lines | Priority | Complexity |
|------|-------|----------|------------|
| `knowledge-extractor.ts` | 520 | P0 | High |
| `speedpass-processor.ts` | ~200 | P0 | Medium |
| `progress-tracker.ts` | ~150 | P1 | Low |
| `quiz-generator.ts` | ~180 | P1 | Medium |
| `analytics.ts` | ~120 | P1 | Medium |
| `index.ts` | ~50 | P2 | Low |

**Implementation Plan**:
```typescript
// Test structure needed
describe('SpeedPass Learning', () => {
  describe('KnowledgeExtractor', () => {
    - test extraction from markdown
    - test extraction from code
    - test chunk splitting
    - test concept detection
  })

  describe('SpeedPassProcessor', () => {
    - test card generation
    - test scheduling algorithm
    - test progress calculation
  })

  describe('ProgressTracker', () => {
    - test session tracking
    - test retention calculation
    - test mastery detection
  })
})
```

**Estimated Effort**: 12-16 hours

---

### 2. Settings System - 0% Coverage

**Location**: `lib/settings/`
**Impact**: High - User configuration management
**Files**: 7 files

| File | Lines | Priority | Notes |
|------|-------|----------|-------|
| `search-index.ts` | ~200 | P0 | Fuzzy search, critical |
| `config-validator.ts` | ~150 | P0 | Schema validation |
| `preset-manager.ts` | ~180 | P1 | Export/import logic |
| `profile-manager.ts` | ~160 | P1 | Profile switching |
| `migration.ts` | ~250 | P1 | Data migrations |
| `defaults.ts` | ~100 | P2 | Static configuration |
| `index.ts` | ~30 | P2 | Exports |

**Implementation Plan**:
```typescript
// Test structure needed
describe('Settings System', () => {
  describe('SearchIndex', () => {
    - test fuzzy matching
    - test weighting algorithm
    - test result ranking
  })

  describe('ConfigValidator', () => {
    - test provider schema validation
    - test model validation
    - test API key format validation
  })

  describe('Migration', () => {
    - test version migration
    - test rollback capability
    - test data integrity
  })
})
```

**Estimated Effort**: 10-14 hours

---

### 3. AI Routing Configuration - 33% Coverage

**Location**: `lib/ai/routing/`
**Impact**: Critical - Core AI routing logic
**Files**: 1 major untested file

| File | Lines | Priority | Notes |
|------|-------|----------|-------|
| `routing-config.ts` | 507 | P0 | Central routing config |

**Why This Matters**: The routing configuration controls how requests are distributed across 14+ AI providers. Untested routing logic can cause:
- Incorrect provider selection
- Poor performance/cost optimization
- Failed requests

**Implementation Plan**:
```typescript
describe('RoutingConfig', () => {
  describe('Model Selection', () => {
    - test fast tier selection
    - test balanced tier selection
    - test reasoning tier selection
  })

  describe('Capability Detection', () => {
    - test tool support detection
    - test vision capability detection
    - test streaming support
  })

  describe('Cost Optimization', () => {
    - test cost calculation
    - test budget-aware routing
  })
})
```

**Estimated Effort**: 6-8 hours

---

### 4. Workflow Git Integration - 0% Coverage

**Location**: `lib/workflow/git/`
**Impact**: High - Version control for workflows
**Files**: 1 major file

| File | Lines | Priority | Notes |
|------|-------|----------|-------|
| `git-service.ts` | 357 | P1 | Git operations |

**Implementation Plan**:
```typescript
describe('GitService', () => {
  - test commit creation
  - test branch management
  - test diff generation
  - test merge operations
  - test error handling
})
```

**Estimated Effort**: 4-6 hours

---

### 5. MCP Server Configuration - Partial Coverage

**Location**: `lib/mcp/`
**Impact**: High - MCP server management
**Files**: 2 untested files

| File | Lines | Priority | Notes |
|------|-------|----------|-------|
| `server-config.ts` | ~150 | P1 | Server template config |
| `env-resolver.ts` | ~120 | P1 | Environment variable resolution |

**Estimated Effort**: 4-5 hours

---

### 6. Text-to-Speech Providers - 0% Coverage

**Location**: `lib/ai/media/tts/`
**Impact**: Medium - Voice output feature
**Files**: 4 files

| File | Priority | Notes |
|------|----------|-------|
| `tts-provider.ts` | P1 | Provider interface |
| `browser-tts.ts` | P1 | Web Speech API |
| `elevenlabs-tts.ts` | P2 | ElevenLabs integration |
| `openai-tts.ts` | P2 | OpenAI TTS |

**Estimated Effort**: 6-8 hours

---

### 7. Database Utilities - Partial Coverage

**Location**: `lib/db/`
**Impact**: High - Data persistence layer
**Files**: 2 untested files

| File | Lines | Priority | Notes |
|------|-------|----------|-------|
| `connection.ts` | ~120 | P0 | Connection management |
| `migration.ts` | ~200 | P1 | Schema migrations |

**Estimated Effort**: 4-6 hours

---

### 8. Provider Configurations - Partial Coverage

**Location**: `lib/ai/providers/`
**Impact**: Critical - AI provider integrations
**Files**: Several untested configs

**Estimated Effort**: 8-10 hours

---

### 9. Plugin Hooks System - Partial Coverage

**Location**: `lib/plugin/`
**Impact**: Medium - Extensibility
**Files**: 2-3 untested files

**Estimated Effort**: 4-5 hours

---

### 10. Agent Prompt Builder - 0% Coverage

**Location**: `lib/ai/agent/`
**Impact**: High - Agent system
**Files**: 1 file

| File | Lines | Priority |
|------|-------|----------|
| `prompt-builder.ts` | ~200 | P1 |

**Estimated Effort**: 3-4 hours

---

## Medium Priority Gaps

### UI Utilities and Formatters

**Location**: `lib/ui/`, `lib/utils/`, `lib/themes/`

| Directory | Untested Files | Priority |
|-----------|----------------|----------|
| `lib/ui/` | 5 files | P2 |
| `lib/themes/` | 3 files | P2 |
| `lib/utils/` | 4 files | P2 |

**Total Estimated Effort**: 15-20 hours

---

### Context System

**Location**: `lib/context/`

| File | Priority | Notes |
|------|----------|-------|
| `context-detector.ts` | P2 | Window/app detection |
| `context-cache.ts` | P2 | Caching logic |

**Estimated Effort**: 3-4 hours

---

### Media Processing

**Location**: `lib/media/`

| File | Priority | Notes |
|------|----------|-------|
| `video-processor.ts` | P2 | Video editing utilities |
| `audio-processor.ts` | P2 | Audio processing |

**Estimated Effort**: 5-6 hours

---

## Low Priority Gaps

### Constants and Type Definitions

These files typically don't require unit tests but should be validated through integration tests:

- `lib/constants/` - Static constants
- `lib/*/types.ts` - Type definitions
- `lib/*/index.ts` - Export barrels

**Recommendation**: Validate via integration/e2e tests

---

### Stub Implementations

**Location**: `lib/stubs/`

These are browser compatibility stubs for desktop-only features.

**Recommendation**: Test only if critical fallback logic exists

---

## Implementation Phases

### Phase 1: Critical Core (Weeks 1-2)

**Goal**: Address all P0 gaps

| Module | Files | Effort |
|--------|-------|--------|
| SpeedPass Learning | 6 files | 12-16h |
| Settings Search | 1 file | 3-4h |
| Settings Validator | 1 file | 2-3h |
| AI Routing Config | 1 file | 6-8h |
| DB Connection | 1 file | 2-3h |

**Total**: ~25-34 hours

**Deliverables**:
- All SpeedPass learning tests
- Settings search and validation tests
- AI routing configuration tests
- Database connection tests

**Success Criteria**:
- 100% coverage for P0 files
- All tests passing
- No critical bugs detected

---

### Phase 2: High Priority Features (Weeks 3-4)

**Goal**: Address P1 gaps

| Module | Files | Effort |
|--------|-------|--------|
| Settings Manager | 3 files | 4-5h |
| Workflow Git | 1 file | 4-6h |
| MCP Config | 2 files | 4-5h |
| TTS Providers | 4 files | 6-8h |
| DB Migration | 1 file | 3-4h |
| Agent Prompt Builder | 1 file | 3-4h |

**Total**: ~24-32 hours

**Deliverables**:
- Complete settings system tests
- Workflow Git integration tests
- MCP configuration tests
- TTS provider tests
- Database migration tests
- Agent prompt builder tests

**Success Criteria**:
- 90%+ coverage for P1 files
- Integration tests working
- Performance benchmarks met

---

### Phase 3: Medium Priority (Month 2)

**Goal**: Address P2 gaps

| Module | Files | Effort |
|--------|-------|--------|
| UI Utilities | 12 files | 15-20h |
| Context System | 2 files | 3-4h |
| Media Processing | 2 files | 5-6h |
| Plugin Hooks | 2 files | 4-5h |

**Total**: ~27-35 hours

**Deliverables**:
- UI utility tests
- Context detection tests
- Media processing tests
- Plugin hook tests

**Success Criteria**:
- 85%+ coverage for P2 files
- All helper functions tested

---

### Phase 4: Validation and Integration (Ongoing)

**Goal**: Ensure integration test coverage

- Add integration tests for multi-file workflows
- Add e2e tests for critical user paths
- Performance testing for AI routing
- Load testing for database operations

---

## Testing Best Practices

### Unit Test Structure

```typescript
// Recommended test file structure
describe('ModuleName', () => {
  describe('FunctionName', () => {
    describe('when condition X', () => {
      it('should do Y', () => {
        // Arrange
        const input = { ... }

        // Act
        const result = functionUnderTest(input)

        // Assert
        expect(result).toBe(expected)
      })
    })
  })
})
```

### Coverage Goals

| Type | Target |
|------|--------|
| Lines | 80%+ |
| Branches | 70%+ |
| Functions | 80%+ |
| Statements | 80%+ |

### Mock Guidelines

- Mock external dependencies (APIs, databases)
- Don't mock the code under test
- Use factories for test data
- Clean up mocks after each test

---

## Quick Reference

### Files by Priority

#### P0 (Critical - Phase 1)
- `lib/learning/knowledge-extractor.ts` (520 lines)
- `lib/learning/speedpass-processor.ts`
- `lib/settings/search-index.ts`
- `lib/settings/config-validator.ts`
- `lib/ai/routing/routing-config.ts` (507 lines)
- `lib/db/connection.ts`

#### P1 (High - Phase 2)
- `lib/learning/quiz-generator.ts`
- `lib/learning/analytics.ts`
- `lib/settings/preset-manager.ts`
- `lib/settings/profile-manager.ts`
- `lib/settings/migration.ts`
- `lib/workflow/git/git-service.ts` (357 lines)
- `lib/mcp/server-config.ts`
- `lib/mcp/env-resolver.ts`
- `lib/ai/media/tts/*.ts` (4 files)
- `lib/db/migration.ts`
- `lib/ai/agent/prompt-builder.ts`

#### P2 (Medium - Phase 3)
- `lib/ui/*` (5 files)
- `lib/themes/*` (3 files)
- `lib/utils/*` (4 files)
- `lib/context/*` (2 files)
- `lib/media/*` (2 files)
- `lib/plugin/*` (2 files)

### Files by Complexity

| Complexity Range | Files | Priority |
|------------------|-------|----------|
| 500+ lines | 2 | P0 |
| 300-499 lines | 1 | P1 |
| 200-299 lines | 3 | P0-P1 |
| 100-199 lines | 15 | P1-P2 |
| <100 lines | 47 | P2-P3 |

---

## Progress Tracking

### Current Status

- [ ] Phase 1: Critical Core (0/5 modules)
- [ ] Phase 2: High Priority (0/6 modules)
- [ ] Phase 3: Medium Priority (0/4 modules)
- [ ] Phase 4: Integration Tests (0%)

### Coverage Target

| Phase | Target | Current | Gap |
|-------|--------|---------|-----|
| Start | 81.6% | 81.6% | - |
| Phase 1 Complete | 85% | TBD | - |
| Phase 2 Complete | 88% | TBD | - |
| Phase 3 Complete | 90% | TBD | - |
| Phase 4 Complete | 92%+ | TBD | - |

---

## Resources

### Related Documentation

- [lib/test-coverage-report.md](../lib/test-coverage-report.md) - Detailed coverage report
- [llmdoc/agent/lib-test-coverage-analysis-2025-01-25.md](../llmdoc/agent/lib-test-coverage-analysis-2025-01-25.md) - Analysis report
- [jest.config.ts](../jest.config.ts) - Jest configuration

### Commands

```bash
# Run all tests
pnpm test

# Run tests for specific directory
pnpm test lib/learning

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test lib/learning/knowledge-extractor.test.ts

# Watch mode
pnpm test:watch
```

---

## Appendix: Detailed File Listing

### Complete Untested Files by Directory

See `lib/test-coverage-report.md` for the complete file-by-file breakdown.

---

**Document Version**: 1.0
**Last Updated**: January 25, 2026
**Next Review**: After Phase 1 completion
