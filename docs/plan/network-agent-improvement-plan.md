# Network and Agent System Improvement Plan


## Analysis Summary

 

### Files Analyzed

 

#### Network System

 

- `@/src-tauri/src/http.rs` - Rust HTTP client module
- `@/src-tauri/src/commands/system/proxy.rs` - Proxy detection and testing
- `@/lib/network/proxy-fetch.ts` - TypeScript proxy-aware fetch
- `@/lib/ai/core/proxy-client.ts` - AI provider proxy integration
- `@/stores/system/proxy-store.ts` - Proxy state management

#### Agent System
- `@/lib/ai/agent/agent-executor.ts` - Core agent execution
- `@/lib/ai/agent/agent-loop.ts` - Task planning and loop
- `@/lib/ai/agent/agent-orchestrator.ts` - Sub-agent coordination
- `@/lib/ai/agent/background-agent-manager.ts` - Background agent management
- `@/lib/ai/agent/sub-agent-executor.ts` - Sub-agent execution
- `@/lib/ai/tools/tool-call-manager.ts` - Parallel tool execution
- `@/lib/ai/core/middleware.ts` - AI middleware and safety

---

## Issues and Improvements

### 🔴 HIGH Priority

#### 1. HTTP Client Module Dead Code Flag
**Location**: `@/src-tauri/src/http.rs:6`
**Issue**: Entire module marked with `#![allow(dead_code)]`
**Impact**: HTTP clients (`HTTP_CLIENT`, `HTTP_CLIENT_LONG`, `HTTP_CLIENT_QUICK`) may not be used consistently across the codebase

**Plan**:
- [ ] Remove `#![allow(dead_code)]` attribute
- [ ] Audit all HTTP requests in Rust backend
- [ ] Replace ad-hoc `reqwest::Client::builder()` calls with shared clients
- [ ] Update these files to use `crate::http`:
  - `src-tauri/src/commands/system/proxy.rs` (lines 226, 335, 523)
  - `src-tauri/src/commands/storage/model_download.rs`
  - Academic providers (arxiv, core, dblp, openalex, semantic_scholar, unpaywall)

#### 2. Proxy Not Actually Applied in Tauri Environment
**Location**: `@/lib/network/proxy-fetch.ts:112-131`
**Issue**: In Tauri environment, `createProxyFetch` logs proxy URL but doesn't actually route through proxy - just uses regular `fetch()`
**Impact**: Proxy settings don't work in desktop app

**Plan**:
- [ ] Create Tauri command for proxied HTTP requests
- [ ] Implement `tauri_proxied_fetch` in Rust using `create_client_with_proxy`
- [ ] Update `createProxyFetch` to invoke Tauri command when in desktop mode
- [ ] Add fallback to regular fetch if command fails

#### 3. Agent Executor Missing Error Recovery
**Location**: `@/lib/ai/agent/agent-executor.ts:825-937`
**Issue**: `generateText` call lacks comprehensive error handling for:
- Network failures mid-execution
- Token limit exceeded
- Model-specific errors
- Rate limiting

**Plan**:
- [ ] Wrap `generateText` with retry logic using `withRetryAsync`
- [ ] Add specific error handlers for different error types
- [ ] Implement graceful degradation (partial results on error)
- [ ] Add circuit breaker pattern for repeated failures

---

### 🟡 MEDIUM Priority

#### 4. Inconsistent Retry Logic Across Network Layers
**Location**: Multiple files
**Issue**: Different retry implementations exist:
- `@/lib/ai/core/middleware.ts:170-197` - `withRetryAsync`
- `@/lib/mcp/marketplace-utils.ts:163-184` - `withRetry`
- `@/lib/ai/agent/agent-executor.ts:460-496` - inline retry

**Plan**:
- [ ] Create unified retry utility in `@/lib/utils/retry.ts`
- [ ] Support configurable:
  - Max retries
  - Backoff strategy (exponential, linear, constant)
  - Jitter
  - Retryable error detection
- [ ] Refactor all usages to use unified utility

#### 5. Agent Loop Missing Cancellation Support
**Location**: `@/lib/ai/agent/agent-loop.ts`
**Issue**: `executeAgentLoop` cannot be cancelled once started
**Impact**: User cannot stop a running agent loop

**Plan**:
- [ ] Add `CancellationToken` parameter to `AgentLoopConfig`
- [ ] Check token between task executions
- [ ] Add `onCancel` callback
- [ ] Update `createAgentLoop` to expose cancel method

#### 6. Background Agent Manager Missing Graceful Shutdown
**Location**: `@/lib/ai/agent/background-agent-manager.ts`
**Issue**: No method to gracefully shut down all agents on app close
**Impact**: Agents may be interrupted without saving state

**Plan**:
- [ ] Add `shutdown()` method that:
  - Pauses queue processing
  - Creates checkpoints for running agents
  - Waits for graceful completion or timeout
  - Persists state
- [ ] Hook into Tauri app close event

#### 7. Tool Call Manager Missing Metrics Collection
**Location**: `@/lib/ai/tools/tool-call-manager.ts`
**Issue**: No metrics/observability for tool execution performance
**Impact**: Cannot diagnose slow tools or bottlenecks

**Plan**:
- [ ] Add timing metrics per tool
- [ ] Track success/failure rates
- [ ] Add histogram for execution durations
- [ ] Integrate with `globalMetricsCollector`

