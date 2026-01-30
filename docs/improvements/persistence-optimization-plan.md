# 持久化功能优化计划

## 执行摘要

Cognia 目前已具备完善的本地持久化基础设施，包括 localStorage (Zustand persist) 和 IndexedDB (Dexie)。通过代码研究和最佳实践分析，识别出 **8 个高优先级** 和 **6 个中优先级** 改进项，主要集中在数据迁移、导入导出增强、云同步准备、以及存储优化等方面。

---

## 模块依赖

- **入口**: `@/components/settings/data/data-settings.tsx`
- **状态管理**: `@/stores/` (58+ stores with persist middleware)
- **数据库**: `@/lib/db/schema.ts` (Dexie v4, 11 tables, version 7)
- **存储管理**: `@/lib/storage/` (StorageManager, cleanup, metrics, compression)
- **导出**: `@/lib/export/`, `@/lib/project/import-export.ts`
- **类型**: `@/lib/storage/types.ts`

---

## 功能清单

| 子功能 | 状态 | 位置 | 备注 |
|--------|------|------|------|
| localStorage 持久化 | ✅ 完善 | `stores/*/` | 58+ stores 使用 persist middleware |
| IndexedDB 存储 | ✅ 完善 | `lib/db/schema.ts` | 11 tables, version 7 |
| 存储统计 | ✅ 完善 | `lib/storage/storage-manager.ts` | 分类统计、配额监控 |
| 存储清理 | ✅ 完善 | `lib/storage/storage-cleanup.ts` | 自动/手动清理 |
| 存储指标 | ✅ 完善 | `lib/storage/storage-metrics.ts` | 趋势分析、快照 |
| 数据压缩 | ✅ 完善 | `lib/storage/storage-compression.ts` | gzip + LZ-String |
| 基础导出 | ✅ 完善 | `components/settings/data/data-settings.tsx` | JSON 导出 |
| 项目导入导出 | ✅ 完善 | `lib/project/import-export.ts` | ZIP 打包 |
| 批量导出 | ✅ 完善 | `lib/export/batch-export.ts` | 多格式支持 |
| 插件备份 | ✅ 完善 | `lib/plugin/backup.ts` | Tauri 集成 |
| Store 版本迁移 | ⚠️ 部分 | 各 stores | 大部分 store 缺少 migrate 函数 |
| IndexedDB 备份/恢复 | ⚠️ 部分 | `lib/storage/indexeddb-utils.ts` | 仅有导出，缺少完整恢复 |
| 持久化存储请求 | ⚠️ 部分 | `lib/storage/indexeddb-utils.ts` | 有 API 但未集成到 UI |
| 数据完整性校验 | ❌ 缺失 | - | 无 checksum/validation |
| 加密存储 | ❌ 缺失 | - | 敏感数据未加密 |
| 云同步准备 | ❌ 缺失 | - | 无同步基础设施 |
| 跨设备同步 | ❌ 缺失 | - | 需后端支持 |
| 完整数据恢复 | ❌ 缺失 | - | 导入功能不完整 |

---

## 发现问题

### 问题 1: Store 缺少版本迁移机制

**位置**: `@/stores/*/`  
**严重程度**: HIGH  
**描述**: 58+ stores 中大部分仅使用基础 `persist()` 配置，缺少 `version` 和 `migrate` 函数。当 store 结构变化时，旧数据可能导致应用错误。  
**影响**: 应用升级后可能因数据结构不兼容导致崩溃或数据丢失。

### 问题 2: 数据导入功能不完整

**位置**: `@/components/settings/data/data-settings.tsx:143-184`  
**严重程度**: HIGH  
**描述**: `handleImport` 函数仅导入 settings，不处理 sessions、artifacts、IndexedDB 数据。  
**影响**: 用户无法完整恢复备份数据。

### 问题 3: IndexedDB 缺少完整备份/恢复

**位置**: `@/lib/storage/indexeddb-utils.ts`  
**严重程度**: HIGH  
**描述**: 有 `exportAllData()` 但缺少对应的 `importAllData()`，且导出不包含 knowledge files、workflows 等。  
**影响**: 无法完整备份和恢复 IndexedDB 数据。

