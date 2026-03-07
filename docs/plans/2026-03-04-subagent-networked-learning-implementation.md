# SubAgent Networked Learning & Source Traceability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fully wire both SubAgent execution chains so they reliably perform networked retrieval and return traceable sources (URLs/titles/tool lineage).

**Architecture:** Introduce one shared network-tool selector used by both `useSubAgent` and `BackgroundAgentManager -> AgentOrchestrator`, then propagate source metadata from tool results into `SubAgentResult`, orchestration aggregates, and background-agent results. Keep changes incremental and backward-compatible (`sources` optional), with strict TDD and small commits.

**Tech Stack:** TypeScript, React hooks, Zustand, Jest, React Testing Library, pnpm.

**Related skills to apply during execution:** `@executing-plans` `@test-driven-development` `@verification-before-completion`

---

### Task 1: Shared Network Tool Selector (Strategy B)

**Files:**
- Create: `lib/ai/agent/sub-agent-tool-selection.ts`
- Create: `lib/ai/agent/sub-agent-tool-selection.test.ts`
- Modify: `lib/ai/agent/index.ts`

**Step 1: Write the failing test**

```ts
import { selectSubAgentTools } from './sub-agent-tool-selection';
import type { AgentTool } from './agent-executor';

const mk = (name: string, description: string): AgentTool => ({
  name,
  description,
  parameters: {} as never,
  execute: async () => ({ ok: true }),
});

it('selects network-relevant tools and enforces maxTools', () => {
  const allTools = {
    web_search: mk('web_search', 'Search the web'),
    web_scraper: mk('web_scraper', 'Scrape URL'),
    search_and_scrape: mk('search_and_scrape', 'Search and scrape'),
    calculator: mk('calculator', 'Math'),
  };

  const result = selectSubAgentTools({
    task: 'Research latest browser release notes and cite URLs',
    allTools,
    maxTools: 2,
  });

  expect(Object.keys(result.tools).length).toBeLessThanOrEqual(2);
  expect(Object.keys(result.tools)).toContain('web_search');
  expect(result.reason).toContain('maxTools');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- --runInBand lib/ai/agent/sub-agent-tool-selection.test.ts`  
Expected: FAIL with module/function not found.

**Step 3: Write minimal implementation**

```ts
// lib/ai/agent/sub-agent-tool-selection.ts
import type { AgentTool } from './agent-executor';

interface SelectSubAgentToolsInput {
  task: string;
  allTools: Record<string, AgentTool>;
  maxTools?: number;
}

interface SelectSubAgentToolsResult {
  tools: Record<string, AgentTool>;
  reason: string;
}

const NETWORK_PRIORITY = ['web_search', 'search_and_scrape', 'web_scraper', 'bulk_web_scraper', 'rag_search'];

export function selectSubAgentTools(input: SelectSubAgentToolsInput): SelectSubAgentToolsResult {
  const { task, allTools, maxTools = 6 } = input;
  const entries = Object.entries(allTools);
  const taskLower = task.toLowerCase();

  const scored = entries
    .map(([name, tool]) => {
      let score = 0;
      if (NETWORK_PRIORITY.includes(name)) score += 20;
      if (name.includes('search') || name.includes('scrape') || name.includes('web')) score += 10;
      if (tool.description.toLowerCase().includes('search')) score += 5;
      if (taskLower.includes('research') || taskLower.includes('latest') || taskLower.includes('source')) score += 5;
      return { name, tool, score };
    })
    .sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, Math.max(1, maxTools));
  const tools = Object.fromEntries(selected.map((s) => [s.name, s.tool]));

  if (!tools.web_search && allTools.web_search) {
    tools.web_search = allTools.web_search;
  }

  return {
    tools,
    reason: `selected=${Object.keys(tools).length}; maxTools=${maxTools}; task="${task.slice(0, 80)}"`,
  };
}
```

