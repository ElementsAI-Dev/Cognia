# MCP 系统改进计划

## 文档信息

- **项目**: Cognia AI 聊天应用
- **模块**: MCP (Model Context Protocol) 系统
- **创建日期**: 2025-01-26
- **状态**: 规划中
- **优先级**: 高

---

## 执行摘要

本计划旨在完善和改进 Cognia 的 MCP (Model Context Protocol) 系统实现。当前 MCP 系统已经实现了核心协议功能（工具、资源、提示），但仍存在以下关键问题和改进机会：

### 关键发现

1. **Sampling 协议未完成**: 类型定义存在但 `create_message` 方法未实现
2. **Ping 命令存在 Bug**: `mcp_ping_server` 只检查状态，未实际调用 ping 方法
3. **代码重复**: 工具转换逻辑在多处重复实现
4. **性能问题**: 无缓存层，每次 agent 执行都获取所有工具
5. **功能不完整**: 并行执行跟踪存在但未使用，资源订阅更新未暴露

### 改进目标

- 实现完整的 Sampling 协议支持
- 修复已知 bug 和性能问题
- 消除代码重复，提高可维护性
- 添加缺失的功能特性
- 改进用户体验（工具选择 UI、使用可视化）

---

## 现状分析

### 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                     前端 (TypeScript/React)                     │
├─────────────────────────────────────────────────────────────────┤
│  stores/mcp/           │  lib/ai/tools/    │  components/       │
│  ├── mcp-store.ts      │  ├── mcp-tools.ts │  ├── settings/mcp/ │
│  └── mcp-marketplace/  │  └── ...          │  └── mcp/          │
│        (483行)            (760行)            (16组件)           │
└────────┬─────────────────┴──────────┬────────┴──────────┬─────────┘
         │                           │                     │
         │    Tauri IPC Commands      │                     │
         ▼                           ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   后端 (Rust)                                    │
├─────────────────────────────────────────────────────────────────┤
│  src-tauri/src/mcp/           │  commands/providers/mcp.rs     │
│  ├── client.rs (1014行)       │  └── (384行, 20命令)            │
│  ├── manager.rs (1648行)      │                                │
│  ├── types.rs (1800+行)       │                                │
│  ├── protocol/ (5文件)        │                                │
│  └── transport/ (2文件)       │                                │
└─────────────────────────────────────────────────────────────────┘
```

### 已实现功能

| 功能 | 状态 | 说明 |
|------|------|------|
| stdio 传输 | ✅ | 完整实现 |
| SSE 传输 | ✅ | 完整实现，支持自定义消息 URL |
| 工具协议 | ✅ | list/call 完整实现 |
| 资源协议 | ✅ | list/read/subscribe/unsubscribe |
| 提示协议 | ✅ | list/get 完整实现 |
| 日志协议 | ✅ | set_log_level 实现 |
| 健康检查 | ⚠️ | ping 方法存在但未正确调用 |
| Sampling | ❌ | 仅类型定义，无实现 |
| 进度通知 | ✅ | 接收并分发到前端 |
| 资源更新通知 | ⚠️ | 接收但未存储/暴露 |
| 并行执行 | ⚠️ | 跟踪存在但未利用 |

### 代码质量评估

| 方面 | 评分 | 说明 |
|------|------|------|
| 架构设计 | 8/10 | 清晰的前后端分离，良好的 IPC 抽象 |
| 代码复用 | 6/10 | 存在重复的工具转换逻辑 |
| 错误处理 | 5/10 | 多处空 catch 块，通用 fallback |
| 性能 | 6/10 | 无缓存，频繁 IPC 调用 |
| 测试覆盖 | 7/10 | Rust 端有测试，前端较少 |
| 文档完整 | 9/10 | 类型定义完善，注释充分 |

---

## 详细改进计划

### 第一阶段: 协议完整性 (优先级: 关键)

#### 1.1 实现 Sampling 协议

**问题**: `SamplingCapability` 和相关类型已定义，但 `sampling/createMessage` 方法未在客户端实现。

**影响**: MCP 服务器无法向客户端发起 AI 请求（反向调用）

**实现方案**:

**文件: `src-tauri/src/mcp/client.rs`**

```rust
/// Create a message using the server's AI capabilities (sampling)
pub async fn create_message(
    &self,
    params: SamplingRequest,
) -> McpResult<SamplingResult> {
    log::info!(
        "Creating sampling message: model='{}', max_tokens={}",
        params.model_preference.as_deref().unwrap_or("default"),
        params.max_tokens
    );

    let json_params = serde_json::to_value(params)?;
    let result = self.send_request(methods::SAMPLING_CREATE_MESSAGE, Some(json_params)).await?;
    let response: SamplingResult = serde_json::from_value(result)?;

    log::info!(
        "Sampling completed: {} messages in result",
        response.messages.len()
    );
    Ok(response)
}
```

**文件: `src-tauri/src/commands/providers/mcp.rs`**

```rust
#[tauri::command]
pub async fn mcp_create_sampling_message(
    state: State<'_, McpManager>,
    server_id: String,
    params: SamplingRequest,
) -> Result<SamplingResult, String> {
    log::debug!(
        "Command: mcp_create_sampling_message, server='{}', max_tokens={}",
        server_id,
        params.max_tokens
    );

    state
        .create_message(&server_id, params)
        .await
        .map_err(|e| e.to_string())
}
```

**文件: `src-tauri/src/mcp/manager.rs`**

```rust
/// Create a sampling message using the server's AI capabilities
pub async fn create_message(
    &self,
    server_id: &str,
    params: SamplingRequest,
) -> McpResult<SamplingResult> {
    let instance = self.get_server_instance(server_id)?;

    // Check if server supports sampling
    let capabilities = instance
        .client
        .get_capabilities()
        .await
        .ok_or(McpError::NotConnected)?;

    if capabilities.sampling.is_none() {
        return Err(McpError::UnsupportedCapability(
            "sampling".to_string(),
        ));
    }

    instance.client.create_message(params).await
}
```

**文件: `stores/mcp/mcp-store.ts`**

```typescript
// 添加到 McpState 接口
createSamplingMessage: (
  serverId: string,
  params: SamplingRequest
) => Promise<SamplingResult>;