#### 8. Proxy Store Missing Connection Health Monitoring
**Location**: `@/stores/system/proxy-store.ts`
**Issue**: No periodic health check for active proxy
**Impact**: Stale proxy status, user not notified of connection issues

**Plan**:
- [ ] Add `healthCheckInterval` setting
- [ ] Implement background health check
- [ ] Update `connected` status automatically
- [ ] Add notification when proxy connection lost

---

### 🟢 LOW Priority

#### 9. HTTP Client Missing User-Agent Header
**Location**: `@/src-tauri/src/http.rs:30-38`
**Issue**: No default User-Agent header set on HTTP clients
**Impact**: Some servers may reject requests

**Plan**:
- [ ] Add `.user_agent()` to client builders
- [ ] Use consistent UA: `Cognia/{version} (Tauri)`

#### 10. Agent Orchestrator Missing Progress Persistence
**Location**: `@/lib/ai/agent/agent-orchestrator.ts:174-201`
**Issue**: `OrchestratorState` not persisted during execution
**Impact**: Progress lost if app crashes

**Plan**:
- [ ] Add periodic state persistence
- [ ] Implement recovery from saved state
- [ ] Add `resumeFromState()` method

#### 11. Proxy Detection Missing More Software
**Location**: `@/src-tauri/src/commands/system/proxy.rs:101-169`
**Issue**: Missing detection for:
- Mihomo (Clash.Meta successor)
- NekoRay/NekoBox
- Hiddify
- Shadowrocket (macOS)

**Plan**:
- [ ] Add port configurations for additional software
- [ ] Update process detection patterns
- [ ] Add API version detection where applicable

#### 12. Safety Mode External API Timeout Too Short
**Location**: `@/lib/ai/core/middleware.ts:736-768`
**Issue**: `callExternalReviewAPI` uses configurable timeout but no default retry
**Impact**: Transient failures block content

**Plan**:
- [ ] Add retry logic to `callExternalReviewAPI`
- [ ] Implement circuit breaker for external API
- [ ] Add configurable fallback behavior

#### 13. Agent Executor Missing Step-Level Logging
**Location**: `@/lib/ai/agent/agent-executor.ts`
**Issue**: Logging is sparse, difficult to debug execution
**Impact**: Hard to diagnose issues in multi-step agents

**Plan**:
- [ ] Add structured logging for each step
- [ ] Log tool call decisions
- [ ] Log stop condition evaluations
- [ ] Add log level configuration

---

## Implementation Priority Order

### Phase 1: Critical Network Fixes (Week 1)
1. Fix Tauri proxy routing (Issue #2) - **CRITICAL**
2. Remove http.rs dead_code and unify clients (Issue #1)
3. Add agent executor error recovery (Issue #3)

### Phase 2: Consistency Improvements (Week 2)
4. Unify retry logic (Issue #4)
5. Add agent loop cancellation (Issue #5)
6. Implement graceful shutdown (Issue #6)

### Phase 3: Observability & Polish (Week 3)
7. Add tool call metrics (Issue #7)
8. Proxy health monitoring (Issue #8)
9. HTTP User-Agent header (Issue #9)

### Phase 4: Nice-to-Have (Week 4+)
10. Orchestrator state persistence (Issue #10)
11. Additional proxy software detection (Issue #11)
12. External API retry logic (Issue #12)
13. Step-level logging (Issue #13)

---

## Affected Files Summary

| File | Changes Required |
|------|------------------|
| `src-tauri/src/http.rs` | Remove dead_code, add User-Agent |
| `src-tauri/src/commands/system/proxy.rs` | Use shared HTTP clients, add software |
| `lib/network/proxy-fetch.ts` | Implement actual Tauri proxy routing |
| `lib/ai/agent/agent-executor.ts` | Error recovery, logging |
| `lib/ai/agent/agent-loop.ts` | Cancellation support |
| `lib/ai/agent/agent-orchestrator.ts` | State persistence |
| `lib/ai/agent/background-agent-manager.ts` | Graceful shutdown |
| `lib/ai/tools/tool-call-manager.ts` | Metrics collection |
| `lib/ai/core/middleware.ts` | Retry logic, external API |
| `stores/system/proxy-store.ts` | Health monitoring |
| `lib/utils/retry.ts` | **NEW FILE** - Unified retry utility |

---

## Risk Assessment

| Issue | Risk Level | Mitigation |
|-------|------------|------------|
| Proxy routing change | Medium | Extensive testing, feature flag |
| HTTP client unification | Low | Gradual migration |
| Retry logic refactor | Medium | Maintain backward compatibility |
| Agent cancellation | Low | Non-breaking addition |
| Graceful shutdown | Low | Additive feature |

---

## Success Metrics

- [ ] All network requests in Tauri use shared HTTP clients
- [ ] Proxy actually routes requests in desktop app
- [ ] Agent execution errors are recoverable
- [ ] Consistent retry behavior across codebase
- [ ] Agent loops can be cancelled
- [ ] Background agents gracefully shut down
- [ ] Tool execution metrics available
- [ ] Proxy health monitored automatically

---

## Notes

- Current dead_code warnings in `src-tauri/src`: 31 matches across 14 files
- HTTP_CLIENT static clients are used by 9 modules
- Agent system has good test coverage (*.test.ts files present)
- Proxy system well-architected but implementation incomplete for Tauri
