# 日志体系优化计划

## 执行摘要

Cognia 项目当前存在 **多套分散的日志系统**，缺乏统一的日志架构。前端使用 `LoggerProvider` + 直接 `console.log`，后端使用 `tauri-plugin-log`，工具脚本有独立的 logger 实现。本计划旨在建立统一、高效、可观测的日志体系。

## 发现问题

- **HIGH**: 3 个
- **MEDIUM**: 5 个
- **LOW**: 4 个

---

## 模块依赖

### 当前日志组件分布

| 组件 | 位置 | 用途 |
|------|------|------|
| **LoggerProvider** | `components/providers/core/logger-provider.tsx` | 前端集中日志 |
| **Logger Types** | `types/system/logger.ts` | 类型定义 |
| **Plugin Logger** | `lib/plugin/logger.ts` | 插件系统日志 |
| **Pricing Logger** | `tools/pricing/utils/logger.ts` | 定价工具日志 |
| **Status Logger** | `tools/status/utils/logger.ts` | 状态检查日志 |
| **Tauri Log Plugin** | `src-tauri/src/lib.rs` | 后端日志配置 |
| **Observability** | `lib/ai/observability/` | OpenTelemetry + Langfuse |

---

## 功能清单

| 子功能 | 状态 | 位置 | 备注 |
|--------|------|------|------|
| 前端集中日志 | ✅ 完善 | `logger-provider.tsx` | LoggerProvider 实现完整 |
| 后端日志配置 | ✅ 完善 | `src-tauri/src/lib.rs` | tauri-plugin-log 配置 |
| 日志级别控制 | ⚠️ 部分 | 多处 | 无统一配置 |
| 日志持久化 | ⚠️ 部分 | localStorage / 文件 | 分散实现 |
| 前后端日志关联 | ❌ 缺失 | - | 无 trace ID 关联 |
| 结构化日志 | ⚠️ 部分 | 部分实现 | 格式不统一 |
| 日志采样/限流 | ❌ 缺失 | - | 高频日志无控制 |
| 远程日志收集 | ❌ 缺失 | - | enableRemote 未实现 |
| 日志查看器 UI | ❌ 缺失 | - | 无可视化界面 |
| 错误追踪集成 | ⚠️ 部分 | Langfuse | 无 Sentry 集成 |

---

## 问题详情

### 问题 1: 多套日志系统并存

**位置**: 项目全局
**严重程度**: HIGH
**描述**: 存在 4+ 套独立的日志实现：
- `LoggerProvider` - React Context 日志
- `lib/plugin/logger.ts` - 插件系统独立日志
- `tools/*/utils/logger.ts` - CLI 工具独立日志
- 大量直接 `console.log` 调用 (511+ 处)

**影响**: 
- 日志格式不统一
- 难以统一配置日志级别
- 无法集中收集和分析

### 问题 2: 前端大量直接 console.log

**位置**: `lib/` 目录 (173+ 文件, 511+ 处)
**严重程度**: HIGH
**描述**: 生产代码中大量使用 `console.log/warn/error`，未经过统一日志系统

**影响**:
- 生产环境日志泄漏
- 无法控制输出
- 缺少上下文信息

### 问题 3: 前后端日志无关联

**位置**: 全局
**严重程度**: HIGH
**描述**: 前端 LoggerProvider 与后端 tauri-plugin-log 相互独立，无 trace ID 或 session ID 关联

**影响**:
- 调试跨端问题困难
- 无法追踪完整请求链路

### 问题 4: LoggerProvider 使用率极低

**位置**: `components/providers/core/logger-provider.tsx`
**严重程度**: MEDIUM
**描述**: 虽然实现了完整的 LoggerProvider，但 `useLogger` hook 仅在测试文件中使用

**影响**:
- 日志系统投入未产生价值
- 日志统计和导出功能闲置

### 问题 5: 日志存储使用 localStorage

**位置**: `@/components/providers/core/logger-provider.tsx:85-136`
**严重程度**: MEDIUM
**描述**: `StorageTransport` 使用 localStorage 存储日志，存在大小限制 (5MB) 和性能问题

**影响**:
- 大量日志可能撑爆 localStorage
- 同步写入影响性能