```ts
// lib/ai/agent/index.ts
export { selectSubAgentTools } from './sub-agent-tool-selection';
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- --runInBand lib/ai/agent/sub-agent-tool-selection.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add lib/ai/agent/sub-agent-tool-selection.ts lib/ai/agent/sub-agent-tool-selection.test.ts lib/ai/agent/index.ts
git commit -m "feat(agent): add shared sub-agent network tool selector"
```

### Task 2: Wire `useSubAgent` to Selector + Conditional Execution

**Files:**
- Modify: `hooks/agent/use-sub-agent.ts`
- Modify: `hooks/agent/use-sub-agent.test.ts`

**Step 1: Write the failing test**

```ts
jest.mock('@/lib/ai/agent/sub-agent-tool-selection', () => ({
  selectSubAgentTools: jest.fn(() => ({ tools: { web_search: { name: 'web_search' } }, reason: 'test' })),
}));

jest.mock('@/lib/ai/agent/sub-agent-executor', () => ({
  executeSubAgent: jest.fn(),
  executeSubAgentsParallel: jest.fn(),
  executeSubAgentsSequential: jest.fn(),
  executeSubAgentsDependencyGraph: jest.fn(),
}));

it('routes conditional mode to dependency graph executor', async () => {
  const { result } = renderHook(() => useSubAgent({ parentAgentId: 'parent-1' }));
  await act(async () => {
    await result.current.executeAll('conditional');
  });
  expect(executeSubAgentsDependencyGraph).toHaveBeenCalled();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- --runInBand hooks/agent/use-sub-agent.test.ts`  
Expected: FAIL because conditional mode currently falls through sequential path and selector is not used.

**Step 3: Write minimal implementation**

```ts
// hooks/agent/use-sub-agent.ts (imports)
import { selectSubAgentTools } from '@/lib/ai/agent/sub-agent-tool-selection';
import { useUnifiedTools } from '@/hooks/agent/use-unified-tools';
import { executeSubAgentsDependencyGraph } from '@/lib/ai/agent/sub-agent-executor';

// inside hook
const { tools: unifiedTools } = useUnifiedTools({ autoSync: true });

const getSelectedTools = useCallback((task: string) => {
  const { tools } = selectSubAgentTools({
    task,
    allTools: unifiedTools,
    maxTools: 6,
  });
  return tools;
}, [unifiedTools]);

// executeOne
const executorConfig = {
  ...getExecutorConfig(),
  globalTools: getSelectedTools(subAgent.task),
  cancellationToken,
  collectMetrics: true,
};

// executeAll
const taskDigest = subAgents.map((sa) => sa.task).join('\n');
const executorConfig = {
  ...getExecutorConfig(),
  globalTools: getSelectedTools(taskDigest),
  cancellationToken,
  collectMetrics: true,
};

if (mode === 'parallel') {
  return executeSubAgentsParallel(...);
}
if (mode === 'conditional') {
  return executeSubAgentsDependencyGraph(subAgents, executorConfig, options, maxConcurrency);
}
return executeSubAgentsSequential(...);
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- --runInBand hooks/agent/use-sub-agent.test.ts`  
Expected: PASS with new conditional-mode assertions.

**Step 5: Commit**

```bash
git add hooks/agent/use-sub-agent.ts hooks/agent/use-sub-agent.test.ts
git commit -m "feat(sub-agent): wire conditional execution and auto-selected network tools"
```

### Task 3: Add Traceable Source Types + Extraction Utilities

**Files:**
- Modify: `types/agent/sub-agent.ts`
- Modify: `types/agent/background-agent.ts`
- Create: `lib/ai/agent/sub-agent-sources.ts`
- Create: `lib/ai/agent/sub-agent-sources.test.ts`

**Step 1: Write the failing test**

