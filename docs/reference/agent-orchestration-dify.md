# Cognia Agent 编排提取与 Dify 对照文档

## 1. 说明

本文基于 Cognia 当前代码实现提取可执行的 Agent 编排链路，并给出对应的 Dify 工作流映射（Workflow/Chatflow 形式）。

- 提取时间：2026-03-10
- 提取范围：`lib/ai/agent/*`、`hooks/agent/*`、`components/chat/core/chat-container.tsx`、`lib/scheduler/executors/index.ts`
- 目标：把 Cognia 的编排逻辑映射为可在 Dify 中复刻的节点化文档

## 2. 编排总览（Inventory）

| ID | 编排名称 | Cognia 入口 | 典型触发 |
|---|---|---|---|
| A01 | 聊天 Agent 路由（External 优先 + 内置回退） | `components/chat/core/chat-container.tsx` `handleAgentMessage` | 用户在 Agent 模式发消息 |
| A02 | 单代理执行（ReAct + Tool Loop） | `lib/ai/agent/agent-executor.ts` `executeAgent` | `useAgent.run`、Team/SubAgent 内部调用 |
| A03 | 上下文增强执行（Context-Aware） | `lib/ai/agent/context-aware-executor.ts` `executeContextAwareAgent` | `useAgent.run` 默认启用 |
| A04 | 规划循环执行（Plan -> Subtasks -> Summary） | `lib/ai/agent/agent-loop.ts` `executeAgentLoop` | `useAgent.runWithPlanning`、Scheduler |
| A05 | 子代理单体执行 | `lib/ai/agent/sub-agent-executor.ts` `executeSubAgent` | SubAgent Hook/Orchestrator |
| A06 | 子代理并行编排 | `lib/ai/agent/sub-agent-executor.ts` `executeSubAgentsParallel` | SubAgent Hook/Orchestrator |
| A07 | 子代理串行编排（含依赖/条件） | `lib/ai/agent/sub-agent-executor.ts` `executeSubAgentsSequential` | SubAgent Hook/Orchestrator |
| A08 | 子代理 DAG 编排（分层拓扑） | `lib/ai/agent/sub-agent-executor.ts` `executeSubAgentsDependencyGraph` | 高级依赖图执行 |
| A09 | Orchestrator 编排（智能路由/外部委派/聚合） | `lib/ai/agent/agent-orchestrator.ts` `execute` | Background Agent 主执行链路 |
| A10 | Team 编排（Lead 分解、队友执行、合成） | `lib/ai/agent/agent-team.ts` `executeTeam` | Agent Team 面板、Bridge 委派 |
| A11 | Background 编排（优先队列 + 超时 + 重试 + 检查点） | `lib/ai/agent/background-agent-manager.ts` `queueAgent/startAgent/executeAgentInternal` | 后台任务 |
| A12 | 跨系统委派编排（Team <-> Background） | `lib/ai/agent/agent-bridge.ts` `delegateToTeam/delegateToBackground` | Team/Background 相互委派 |
| A13 | External ACP 执行编排（会话复用） | `lib/ai/agent/external/manager.ts` `execute/stream` | Chat External Agent |
| A14 | 定时任务 Agent 编排 | `lib/scheduler/executors/index.ts` `executeAgentTask` | Scheduler `taskType=agent` |

## 3. Dify 映射约定

下文统一使用这些 Dify 节点类型描述：

- `Start`
- `LLM`
- `Tool`
- `IF/ELSE`
- `Iteration`
- `Code`
- `HTTP Request`
- `Variable Assigner`
- `End`

## 4. 分编排 Dify 设计

### A01 聊天 Agent 路由（External 优先 + 内置回退）

**Cognia 实现要点**

1. 读取会话中的 `externalAgentId`。  
2. 有外部 Agent 时先做健康检查和连接。  
3. 外部执行失败时按策略：`strict` 直接失败，`fallback` 回退内置 `runAgent`。  
4. 记录工具摘要并拼接到最终回复。

**Dify 映射**

- App 类型：`Chatflow`
- 输入：`user_query`, `external_agent_id`, `failure_policy`
- 节点：
  1. `Start`
  2. `IF/ELSE`（是否有 `external_agent_id`）
  3. `HTTP Request`（外部 Agent 健康检查/执行）
  4. `IF/ELSE`（外部执行成功?）
  5. `LLM+Tool`（内置回退路径）
  6. `Variable Assigner`（合并 `final_response` + `tool_summary`）
  7. `End`

---

### A02 单代理执行（ReAct + Tool Loop）

**Cognia 实现要点**

1. 构建系统提示（可叠加 ReAct、Memory、自定义 stop 条件）。  
2. `generateText` 多步循环。  
3. 工具调用支持：安全检查、审批、缓存、重试、并行管理。  
4. `onStepFinish` 聚合步骤、工具、token 统计。  
5. 输出 `AgentResult`。

**Dify 映射**