### 问题 4: 敏感数据未加密

**位置**: `@/stores/settings/settings-store.ts`  
**严重程度**: MEDIUM  
**描述**: API keys 存储在 localStorage 中未加密，AGENTS.md 中明确提到 "API keys: Stored in localStorage (unencrypted)"。  
**影响**: 安全隐患，恶意脚本可读取 API keys。

### 问题 5: 持久化存储未请求

**位置**: `@/lib/storage/indexeddb-utils.ts:325-335`  
**严重程度**: MEDIUM  
**描述**: 有 `requestPersistentStorage()` 函数但未在应用启动时调用，浏览器可能在存储压力下删除数据。  
**影响**: 重要数据可能被浏览器自动清除。

### 问题 6: 缺少数据完整性校验

**位置**: 全局  
**严重程度**: MEDIUM  
**描述**: 导入数据时无 checksum 验证，无法检测数据损坏。  
**影响**: 损坏的备份文件可能导致应用状态异常。

---

## 推荐行动

### [优先级: HIGH] 1. 实现 Store 版本迁移系统

**当前状态**:
大部分 stores 仅使用 `persist((set) => ({...}), { name: 'cognia-xxx' })` 基础配置。

**问题**:
当 store 结构变化时（如重命名字段、添加必填字段），旧数据无法自动迁移。

**改进方案**:
```typescript
// lib/storage/store-migration.ts
export interface MigrationConfig<T> {
  version: number;
  migrations: Record<number, (state: unknown) => T>;
}

export function createMigratedStore<T>(
  name: string,
  config: MigrationConfig<T>,
  storeCreator: StateCreator<T>
) {
  return create<T>()(
    persist(storeCreator, {
      name,
      version: config.version,
      migrate: (persistedState, version) => {
        let state = persistedState;
        for (let v = version; v < config.version; v++) {
          if (config.migrations[v + 1]) {
            state = config.migrations[v + 1](state);
          }
        }
        return state as T;
      },
    })
  );
}
```

**涉及文件**:
- 新增: `@/lib/storage/store-migration.ts`
- 修改: 关键 stores (settings, sessions, artifacts 优先)

**预期收益**:
- 安全性: 升级不再破坏用户数据
- 维护性: 统一迁移模式

**工作量**: 中 (4-6hr)

---

### [优先级: HIGH] 2. 完善数据导入功能

**当前状态**:
`handleImport` 仅部分实现，console.log 提示待完成。

**问题**:
用户导出的数据无法完整恢复。

**改进方案**:
```typescript
// lib/storage/data-import.ts
export interface ImportResult {
  success: boolean;
  imported: {
    sessions: number;
    messages: number;
    artifacts: number;
    settings: boolean;
  };
  errors: string[];
  warnings: string[];
}

export async function importFullBackup(
  data: ExportData,
  options?: {
    mergeStrategy: 'replace' | 'merge' | 'skip';
    generateNewIds: boolean;
  }
): Promise<ImportResult>;
```

**涉及文件**:
- 新增: `@/lib/storage/data-import.ts`
- 修改: `@/components/settings/data/data-settings.tsx`
- 修改: `@/stores/chat/session-store.ts` (添加 bulk import)

**预期收益**:
- 体验: 用户可完整备份/恢复
- 可靠性: 数据可迁移到新设备

**工作量**: 中 (4-6hr)

---

### [优先级: HIGH] 3. 完善 IndexedDB 备份/恢复

**当前状态**:
`exportAllData()` 存在但不完整，无 `importAllData()`。

**问题**:
IndexedDB 数据（messages, documents, workflows）无法完整备份恢复。

**改进方案**:
```typescript
// lib/storage/indexeddb-utils.ts 扩展
export async function importAllData(data: {
  sessions: DBSession[];
  messages: DBMessage[];
  documents: DBDocument[];
  projects: DBProject[];
  workflows: DBWorkflow[];
  knowledgeFiles?: DBKnowledgeFile[];
  summaries?: DBSummary[];
}, options?: { clearExisting?: boolean }): Promise<ImportResult>;

export async function createFullBackup(): Promise<Blob>;
export async function restoreFromBackup(blob: Blob): Promise<RestoreResult>;
```