```ts
import { extractSourcesFromToolResult, mergeSources } from './sub-agent-sources';

it('extracts url/title sources from web_search result', () => {
  const sources = extractSourcesFromToolResult({
    toolName: 'web_search',
    subAgentId: 'sa-1',
    result: {
      success: true,
      results: [{ title: 'Doc', url: 'https://example.com/a', content: 'x', score: 0.9 }],
    },
  });

  expect(sources).toEqual([
    expect.objectContaining({ url: 'https://example.com/a', title: 'Doc', toolName: 'web_search' }),
  ]);
});

it('deduplicates by url', () => {
  const merged = mergeSources(
    [{ url: 'https://a.com', toolName: 'web_search', sourceType: 'web', subAgentId: '1' }],
    [{ url: 'https://a.com', toolName: 'search_and_scrape', sourceType: 'web', subAgentId: '2' }]
  );
  expect(merged).toHaveLength(1);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- --runInBand lib/ai/agent/sub-agent-sources.test.ts`  
Expected: FAIL with missing file/functions.

**Step 3: Write minimal implementation**

```ts
// types/agent/sub-agent.ts
export interface SubAgentSource {
  url: string;
  title?: string;
  toolName: string;
  sourceType: 'web' | 'mcp' | 'rag' | 'other';
  subAgentId: string;
}

export interface SubAgentResult {
  // ...
  sources?: SubAgentSource[];
}

export interface SubAgentOrchestrationResult {
  // ...
  sources?: SubAgentSource[];
}
```

```ts
// types/agent/background-agent.ts
import type { SubAgentSource } from './sub-agent';

export interface BackgroundAgentResult {
  // ...
  sources?: SubAgentSource[];
}
```

```ts
// lib/ai/agent/sub-agent-sources.ts
import type { SubAgentSource } from '@/types/agent/sub-agent';

export function mergeSources(...batches: SubAgentSource[][]): SubAgentSource[] {
  const byUrl = new Map<string, SubAgentSource>();
  for (const batch of batches) {
    for (const src of batch) {
      if (!src.url) continue;
      if (!byUrl.has(src.url)) byUrl.set(src.url, src);
    }
  }
  return [...byUrl.values()];
}

export function extractSourcesFromToolResult(input: {
  toolName: string;
  subAgentId: string;
  result: unknown;
}): SubAgentSource[] {
  const { toolName, subAgentId, result } = input;
  const asRecord = typeof result === 'object' && result ? (result as Record<string, unknown>) : {};
  const out: SubAgentSource[] = [];

  const push = (url?: unknown, title?: unknown) => {
    if (typeof url !== 'string' || !url.startsWith('http')) return;
    out.push({
      url,
      title: typeof title === 'string' ? title : undefined,
      toolName,
      sourceType: 'web',
      subAgentId,
    });
  };

  const resultList = Array.isArray(asRecord.results) ? asRecord.results as Array<Record<string, unknown>> : [];
  for (const item of resultList) push(item.url, item.title);

  if (typeof asRecord.url === 'string') push(asRecord.url, asRecord.title);

  return mergeSources(out);
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- --runInBand lib/ai/agent/sub-agent-sources.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add types/agent/sub-agent.ts types/agent/background-agent.ts lib/ai/agent/sub-agent-sources.ts lib/ai/agent/sub-agent-sources.test.ts
git commit -m "feat(agent): add sub-agent source model and extraction helpers"
```

### Task 4: Propagate Sources in SubAgent Executor + Orchestration Aggregates

**Files:**
- Modify: `lib/ai/agent/sub-agent-executor.ts`
- Modify: `lib/ai/agent/sub-agent-executor.test.ts`
- Modify: `lib/ai/agent/sub-agent-dependency-graph.test.ts`

**Step 1: Write the failing test**

```ts
it('stores extracted sources on successful sub-agent result', async () => {
  mockExecuteAgent.mockResolvedValue({
    success: true,
    finalResponse: 'Done',
    totalSteps: 1,
    steps: [],
    toolResults: [
      {
        toolCallId: 't1',
        toolName: 'web_search',
        result: { success: true, results: [{ title: 'A', url: 'https://example.com/a', content: '', score: 1 }] },
      },
    ],
  });

  const sa = createSubAgent({ parentAgentId: 'p1', name: 'N', task: 'T' });
  const result = await executeSubAgent(sa, createMockExecutorConfig());

  expect(result.sources?.[0].url).toBe('https://example.com/a');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- --runInBand lib/ai/agent/sub-agent-executor.test.ts`  