### 问题 6: 远程日志功能未实现

**位置**: `@/types/system/logger.ts:27-28`
**严重程度**: MEDIUM
**描述**: `LoggerConfig` 定义了 `enableRemote` 和 `remoteEndpoint`，但未实现远程传输

**影响**:
- 无法进行生产环境日志收集
- 无法使用日志聚合服务

### 问题 7: 日志格式不统一

**位置**: 多处
**严重程度**: MEDIUM
**描述**: 
- 后端: `[LEVEL][TARGET] MESSAGE`
- 前端 LoggerProvider: `[TIMESTAMP] [LEVEL] MESSAGE`
- Plugin Logger: `[Plugin:MODULE] MESSAGE`
- CLI Tools: `[TIMESTAMP] ICON MESSAGE`

**影响**:
- 日志解析困难
- 无法统一分析

### 问题 8: 缺少日志采样机制

**位置**: 全局
**严重程度**: MEDIUM
**描述**: 高频操作（如鼠标移动、键盘输入）可能产生大量日志，无采样或限流

**影响**:
- 日志文件快速增长
- 性能下降

### 问题 9: 类型定义中有 any

**位置**: `@/components/providers/core/logger-provider.tsx:120`
**严重程度**: LOW
**描述**: `logs.map((log: any) => ...)` 使用了 any 类型

**影响**:
- 类型安全降低

### 问题 10: 日志级别定义重复

**位置**: 多处
**严重程度**: LOW
**描述**: 
- `types/system/logger.ts`: `AppLogLevel`
- `lib/plugin/logger.ts`: `LogLevel`
- `tools/*/utils/logger.ts`: `LogLevel`

**影响**:
- 代码冗余
- 维护成本增加

### 问题 11: 无日志查看器

**位置**: 无
**严重程度**: LOW
**描述**: 无法在应用内查看、搜索、过滤日志

**影响**:
- 调试效率低

### 问题 12: Observability 模块与日志系统分离

**位置**: `lib/ai/observability/`
**严重程度**: LOW
**描述**: OpenTelemetry tracing 与日志系统独立，未集成

**影响**:
- 无法关联日志和追踪

---

## 优化方案

### [优先级: HIGH] 方案 1: 统一日志 API 层

**当前状态**:
多套独立的日志实现，前端组件直接调用 console

**问题**:
日志分散，无法统一控制

**改进方案**:
创建统一的 `@/lib/logger` 模块，提供单一的日志 API：

```typescript
// lib/logger/index.ts
import { createLogger } from './core';

export const logger = createLogger('app');
export const createModuleLogger = (module: string) => createLogger(module);

// 使用
import { logger } from '@/lib/logger';
logger.info('Message', { context: 'value' });
```

**涉及文件**:
- 新建 `lib/logger/core.ts`
- 新建 `lib/logger/transports/`
- 新建 `lib/logger/index.ts`
- 迁移 `components/providers/core/logger-provider.tsx` 逻辑

**预期收益**:
- 统一日志入口
- 可配置的日志行为
- 支持 tree-shaking

**工作量**: 大 (> 8hr)

**依赖项**: 无

---

### [优先级: HIGH] 方案 2: 消除直接 console 调用

**当前状态**:
511+ 处直接使用 console.log/warn/error

**问题**:
生产环境日志泄漏，无法控制

**改进方案**:
1. 添加 ESLint 规则禁止直接 console
2. 批量替换为统一日志 API
3. 允许测试文件例外

```javascript
// eslint.config.mjs
{
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }],
  }
}
```

**涉及文件**:
- `eslint.config.mjs`
- `lib/**/*.ts` (173+ 文件)

**预期收益**:
- 生产环境无日志泄漏
- 统一日志格式

**工作量**: 大 (> 8hr)

**依赖项**: 方案 1

---

### [优先级: HIGH] 方案 3: 前后端日志关联

**当前状态**:
前后端日志完全独立

**问题**:
无法追踪跨端请求

**改进方案**:
1. 生成全局 session ID
2. 每次 Tauri invoke 携带 trace ID
3. 后端日志包含 trace ID