// 实现
createSamplingMessage: async (serverId, params) => {
  return invoke<SamplingResult>('mcp_create_sampling_message', {
    serverId,
    params,
  });
},
```

**测试用例**:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sampling_request_serialization() {
        let request = SamplingRequest {
            messages: vec![SamplingMessage {
                role: "user".to_string(),
                content: SamplingMessageContent::Text("Test".to_string()),
            }],
            model_preference: None,
            max_tokens: 100,
            temperature: Some(0.7),
            stop_sequences: None,
            include_context: None,
            metadata: None,
        };

        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["max_tokens"], 100);
    }
}
```

#### 1.2 修复 Ping 命令

**问题**: `mcp_ping_server` 命令只检查服务器状态，未实际调用 ping 方法

**位置**: `src-tauri/src/commands/providers/mcp.rs:261-270`

**当前实现**:
```rust
#[tauri::command]
pub async fn mcp_ping_server(
    state: State<'_, McpManager>,
    server_id: String,
) -> Result<i64, String> {
    // 只检查状态，未真正 ping
    Ok(0)
}
```

**修复方案**:

```rust
#[tauri::command]
pub async fn mcp_ping_server(
    state: State<'_, McpManager>,
    server_id: String,
) -> Result<i64, String> {
    log::debug!("Command: mcp_ping_server, server='{}'", server_id);

    let start = std::time::Instant::now();
    state
        .ping_server(&server_id)
        .await
        .map_err(|e| e.to_string())?;
    let elapsed = start.elapsed();

    Ok(elapsed.as_millis() as i64)
}
```

**文件: `src-tauri/src/mcp/manager.rs`**

添加 ping 方法:
```rust
/// Ping a server to check connection latency
pub async fn ping_server(&self, server_id: &str) -> McpResult<()> {
    let instance = self.get_server_instance(server_id)?;
    instance.client.ping().await
}
```

---

### 第二阶段: 代码重构与性能改进 (优先级: 高)

#### 2.1 统一工具转换逻辑

**问题**: `createMcpToolsFromStore` 和 `createMcpToolsFromBackend` 存在重复逻辑

**位置**:
- `lib/ai/tools/mcp-tools.ts:288-299` (createMcpToolsFromStore)
- `lib/ai/tools/mcp-tools.ts:310-347` (createMcpToolsFromBackend)

