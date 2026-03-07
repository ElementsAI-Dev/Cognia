# AgentTeam Consistency & Unified Tools Injection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate `AgentTeamManager`/store ID drift and ensure AgentTeam execution uses the same unified toolset as normal Agent mode.

**Architecture:** Keep the current low-risk architecture: manager is runtime truth, Zustand store is UI projection. Add idempotent `upsert*` store actions and refactor `useAgentTeam` to sync manager-created entities into store instead of creating duplicate IDs. Inject `useUnifiedTools().tools` into `useAgentTeam` from `AgentTeamPanelSheet`.

**Tech Stack:** TypeScript, React hooks, Zustand, Jest, React Testing Library, pnpm.

---

### Task 1: Add Store `upsert*` APIs (Projection-Safe Writes)

**Files:**
- Modify: `stores/agent/agent-team-store/types.ts`
- Modify: `stores/agent/agent-team-store/slices/actions.slice.ts`
- Test: `stores/agent/agent-team-store.test.ts`

**Step 1: Write the failing test**

Add a new `describe('upsert operations', ...)` block in `stores/agent/agent-team-store.test.ts`:

```ts
describe('upsert operations', () => {
  it('should upsert a team without generating a new id', () => {
    const externalTeam = {
      id: 'mgr-team-1',
      name: 'Manager Team',
      description: '',
      task: 'sync',
      status: 'idle' as const,
      config: { ...DEFAULT_TEAM_CONFIG },
      leadId: 'mgr-lead-1',
      teammateIds: ['mgr-lead-1'],
      taskIds: [],
      messageIds: [],
      progress: 0,
      totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      createdAt: new Date(),
    };

    // @ts-expect-error new API not implemented yet
    getStore().upsertTeam(externalTeam);

    expect(getStore().teams['mgr-team-1']).toBeDefined();
    expect(getStore().teams['mgr-team-1'].name).toBe('Manager Team');
  });

  it('should be idempotent when upserting the same task twice', () => {
    const team = getStore().createTeam({ name: 'T', task: 'X' });
    const task = {
      id: 'mgr-task-1',
      teamId: team.id,
      title: 'From manager',
      description: 'd',
      status: 'pending' as const,
      priority: 'normal' as const,
      dependencies: [],
      tags: [],
      createdAt: new Date(),
      order: 0,
    };

    // @ts-expect-error new API not implemented yet
    getStore().upsertTask(task);
    // @ts-expect-error new API not implemented yet
    getStore().upsertTask({ ...task, title: 'Updated title' });

    expect(Object.keys(getStore().tasks).filter((id) => id === 'mgr-task-1')).toHaveLength(1);
    expect(getStore().tasks['mgr-task-1'].title).toBe('Updated title');
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm test -- --runInBand stores/agent/agent-team-store.test.ts
```

Expected: FAIL with TypeScript/runtime errors like `upsertTeam is not a function`.

**Step 3: Write minimal implementation**

1. Add function signatures to `AgentTeamState` in `stores/agent/agent-team-store/types.ts`:

```ts
upsertTeam: (team: AgentTeam) => void;
upsertTeammate: (teammate: AgentTeammate) => void;
upsertTask: (task: AgentTeamTask) => void;
upsertMessage: (message: AgentTeamMessage) => void;
```

2. Implement in `createAgentTeamActionsSlice`:

```ts
upsertTeam: (team) => {
  set((state) => ({
    teams: { ...state.teams, [team.id]: team },
  }));
},

upsertTeammate: (teammate) => {
  set((state) => ({
    teammates: { ...state.teammates, [teammate.id]: teammate },
  }));
},

upsertTask: (task) => {
  set((state) => ({
    tasks: { ...state.tasks, [task.id]: task },
  }));
},

upsertMessage: (message) => {
  set((state) => ({
    messages: { ...state.messages, [message.id]: message },
  }));
},
```

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm test -- --runInBand stores/agent/agent-team-store.test.ts
```

Expected: PASS for new `upsert operations` tests and existing store tests.

**Step 5: Commit**

```bash
git add stores/agent/agent-team-store/types.ts stores/agent/agent-team-store/slices/actions.slice.ts stores/agent/agent-team-store.test.ts
git commit -m "feat(agent-team-store): add upsert projection actions for manager-synced entities"
```

---

### Task 2: Refactor `useAgentTeam.createTeam` to Preserve Manager IDs

**Files:**
- Modify: `hooks/agent/use-agent-team.ts`
- Create: `hooks/agent/use-agent-team.test.tsx`
- Test: `hooks/agent/use-agent-team.test.tsx`

**Step 1: Write the failing test**

Create `hooks/agent/use-agent-team.test.tsx` with a focused test for ID consistency:

```tsx
import { renderHook, act } from '@testing-library/react';
import { useAgentTeam } from './use-agent-team';

