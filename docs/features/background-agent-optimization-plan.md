# Background Agent 优化计划

## 分析日期
2025-01-29

## 现有实现评估

### ✅ 已完善功能 (无需优化)

| 功能 | 文件 | 状态 |
|------|------|------|
| Background Agent Panel | `components/agent/background-agent-panel.tsx` | 完整的 Sheet 面板 |
| Agent Flow Visualizer | `components/agent/agent-flow-visualizer.tsx` | Sub-Agent 可视化 |
| Agent Indicator | `components/agent/background-agent-indicator.tsx` | 顶栏快捷指示器 |
| Sidebar Widget | `components/sidebar/widgets/sidebar-background-tasks.tsx` | 侧边栏入口 |
| Logs Viewer | `background-agent-panel.tsx:253-320` | 日志过滤/查看 |
| Performance Stats | `background-agent-panel.tsx:323-391` | 性能统计卡片 |
| Queue Management | `background-agent-panel.tsx:560-578` | 暂停/恢复队列 |
| Desktop Notifications | `background-agent-panel.tsx:484-513` | 浏览器通知 |

### 核心架构总结

```
┌─────────────────────────────────────────────────────────────────┐
│                     UI Layer (完善)                              │
├─────────────────────────────────────────────────────────────────┤
│ SidebarBackgroundTasks ──► BackgroundAgentPanel (Sheet)         │
│ BackgroundAgentIndicator ──► Popover ──► openPanel()            │
│                              │                                   │
│                    ┌─────────┴─────────┐                        │
│                    ▼                   ▼                        │
│              AgentCard          Detail Tabs                     │
│           (List View)     ┌──────┴──────┐                       │
│                           ▼      ▼      ▼                       │
│                        Flow    Logs   Stats                     │
│                    (Visualizer)(Viewer)(Card)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Hook Layer (完善)                             │
├─────────────────────────────────────────────────────────────────┤
│ useBackgroundAgent() ◄──► BackgroundAgentManager (单例)          │
│      │                         │                                 │
│      ├── agents                ├── queue.maxConcurrent=3        │
│      ├── runningAgents         ├── pause/resume/cancel          │
│      ├── completedAgents       ├── checkpoint 支持              │
│      ├── queueState            └── health monitoring            │
│      └── notifications                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Store Layer (完善)                            │
├─────────────────────────────────────────────────────────────────┤
│ useBackgroundAgentStore (Zustand + persist)                     │
│      │                                                          │
│      ├── agents: Record<string, BackgroundAgent>                │
│      ├── queue: { items, maxConcurrent, currentlyRunning }      │
│      ├── isPanelOpen / selectedAgentId                          │
│      └── CRUD + 状态管理方法                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Execution Layer (完善)                          │
├─────────────────────────────────────────────────────────────────┤
│ BackgroundAgentManager                                          │
│      │                                                          │
│      ├── AgentOrchestrator (per agent)                          │
│      │      └── SubAgentExecutor                                │
│      │             ├── executeSubAgentsParallel()               │
│      │             └── executeSubAgentsSequential()             │
│      │                                                          │
│      └── ToolCallManager                                        │
│             ├── mode: 'blocking' | 'non-blocking'               │
│             ├── maxConcurrent: 5                                │
│             └── timeout / retry / metrics                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 优化方案

### 方案一: 工具执行指标持久化 (LOW 优先级)

**问题**: `ToolCallManager` 的 metrics 仅在内存中，刷新后丢失

**目标**: 将工具执行统计持久化到 IndexedDB

**涉及文件**:
1. `lib/ai/tools/tool-call-manager.ts` - 添加持久化 hooks
2. `lib/db/repositories/` - 新建 `tool-metrics-repository.ts`
3. `stores/agent/` - 新建 `tool-metrics-store.ts`
4. `components/agent/background-agent-panel.tsx` - 添加历史统计 Tab

**实现步骤**:

```typescript
// 1. 定义类型 (types/agent/tool-metrics.ts)
export interface ToolExecutionRecord {
  id: string;
  toolName: string;
  agentId?: string;
  startedAt: Date;
  completedAt?: Date;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface AggregatedToolMetrics {
  toolName: string;
  totalCalls: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  lastUsed: Date;
}

// 2. IndexedDB Repository (lib/db/repositories/tool-metrics-repository.ts)
export class ToolMetricsRepository {
  async recordExecution(record: ToolExecutionRecord): Promise<void>;
  async getRecentExecutions(limit: number): Promise<ToolExecutionRecord[]>;
  async getAggregatedMetrics(): Promise<AggregatedToolMetrics[]>;
  async clearOldRecords(olderThanDays: number): Promise<void>;
}

// 3. ToolCallManager 增强
export class ToolCallManager {
  // 添加持久化回调
  private persistenceCallback?: (record: ToolExecutionRecord) => void;
  
  setPersistenceCallback(cb: (record: ToolExecutionRecord) => void): void {
    this.persistenceCallback = cb;
  }
  