**当前模式**:
```typescript
// createMcpToolsFromStore - 从 store 状态读取
export async function createMcpToolsFromStore(): Promise<AgentTool[]> {
  const mcpStore = useMcpStore.getState();
  const servers = mcpStore.servers;
  // ... 转换逻辑
}

// createMcpToolsFromBackend - 从后端 API 获取
export async function createMcpToolsFromBackend(): Promise<AgentTool[]> {
  const mcpStore = useMcpStore.getState();
  const allTools = await mcpStore.getAllTools();
  // ... 相似的转换逻辑
}
```

**重构方案**:

**新文件: `lib/ai/tools/mcp-tool-converter.ts`**

```typescript
import { invoke } from '@tauri-apps/api/core';
import type { AgentTool } from '../agent/types';
import type { McpTool } from '@/types/mcp';
import { convertMcpToolToAgentTool } from './mcp-tools';

/**
 * 工具数据源接口
 */
export interface McpToolDataSource {
  getAllTools: () => Promise<Array<{ serverId: string; tool: McpTool }>>;
}

/**
 * Store 数据源 - 从 Zustand store 读取
 */
class StoreToolDataSource implements McpToolDataSource {
  async getAllTools(): Promise<Array<{ serverId: string; tool: McpTool }>> {
    const { useMcpStore } = await import('@/stores/mcp/mcp-store');
    const mcpStore = useMcpStore.getState();
    const servers = mcpStore.servers.filter(s => s.status === 'connected');

    const tools: Array<{ serverId: string; tool: McpTool }> = [];
    for (const server of servers) {
      if (server.tools) {
        for (const tool of server.tools) {
          tools.push({ serverId: server.id, tool });
        }
      }
    }
    return tools;
  }
}

/**
 * Backend 数据源 - 通过 Tauri IPC 获取
 */
class BackendToolDataSource implements McpToolDataSource {
  async getAllTools(): Promise<Array<{ serverId: string; tool: McpTool }>> {
    const result = await invoke<Array<[string, McpTool]>>('mcp_get_all_tools');
    if (!Array.isArray(result)) return [];
    return result.map(([serverId, tool]) => ({ serverId, tool }));
  }
}

/**
 * 统一的工具转换器
 */
export class McpToolConverter {
  /**
   * 从数据源转换 MCP 工具为 AgentTool
   */
  static async convertFromSource(
    source: McpToolDataSource
  ): Promise<AgentTool[]> {
    const allTools = await source.getAllTools();
    return Promise.all(
      allTools.map(({ serverId, tool }) =>
        convertMcpToolToAgentTool(tool, serverId)
      )
    );
  }

  /**
   * 从 Store 转换 (向后兼容)
   */
  static async convertFromStore(): Promise<AgentTool[]> {
    return this.convertFromSource(new StoreToolDataSource());
  }

  /**
   * 从 Backend 转换 (向后兼容)
   */
  static async convertFromBackend(): Promise<AgentTool[]> {
    return this.convertFromSource(new BackendToolDataSource());
  }
}

// 向后兼容的导出
export async function createMcpToolsFromStore(): Promise<AgentTool[]> {
  return McpToolConverter.convertFromStore();
}

export async function createMcpToolsFromBackend(): Promise<AgentTool[]> {
  return McpToolConverter.convertFromBackend();
}
```

**更新导入**:

**文件: `lib/ai/tools/mcp-tools.ts`**
```typescript
// 更新导出
export { McpToolConverter } from './mcp-tool-converter';
export { convertMcpToolToAgentTool } from './mcp-tool-converter';

// 保持向后兼容
export { createMcpToolsFromStore, createMcpToolsFromBackend } from './mcp-tool-converter';
```

#### 2.2 实现工具缓存层

**问题**: `getAllTools()` 在每次 agent 执行时都被调用，无缓存机制

**位置**: `stores/mcp/mcp-store.ts:274-278`

**实现方案**:

**新文件: `lib/mcp/tool-cache.ts`**