- App 类型：`Workflow` 或 `Chatflow`
- 输入：`prompt`, `system_prompt`, `max_steps`
- 节点：
  1. `Start`
  2. `Iteration`（step loop，max=`max_steps`）
  3. `LLM`（可调用工具）
  4. `IF/ELSE`（是否触发工具）
  5. `Tool`（可串/并）
  6. `Code`（stop condition 计算）
  7. `End`

---

### A03 上下文增强执行（Context-Aware）

**Cognia 实现要点**

1. 包装工具输出：长输出写入上下文文件。  
2. 自动注入上下文工具（`read_context_file` 等）。  
3. 将 terminal/skills/mcp 静态提示注入系统提示。  
4. 最终仍调用 `executeAgent`。

**Dify 映射**

- App 类型：`Workflow`
- 输入：`prompt`, `enable_context_files`
- 节点：
  1. `Start`
  2. `Code`（包装工具输出，判定是否落盘）
  3. `Variable Assigner`（增强 system prompt）
  4. `LLM+Tool`
  5. `End`

---

### A04 规划循环执行（Plan -> Subtasks -> Summary）

**Cognia 实现要点**

1. 可选规划阶段：用单次 Agent 生成子任务列表。  
2. 逐任务执行（可动态选模型 tier）。  
3. 支持中途上下文压缩。  
4. 全部任务后做最终摘要。

**Dify 映射**

- App 类型：`Workflow`
- 输入：`task`, `planning_enabled`
- 节点：
  1. `Start`
  2. `IF/ELSE`（planning_enabled）
  3. `LLM`（生成 subtask list）
  4. `Code`（解析任务列表）
  5. `Iteration`（遍历 subtask）
  6. `LLM+Tool`（执行单任务）
  7. `Code`（中间结果压缩）
  8. `LLM`（总结）
  9. `End`

---

### A05 子代理单体执行

**Cognia 实现要点**

1. 组装子代理上下文（父上下文 + 同级结果）。  
2. 调用 `executeAgent`。  
3. 可选结果摘要（context isolation）。  
4. 支持超时、取消、重试、外部代理执行。

**Dify 映射**

- App 类型：`Workflow`
- 输入：`subagent_task`, `parent_context`
- 节点：
  1. `Start`
  2. `Variable Assigner`（构建 subagent prompt）
  3. `LLM+Tool`
  4. `IF/ELSE`（是否超长结果）
  5. `LLM`（结果摘要，可选）
  6. `End`

---

### A06 子代理并行编排

**Cognia 实现要点**

1. 按优先级排序。  
2. 按 `maxConcurrency` 分批并行。  
3. 每批共享已完成 sibling results。  
4. 聚合成功结果和错误。

**Dify 映射**

- App 类型：`Workflow`
- 输入：`subagent_list`, `max_concurrency`
- 节点：
  1. `Start`
  2. `Code`（优先级排序 + 分批）
  3. `Iteration`（批次循环）
  4. `Parallel Branch`（每个子代理一个分支；Dify 中可用多分支 + 子流程）
  5. `Code`（聚合）
  6. `End`

---

### A07 子代理串行编排（依赖/条件）

**Cognia 实现要点**

1. 按 `order` 串行。  
2. 每个子任务先检查依赖。  
3. 条件表达式不满足则跳过。  
4. `stopOnError` 可提前终止。

**Dify 映射**

- App 类型：`Workflow`
- 输入：`subagent_list`, `stop_on_error`
- 节点：
  1. `Start`
  2. `Iteration`（顺序遍历）
  3. `IF/ELSE`（依赖满足?）
  4. `IF/ELSE`（条件满足?）
  5. `LLM+Tool`（执行）
  6. `IF/ELSE`（失败且 stop_on_error?）
  7. `End`

---

### A08 子代理 DAG 编排（拓扑分层）

**Cognia 实现要点**

1. `topologicalSort` 形成层级。  
2. 每层并行，层间串行。  
3. 每层执行前再次检查依赖/条件。  
4. 层完成后汇总，最终输出全局结果。

**Dify 映射**

- App 类型：`Workflow`
- 输入：`subagent_graph`
- 节点：
  1. `Start`
  2. `Code`（拓扑分层）
  3. `Iteration`（按 layer 循环）
  4. `Parallel Branch`（layer 内并行）
  5. `Code`（写回 sibling_results）
  6. `End`

---

### A09 Orchestrator 编排（智能路由/外部委派/聚合）

**Cognia 实现要点**

1. 可先判断是否委派外部 Agent。  
2. 可做 Smart Routing：单代理 vs 多代理。  
3. 多代理时：生成 plan -> 创建 subAgents -> 执行 -> 聚合。  
4. 支持 pause/resume/cancel。

**Dify 映射**

- App 类型：`Workflow`
- 输入：`task`, `enable_smart_routing`, `enable_external_delegate`
- 节点：
  1. `Start`
  2. `IF/ELSE`（是否外部委派）
  3. `HTTP Request`（外部执行）
  4. `IF/ELSE`（回退本地?）
  5. `Code`（smart routing）
  6. `IF/ELSE`（single/multi）
  7. `LLM`（plan）
  8. `Iteration/Parallel`（subagent 执行）
  9. `LLM`（aggregate）
  10. `End`