Expected: FAIL because `sources` is not populated.

**Step 3: Write minimal implementation**

```ts
// imports
import { extractSourcesFromToolResult, mergeSources } from './sub-agent-sources';

function convertToSubAgentResult(agentResult: AgentResult, subAgentId: string): SubAgentResult {
  // existing mapping...
  const sources = (agentResult.toolResults || []).flatMap((tr) =>
    extractSourcesFromToolResult({
      toolName: tr.toolName,
      subAgentId,
      result: tr.result,
    })
  );

  return {
    // existing fields...
    sources: sources.length > 0 ? mergeSources(sources) : undefined,
  };
}

// callsite
const result = convertToSubAgentResult(agentResult, subAgent.id);

// in executeSubAgentsParallel / executeSubAgentsSequential / executeSubAgentsDependencyGraph return objects:
const allSources = mergeSources(...Object.values(results).map((r) => r.sources || []));
return {
  // existing fields...
  sources: allSources.length > 0 ? allSources : undefined,
};
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- --runInBand lib/ai/agent/sub-agent-executor.test.ts lib/ai/agent/sub-agent-dependency-graph.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add lib/ai/agent/sub-agent-executor.ts lib/ai/agent/sub-agent-executor.test.ts lib/ai/agent/sub-agent-dependency-graph.test.ts
git commit -m "feat(sub-agent): propagate traceable sources through executor and orchestration"
```

### Task 5: Add Conditional Mode Support in AgentOrchestrator

**Files:**
- Modify: `lib/ai/agent/agent-orchestrator.ts`
- Modify: `lib/ai/agent/agent-orchestrator.test.ts`

**Step 1: Write the failing test**

```ts
jest.mock('./sub-agent-executor', () => ({
  // existing mocks...
  executeSubAgentsDependencyGraph: jest.fn(),
}));

it('uses dependency graph executor in conditional mode', async () => {
  mockGenerateText.mockResolvedValue({
    text: JSON.stringify({
      executionMode: 'conditional',
      reasoning: 'Conditional flow',
      subAgents: [{ name: 'Agent 1', description: 'Desc', task: 'Task 1' }],
    }),
  });

  await new AgentOrchestrator(createMockConfig()).execute('Task');
  expect(executeSubAgentsDependencyGraph).toHaveBeenCalled();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- --runInBand lib/ai/agent/agent-orchestrator.test.ts`  
Expected: FAIL because conditional currently uses sequential fallback.

**Step 3: Write minimal implementation**

```ts
import { executeSubAgentsDependencyGraph } from './sub-agent-executor';

if (executionMode === 'parallel') {
  return executeSubAgentsParallel(...);
}
if (executionMode === 'conditional') {
  return executeSubAgentsDependencyGraph(
    subAgents,
    executorConfig,
    subAgentOptions,
    this.config.maxConcurrentSubAgents
  );
}
return executeSubAgentsSequential(...);
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- --runInBand lib/ai/agent/agent-orchestrator.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add lib/ai/agent/agent-orchestrator.ts lib/ai/agent/agent-orchestrator.test.ts
git commit -m "feat(orchestrator): support conditional mode via dependency graph executor"
```

### Task 6: Wire Background Chain to Shared Selector + Optimization Settings

**Files:**
- Modify: `lib/ai/agent/background-agent-manager.ts`
- Modify: `lib/ai/agent/background-agent-manager.test.ts`
- Modify: `hooks/agent/use-background-agent.ts`

**Step 1: Write the failing test**