const mockUpsertTeam = jest.fn();
const mockUpsertTeammate = jest.fn();

jest.mock('@/stores/settings', () => ({
  useSettingsStore: (selector: (state: any) => unknown) =>
    selector({
      defaultProvider: 'openai',
      providerSettings: { openai: { defaultModel: 'gpt-4o-mini', apiKeys: ['k'] } },
      getActiveApiKey: () => 'k',
    }),
}));

jest.mock('@/stores/agent/agent-team-store', () => ({
  useAgentTeamStore: (selector: (state: any) => unknown) =>
    selector({
      teams: {},
      activeTeamId: null,
      selectedTeammateId: null,
      displayMode: 'expanded',
      isPanelOpen: false,
      templates: {},
      upsertTeam: mockUpsertTeam,
      upsertTeammate: mockUpsertTeammate,
      upsertTask: jest.fn(),
      upsertMessage: jest.fn(),
      setTeamStatus: jest.fn(),
      setTeammateStatus: jest.fn(),
      setTeammateProgress: jest.fn(),
      setTaskStatus: jest.fn(),
      claimTask: jest.fn(),
      assignTask: jest.fn(),
      deleteTask: jest.fn(),
      removeTeammate: jest.fn(),
      deleteTeam: jest.fn(),
      cleanupTeam: jest.fn(),
      updateTeam: jest.fn(),
      addEvent: jest.fn(),
      addTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      setActiveTeam: jest.fn(),
      setSelectedTeammate: jest.fn(),
      setDisplayMode: jest.fn(),
      setIsPanelOpen: jest.fn(),
      getTeammates: jest.fn(() => []),
      getTeamTasks: jest.fn(() => []),
      getTeamMessages: jest.fn(() => []),
      getUnreadMessages: jest.fn(() => []),
    }),
}));

const managerTeam = {
  id: 'mgr-team-1',
  leadId: 'mgr-lead-1',
  name: 'M Team',
  description: '',
  task: 'x',
  status: 'idle',
  config: {},
  teammateIds: ['mgr-lead-1'],
  taskIds: [],
  messageIds: [],
  progress: 0,
  totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  createdAt: new Date(),
} as any;

const managerLead = {
  id: 'mgr-lead-1',
  teamId: 'mgr-team-1',
  name: 'Team Lead',
  role: 'lead',
  status: 'idle',
  description: '',
  config: {},
  completedTaskIds: [],
  tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  progress: 0,
  createdAt: new Date(),
} as any;

jest.mock('@/lib/ai/agent/agent-team', () => ({
  getAgentTeamManager: () => ({
    createTeam: jest.fn(() => managerTeam),
    getTeammate: jest.fn(() => managerLead),
    executeTeam: jest.fn(),
    cancelTeam: jest.fn(),
    pauseTeam: jest.fn(),
    resumeTeam: jest.fn(),
    addTeammate: jest.fn(),
    removeTeammate: jest.fn(),
    shutdownTeammate: jest.fn(),
    createTask: jest.fn(),
    claimTask: jest.fn(),
    assignTask: jest.fn(),
    sendMessage: jest.fn(),
    cleanupTeam: jest.fn(),
    writeSharedMemory: jest.fn(),
    readSharedMemory: jest.fn(),
    readAllSharedMemory: jest.fn(),
    createConsensus: jest.fn(),
    castVote: jest.fn(),
    getConsensus: jest.fn(),
    getTeamConsensus: jest.fn(),
    delegateTaskToBackground: jest.fn(),
  }),
  createTeamFromTemplate: jest.fn(),
}));