```typescript
import type { McpTool } from '@/types/mcp';

/**
 * 工具缓存条目
 */
interface CachedToolEntry {
  tools: Array<{ serverId: string; tool: McpTool }>;
  timestamp: number;
  version: number;
}

/**
 * 工具缓存配置
 */
export interface ToolCacheConfig {
  ttl: number;           // 缓存生存时间 (毫秒)
  maxSize: number;       // 最大缓存条目数
  enabled: boolean;      // 是否启用缓存
}

const DEFAULT_CACHE_CONFIG: ToolCacheConfig = {
  ttl: 5 * 60 * 1000,    // 5 分钟
  maxSize: 10,
  enabled: true,
};

/**
 * 工具缓存管理器
 */
export class ToolCacheManager {
  private cache: Map<string, CachedToolEntry> = new Map();
  private config: ToolCacheConfig;
  private version: number = 0;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<ToolCacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.startCleanupTimer();
  }

  /**
   * 获取缓存的工具
   */
  get(key: string): Array<{ serverId: string; tool: McpTool }> | null {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    const now = Date.now();
    if (now - entry.timestamp > this.config.ttl) {
      this.cache.delete(key);
      return null;
    }

    // 检查版本是否匹配
    if (entry.version !== this.version) {
      this.cache.delete(key);
      return null;
    }

    return entry.tools;
  }

  /**
   * 设置缓存
   */
  set(key: string, tools: Array<{ serverId: string; tool: McpTool }>): void {
    if (!this.config.enabled) return;

    // 限制缓存大小
    if (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      tools,
      timestamp: Date.now(),
      version: this.version,
    });
  }

  /**
   * 使缓存失效 (当服务器状态变化时调用)
   */
  invalidate(): void {
    this.version++;
    this.cache.clear();
  }

  /**
   * 清除特定服务器的缓存
   */
  invalidateServer(serverId: string): void {
    this.version++;
    // 删除包含该服务器的缓存条目
    for (const [key, entry] of this.cache) {
      if (entry.tools.some(t => t.serverId === serverId)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.config.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // 每分钟清理一次
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// 全局单例
let globalCacheManager: ToolCacheManager | null = null;

export function getToolCacheManager(): ToolCacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new ToolCacheManager();
  }
  return globalCacheManager;
}

export function destroyToolCacheManager(): void {
  if (globalCacheManager) {
    globalCacheManager.destroy();
    globalCacheManager = null;
  }
}
```

**更新 `mcp-store.ts`**:

```typescript
import { getToolCacheManager } from '@/lib/mcp/tool-cache';

// 在 loadServers 后使缓存失效
loadServers: async () => {
  set({ isLoading: true, error: null });
  try {
    const servers = await invoke<McpServerState[]>('mcp_get_servers');
    set({ servers, isLoading: false });

    // 使工具缓存失效
    getToolCacheManager().invalidate();
  } catch (error) {
    set({ error: String(error), isLoading: false });
  }
},

// 缓存 getAllTools 结果
getAllTools: async () => {
  const cache = getToolCacheManager();
  const cached = cache.get('all');
  if (cached) return cached;

  const result = await invoke<Array<[string, McpTool]>>('mcp_get_all_tools');
  if (!Array.isArray(result)) return [];

  const tools = result.map(([serverId, tool]) => ({ serverId, tool }));
  cache.set('all', tools);
  return tools;
},
```

#### 2.3 改进健康检查机制

**问题**: 所有连接的服务器每 30 秒进行一次健康检查，不可配置

**位置**: `src-tauri/src/mcp/manager.rs:903-979`

**实现方案**:

**文件: `src-tauri/src/mcp/types.rs`**

添加健康检查配置:
```rust
/// 健康检查配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheckConfig {
    /// 检查间隔 (秒)
    pub interval_secs: u64,
    /// 是否启用
    pub enabled: bool,
    /// 超时时间 (秒)
    pub timeout_secs: u64,
}

impl Default for HealthCheckConfig {
    fn default() -> Self {
        Self {
            interval_secs: 30,
            enabled: true,
            timeout_secs: 5,
        }
    }
}
```

**更新 `McpServerConfig`**:
```rust
pub struct McpServerConfig {
    // ... 现有字段

    /// 健康检查配置
    #[serde(default)]
    pub health_check: HealthCheckConfig,
}
```

**文件: `src-tauri/src/mcp/manager.rs`**