---

### A10 Team 编排（Lead + Teammates）

**Cognia 实现要点**

1. Lead 先分解任务（若 task list 为空）。  
2. 执行模式：`coordinated` / `autonomous` / `delegate`。  
3. 每位队友执行具体 task（可含计划审批循环）。  
4. 任务结果写入 shared memory，最终由 Lead 合成。

**Dify 映射**

- App 类型：`Workflow`
- 输入：`team_task`, `execution_mode`
- 节点：
  1. `Start`
  2. `LLM`（Lead 分解任务）
  3. `Code`（任务依赖解析 + 分配）
  4. `Iteration`（调度循环）
  5. `LLM+Tool`（teammate 执行子任务）
  6. `Code`（deadlock recovery / retry）
  7. `LLM`（Lead synthesis）
  8. `End`

---

### A11 Background 编排（队列 + 后台执行）

**Cognia 实现要点**

1. 维护优先级队列和并发上限。  
2. 每个后台任务进入 `AgentOrchestrator` 执行。  
3. 支持 timeout、auto-retry、checkpoint pause/resume。  
4. 结果与事件全量记录并可持久化恢复。

**Dify 映射**

- App 类型：`Workflow`（通常配合外部调度器）
- 输入：`agent_job`, `priority`
- 节点：
  1. `Start`
  2. `Code`（入队与并发门控）
  3. `Sub Workflow`（调用 A09）
  4. `IF/ELSE`（超时/失败）
  5. `Code`（重试与回退策略）
  6. `End`

---

### A12 跨系统委派（Bridge）

**Cognia 实现要点**

1. 创建 delegation 记录。  
2. 可委派到 Team 或 Background。  
3. 监听目标系统事件更新 delegation 状态。  
4. 结果写入共享内存。

**Dify 映射**

- App 类型：`Workflow`
- 输入：`source_type`, `target_type`, `task`
- 节点：
  1. `Start`
  2. `Code`（创建 delegation metadata）
  3. `IF/ELSE`（target_type）
  4. `Sub Workflow`（A10 或 A11）
  5. `Variable Assigner`（同步 delegation 状态）
  6. `End`

---

### A13 External ACP 执行编排

**Cognia 实现要点**

1. 连接检查。  
2. 解析并复用 session（可 resume/create）。  
3. 执行 prompt（stream 或 execute）。  
4. 更新会话缓存与统计。  
5. 支持 delegation rule 匹配。

**Dify 映射**

- App 类型：`Chatflow`
- 输入：`prompt`, `agent_id`, `session_id`
- 节点：
  1. `Start`
  2. `HTTP Request`（health/connect）
  3. `Code`（session resolve）
  4. `HTTP Request`（ACP execute）
  5. `Variable Assigner`（session 回写）
  6. `End`

---

### A14 定时任务 Agent 编排（Scheduler）

**Cognia 实现要点**

1. Scheduler 触发 `taskType=agent`。  
2. 任务体调用 `executeAgentLoop`。  
3. 返回执行统计（taskCount/steps/duration/summary）。

**Dify 映射**

- App 类型：`Workflow`（由 Dify 定时触发）
- 输入：`agent_task`, `config`
- 节点：
  1. `Start`（cron trigger）
  2. `Sub Workflow`（调用 A04）
  3. `Variable Assigner`（提取统计字段）
  4. `End`

## 5. 落地建议（Cognia -> Dify）

1. **可直接映射**：A01/A02/A04/A07/A14。  
2. **需 Code 节点补齐**：A06/A08/A11（并发队列、拓扑层、重试检查点）。  
3. **需外部服务配合**：A12/A13（Bridge 事件监听、ACP 会话与长连接）。  
4. **建议拆分子流程**：把 A02/A04/A10 做成可复用子工作流，A09/A11/A12 只负责调度和路由。  

## 6. 与源码的关键对齐点

- `executeAgent`：`lib/ai/agent/agent-executor.ts`  
- `executeAgentLoop`：`lib/ai/agent/agent-loop.ts`  
- `executeSubAgent*`：`lib/ai/agent/sub-agent-executor.ts`  
- `AgentOrchestrator.execute`：`lib/ai/agent/agent-orchestrator.ts`  
- `AgentTeamManager.executeTeam`：`lib/ai/agent/agent-team.ts`  
- `BackgroundAgentManager.executeAgentInternal`：`lib/ai/agent/background-agent-manager.ts`  
- `AgentBridge.delegateToTeam/delegateToBackground`：`lib/ai/agent/agent-bridge.ts`  
- `ExternalAgentManager.execute`：`lib/ai/agent/external/manager.ts`  
- `Scheduler executeAgentTask`：`lib/scheduler/executors/index.ts`

