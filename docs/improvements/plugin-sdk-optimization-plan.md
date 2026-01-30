# 插件页面和 SDK 优化计划

## 执行摘要

Cognia 插件系统是一个功能完整的模块化架构，包含 TypeScript 和 Python 双语言 SDK、插件市场、生命周期管理、热重载开发工具等。当前系统设计良好，但存在一些可优化的领域，包括 Marketplace 真实 API 集成、console.log 清理、测试覆盖提升和文档完善。

## 已完成的优化 ✅

### 2025-01-29 实施的改进

1. **时间戳排序功能** ✅
   - 添加 `lastUsedAt` 字段到 `Plugin` 接口 (`types/plugin/plugin.ts:1179`)
   - 实现排序逻辑 (`components/plugin/config/plugin-settings-page.tsx:159`)
   - 添加 `updateLastUsedAt` 方法到 store (`stores/plugin/plugin-store.ts:440`)
   - 启用插件时自动更新 `lastUsedAt`

2. **统一日志系统** ✅
   - 创建 `lib/plugin/logger.ts` 提供环境感知日志
   - 生产环境仅输出 warn/error，开发环境输出所有级别
   - 更新 `hooks-system.ts` (19处) 和 `manager.ts` (4处) 使用新日志器

3. **Marketplace API 集成** ✅
   - 创建 `hooks/plugin/use-marketplace.ts` hook
   - 实现真实 API 调用，失败时回退到 mock 数据
   - 更新 `plugin-marketplace.tsx` 使用新 hook

---

## 模块依赖

### 核心文件结构

| 层级 | 位置 | 描述 |
|------|------|------|
| **入口** | `components/plugin/config/plugin-settings-page.tsx` | 插件设置页面主入口 |
| **状态** | `stores/plugin/plugin-store.ts` | Zustand 状态管理 (786 行) |
| **Hooks** | `hooks/plugin/` | 6 个 hooks (use-plugin, use-plugin-tools 等) |
| **工具库** | `lib/plugin/` | 30+ 模块 (manager, marketplace, ipc 等) |
| **类型** | `types/plugin/` | 4 个类型定义文件 (~78K) |
| **后端** | `src-tauri/src/plugin/` | Rust 后端 (manager, python, types) |
| **SDK** | `plugin-sdk/typescript/`, `plugin-sdk/python/` | 双语言 SDK |

### 组件层级

```
components/plugin/
├── config/          # 配置页面 (settings-page, config, filter-bar, create-wizard)
├── core/            # 核心组件 (manager, list, card, quick-actions)
├── marketplace/     # 市场组件 (marketplace, detail-modal, grid-card, list-item)
├── monitoring/      # 监控组件 (analytics, health, profiler, conflicts, updates)
├── dev/             # 开发工具 (dev-tools)
├── extension/       # 扩展点系统
└── schema/          # JSON Schema 表单
```

---

## 功能清单

### 插件页面功能

| 子功能 | 状态 | 位置 | 备注 |
|--------|------|------|------|
| 插件列表展示 | ✅ 完善 | `plugin-list.tsx`, `plugin-card.tsx` | 分组、过滤、搜索 |
| 插件安装/卸载 | ✅ 完善 | `plugin-manager.tsx`, `plugin-store.ts` | 完整生命周期 |
| 插件配置 | ✅ 完善 | `plugin-config.tsx`, `schema-form.tsx` | JSON Schema 驱动 |
| 插件市场 | ⚠️ Mock数据 | `plugin-marketplace.tsx` | 使用 MOCK_PLUGINS |
| 市场搜索 | ✅ 完善 | `plugin-marketplace.tsx` | 本地过滤实现 |
| 插件分析 | ✅ 完善 | `plugin-analytics.tsx` | 使用统计、性能数据 |
| 健康监控 | ✅ 完善 | `plugin-health.tsx` | 状态检查、自动刷新 |
| 依赖树 | ✅ 完善 | `plugin-dependency-tree.tsx` | 可视化依赖关系 |
| 冲突检测 | ✅ 完善 | `plugin-conflicts.tsx` | 自动检测冲突 |
| 更新检查 | ✅ 完善 | `plugin-updates.tsx` | 自动检查更新 |
| 开发工具 | ✅ 完善 | `plugin-dev-tools.tsx` | 热重载、日志、调试 |
| 创建向导 | ✅ 完善 | `plugin-create-wizard.tsx` | 模板化创建 |
| 排序功能 | ⚠️ 部分 | `plugin-settings-page.tsx:159` | TODO: 时间戳排序未实现 |

### SDK 功能 (TypeScript)