  private recordExecutionTime(toolName: string, durationMs: number): void {
    // ... 现有逻辑
    
    // 调用持久化
    this.persistenceCallback?.({
      id: nanoid(),
      toolName,
      durationMs,
      success: true,
      startedAt: new Date(Date.now() - durationMs),
      completedAt: new Date(),
    });
  }
}
```

**工作量估计**: 4-6 小时

---

### 方案二: 命令/进程管理 UI (MEDIUM 优先级)

**问题**: `process-tools.ts` 提供了进程管理能力，但无可视化界面

**目标**: 创建进程管理面板，展示 Agent 启动的进程

**涉及文件**:
1. `components/agent/process-manager-panel.tsx` - 新建
2. `hooks/agent/use-process-manager.ts` - 新建
3. `stores/agent/process-store.ts` - 新建
4. `lib/native/process.ts` - 已存在，无需修改

**UI 设计**:

```
┌─────────────────────────────────────────────────────────────┐
│  Process Manager                                    [X]     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Search: [_________________]  [Refresh] [Kill All]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PID    Name         Memory    Status    Actions     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 1234   node.exe     128 MB    Running   [Kill]      │   │
│  │ 5678   python.exe   64 MB     Running   [Kill]      │   │
│  │ 9012   code.exe     512 MB    Running   [Kill]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Started by Agent: 2 processes | Total Memory: 192 MB      │
└─────────────────────────────────────────────────────────────┘
```

**实现步骤**:

```typescript
// 1. Store (stores/agent/process-store.ts)
interface ProcessStoreState {
  processes: ProcessInfo[];
  agentStartedPids: Set<number>;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchProcesses: () => Promise<void>;
  trackAgentProcess: (pid: number, agentId: string) => void;
  terminateProcess: (pid: number) => Promise<boolean>;
}

// 2. Hook (hooks/agent/use-process-manager.ts)
export function useProcessManager() {
  const store = useProcessStore();
  const { isProcessManagementAvailable } = useTauri();
  
  // 自动刷新
  useInterval(() => store.fetchProcesses(), 5000);
  
  return {
    ...store,
    isAvailable: isProcessManagementAvailable,
  };
}

// 3. Component (components/agent/process-manager-panel.tsx)
export function ProcessManagerPanel() {
  const { processes, isLoading, terminateProcess } = useProcessManager();
  
  return (
    <Sheet>
      <DataTable columns={processColumns} data={processes} />
    </Sheet>
  );
}
```

**工作量估计**: 6-8 小时

---

### 方案三: Background Panel 增强 (LOW 优先级)

**现状**: Panel 已完善，以下为微优化

**增强项**:

1. **任务历史持久化** - 当前仅 localStorage，可迁移到 IndexedDB
2. **导出功能** - 导出 Agent 执行日志为 JSON/Markdown
3. **搜索过滤** - 按名称/状态/时间范围搜索历史任务
4. **批量操作** - 多选后批量暂停/恢复/取消

**实现代码片段**:

```typescript
// 1. 搜索过滤 (添加到 background-agent-panel.tsx)
const [searchQuery, setSearchQuery] = useState('');
const [statusFilter, setStatusFilter] = useState<BackgroundAgentStatus | 'all'>('all');
const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);

const filteredAgents = useMemo(() => {
  return agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.task.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    const matchesDate = !dateRange || (
      agent.createdAt >= dateRange[0] && agent.createdAt <= dateRange[1]
    );
    return matchesSearch && matchesStatus && matchesDate;
  });
}, [agents, searchQuery, statusFilter, dateRange]);

// 2. 导出功能
const exportLogs = useCallback((agent: BackgroundAgent, format: 'json' | 'md') => {
  const data = format === 'json' 
    ? JSON.stringify(agent, null, 2)
    : formatAgentAsMarkdown(agent);
  
  downloadFile(`${agent.name}-${agent.id}.${format}`, data);
}, []);

// 3. 批量操作
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

const batchPause = () => selectedIds.forEach(id => pauseAgent(id));
const batchResume = () => selectedIds.forEach(id => resumeAgent(id));
const batchCancel = () => selectedIds.forEach(id => cancelAgent(id));
```

**工作量估计**: 3-4 小时

---

## 实施优先级

| 优先级 | 方案 | 工作量 | 价值 |
|--------|------|--------|------|
| **P1** | 方案二: 进程管理 UI | 6-8h | 填补功能空白 |
| **P2** | 方案三: Panel 增强 | 3-4h | 提升用户体验 |
| **P3** | 方案一: 指标持久化 | 4-6h | 数据分析能力 |

## 建议执行顺序

1. **方案二** - 创建 ProcessManagerPanel，使现有 process-tools 可视化
2. **方案三** - 增强 BackgroundAgentPanel 的搜索/过滤/导出
3. **方案一** - 实现 ToolMetrics 持久化和历史查看

---

## 结论

Cognia 的 Background Agent 系统**已经非常完善**:

- ✅ 完整的 UI 面板 (`BackgroundAgentPanel`)
- ✅ 多入口访问 (Sidebar Widget + Indicator + Panel)
- ✅ 详细的日志查看器
- ✅ 性能统计展示
- ✅ 队列管理 (暂停/恢复)
- ✅ 桌面通知

主要优化空间在于:
1. 为 `process-tools.ts` 添加可视化管理界面
2. 增强历史记录的搜索和导出能力
3. 持久化工具执行指标

**建议**: 根据实际需求选择性实施，当前系统已满足大部分使用场景。