**涉及文件**:
- 修改: `@/lib/storage/indexeddb-utils.ts`
- 修改: `@/components/settings/data/data-settings.tsx`

**预期收益**:
- 完整性: 所有数据可备份
- 可靠性: 灾难恢复能力

**工作量**: 中 (3-4hr)

---

### [优先级: HIGH] 4. 请求持久化存储

**当前状态**:
有 API 但未使用。

**问题**:
浏览器可能在存储压力下删除数据。

**改进方案**:
```typescript
// app/providers.tsx 或独立 hook
useEffect(() => {
  async function requestPersistence() {
    if (navigator.storage?.persist) {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        if (granted) {
          console.log('Storage is now persistent');
        }
      }
    }
  }
  requestPersistence();
}, []);
```

**涉及文件**:
- 修改: `@/app/providers.tsx` 或 `@/hooks/storage/use-storage-stats.ts`

**预期收益**:
- 可靠性: 数据不会被浏览器自动清除
- 体验: 用户数据更安全

**工作量**: 小 (1hr)

---

### [优先级: MEDIUM] 5. 添加数据完整性校验

**当前状态**:
导入时无验证。

**问题**:
损坏的备份可能导致问题。

**改进方案**:
```typescript
// lib/storage/data-validation.ts
export interface ValidationResult {
  valid: boolean;
  version: string;
  checksum: string;
  errors: ValidationError[];
}

export function validateExportData(data: unknown): ValidationResult;
export function generateChecksum(data: string): string;
export function verifyChecksum(data: string, checksum: string): boolean;
```

**涉及文件**:
- 新增: `@/lib/storage/data-validation.ts`
- 修改: 导入/导出流程

**预期收益**:
- 可靠性: 检测损坏数据
- 安全性: 防止恶意文件

**工作量**: 小 (2hr)

---

### [优先级: MEDIUM] 6. 敏感数据加密

**当前状态**:
API keys 明文存储。

**问题**:
XSS 攻击可读取 API keys。

**改进方案**:
```typescript
// lib/storage/secure-storage.ts
export class SecureStorage {
  private key: CryptoKey | null = null;

  async encrypt(data: string): Promise<string>;
  async decrypt(encrypted: string): Promise<string>;
  
  // 使用 Web Crypto API
  private async deriveKey(): Promise<CryptoKey>;
}

// 集成到 settings store
const storage = createJSONStorage(() => secureStorage);
```

**涉及文件**:
- 新增: `@/lib/storage/secure-storage.ts`
- 修改: `@/stores/settings/settings-store.ts`

**预期收益**:
- 安全性: API keys 加密存储
- 合规性: 保护用户敏感数据

**工作量**: 中 (4hr)

---

### [优先级: MEDIUM] 7. 统一存储 Hook

**当前状态**:
存储功能分散在多个位置。

**问题**:
组件需要导入多个 hooks 和 services。

**改进方案**:
```typescript
// hooks/storage/use-storage.ts
export function useStorage() {
  return {
    // Stats
    stats, health, isLoading,
    
    // Actions
    refresh, cleanup, clearCategory,
    
    // Backup/Restore
    createBackup, restoreBackup,
    
    // Export/Import
    exportAll, importAll,
    
    // Utils
    formatBytes, requestPersistence,
  };
}
```

**涉及文件**:
- 新增/修改: `@/hooks/storage/use-storage.ts`

**预期收益**:
- 开发体验: 统一 API
- 维护性: 减少重复代码

**工作量**: 小 (2hr)

---

### [优先级: MEDIUM] 8. IndexedDB 存储选项

**当前状态**:
仅使用 localStorage 的 Zustand stores。

**问题**:
localStorage 5MB 限制，大量数据时性能下降。

**改进方案**:
为大型 stores 提供 IndexedDB 存储选项：