修改健康检查逻辑:
```rust
impl McpManager {
    fn spawn_health_check(&self, server_id: String) -> JoinHandle<()> {
        let config = self.get_server_config(&server_id);
        let health_config = config
            .and_then(|c| c.health_check.clone())
            .unwrap_or_default();

        if !health_config.enabled {
            log::debug!("Health check disabled for server '{}'", server_id);
            return tokio::spawn(async {});
        }

        let interval = Duration::from_secs(health_config.interval_secs);
        let timeout = Duration::from_secs(health_config.timeout_secs);

        let manager = self.clone();
        tokio::spawn(async move {
            let mut interval_timer = tokio::time::interval(interval);
            loop {
                interval_timer.tick().await;

                log::trace!("Health check for server '{}'", server_id);

                let instance = match manager.get_server_instance(&server_id) {
                    Ok(i) => i,
                    Err(_) => continue,
                };

                // 带超时的 ping
                let ping_result = tokio::time::timeout(
                    timeout,
                    instance.client.ping()
                ).await;

                match ping_result {
                    Ok(Ok(_)) => {
                        // Ping 成功
                    }
                    Ok(Err(e)) => {
                        log::warn!("Health check failed for '{}': {}", server_id, e);
                    }
                    Err(_) => {
                        log::warn!("Health check timeout for '{}'", server_id);
                    }
                }
            }
        })
    }
}
```

---

### 第三阶段: 功能完善 (优先级: 高)

#### 3.1 实现并行工具执行

**问题**: 活动工具调用跟踪已存在，但并行执行逻辑未实现

**位置**: `stores/mcp/mcp-store.ts:49-50, 119-120`

**实现方案**:

**新文件: `lib/mcp/parallel-executor.ts`**

```typescript
import type { ActiveToolCall, ToolCallResult } from '@/stores/mcp/mcp-store';
import { useMcpStore } from '@/stores/mcp/mcp-store';

/**
 * 并行执行配置
 */
export interface ParallelExecutionConfig {
  maxConcurrent: number;     // 最大并发数
  timeout: number;            // 单个工具超时 (毫秒)
  retryOnError: boolean;      // 错误时重试
  maxRetries: number;         // 最大重试次数
}

const DEFAULT_CONFIG: ParallelExecutionConfig = {
  maxConcurrent: 5,
  timeout: 30000,
  retryOnError: false,
  maxRetries: 1,
};

/**
 * 工具执行请求
 */
export interface ToolExecutionRequest {
  callId: string;
  serverId: string;
  toolName: string;
  args: Record<string, unknown>;
  priority?: number;          // 优先级 (0-10, 10最高)
}

/**
 * 执行结果
 */
export interface ToolExecutionResult {
  callId: string;
  result?: ToolCallResult;
  error?: string;
  duration: number;
}

/**
 * 并行工具执行器
 */
export class ParallelToolExecutor {
  private config: ParallelExecutionConfig;
  private queue: ToolExecutionRequest[] = [];
  private running: Set<string> = new Set();
  private mcpStore = useMcpStore;

  constructor(config: Partial<ParallelExecutionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 提交工具执行请求
   */
  async submit(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    return new Promise((resolve, reject) => {
      // 开始跟踪
      this.mcpStore.getState().trackToolCallStart(
        request.callId,
        request.serverId,
        request.toolName,
        request.args
      );

      const execute = async () => {
        this.running.add(request.callId);

        try {
          const startTime = Date.now();
          const result = await this.executeWithTimeout(request);
          const duration = Date.now() - startTime;

          this.mcpStore.getState().trackToolCallComplete(request.callId, result);

          resolve({
            callId: request.callId,
            result,
            duration,
          });
        } catch (error) {
          this.mcpStore.getState().trackToolCallError(
            request.callId,
            String(error)
          );

          resolve({
            callId: request.callId,
            error: String(error),
            duration: 0,
          });
        } finally {
          this.running.delete(request.callId);
          this.processQueue();
        }
      };

      // 检查是否可以立即执行
      if (this.running.size < this.config.maxConcurrent) {
        execute();
      } else {
        // 加入队列
        this.queue.push(request);
        this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      }
    });
  }

  /**
   * 批量提交工具执行请求
   */
  async submitBatch(
    requests: ToolExecutionRequest[]
  ): Promise<ToolExecutionResult[]> {
    return Promise.all(
      requests.map(req => this.submit(req))
    );
  }

  /**
   * 带超时的执行
   */
  private async executeWithTimeout(
    request: ToolExecutionRequest
  ): Promise<ToolCallResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      this.mcpStore
        .getState()
        .callTool(request.serverId, request.toolName, request.args)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);

          // 重试逻辑
          if (this.config.retryOnError) {
            // TODO: 实现重试
          }
          reject(error);
        });
    });
  }

  /**
   * 处理队列
   */
  private processQueue(): void {
    while (
      this.queue.length > 0 &&
      this.running.size < this.config.maxConcurrent
    ) {
      const request = this.queue.shift();
      if (request) {
        // 异步执行，不阻塞
        this.submit(request).catch(() => {});
      }
    }
  }

  /**
   * 取消执行
   */
  cancel(callId: string): void {
    // 从队列中移除
    this.queue = this.queue.filter(r => r.callId !== callId);

    // 如果正在运行，标记为取消
    if (this.running.has(callId)) {
      this.mcpStore.getState().trackToolCallError(callId, 'Cancelled');
    }
  }

  /**
   * 获取执行状态
   */
  getStatus(): { running: number; queued: number } {
    return {
      running: this.running.size,
      queued: this.queue.length,
    };
  }
}
```