```ts
jest.mock('./sub-agent-tool-selection', () => ({
  selectSubAgentTools: jest.fn(() => ({
    tools: { web_search: { name: 'web_search', execute: jest.fn(), description: 'x', parameters: {} } },
    reason: 'selected for test',
  })),
}));

it('passes selected tools and optimization settings into orchestrator config', async () => {
  const apiKeyProvider = jest.fn(() => 'k');
  manager.setProviders({
    apiKey: apiKeyProvider,
    optimization: () => ({
      enableSmartRouting: true,
      singleAgentThreshold: 0.7,
      enableTokenBudget: true,
      maxTokenBudget: 60000,
      estimatedTokensPerSubAgent: 2500,
      enableTokenWarnings: true,
      enableContextIsolation: true,
      summarizeSubAgentResults: true,
      maxResultTokens: 400,
    }),
  });

  const agent = manager.createAgent({ sessionId: 's', name: 'N', task: 'Research latest news', config: {} });
  await (manager as unknown as { executeAgentInternal: (a: unknown) => Promise<void> }).executeAgentInternal(agent);

  expect(AgentOrchestrator).toHaveBeenCalledWith(expect.objectContaining({
    enableSmartRouting: true,
    singleAgentThreshold: 0.7,
    maxTokenBudget: 60000,
    estimatedTokensPerSubAgent: 2500,
    defaultSubAgentConfig: expect.objectContaining({ summarizeResults: true, maxResultTokens: 400 }),
    tools: expect.objectContaining({ web_search: expect.any(Object) }),
  }));
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- --runInBand lib/ai/agent/background-agent-manager.test.ts`  
Expected: FAIL because selector/optimization provider are not wired.

**Step 3: Write minimal implementation**

```ts
// background-agent-manager.ts
import { selectSubAgentTools } from './sub-agent-tool-selection';

interface AgentOptimizationSnapshot {
  enableSmartRouting: boolean;
  singleAgentThreshold: number;
  enableTokenBudget: boolean;
  maxTokenBudget: number;
  estimatedTokensPerSubAgent: number;
  enableTokenWarnings: boolean;
  enableContextIsolation: boolean;
  summarizeSubAgentResults: boolean;
  maxResultTokens: number;
}

private optimizationProvider?: () => AgentOptimizationSnapshot;

setProviders(providers: { /* existing */ optimization?: () => AgentOptimizationSnapshot }) {
  // existing...
  this.optimizationProvider = providers.optimization;
}

const allTools = { ...agent.config.customTools, ...enhancedTools };
const selected = selectSubAgentTools({ task: agent.task, allTools, maxTools: 8 });
const opt = this.optimizationProvider?.();

const orchestratorConfig: OrchestratorConfig = {
  // existing...
  tools: selected.tools,
  enableSmartRouting: opt?.enableSmartRouting,
  singleAgentThreshold: opt?.singleAgentThreshold,
  maxTokenBudget: opt?.enableTokenBudget ? opt.maxTokenBudget : undefined,
  estimatedTokensPerSubAgent: opt?.estimatedTokensPerSubAgent,
  enableTokenWarnings: opt?.enableTokenWarnings,
  defaultSubAgentConfig: {
    summarizeResults: !!(opt?.enableContextIsolation && opt?.summarizeSubAgentResults),
    maxResultTokens: opt?.maxResultTokens,
  },
};
```

```ts
// hooks/agent/use-background-agent.ts
const agentOptSettings = useSettingsStore((state) => state.agentOptimizationSettings);

manager.setProviders({
  // existing...
  optimization: () => agentOptSettings,
});
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- --runInBand lib/ai/agent/background-agent-manager.test.ts hooks/agent/use-background-agent.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add lib/ai/agent/background-agent-manager.ts lib/ai/agent/background-agent-manager.test.ts hooks/agent/use-background-agent.ts hooks/agent/use-background-agent.test.ts
git commit -m "feat(background-agent): apply shared tool selection and optimization settings to orchestrator"
```

### Task 7: Propagate Sources into Background Agent Results