```typescript
// lib/logger/context.ts
export const LogContext = {
  sessionId: generateSessionId(),
  getTraceId: () => crypto.randomUUID(),
};

// Tauri invoke wrapper
export async function invokeWithTrace<T>(cmd: string, args?: object): Promise<T> {
  const traceId = LogContext.getTraceId();
  logger.debug(`[${traceId}] Invoking ${cmd}`);
  return invoke(cmd, { ...args, __traceId: traceId });
}
```

**涉及文件**:
- 新建 `lib/logger/context.ts`
- 修改 `lib/native/*.ts` (invoke 调用)
- 修改 `src-tauri/src/lib.rs` (日志格式)

**预期收益**:
- 端到端请求追踪
- 快速定位问题

**工作量**: 中 (2-8hr)

**依赖项**: 方案 1

---

### [优先级: MEDIUM] 方案 4: 改进日志存储

**当前状态**:
使用 localStorage 同步存储日志

**问题**:
大小限制，性能问题

**改进方案**:
1. 使用 IndexedDB (Dexie) 存储日志
2. 异步批量写入
3. 自动清理过期日志

```typescript
// lib/logger/transports/indexeddb-transport.ts
export class IndexedDBTransport implements LogTransport {
  private buffer: LogEntry[] = [];
  private flushInterval = 1000; // 1秒批量写入
  
  async log(entry: LogEntry) {
    this.buffer.push(entry);
    if (this.buffer.length >= 100) {
      await this.flush();
    }
  }
}
```

**涉及文件**:
- 新建 `lib/logger/transports/indexeddb-transport.ts`
- 修改 `lib/db/index.ts` (添加 logs 表)

**预期收益**:
- 无大小限制
- 性能提升
- 支持大量日志

**工作量**: 中 (2-8hr)

**依赖项**: 方案 1

---

### [优先级: MEDIUM] 方案 5: 实现远程日志传输

**当前状态**:
`enableRemote` 配置项未实现

**问题**:
无法进行生产环境日志收集

**改进方案**:
1. 实现 HTTP 日志传输
2. 支持批量发送
3. 失败重试机制
4. 支持 Sentry/Loggly/自建服务

```typescript
// lib/logger/transports/remote-transport.ts
export class RemoteTransport implements LogTransport {
  private endpoint: string;
  private buffer: LogEntry[] = [];
  private batchSize = 50;
  
  async flush() {
    if (this.buffer.length === 0) return;
    
    const batch = this.buffer.splice(0, this.batchSize);
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        body: JSON.stringify(batch),
      });
    } catch {
      // 重新加入队列
      this.buffer.unshift(...batch);
    }
  }
}
```

**涉及文件**:
- 新建 `lib/logger/transports/remote-transport.ts`
- 修改 `types/system/logger.ts`

**预期收益**:
- 生产环境日志收集
- 远程调试能力

**工作量**: 中 (2-8hr)

**依赖项**: 方案 1

---

### [优先级: MEDIUM] 方案 6: 统一日志格式

**当前状态**:
多种日志格式并存

**问题**:
解析和分析困难

**改进方案**:
采用结构化 JSON 日志格式：

```json
{
  "timestamp": "2024-01-29T12:00:00.000Z",
  "level": "info",
  "message": "User logged in",
  "module": "auth",
  "traceId": "abc-123",
  "sessionId": "session-456",
  "data": { "userId": "user-789" }
}
```

**涉及文件**:
- `lib/logger/core.ts`
- `src-tauri/src/lib.rs` (日志格式)

**预期收益**:
- 日志可解析
- 支持日志分析工具

**工作量**: 小 (< 2hr)

**依赖项**: 方案 1

---

### [优先级: MEDIUM] 方案 7: 添加日志采样

**当前状态**:
无采样机制

**问题**:
高频日志可能影响性能

**改进方案**:
1. 按模块配置采样率
2. 相同日志去重
3. 频率限制

```typescript
// lib/logger/sampling.ts
export const samplingConfig = {
  'mouse-events': { rate: 0.01 },  // 1% 采样
  'keyboard': { rate: 0.1 },       // 10% 采样
  'default': { rate: 1.0 },        // 全量
};

export function shouldLog(module: string): boolean {
  const config = samplingConfig[module] || samplingConfig.default;
  return Math.random() < config.rate;
}
```