#### 3.2 实现资源订阅更新回调

**问题**: 资源订阅更新通知被接收但未存储或暴露给前端

**位置**: `src-tauri/src/mcp/manager.rs:1027-1043`

**实现方案**:

**文件: `types/mcp/mcp.ts`**

添加资源更新类型:
```typescript
/**
 * 资源更新事件
 */
export interface ResourceUpdateEvent {
  serverId: string;
  uri: string;
  contents?: ResourceContentItem[];
}

/**
 * 资源订阅状态
 */
export interface ResourceSubscription {
  serverId: string;
  uri: string;
  subscribedAt: number;
  lastUpdate?: number;
  updateCount: number;
}
```

**文件: `stores/mcp/mcp-store.ts`**

```typescript
interface McpState {
  // ... 现有字段

  // 资源订阅
  resourceSubscriptions: Map<string, ResourceSubscription>;
  resourceUpdates: ResourceUpdateEvent[];

  // 资源订阅操作
  subscribeToResource: (serverId: string, uri: string) => Promise<void>;
  unsubscribeFromResource: (serverId: string, uri: string) => Promise<void>;
  getResourceSubscriptions: () => ResourceSubscription[];
  getResourceUpdates: (serverId: string, uri?: string) => ResourceUpdateEvent[];
  clearResourceUpdates: () => void;
}

// 实现
subscribeToResource: async (serverId, uri) => {
  try {
    await invoke('mcp_subscribe_resource', { serverId, uri });

    set((prev) => {
      const subs = new Map(prev.resourceSubscriptions);
      subs.set(`${serverId}:${uri}`, {
        serverId,
        uri,
        subscribedAt: Date.now(),
        updateCount: 0,
      });
      return { resourceSubscriptions: subs };
    });
  } catch (error) {
    set({ error: String(error) });
    throw error;
  }
},

unsubscribeFromResource: async (serverId, uri) => {
  try {
    await invoke('mcp_unsubscribe_resource', { serverId, uri });

    set((prev) => {
      const subs = new Map(prev.resourceSubscriptions);
      subs.delete(`${serverId}:${uri}`);
      return { resourceSubscriptions: subs };
    });
  } catch (error) {
    set({ error: String(error) });
    throw error;
  }
},

getResourceSubscriptions: () => {
  return Array.from(get().resourceSubscriptions.values());
},

getResourceUpdates: (serverId, uri) => {
  const updates = get().resourceUpdates;
  return updates.filter(u => {
    if (serverId && u.serverId !== serverId) return false;
    if (uri && u.uri !== uri) return false;
    return true;
  });
},

clearResourceUpdates: () => {
  set({ resourceUpdates: [] });
},
```

**更新事件监听器**:

```typescript
initialize: async () => {
  // ... 现有代码

  // 添加资源更新监听器
  unlistenResourceUpdate = await listen<ResourceUpdateEvent>(
    'mcp:resource-update',
    (event) => {
      const update = event.payload;

      // 存储更新
      set((prev) => ({
        resourceUpdates: [...prev.resourceUpdates, update].slice(-100), // 保留最近100条
      }));

      // 更新订阅统计
      set((prev) => {
        const subs = new Map(prev.resourceSubscriptions);
        const key = `${update.serverId}:${update.uri}`;
        const sub = subs.get(key);
        if (sub) {
          subs.set(key, {
            ...sub,
            lastUpdate: Date.now(),
            updateCount: sub.updateCount + 1,
          });
        }
        return { resourceSubscriptions: subs };
      });
    }
  );
},
```

