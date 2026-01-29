# 聊天记录管理机制优化计划

## 执行摘要

Cognia 现有的聊天记录管理机制已具备基础功能（IndexedDB 持久化、分页加载、分支支持、多格式导出），但在**归档清理、全文搜索、云同步、历史压缩**等方面存在明显缺失。本报告基于代码分析和行业最佳实践，提出 12 项优化建议。

## 模块依赖图

```
├── 入口: components/chat/core/chat-container.tsx
├── 状态管理:
│   ├── stores/chat/session-store.ts (localStorage - 会话元数据)
│   └── stores/chat/chat-widget-store.ts (localStorage - Widget消息)
├── 数据持久化:
│   ├── lib/db/schema.ts (Dexie IndexedDB)
│   └── lib/db/repositories/message-repository.ts
│   └── lib/db/repositories/session-repository.ts
├── Hooks:
│   └── hooks/chat/use-messages.ts (消息加载/保存)
├── 导出:
│   └── lib/export/index.ts (MD/JSON/HTML/PDF/Excel/Word/PPTX)
├── 搜索:
│   ├── components/chat/utils/conversation-search.tsx (会话内搜索)
│   └── components/layout/global-search.tsx (全局搜索)
└── 类型:
    └── types/core/session.ts
```

---

## 功能清单与现状评估

| 子功能 | 状态 | 位置 | 备注 |
|--------|------|------|------|
| 消息持久化 (IndexedDB) | ✅ 完善 | `lib/db/repositories/message-repository.ts` | Dexie v7，支持事务 |
| 分页加载 | ✅ 完善 | `hooks/chat/use-messages.ts` | 初始100条，加载80条/次 |
| 会话分支 | ✅ 完善 | `session-store.ts` + `message-repository.ts` | 支持多分支和复制 |
| 流式消息保存 | ✅ 完善 | `use-messages.ts:appendToMessage` | 防抖500ms保存 |
| 会话文件夹 | ✅ 完善 | `session-store.ts` | 支持创建/移动/删除 |
| 多格式导出 | ✅ 完善 | `lib/export/` | MD/JSON/HTML/PDF/Excel/Word/PPTX/图片 |
| 会话内搜索 | ✅ 完善 | `conversation-search.tsx` | 关键词+书签过滤 |
| 全局搜索 | ⚠️ 部分 | `global-search.tsx` | **仅搜索标题和预览，不含消息内容** |
| 导入会话 | ⚠️ 部分 | `session-repository.ts:importAll` | 批量导入但无验证和冲突处理 |
| 自动归档 | ❌ 缺失 | - | 无自动归档/清理机制 |
| 存储限额管理 | ❌ 缺失 | - | 无限增长，可能耗尽 IndexedDB 配额 |
| 历史压缩/摘要 | ❌ 缺失 | - | 无自动摘要功能 |
| 云同步 | ❌ 缺失 | - | 仅本地存储 |
| 数据迁移 | ⚠️ 部分 | `lib/db/schema.ts` | 有版本迁移但无数据修复工具 |

---

## 发现问题统计

- **HIGH**: 3 个
- **MEDIUM**: 6 个
- **LOW**: 3 个

---

## 优化项详情

### [优先级: HIGH] 1. 添加自动归档与清理机制

**当前状态**:
无任何自动清理机制，消息无限增长。

**问题**:
IndexedDB 有存储限额（通常为可用空间的 50-80%），长期使用可能导致：
- 存储配额耗尽，新消息无法保存
- 数据库查询变慢
- 浏览器性能下降

**改进方案**:
```typescript
// lib/db/repositories/message-repository.ts 新增
interface ArchiveOptions {
  olderThanDays: number;      // 归档超过N天的消息
  maxMessagesPerSession: number; // 每个会话保留的最大消息数
  archiveFormat: 'json' | 'compressed';
}

async function archiveOldMessages(options: ArchiveOptions): Promise<{
  archivedCount: number;
  freedBytes: number;
}>;

async function getStorageUsage(): Promise<{
  used: number;
  quota: number;
  percentage: number;
}>;
```

**涉及文件**:
- `@/lib/db/repositories/message-repository.ts:346` - 新增归档方法
- `@/stores/chat/session-store.ts` - 添加 `archiveSession` 动作
- `@/components/settings/data-management.tsx` - 新增归档设置 UI