| 子功能 | 状态 | 位置 | 备注 |
|--------|------|------|------|
| 核心类型定义 | ✅ 完善 | `src/core/`, `src/manifest/` | 100+ 类型 |
| 工具定义 | ✅ 完善 | `src/tools/`, `src/helpers/` | defineTool, Schema |
| 命令定义 | ✅ 完善 | `src/commands/` | defineCommand |
| 模式定义 | ✅ 完善 | `src/modes/` | ModeBuilder, ModeTemplates |
| A2UI 组件 | ✅ 完善 | `src/a2ui/` | 组件、模板定义 |
| Hooks 系统 | ✅ 完善 | `src/hooks/` | 60+ 事件钩子 |
| 扩展 API | ✅ 完善 | `src/api/` | network, fs, db, ipc 等 |
| Context API | ✅ 完善 | `src/context/` | base + extended |
| React Hooks | ✅ 完善 | `src/react/` | usePluginContext 等 |
| 测试工具 | ✅ 完善 | `src/testing/` | mock 工具 |

### SDK 功能 (Python)

| 子功能 | 状态 | 位置 | 备注 |
|--------|------|------|------|
| 装饰器 | ✅ 完善 | `src/cognia/` | @tool, @hook, @command |
| 扩展 Context | ✅ 完善 | `src/cognia/` | ExtendedPluginContext |
| Schema 构建 | ✅ 完善 | `src/cognia/` | Schema, parameters |
| A2UI Builder | ✅ 完善 | `src/cognia/` | A2UIBuilder |
| CLI 工具 | ✅ 完善 | `src/cognia/` | new, manifest, test, pack |

---

## 发现问题

### HIGH 严重

无高严重问题发现。

### MEDIUM 中等

#### 1. Marketplace 使用 Mock 数据

**位置**: `@/components/plugin/marketplace/plugin-marketplace.tsx:92-95`
**描述**: 市场数据完全使用 `MOCK_PLUGINS`，未连接真实 API
**影响**: 用户无法从真实市场安装插件

#### 2. 时间戳排序未实现

**位置**: `@/components/plugin/config/plugin-settings-page.tsx:159`
**描述**: `case 'recent': return 0; // TODO: Add timestamp tracking`
**影响**: 插件按"最近使用"排序功能无效

#### 3. 过多的 console.log 语句

**位置**: 28 个文件，共 119 处
**描述**: 生产代码中存在大量 console.log/warn/error
**影响**: 控制台输出过多，可能暴露敏感信息

**主要文件**:
- `lib/plugin/context.ts` (21 处)
- `lib/plugin/hooks-system.ts` (19 处)
- `lib/plugin/dev-server.ts` (13 处)
- `lib/plugin/hot-reload.ts` (7 处)

### LOW 低

#### 4. 测试路径配置问题

**描述**: Jest 测试命令参数解析异常，无法正常运行插件测试
**影响**: 测试覆盖难以验证

#### 5. SDK 包未发布

**位置**: `plugin-sdk/typescript/`, `plugin-sdk/python/`
**描述**: SDK 包名 `@cognia/plugin-sdk` 和 `cognia-plugin-sdk` 尚未发布到 npm/PyPI
**影响**: 外部开发者无法通过包管理器安装 SDK

---

## 推荐改进

### [优先级: MEDIUM] 1. 实现真实 Marketplace API 集成

**当前状态**:
```typescript
const marketplacePlugins = useMemo(
  () => MOCK_PLUGINS.map((p) => ({ ...p, installed: installedPluginIds.has(p.id) })),
  [installedPluginIds]
);
```

**问题**:
市场使用硬编码的 mock 数据，无法展示真实插件

**改进方案**:
1. 实现后端 marketplace API (`src-tauri/src/plugin/manager.rs` 已有 `search_marketplace`, `get_marketplace_plugin`)
2. 前端调用真实 API 替代 mock 数据
3. 添加缓存和离线支持
4. 实现分页加载

**涉及文件**:
- `@/components/plugin/marketplace/plugin-marketplace.tsx`
- `@/lib/plugin/marketplace.ts`
- `@/src-tauri/src/plugin/manager.rs:625-697`

**预期收益**:
- 用户可发现和安装真实插件
- 建立插件生态系统基础

**工作量**: 大 (> 8hr)

---

### [优先级: MEDIUM] 2. 实现时间戳排序

**当前状态**:
```typescript
case 'recent':
  return 0; // TODO: Add timestamp tracking
```

**问题**:
"最近使用"排序返回 0，实际无排序效果

**改进方案**:
1. 在 `Plugin` 类型中添加 `lastUsedAt` 字段
2. 在插件启用/使用时更新时间戳
3. 持久化到 localStorage

**涉及文件**:
- `@/components/plugin/config/plugin-settings-page.tsx:159`
- `@/types/plugin/plugin.ts`
- `@/stores/plugin/plugin-store.ts`

**预期收益**:
- 提升用户体验，快速访问常用插件