#### 3.3 添加工具选择 UI

**问题**: 工具选择配置已存在但未在 UI 中暴露

**实现方案**:

**新文件: `components/settings/mcp-tool-selection.tsx`**

```typescript
import { useMcpStore } from '@/stores/mcp/mcp-store';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function McpToolSelectionSettings() {
  const { toolSelectionConfig, setToolSelectionConfig } = useMcpStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>智能工具选择</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 启用/禁用 */}
        <div className="flex items-center justify-between">
          <Label htmlFor="enable-selection">启用智能选择</Label>
          <Switch
            id="enable-selection"
            checked={toolSelectionConfig.enabled}
            onCheckedChange={(checked) =>
              setToolSelectionConfig({ enabled: checked })
            }
          />
        </div>

        {/* 最大工具数 */}
        <div className="space-y-2">
          <Label>最大工具数量: {toolSelectionConfig.maxTools}</Label>
          <Slider
            value={[toolSelectionConfig.maxTools]}
            onValueChange={([value]) =>
              setToolSelectionConfig({ maxTools: value })
            }
            min={1}
            max={20}
            step={1}
          />
        </div>

        {/* 相关性阈值 */}
        <div className="space-y-2">
          <Label>
            相关性阈值: {(toolSelectionConfig.minRelevanceScore * 100).toFixed(0)}%
          </Label>
          <Slider
            value={[toolSelectionConfig.minRelevanceScore * 100]}
            onValueChange={([value]) =>
              setToolSelectionConfig({ minRelevanceScore: value / 100 })
            }
            min={0}
            max={100}
            step={5}
          />
        </div>

        {/* 历史权重 */}
        <div className="space-y-2">
          <Label>
            历史使用权重: {toolSelectionConfig.historyBoost.toFixed(1)}
          </Label>
          <Slider
            value={[toolSelectionConfig.historyBoost * 10]}
            onValueChange={([value]) =>
              setToolSelectionConfig({ historyBoost: value / 10 })
            }
            min={0}
            max={50}
            step={1}
          />
        </div>

        {/* 成功率权重 */}
        <div className="space-y-2">
          <Label>
            成功率权重: {toolSelectionConfig.successRateWeight.toFixed(1)}
          </Label>
          <Slider
            value={[toolSelectionConfig.successRateWeight * 10]}
            onValueChange={([value]) =>
              setToolSelectionConfig({ successRateWeight: value / 10 })
            }
            min={0}
            max={50}
            step={1}
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 第四阶段: 用户体验改进 (优先级: 中)

#### 4.1 工具使用可视化

**新文件: `components/mcp/mcp-tool-usage-stats.tsx`**

```typescript
import { useMcpStore } from '@/stores/mcp/mcp-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export function McpToolUsageStats() {
  const { getToolUsageHistory } = useMcpStore();
  const history = getToolUsageHistory();

  const sortedTools = Array.from(history.values())
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10);

  const totalUsage = sortedTools.reduce((sum, t) => sum + t.usageCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>工具使用统计</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedTools.map((tool) => {
          const percentage = (tool.usageCount / totalUsage) * 100;
          const successRate = (tool.successCount / tool.usageCount) * 100;

          return (
            <div key={tool.toolName} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{tool.toolName}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{tool.usageCount} 次</Badge>
                  <Badge
                    variant={successRate > 80 ? 'default' : 'destructive'}
                  >
                    {successRate.toFixed(0)}% 成功
                  </Badge>
                </div>
              </div>
              <Progress value={percentage} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>平均耗时: {tool.avgExecutionTime.toFixed(0)}ms</span>
                <span>最后使用: {new Date(tool.lastUsedAt).toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
```

#### 4.2 改进错误处理

**文件: `lib/mcp/error-handler.ts`**

```typescript
/**
 * MCP 错误类型
 */
export enum McpErrorType {
  Connection = 'connection',
  Timeout = 'timeout',
  Protocol = 'protocol',
  Server = 'server',
  ToolNotFound = 'tool_not_found',
  InvalidArgs = 'invalid_args',
  Permission = 'permission',
  RateLimit = 'rate_limit',
  Unknown = 'unknown',
}

/**
 * 分类 MCP 错误
 */
export function classifyMcpError(error: string): McpErrorType {
  const lower = error.toLowerCase();

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return McpErrorType.Timeout;
  }
  if (lower.includes('connection') || lower.includes('connect')) {
    return McpErrorType.Connection;
  }
  if (lower.includes('not found')) {
    return McpErrorType.ToolNotFound;
  }
  if (lower.includes('permission') || lower.includes('unauthorized')) {
    return McpErrorType.Permission;
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return McpErrorType.RateLimit;
  }
  if (lower.includes('invalid') && lower.includes('argument')) {
    return McpErrorType.InvalidArgs;
  }

  return McpErrorType.Unknown;
}

/**
 * 获取用户友好的错误消息
 */
export function getErrorMessage(error: string): string {
  const type = classifyMcpError(error);

  switch (type) {
    case McpErrorType.Timeout:
      return '操作超时，请稍后重试';
    case McpErrorType.Connection:
      return '无法连接到服务器，请检查服务器状态';
    case McpErrorType.ToolNotFound:
      return '工具不存在或未启用';
    case McpErrorType.Permission:
      return '权限不足，请检查配置';
    case McpErrorType.RateLimit:
      return '请求过于频繁，请稍后重试';
    case McpErrorType.InvalidArgs:
      return '参数无效，请检查输入';
    default:
      return '操作失败，请重试';
  }
}

/**
 * 获取错误恢复建议
 */
export function getErrorRecovery(type: McpErrorType): string[] {
  switch (type) {
    case McpErrorType.Timeout:
      return [
        '检查网络连接',
        '尝试增加超时时间',
        '减少同时调用的工具数量',
      ];
    case McpErrorType.Connection:
      return [
        '确认服务器正在运行',
        '检查服务器配置',
        '查看服务器日志',
      ];
    case McpErrorType.ToolNotFound:
      return [
        '确认工具名称正确',
        '检查服务器是否支持此工具',
        '尝试重新连接服务器',
      ];
    default:
      return ['重试操作', '检查配置', '查看日志'];
  }
}
```

---

## 实施路线图

### Sprint 1: 协议完整性 (Week 1-2)
- [ ] 实现 Sampling 协议 (create_message)
- [ ] 修复 ping 命令 bug
- [ ] 添加单元测试
- [ ] 更新文档

### Sprint 2: 性能改进 (Week 2-3)
- [ ] 统一工具转换逻辑
- [ ] 实现工具缓存层
- [ ] 改进健康检查机制
- [ ] 性能测试和基准测试

### Sprint 3: 功能完善 (Week 3-4)
- [ ] 实现并行工具执行
- [ ] 实现资源订阅更新回调
- [ ] 添加工具选择 UI
- [ ] 集成测试

### Sprint 4: 用户体验 (Week 4-5)
- [ ] 添加工具使用可视化
- [ ] 改进错误处理
- [ ] 添加操作历史视图
- [ ] UI/UX 改进

### Sprint 5: 测试与发布 (Week 5-6)
- [ ] 端到端测试
- [ ] 性能调优
- [ ] 文档完善
- [ ] 发布准备

---

## 成功指标

1. **协议完整性**: 100% MCP 协议特性实现
2. **性能**: 工具获取延迟降低 60% (通过缓存)
3. **可靠性**: 错误恢复率提升 40%
4. **用户体验**: 工具选择准确率 >80%
5. **代码质量**: 重复代码减少 30%

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Sampling 协议实现复杂 | 高 | 参考 MCP 规范，逐步实现 |
| 缓存一致性问题 | 中 | 实现失效机制，添加测试 |
| 并行执行竞态条件 | 中 | 使用互斥锁，仔细测试 |
| 向后兼容性 | 低 | 保留旧 API，标记为 deprecated |

---

## 相关文档

- [MCP 系统文档](../../llmdoc/feature/mcp-system.md)
- [Input Completion 计划](./input-completion-plan.md)
- [Components Integration 计划](./enhanced-components-integration-plan.md)
- [Agent 系统文档](../../llmdoc/architecture/agent-system.md)

---

**文档版本**: 1.0
**最后更新**: 2025-01-26
**状态**: 待审核
