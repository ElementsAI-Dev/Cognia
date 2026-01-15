# Observability Implementation - Next Steps

## Current Status

### Completed
- ✅ Langfuse client implementation
- ✅ OpenTelemetry tracing implementation  
- ✅ Chat observability manager
- ✅ Agent observability manager
- ✅ Dependencies installed

### Remaining Lint Errors to Fix
1. `Resource` type issue in tracing.ts - need to use proper import
2. Type compatibility issues in chat-observability.ts
3. Duplicate export warning for `createSpanWithErrorHandling`

### Next Implementation Steps

1. **Fix Lint Errors** (Priority: High)
   - Fix Resource import in tracing.ts
   - Fix type issues in chat-observability.ts
   - Resolve duplicate export warnings

2. **Integrate Observability into AI Chat** (Priority: High)
   - Modify `lib/ai/generation/use-ai-chat.ts`
   - Add observability initialization
   - Track chat sessions and generations

3. **Integrate Observability into Agent System** (Priority: High)
   - Modify `lib/ai/agent/agent-executor.ts`
   - Modify `lib/ai/agent/agent-loop.ts`
   - Track agent executions and tool calls

4. **Create Observability Dashboard UI** (Priority: Medium)
   - Create dashboard components
   - Add trace viewer
   - Add metrics visualization

5. **Implement Workflow Template Marketplace** (Priority: High)
   - Design architecture
   - Create backend store
   - Create UI components

6. **Implement Git Integration for Workflows** (Priority: High)
   - Create Git integration service
   - Create Git panel UI
   - Integrate with workflow editor

## Files Created

- `lib/ai/observability/langfuse-client.ts`
- `lib/ai/observability/tracing.ts`
- `lib/ai/observability/chat-observability.ts`
- `lib/ai/observability/agent-observability.ts`
- `lib/ai/observability/index.ts`
- `lib/ai/observability/README.md`

## Files to Modify

- `lib/ai/generation/use-ai-chat.ts`
- `lib/ai/agent/agent-executor.ts`
- `lib/ai/agent/agent-loop.ts`
- `app/layout.tsx` (for initialization)

## Environment Variables

```env
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com
LANGFUSE_ENABLED=true

OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=cognia-ai
OTEL_TRACING_ENABLED=true
```