**工作量**: 小 (< 2hr)

---

### [优先级: MEDIUM] 3. 清理 console.log 语句

**当前状态**:
28 个文件中有 119 处 console.log/warn/error

**问题**:
- 生产环境控制台输出过多
- 可能暴露调试信息
- 影响性能

**改进方案**:
1. 使用统一的 Logger 替代直接 console 调用
2. 在 `lib/plugin/context.ts` 中已有 `createLogger`，应统一使用
3. 仅在开发模式下输出调试日志
4. 错误日志改用 Sentry/错误追踪服务

**涉及文件**:
- `@/lib/plugin/context.ts` (21 处)
- `@/lib/plugin/hooks-system.ts` (19 处)
- `@/lib/plugin/dev-server.ts` (13 处)
- 其他 25 个文件

**预期收益**:
- 更清洁的生产环境输出
- 更好的错误追踪
- 略微提升性能

**工作量**: 中 (2-8hr)

---

### [优先级: LOW] 4. 修复测试配置

**当前状态**:
```
Pattern: --testPathPattern=plugin|--passWithNoTests|--silent - 0 matches
```

**问题**:
Jest 命令参数被错误解析

**改进方案**:
1. 检查 jest.config.ts 配置
2. 确保 testMatch 正确匹配 plugin 测试文件
3. 已发现 33 个插件相关测试文件应能正常运行

**涉及文件**:
- `@/jest.config.ts`
- 33 个 `*plugin*.test.*` 文件

**预期收益**:
- 测试覆盖可验证
- CI/CD 可靠性提升

**工作量**: 小 (< 2hr)

---

### [优先级: LOW] 5. 发布 SDK 包

**当前状态**:
SDK 完整实现但未发布到公共注册表

**问题**:
外部开发者无法安装 SDK

**改进方案**:
1. 完善 `plugin-sdk/typescript/package.json` 发布配置
2. 完善 `plugin-sdk/python/pyproject.toml` 发布配置
3. 设置 GitHub Actions 自动发布流程
4. 编写发布文档

**涉及文件**:
- `@/plugin-sdk/typescript/package.json`
- `@/plugin-sdk/python/pyproject.toml`
- `@/.github/workflows/` (新增)

**预期收益**:
- 开放插件生态系统
- 第三方开发者可创建插件

**工作量**: 中 (2-8hr)

---

### [优先级: LOW] 6. 增强 Python SDK 集成

**当前状态**:
Python SDK 设计完整，后端支持存在 (`src-tauri/src/plugin/python.rs`)

**问题**:
Python 插件运行时集成需要验证

**改进方案**:
1. 添加 Python 插件 E2E 测试
2. 验证 Python 虚拟环境自动创建
3. 测试 Python 依赖安装流程
4. 添加 Python 插件示例到 examples

**涉及文件**:
- `@/src-tauri/src/plugin/python.rs`
- `@/plugin-sdk/python/`
- `@/plugin-sdk/examples/python-plugin/`

**预期收益**:
- 数据科学/ML 插件支持
- 扩展开发者群体

**工作量**: 中 (2-8hr)

---

## 快速优化 (高收益低成本)

1. **实现时间戳排序** — 1-2 小时，提升用户体验
2. **添加 ESLint 规则禁止 console.log** — 配置 + 自动修复
3. **修复测试配置** — 检查 jest.config.ts

---

## 总工作量估计

| 类型 | 数量 | 预估时间 |
|------|------|----------|
| 小型任务 | 3 个 | ~4 hr |
| 中型任务 | 3 个 | ~15 hr |
| 大型任务 | 1 个 | ~12 hr |
| **总计** | 7 个 | **~31 hr** |

---

## 架构优势 (参考最佳实践)

基于对 VSCode 扩展、Tauri 插件、Electron 插件等系统的研究，当前架构已采用多项最佳实践：

1. **Manifest 驱动** — JSON Schema 配置，类似 VSCode extension.json
2. **沙箱执行** — `lib/plugin/sandbox.ts` 隔离插件运行
3. **权限系统** — `lib/plugin/permission-guard.ts` 细粒度权限控制
4. **热重载** — `lib/plugin/hot-reload.ts` 开发时无需重启
5. **IPC 通信** — `lib/plugin/ipc.ts` 进程间通信
6. **签名验证** — `lib/plugin/signature.ts` 插件完整性校验
7. **版本管理** — `lib/plugin/dependency-resolver.ts` 语义化版本解析
8. **备份回滚** — `lib/plugin/backup.ts`, `lib/plugin/rollback.ts`

---

## 相关工作流

- `/refactor` — 代码重构实施
- `/optimize` — 性能优化实施
- `/test` — 测试运行
- `/cleanup` — 清理未使用代码

---

*生成时间: 2025-01-29*