**预期收益**:
- 性能: 防止数据库膨胀
- 稳定性: 避免存储配额问题
- 用户体验: 保持应用响应速度

**工作量**: 中 (4-6hr)

**依赖项**: 无

---

### [优先级: HIGH] 2. 增强全局搜索支持消息内容

**当前状态**:
`global-search.tsx` 仅搜索会话标题和 `lastMessagePreview`，无法搜索消息内容。

**问题**:
用户无法跨会话查找历史对话内容，降低了聊天记录的可用性。

**改进方案**:
```typescript
// lib/db/repositories/message-repository.ts 新增
async function searchMessages(query: string, options?: {
  sessionIds?: string[];
  dateRange?: { start: Date; end: Date };
  limit?: number;
}): Promise<Array<{
  message: UIMessage;
  sessionId: string;
  sessionTitle: string;
  matchContext: string;
}>>;
```

**涉及文件**:
- `@/lib/db/repositories/message-repository.ts` - 新增 `searchMessages`
- `@/components/layout/global-search.tsx:52-100` - 集成消息搜索
- `@/lib/db/schema.ts` - 考虑添加全文索引

**预期收益**:
- 用户体验: 快速定位历史对话
- 生产力: 提升信息检索效率

**工作量**: 中 (4-6hr)

**依赖项**: 无

---

### [优先级: HIGH] 3. 添加存储使用量监控与警告

**当前状态**:
无存储使用量监控，用户无法知道已使用多少空间。

**问题**:
存储耗尽时用户会收到意外错误，数据可能丢失。

**改进方案**:
```typescript
// lib/db/utils.ts 新增
async function getStorageStats(): Promise<{
  used: number;
  quota: number;
  percentage: number;
  messageCount: number;
  sessionCount: number;
}>;

// stores/system/storage-store.ts 新增
interface StorageState {
  stats: StorageStats | null;
  isWarning: boolean;  // > 80%
  isCritical: boolean; // > 95%
  refreshStats: () => Promise<void>;
}
```

**涉及文件**:
- `@/lib/db/utils.ts` - 新增存储统计
- `@/stores/system/` - 新增 `storage-store.ts`
- `@/components/settings/` - 新增存储使用量展示

**预期收益**:
- 可见性: 用户了解存储使用情况
- 预防性: 提前警告避免数据丢失

**工作量**: 小 (2-3hr)

**依赖项**: 无

---

### [优先级: MEDIUM] 4. 实现历史消息自动摘要

**当前状态**:
已有 `DBSummary` 表和 `summaries` 存储，但未实现自动摘要生成。

**问题**:
长对话占用大量 token，无法高效携带历史上下文到新会话。

**改进方案**:
```typescript
// lib/ai/summarization/chat-summarizer.ts 新增
interface SummarizationConfig {
  triggerMessageCount: number;  // 触发摘要的消息数 (默认 50)
  compressionRatio: number;     // 目标压缩比 (默认 0.2)
  preserveRecentCount: number;  // 保留最近N条原始消息 (默认 10)
}

async function summarizeSession(
  sessionId: string, 
  config?: SummarizationConfig
): Promise<DBSummary>;

async function getCompressedHistory(sessionId: string): Promise<string>;
```

**涉及文件**:
- `@/lib/ai/summarization/` - 新增摘要模块
- `@/lib/db/repositories/` - 新增 `summary-repository.ts`
- `@/stores/chat/summary-store.ts` - 集成摘要状态

**预期收益**:
- Token 节省: 减少 50%+ 的历史上下文 token
- 跨会话上下文: 支持携带压缩历史

**工作量**: 大 (8-12hr)

**依赖项**: 需要 AI 提供商支持

---

### [优先级: MEDIUM] 5. 完善导入功能与冲突处理

**当前状态**:
`sessionRepository.importAll` 直接批量插入，无验证和冲突处理。

**问题**:
- 导入重复数据会创建冗余记录
- 格式错误的数据可能导致应用崩溃
- 无导入进度反馈

**改进方案**:
```typescript
// lib/db/repositories/session-repository.ts 增强
interface ImportOptions {
  conflictStrategy: 'skip' | 'replace' | 'rename';
  validateData: boolean;
  onProgress?: (progress: { current: number; total: number }) => void;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ index: number; error: string }>;
}

async function importWithValidation(
  data: unknown, 
  options: ImportOptions
): Promise<ImportResult>;
```