**涉及文件**:
- 新建 `lib/logger/sampling.ts`
- 修改 `lib/logger/core.ts`

**预期收益**:
- 降低日志量
- 性能优化

**工作量**: 小 (< 2hr)

**依赖项**: 方案 1

---

### [优先级: LOW] 方案 8: 日志查看器 UI

**当前状态**:
无日志查看界面

**问题**:
调试效率低

**改进方案**:
在设置页面添加日志查看器：
- 日志列表（虚拟滚动）
- 级别过滤
- 关键字搜索
- 导出功能

**涉及文件**:
- 新建 `components/settings/log-viewer.tsx`
- 修改 `app/(main)/settings/page.tsx`

**预期收益**:
- 应用内查看日志
- 提高调试效率

**工作量**: 中 (2-8hr)

**依赖项**: 方案 4

---

### [优先级: LOW] 方案 9: 整合 Observability

**当前状态**:
OpenTelemetry 与日志系统分离

**问题**:
无法关联日志和追踪

**改进方案**:
将日志作为 span 事件发送到 OpenTelemetry：

```typescript
import { addSpanEvent } from '@/lib/ai/observability';

export class OTelTransport implements LogTransport {
  log(entry: LogEntry) {
    addSpanEvent(entry.message, {
      'log.level': entry.level,
      'log.module': entry.context?.module,
    });
  }
}
```

**涉及文件**:
- 新建 `lib/logger/transports/otel-transport.ts`
- 修改 `lib/ai/observability/index.ts`

**预期收益**:
- 日志与追踪关联
- 统一可观测性

**工作量**: 小 (< 2hr)

**依赖项**: 方案 1

---

### [优先级: LOW] 方案 10: 合并重复类型定义

**当前状态**:
多处定义 LogLevel 类型

**问题**:
代码冗余

**改进方案**:
统一使用 `@/types/system/logger.ts` 中的类型定义

**涉及文件**:
- `lib/plugin/logger.ts`
- `tools/pricing/utils/logger.ts`
- `tools/status/utils/logger.ts`

**预期收益**:
- 减少冗余
- 统一类型

**工作量**: 小 (< 2hr)

**依赖项**: 无

---

## 推荐行动

1. **方案 1**: 统一日志 API 层 — 所有改进的基础
2. **方案 3**: 前后端日志关联 — 解决调试痛点
3. **方案 2**: 消除直接 console 调用 — 生产环境安全
4. **方案 6**: 统一日志格式 — 可分析性
5. **方案 4**: 改进日志存储 — 性能和容量

## 快速优化 (高收益低成本)

- **方案 6**: 统一日志格式 (~1hr)
- **方案 7**: 添加日志采样 (~1hr)
- **方案 10**: 合并重复类型定义 (~1hr)

## 总工作量估计

| 类型 | 数量 | 预计时间 |
|------|------|----------|
| 小型任务 | 4 个 | ~6 hr |
| 中型任务 | 4 个 | ~20 hr |
| 大型任务 | 2 个 | ~20 hr |
| **总计** | 10 个 | **~46 hr** |

---

## 实施路线图

### Phase 1: 基础设施 (Week 1)
- [ ] 方案 1: 统一日志 API 层
- [ ] 方案 10: 合并重复类型定义

### Phase 2: 核心功能 (Week 2)
- [ ] 方案 3: 前后端日志关联
- [ ] 方案 6: 统一日志格式
- [ ] 方案 7: 添加日志采样

### Phase 3: 迁移 (Week 3-4)
- [ ] 方案 2: 消除直接 console 调用
- [ ] 方案 4: 改进日志存储

### Phase 4: 增强 (Week 5+)
- [ ] 方案 5: 实现远程日志传输
- [ ] 方案 8: 日志查看器 UI
- [ ] 方案 9: 整合 Observability

---

## 相关文档

- `AGENTS.md` - 项目开发规范
- `lib/ai/observability/` - 可观测性模块
- `components/providers/core/logger-provider.tsx` - 当前日志实现
- `src-tauri/src/lib.rs` - 后端日志配置

---

*生成时间: 2025-01-29*
*工作流: /feature-optimize*