describe('useAgentTeam createTeam sync', () => {
  it('uses manager IDs and upserts manager entities into store', () => {
    const { result } = renderHook(() => useAgentTeam());

    act(() => {
      const created = result.current.createTeam({ name: 'A', task: 'B' });
      expect(created.id).toBe('mgr-team-1');
    });

    expect(mockUpsertTeam).toHaveBeenCalledWith(expect.objectContaining({ id: 'mgr-team-1' }));
    expect(mockUpsertTeammate).toHaveBeenCalledWith(expect.objectContaining({ id: 'mgr-lead-1' }));
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm test -- --runInBand hooks/agent/use-agent-team.test.tsx
```

Expected: FAIL because `useAgentTeam` still uses `storeCreateTeam` path and does not call `upsertTeam/upsertTeammate`.

**Step 3: Write minimal implementation**

In `hooks/agent/use-agent-team.ts`:

1. Replace `storeCreateTeam` / `storeAddTeammate` / `storeCreateTask` / `storeAddMessage` selectors with:

```ts
storeUpsertTeam: s.upsertTeam,
storeUpsertTeammate: s.upsertTeammate,
storeUpsertTask: s.upsertTask,
storeUpsertMessage: s.upsertMessage,
```

2. Refactor `createTeam`:

```ts
const managerTeam = manager.createTeam(enrichedInput);
storeActions.storeUpsertTeam(managerTeam);

const managerLead = manager.getTeammate(managerTeam.leadId);
if (managerLead) {
  storeActions.storeUpsertTeammate(managerLead);
}

storeActions.setActiveTeam(managerTeam.id);
return managerTeam;
```

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm test -- --runInBand hooks/agent/use-agent-team.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add hooks/agent/use-agent-team.ts hooks/agent/use-agent-team.test.tsx
git commit -m "fix(agent-team): sync createTeam via manager IDs and store upsert actions"
```

---

### Task 3: Refactor Team Entity Writes (`createTeamFromTemplate`, `addTeammate`, `createTask`, `sendMessage`)

**Files:**
- Modify: `hooks/agent/use-agent-team.ts`
- Modify: `hooks/agent/use-agent-team.test.tsx`
- Test: `hooks/agent/use-agent-team.test.tsx`

**Step 1: Write the failing test**

Extend `hooks/agent/use-agent-team.test.tsx` with failing tests:

```tsx
it('uses manager teammate id when adding teammate', () => {
  const { result } = renderHook(() => useAgentTeam());
  const managerTeammate = { id: 'mgr-tm-2', teamId: 'mgr-team-1', name: 'R', role: 'teammate', status: 'idle', description: '', config: {}, completedTaskIds: [], tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, progress: 0, createdAt: new Date() } as any;
  (result.current.manager.addTeammate as jest.Mock).mockReturnValue(managerTeammate);

  act(() => {
    const tm = result.current.addTeammate({ teamId: 'mgr-team-1', name: 'R' });
    expect(tm.id).toBe('mgr-tm-2');
  });

  expect(mockUpsertTeammate).toHaveBeenCalledWith(expect.objectContaining({ id: 'mgr-tm-2' }));
});
```

Add equivalent tests for:
- `createTask` uses `mgr-task-*` id and calls `upsertTask`.
- `sendMessage` uses `mgr-msg-*` id and calls `upsertMessage`.
- `createTeamFromTemplate` returns manager team id and upserts all teammates from manager.

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm test -- --runInBand hooks/agent/use-agent-team.test.tsx
```

Expected: FAIL in new tests due current dual-write behavior.

**Step 3: Write minimal implementation**

In `hooks/agent/use-agent-team.ts`:

1. `createTeamFromTemplate` should:
- call `createTeamFromTemplate(...)` and capture returned manager team,
- `storeUpsertTeam(managerTeam)`,
- iterate `manager.getTeammates(managerTeam.id)` and `storeUpsertTeammate`,
- `setActiveTeam(managerTeam.id)`,
- return manager team.

2. `addTeammate`:

```ts
const teammate = manager.addTeammate(input);
if (!teammate) throw new Error('Failed to add teammate');
storeActions.storeUpsertTeammate(teammate);
return teammate;
```

3. `createTask` and `sendMessage`:

```ts
const task = manager.createTask(input);
storeActions.storeUpsertTask(task);
return task;
```

```ts
const message = manager.sendMessage(input);
storeActions.storeUpsertMessage(message);
return message;
```

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm test -- --runInBand hooks/agent/use-agent-team.test.tsx
```

Expected: PASS for all hook sync tests.

**Step 5: Commit**

```bash
git add hooks/agent/use-agent-team.ts hooks/agent/use-agent-team.test.tsx
git commit -m "fix(agent-team): remove dual-write id drift for template teammate task and message flows"
```

---

### Task 4: Inject Unified Tools into `AgentTeamPanelSheet`

**Files:**
- Modify: `components/agent/agent-team-panel-sheet.tsx`
- Modify: `components/agent/agent-team-panel-sheet.test.tsx`
- Test: `components/agent/agent-team-panel-sheet.test.tsx`

**Step 1: Write the failing test**

Update `components/agent/agent-team-panel-sheet.test.tsx`:

1. Mock `useUnifiedTools`:

```ts
const mockUnifiedTools = { web_search: { name: 'web_search' } } as any;
jest.mock('@/hooks/agent/use-unified-tools', () => ({
  useUnifiedTools: () => ({ tools: mockUnifiedTools }),
}));
```

2. Change `useAgentTeam` mock to spy arguments:

```ts
const mockUseAgentTeam = jest.fn(() => ({
  createTeam: mockCreateTeam,
  createTeamFromTemplate: mockCreateTeamFromTemplate,
  executeTeam: mockExecuteTeam,
  cancelTeam: mockCancelTeam,
  pauseTeam: mockPauseTeam,
  resumeTeam: mockResumeTeam,
  deleteTeam: mockDeleteTeam,
  addTeammate: mockAddTeammate,
}));

jest.mock('@/hooks/agent/use-agent-team', () => ({
  useAgentTeam: (options?: unknown) => mockUseAgentTeam(options),
}));
```

3. Add assertion:

```ts
it('passes unified tools into useAgentTeam', () => {
  mockIsPanelOpen = true;
  render(<AgentTeamPanelSheet />);
  expect(mockUseAgentTeam).toHaveBeenCalledWith(
    expect.objectContaining({ tools: mockUnifiedTools })
  );
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm test -- --runInBand components/agent/agent-team-panel-sheet.test.tsx
```

Expected: FAIL because `AgentTeamPanelSheet` currently calls `useAgentTeam()` without tools.

**Step 3: Write minimal implementation**

In `components/agent/agent-team-panel-sheet.tsx`:

```tsx
import { useUnifiedTools } from '@/hooks/agent/use-unified-tools';

// ...
const { tools: unifiedTools } = useUnifiedTools();

const {
  createTeam,
  createTeamFromTemplate,
  executeTeam,
  cancelTeam,
  pauseTeam,
  resumeTeam,
  deleteTeam,
  addTeammate,
} = useAgentTeam({ tools: unifiedTools });
```

No new behavior beyond dependency injection.

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm test -- --runInBand components/agent/agent-team-panel-sheet.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add components/agent/agent-team-panel-sheet.tsx components/agent/agent-team-panel-sheet.test.tsx
git commit -m "feat(agent-team): inject unified tools into team panel execution hook"
```

---

### Task 5: Regression Verification (No Hidden Drift)

**Files:**
- Test: `stores/agent/agent-team-store.test.ts`
- Test: `hooks/agent/use-agent-team.test.tsx`
- Test: `components/agent/agent-team-panel-sheet.test.tsx`
- Verify: `hooks/agent/use-unified-tools.test.ts`

**Step 1: Run targeted regression suite**

Run:

```bash
pnpm test -- --runInBand stores/agent/agent-team-store.test.ts hooks/agent/use-agent-team.test.tsx components/agent/agent-team-panel-sheet.test.tsx hooks/agent/use-unified-tools.test.ts
```

Expected: PASS (all targeted tests green).

**Step 2: Run static type check**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: PASS with no new TypeScript errors.

**Step 3: Run lint on modified files**

Run:

```bash
pnpm lint
```

Expected: PASS (or only pre-existing unrelated warnings).

**Step 4: Final commit**

```bash
git add hooks/agent/use-agent-team.ts hooks/agent/use-agent-team.test.tsx stores/agent/agent-team-store/types.ts stores/agent/agent-team-store/slices/actions.slice.ts stores/agent/agent-team-store.test.ts components/agent/agent-team-panel-sheet.tsx components/agent/agent-team-panel-sheet.test.tsx
git commit -m "fix(agent-team): align manager-store identity and wire unified tool injection"
```

**Step 5: Prepare PR summary**

Include in PR:
- Root cause: dual-write ID drift (`manager.create*` + `store.create*`).
- Fix: manager-first + store `upsert*` projection.
- Validation: targeted tests, `tsc --noEmit`, `pnpm lint`.