**涉及文件**:
- `@/lib/db/repositories/session-repository.ts:194-205` - 增强 `importAll`
- `@/components/settings/` - 添加导入对话框

**预期收益**:
- 数据完整性: 防止损坏数据导入
- 用户体验: 清晰的导入结果反馈

**工作量**: 中 (3-4hr)

**依赖项**: 无

---

### [优先级: MEDIUM] 6. 添加会话标签系统

**当前状态**:
仅支持文件夹组织，无标签系统。

**问题**:
文件夹是单一维度，无法灵活分类（如同一会话属于"工作"和"代码"）。

**改进方案**:
```typescript
// types/core/session.ts 扩展
interface Session {
  // ... existing fields
  tags?: string[];
}

// stores/chat/session-store.ts 新增
interface SessionState {
  // ... existing
  addTag: (sessionId: string, tag: string) => void;
  removeTag: (sessionId: string, tag: string) => void;
  getSessionsByTag: (tag: string) => Session[];
  getAllTags: () => string[];
}
```

**涉及文件**:
- `@/types/core/session.ts:58-142` - 添加 `tags` 字段
- `@/stores/chat/session-store.ts` - 添加标签管理方法
- `@/components/sidebar/sessions/` - 添加标签 UI

**预期收益**:
- 组织能力: 多维度分类
- 搜索能力: 按标签筛选

**工作量**: 中 (4-5hr)

**依赖项**: 无

---

### [优先级: MEDIUM] 7. 实现批量操作功能

**当前状态**:
会话操作仅支持单个操作（删除、归档、移动）。

**问题**:
用户无法高效管理大量会话。

**改进方案**:
```typescript
// stores/chat/session-store.ts 新增
interface SessionState {
  // ... existing
  selectedSessionIds: string[];
  selectSession: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  bulkDelete: (ids: string[]) => void;
  bulkMove: (ids: string[], folderId: string | null) => void;
  bulkExport: (ids: string[]) => Promise<void>;
  bulkArchive: (ids: string[]) => void;
}
```

**涉及文件**:
- `@/stores/chat/session-store.ts` - 添加批量操作
- `@/components/sidebar/sessions/` - 添加多选 UI

**预期收益**:
- 效率: 批量管理大量会话
- 用户体验: 减少重复操作

**工作量**: 中 (4-5hr)

**依赖项**: 无

---

### [优先级: MEDIUM] 8. 添加数据备份提醒

**当前状态**:
无备份提醒机制。

**问题**:
用户可能忘记备份，浏览器数据清理会导致数据永久丢失。

**改进方案**:
```typescript
// stores/system/backup-store.ts 新增
interface BackupState {
  lastBackupDate: Date | null;
  backupReminderDays: number; // 默认 7 天
  shouldShowReminder: boolean;
  dismissReminder: () => void;
  markBackupComplete: () => void;
}
```

**涉及文件**:
- `@/stores/system/` - 新增 `backup-store.ts`
- `@/components/layout/` - 添加备份提醒组件

**预期收益**:
- 数据安全: 防止数据丢失
- 用户习惯: 培养备份习惯

**工作量**: 小 (2-3hr)

**依赖项**: 无

---

### [优先级: MEDIUM] 9. 优化消息删除性能

**当前状态**:
`deleteMessagesAfter` 使用 `Promise.all` 逐条删除。

**问题**:
删除大量消息时性能差，可能阻塞 UI。

**改进方案**:
```typescript
// lib/db/repositories/message-repository.ts 优化
async function deleteMessagesAfter(
  sessionId: string, 
  messageId: string, 
  branchId?: string
): Promise<number> {
  // 使用批量删除替代逐条删除
  return db.messages
    .where('[sessionId+branchId+createdAt]')
    .above([sessionId, branchId ?? '', targetCreatedAt])
    .delete();
}
```

**涉及文件**:
- `@/lib/db/repositories/message-repository.ts` - 优化删除逻辑
- `@/hooks/chat/use-messages.ts:258-277` - 调用优化后的方法

**预期收益**:
- 性能: 批量操作更快
- 用户体验: 删除操作更流畅