```typescript
// lib/storage/indexed-storage.ts
import { get, set, del } from 'idb-keyval';

export const indexedStorage: StateStorage = {
  getItem: async (name) => (await get(name)) ?? null,
  setItem: async (name, value) => await set(name, value),
  removeItem: async (name) => await del(name),
};

// 使用
persist(storeCreator, {
  name: 'cognia-large-store',
  storage: createJSONStorage(() => indexedStorage),
});
```

**涉及文件**:
- 新增: `@/lib/storage/indexed-storage.ts`
- 可选修改: 大型 stores (artifacts, sessions)

**预期收益**:
- 性能: 大数据量时更快
- 容量: 突破 5MB 限制

**工作量**: 小 (2hr)

---

### [优先级: LOW] 9. 云同步准备

**当前状态**:
无云同步基础设施。

**问题**:
用户无法跨设备同步数据。

**改进方案**:
准备同步接口，后续可对接云服务：

```typescript
// lib/storage/sync-interface.ts
export interface SyncProvider {
  // 认证
  authenticate(): Promise<boolean>;
  
  // 同步
  push(data: SyncData): Promise<SyncResult>;
  pull(): Promise<SyncData>;
  
  // 冲突解决
  resolveConflict(local: SyncData, remote: SyncData): SyncData;
  
  // 状态
  getLastSyncTime(): Date | null;
  getSyncStatus(): 'idle' | 'syncing' | 'error';
}

// 可选实现: WebDAV, Dropbox, Google Drive, 自建服务
```

**涉及文件**:
- 新增: `@/lib/storage/sync-interface.ts`
- 新增: `@/types/sync.ts`

**预期收益**:
- 可扩展性: 为云同步做准备
- 架构: 清晰的同步接口

**工作量**: 大 (8hr+, 不含后端)

---

### [优先级: LOW] 10. 存储配额管理 UI

**当前状态**:
有 `StorageBreakdown` 和 `StorageHealthDisplay` 组件。

**问题**:
用户对存储配额感知不足。

**改进方案**:
增强 UI，添加配额告警、自动清理设置：

```typescript
// components/settings/data/storage-quota-manager.tsx
export function StorageQuotaManager() {
  // 配额可视化
  // 告警阈值设置
  // 自动清理策略配置
  // 存储趋势图表
}
```

**涉及文件**:
- 新增: `@/components/settings/data/storage-quota-manager.tsx`
- 修改: `@/components/settings/data/data-settings.tsx`

**预期收益**:
- 体验: 用户可主动管理存储
- 预防: 避免存储溢出

**工作量**: 中 (3hr)

---

## 快速优化 (高收益低成本)

1. **请求持久化存储** — 1 行代码，防止数据丢失
2. **添加 store version 字段** — 为未来迁移做准备
3. **完善 IndexedDB 导出** — 补全缺失的表
4. **IndexedDB 存储适配器** — 使用 idb-keyval 简化实现

---

## 总工作量估计

| 类型 | 数量 | 预计时间 |
|------|------|----------|
| 小型任务 | 4 个 | ~7 hr |
| 中型任务 | 5 个 | ~21 hr |
| 大型任务 | 1 个 | ~8+ hr |
| **总计** | 10 个 | **~36 hr** |

---

## 实施优先级

### 第一阶段 (必要)
1. 请求持久化存储 (1hr)
2. 完善数据导入功能 (4-6hr)
3. 完善 IndexedDB 备份/恢复 (3-4hr)

### 第二阶段 (重要)
4. Store 版本迁移系统 (4-6hr)
5. 数据完整性校验 (2hr)
6. 统一存储 Hook (2hr)

### 第三阶段 (增强)
7. 敏感数据加密 (4hr)
8. IndexedDB 存储选项 (2hr)
9. 存储配额管理 UI (3hr)

### 第四阶段 (扩展)
10. 云同步准备 (8hr+)

---

## 相关工作流

- `/refactor` — 代码重构实施
- `/test` — 测试运行
- `/review` — 代码审查