**Files:**
- Modify: `lib/ai/agent/background-agent-manager.ts`
- Modify: `lib/ai/agent/background-agent-manager.test.ts`

**Step 1: Write the failing test**

```ts
it('stores orchestration sources on background agent result', async () => {
  const orchestratorModule = jest.requireMock('./agent-orchestrator') as { AgentOrchestrator: jest.Mock };
  orchestratorModule.AgentOrchestrator.mockImplementationOnce(() => ({
    execute: jest.fn().mockResolvedValue({
      success: true,
      finalResponse: 'done',
      subAgentResults: {
        success: true,
        results: {},
        totalDuration: 100,
        sources: [{ url: 'https://example.com/a', toolName: 'web_search', sourceType: 'web', subAgentId: 'sa-1' }],
      },
      totalDuration: 100,
    }),
    cancel: jest.fn(),
  }));

  const agent = manager.createAgent({ sessionId: 's1', name: 'A', task: 'T' });
  await (manager as unknown as { executeAgentInternal: (a: unknown) => Promise<void> }).executeAgentInternal(agent);
  expect(agent.result?.sources?.[0].url).toBe('https://example.com/a');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- --runInBand lib/ai/agent/background-agent-manager.test.ts`  
Expected: FAIL because `BackgroundAgentResult.sources` is not assigned.

**Step 3: Write minimal implementation**

```ts
const agentResult: BackgroundAgentResult = {
  // existing...
  subAgentResults: result.subAgentResults,
  sources: result.subAgentResults?.sources,
};
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- --runInBand lib/ai/agent/background-agent-manager.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add lib/ai/agent/background-agent-manager.ts lib/ai/agent/background-agent-manager.test.ts
git commit -m "feat(background-agent): persist traceable source metadata in final results"
```

### Task 8: Update Docs + Full Verification

**Files:**
- Modify: `docs/features/agent-guide.md`
- Modify: `docs/api/hooks.md`
- Modify: `docs/architecture/overview.md`

**Step 1: Write documentation assertions first (docs tests/lint hooks if available)**

If repo has markdown lint/docs checks, add/update those checks first; otherwise write concrete doc sections and examples that must match code behavior.

Example snippets to add:

```md
### Conditional Sub-Agent Execution

`useSubAgent.executeAll('conditional')` now executes via dependency-graph scheduling.
```

```md
### Traceable Sources

`SubAgentResult.sources` includes URL/title/toolName/sourceType/subAgentId for network-derived outputs.
```

**Step 2: Run docs-related checks (or targeted grep assertions)**

Run: `rg -n "conditional|sources|traceable" docs/features/agent-guide.md docs/api/hooks.md docs/architecture/overview.md`  
Expected: matched lines for all newly documented behaviors.

**Step 3: Write minimal doc updates**

Document only implemented behavior; avoid speculative UI/metrics features (YAGNI).

**Step 4: Run verification suite**

Run:

```bash
pnpm test -- --runInBand lib/ai/agent/sub-agent-tool-selection.test.ts hooks/agent/use-sub-agent.test.ts lib/ai/agent/sub-agent-executor.test.ts lib/ai/agent/sub-agent-dependency-graph.test.ts lib/ai/agent/agent-orchestrator.test.ts lib/ai/agent/background-agent-manager.test.ts hooks/agent/use-background-agent.test.ts
pnpm exec tsc --noEmit
pnpm lint
```

Expected: all PASS.

**Step 5: Commit**

```bash
git add docs/features/agent-guide.md docs/api/hooks.md docs/architecture/overview.md
git commit -m "docs(agent): document conditional execution and traceable source outputs"
```

### Final Integration Commit (Optional Squash Policy Dependent)

If your workflow keeps granular commits, skip squash. If team requires single feature commit, squash via non-interactive rebase after all tests pass.

```bash
# only if policy requires single commit:
git log --oneline -n 12
# then perform approved non-interactive squash workflow
```