**工作量**: 小 (1-2hr)

**依赖项**: 无

---

### [优先级: LOW] 10. 添加会话统计仪表板

**当前状态**:
无会话和消息的统计视图。

**问题**:
用户无法了解使用模式和历史趋势。

**改进方案**:
新增统计仪表板显示：
- 总会话数/消息数
- 按模式（chat/agent/research）分布
- 按提供商/模型分布
- 时间趋势图
- Token 使用统计

**涉及文件**:
- `@/components/settings/` - 新增 `chat-statistics.tsx`
- `@/lib/db/repositories/` - 添加统计查询方法

**预期收益**:
- 可见性: 了解使用模式
- 优化: 基于数据优化使用

**工作量**: 中 (4-6hr)

**依赖项**: 无

---

### [优先级: LOW] 11. 支持消息编辑历史

**当前状态**:
编辑消息直接覆盖，无历史记录。

**问题**:
用户无法查看或恢复之前的版本。

**改进方案**:
```typescript
// types/core/message.ts 扩展
interface UIMessage {
  // ... existing
  editHistory?: Array<{
    content: string;
    editedAt: Date;
  }>;
}
```

**涉及文件**:
- `@/types/core/message.ts` - 添加 `editHistory`
- `@/lib/db/repositories/message-repository.ts` - 保存编辑历史
- `@/components/chat/message/` - 添加历史查看 UI

**预期收益**:
- 可追溯: 查看编辑历史
- 恢复能力: 恢复之前版本

**工作量**: 中 (3-4hr)

**依赖项**: 无

---

### [优先级: LOW] 12. 添加快捷键支持

**当前状态**:
部分快捷键支持（全局搜索），但会话管理缺少快捷键。

**问题**:
高效用户无法快速操作。

**改进方案**:
- `Ctrl+Shift+N`: 新建会话
- `Ctrl+Shift+D`: 删除当前会话
- `Ctrl+Shift+E`: 导出当前会话
- `Ctrl+Shift+S`: 会话搜索
- `Ctrl+[/]`: 切换上/下一个会话

**涉及文件**:
- `@/hooks/ui/use-keyboard-shortcuts.ts` - 添加快捷键
- `@/components/layout/keyboard-shortcuts-help.tsx` - 更新帮助文档

**预期收益**:
- 效率: 快速操作
- 专业感: 提升产品体验

**工作量**: 小 (2-3hr)

**依赖项**: 无

---

## 推荐行动优先级

1. **存储监控与警告** - 防止数据丢失（2-3hr）
2. **自动归档与清理** - 保持性能（4-6hr）
3. **全局消息搜索** - 核心功能增强（4-6hr）
4. **批量操作功能** - 提升效率（4-5hr）
5. **导入功能完善** - 数据安全（3-4hr）

## 快速优化（高收益低成本）

| 优化项 | 工作量 | 收益 |
|--------|--------|------|
| 存储使用量监控 | 2-3hr | 防止数据丢失 |
| 消息批量删除优化 | 1-2hr | 性能提升 |
| 备份提醒 | 2-3hr | 数据安全 |
| 快捷键支持 | 2-3hr | 用户效率 |

## 总工作量估计

| 类型 | 数量 | 估计时间 |
|------|------|----------|
| 小型任务 (< 3hr) | 4 个 | ~10 hr |
| 中型任务 (3-6hr) | 7 个 | ~35 hr |
| 大型任务 (> 8hr) | 1 个 | ~10 hr |
| **总计** | 12 个 | **~55 hr** |

---

## 技术建议

### IndexedDB 最佳实践
- 使用复合索引 `[sessionId+branchId+createdAt]` 提升查询性能（已实现）
- 考虑添加全文搜索索引（Dexie 不原生支持，可用 `flexsearch` 库）
- 实现定期 vacuum/compact 机制

### 存储策略
- 热数据: IndexedDB (最近 30 天)
- 温数据: 压缩归档 (30-90 天)
- 冷数据: 导出文件 (> 90 天)

### 云同步预留
- 设计时考虑 CRDT 或 OT 算法兼容
- 消息 ID 使用 nanoid 已支持分布式生成
- 添加 `syncStatus` 字段预留

---

*生成日期: 2026-01-29*
*分析版本: Cognia Chat History Management v1*
