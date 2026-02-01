# 插件系统优化计划

## 执行摘要

Cognia 已具备完整的插件系统架构，支持 Tools、Components、Modes、Hooks 等能力。现有 **1 个示例插件** (ai-tools)，插件 SDK 支持 TypeScript 和 Python。通过研究 VS Code Extension API、MCP Server 生态和现代 AI 助手最佳实践，本报告识别了关键扩展机会。

---

## 模块依赖图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Plugin System Architecture                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │
│  │  Rust Backend │    │  TypeScript  │    │   Plugin     │           │
│  │  (Tauri)     │◄───│    Layer     │◄───│   Store      │           │
│  └──────────────┘    └──────────────┘    └──────────────┘           │
│         │                   │                   │                    │
│         ▼                   ▼                   ▼                    │
│  src-tauri/src/plugin/  lib/plugin/       stores/plugin/            │
│  ├── manager.rs         ├── manager.ts    └── plugin-store.ts       │
│  ├── types.rs           ├── loader.ts                               │
│  └── python.rs          ├── registry.ts                             │
│                         ├── hooks-system.ts                         │
│                         ├── context.ts                              │
│                         ├── tools-bridge.ts                         │
│                         ├── a2ui-bridge.ts                          │
│                         ├── marketplace.ts                          │
│                         ├── hot-reload.ts                           │
│                         ├── dev-server.ts                           │
│                         ├── permission-guard.ts                     │
│                         ├── backup.ts                               │
│                         ├── rollback.ts                             │
│                         ├── signature.ts                            │
│                         └── ...                                     │
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐                               │
│  │  Plugin SDK  │    │   Plugins    │                               │
│  │  (TS/Python) │    │  Directory   │                               │
│  └──────────────┘    └──────────────┘                               │
│         │                   │                                        │
│  plugin-sdk/            plugins/                                     │
│  ├── typescript/        └── ai-tools/                               │
│  └── python/                ├── manifest.json                       │
│                             └── src/                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 现有功能清单

| 子功能 | 状态 | 位置 | 备注 |
|--------|------|------|------|
| **插件生命周期管理** | ✅ 完善 | `lib/plugin/manager.ts` | discover → install → load → enable → disable → unload → uninstall |
| **Tools 注册** | ✅ 完善 | `lib/plugin/tools-bridge.ts` | Agent 工具集成 |
| **Components 注册** | ✅ 完善 | `lib/plugin/a2ui-bridge.ts` | A2UI 组件扩展 |
| **Modes 注册** | ✅ 完善 | `stores/plugin/plugin-store.ts` | Agent 模式扩展 |
| **Commands 注册** | ✅ 完善 | `types/plugin/plugin.ts` | 命令系统 |
| **Hooks 系统** | ✅ 完善 | `lib/plugin/hooks-system.ts` | 生命周期 + Agent + Message + Session |
| **权限守卫** | ✅ 完善 | `lib/plugin/permission-guard.ts` | 16+ 权限类型 |
| **热重载** | ✅ 完善 | `lib/plugin/hot-reload.ts` | 开发模式支持 |
| **开发服务器** | ✅ 完善 | `lib/plugin/dev-server.ts` | 调试支持 |
| **Marketplace** | ✅ 完善 | `lib/plugin/marketplace.ts` | 搜索/安装/更新 |
| **备份/回滚** | ✅ 完善 | `lib/plugin/backup.ts`, `rollback.ts` | 版本管理 |
| **签名验证** | ✅ 完善 | `lib/plugin/signature.ts` | 安全验证 |
| **依赖解析** | ✅ 完善 | `lib/plugin/dependency-resolver.ts` | 版本兼容性 |
| **冲突检测** | ✅ 完善 | `lib/plugin/conflict-detector.ts` | 插件冲突处理 |
| **Analytics** | ✅ 完善 | `lib/plugin/analytics.ts` | 使用统计 |
| **i18n** | ✅ 完善 | `lib/plugin/i18n-loader.ts` | 多语言支持 |
| **IPC/消息总线** | ✅ 完善 | `lib/plugin/ipc.ts`, `message-bus.ts` | 插件间通信 |
| **Python 支持** | ✅ 完善 | `src-tauri/src/plugin/python.rs` | Hybrid 插件 |
| **Plugin SDK** | ✅ 完善 | `plugin-sdk/typescript/` | 完整 API + 测试工具 |
| **示例插件** | ⚠️ 仅 1 个 | `plugins/ai-tools/` | 需要更多插件 |
| **MCP 集成** | ❌ 缺失 | - | 需要 MCP Server 适配器 |
| **官方插件库** | ❌ 缺失 | - | 需要更多内置插件 |

---

## 发现问题

- **HIGH**: 0 个 (架构完善)
- **MEDIUM**: 3 个 (需要更多插件)
- **LOW**: 2 个 (文档/示例)

---

## 推荐插件扩展

基于 MCP 生态、VS Code 扩展模式和 AI 助手最佳实践，推荐以下插件优先级：

### [优先级: HIGH] 1. MCP Server 适配器插件

**当前状态**:
Cognia 有独立的插件系统，但未与 MCP (Model Context Protocol) 生态集成。

**问题**:
- 无法直接使用 200+ 社区 MCP 服务器
- 错过 Filesystem、Git、Memory 等成熟工具

**改进方案**:
创建 MCP 适配器插件，将任意 MCP Server 转换为 Cognia 插件工具。

```typescript
// plugins/mcp-adapter/manifest.json
{
  "id": "cognia-mcp-adapter",
  "name": "MCP Server Adapter",
  "capabilities": ["tools", "providers"],
  "tools": [
    { "name": "mcp_connect", "description": "Connect to MCP server" },
    { "name": "mcp_call", "description": "Call MCP tool" },
    { "name": "mcp_resource", "description": "Access MCP resource" }
  ]
}
```

**涉及文件**:
- 新建 `plugins/mcp-adapter/`
- 修改 `lib/ai/agent/mcp-tools.ts` 集成

**预期收益**:
- 立即获得 200+ MCP 工具生态
- Filesystem, Git, Memory, Fetch 等核心能力
- 与 Claude Code, VS Code Copilot 工具互通

**工作量**: 大 (> 8hr)

---

### [优先级: HIGH] 2. Filesystem 工具插件

**当前状态**:
Agent 有基础文件操作，但缺少完整的文件管理工具集。

**问题**:
- 缺少批量操作、搜索、监视等高级功能
- 安全边界需要更精细控制

**改进方案**:
```typescript
// plugins/filesystem-tools/manifest.json
{
  "id": "cognia-filesystem-tools",
  "name": "Filesystem Tools",
  "tools": [
    { "name": "fs_read", "description": "Read file content" },
    { "name": "fs_write", "description": "Write file content" },
    { "name": "fs_search", "description": "Search files by pattern/content" },
    { "name": "fs_tree", "description": "Get directory tree structure" },
    { "name": "fs_watch", "description": "Watch file changes" },
    { "name": "fs_diff", "description": "Compare files" },
    { "name": "fs_patch", "description": "Apply patches to files" }
  ],
  "permissions": ["filesystem:read", "filesystem:write"]
}
```

**预期收益**:
- Agent 获得完整文件操作能力
- 支持代码编辑、重构等复杂任务
- 安全的沙箱化文件访问

**工作量**: 中 (2-8hr)

---

### [优先级: HIGH] 3. Git 工具插件

**当前状态**:
无 Git 相关 Agent 工具。

**问题**:
- Agent 无法执行版本控制操作
- 无法自动提交、分支管理

**改进方案**:
```typescript
// plugins/git-tools/manifest.json
{
  "id": "cognia-git-tools",
  "name": "Git Tools",
  "tools": [
    { "name": "git_status", "description": "Get repository status" },
    { "name": "git_diff", "description": "Show changes" },
    { "name": "git_commit", "description": "Create commit" },
    { "name": "git_branch", "description": "Manage branches" },
    { "name": "git_log", "description": "View commit history" },
    { "name": "git_stash", "description": "Stash/unstash changes" },
    { "name": "git_blame", "description": "Show line-by-line attribution" }
  ],
  "permissions": ["shell:execute", "filesystem:read"]
}
```

**预期收益**:
- Agent 可自动执行版本控制
- 支持 "fix and commit" 等工作流
- 代码审查辅助

**工作量**: 中 (2-8hr)

---

### [优先级: HIGH] 4. Shell/Terminal 工具插件

**当前状态**:
有基础命令执行，但缺少交互式 Shell 工具。

**问题**:
- 无法执行复杂的多步骤命令
- 缺少环境变量管理
- 无法持久化 Shell 会话

**改进方案**:
```typescript
// plugins/shell-tools/manifest.json
{
  "id": "cognia-shell-tools",
  "name": "Shell Tools",
  "tools": [
    { "name": "shell_exec", "description": "Execute shell command" },
    { "name": "shell_spawn", "description": "Spawn persistent process" },
    { "name": "shell_script", "description": "Run script file" },
    { "name": "env_get", "description": "Get environment variable" },
    { "name": "env_set", "description": "Set environment variable" },
    { "name": "process_list", "description": "List running processes" },
    { "name": "process_kill", "description": "Terminate process" }
  ],
  "permissions": ["shell:execute", "process:spawn"]
}
```

**预期收益**:
- 完整的命令行操作能力
- 支持构建、测试、部署自动化
- 安全的进程管理

**工作量**: 中 (2-8hr)

---

### [优先级: MEDIUM] 5. Web 搜索/抓取插件

**当前状态**:
依赖外部 MCP 工具 (exa, fetch)。

**问题**:
- 无内置 Web 搜索能力
- 无法抓取网页内容

**改进方案**:
```typescript
// plugins/web-tools/manifest.json
{
  "id": "cognia-web-tools",
  "name": "Web Tools",
  "tools": [
    { "name": "web_search", "description": "Search the web" },
    { "name": "web_fetch", "description": "Fetch URL content" },
    { "name": "web_scrape", "description": "Scrape structured data" },
    { "name": "web_screenshot", "description": "Capture webpage screenshot" },
    { "name": "api_call", "description": "Make HTTP API request" }
  ],
  "permissions": ["network:fetch"]
}
```

**预期收益**:
- 减少外部依赖
- 更好的缓存和速率控制
- 本地化搜索结果

**工作量**: 中 (2-8hr)

---

### [优先级: MEDIUM] 6. Memory/知识图谱插件

**当前状态**:
有向量存储，但缺少结构化知识图谱。

**问题**:
- Agent 无法持久化结构化记忆
- 无法建立实体关系

**改进方案**:
```typescript
// plugins/memory-tools/manifest.json
{
  "id": "cognia-memory-tools",
  "name": "Memory & Knowledge Graph",
  "tools": [
    { "name": "memory_create", "description": "Create memory entity" },
    { "name": "memory_query", "description": "Query memories" },
    { "name": "memory_relate", "description": "Create entity relation" },
    { "name": "memory_graph", "description": "Get knowledge graph" },
    { "name": "memory_forget", "description": "Delete memories" }
  ],
  "permissions": ["database:read", "database:write"]
}
```

**预期收益**:
- 持久化 Agent 学习结果
- 跨会话上下文保持
- 知识推理能力

**工作量**: 大 (> 8hr)

---

### [优先级: MEDIUM] 7. 数据库工具插件

**当前状态**:
有 Dexie (IndexedDB) 支持，缺少 SQL 数据库工具。

**问题**:
- Agent 无法查询/操作外部数据库
- 缺少 SQL 生成和执行能力

**改进方案**:
```typescript
// plugins/database-tools/manifest.json
{
  "id": "cognia-database-tools",
  "name": "Database Tools",
  "tools": [
    { "name": "db_connect", "description": "Connect to database" },
    { "name": "db_query", "description": "Execute SQL query" },
    { "name": "db_schema", "description": "Get database schema" },
    { "name": "db_explain", "description": "Explain query plan" },
    { "name": "db_migrate", "description": "Run migration" }
  ],
  "permissions": ["database:read", "database:write", "network:fetch"]
}
```

**支持的数据库**:
- SQLite (本地)
- PostgreSQL
- MySQL
- MongoDB

**工作量**: 大 (> 8hr)

---

### [优先级: MEDIUM] 8. Docker/容器工具插件

**当前状态**:
Sandbox 支持 Docker/Podman，但 Agent 无法直接操作。

**问题**:
- 无法管理容器化应用
- 缺少 Docker Compose 支持

**改进方案**:
```typescript
// plugins/docker-tools/manifest.json
{
  "id": "cognia-docker-tools",
  "name": "Docker Tools",
  "tools": [
    { "name": "docker_ps", "description": "List containers" },
    { "name": "docker_run", "description": "Run container" },
    { "name": "docker_exec", "description": "Execute in container" },
    { "name": "docker_logs", "description": "View container logs" },
    { "name": "docker_compose", "description": "Docker Compose operations" },
    { "name": "docker_build", "description": "Build image" }
  ],
  "permissions": ["shell:execute"]
}
```

**工作量**: 中 (2-8hr)

---

### [优先级: MEDIUM] 9. 代码分析工具插件

**当前状态**:
有基础代码搜索，缺少深度分析。

**问题**:
- 无 AST 分析能力
- 缺少依赖分析、安全扫描

**改进方案**:
```typescript
// plugins/code-analysis/manifest.json
{
  "id": "cognia-code-analysis",
  "name": "Code Analysis Tools",
  "tools": [
    { "name": "analyze_ast", "description": "Parse and analyze AST" },
    { "name": "find_references", "description": "Find symbol references" },
    { "name": "find_definition", "description": "Go to definition" },
    { "name": "analyze_dependencies", "description": "Analyze project dependencies" },
    { "name": "security_scan", "description": "Scan for vulnerabilities" },
    { "name": "complexity_report", "description": "Code complexity analysis" }
  ]
}
```

**工作量**: 大 (> 8hr)

---

### [优先级: LOW] 10. 日历/时间工具插件

**当前状态**:
无日期时间处理工具。

**改进方案**:
```typescript
// plugins/time-tools/manifest.json
{
  "id": "cognia-time-tools",
  "name": "Time & Calendar Tools",
  "tools": [
    { "name": "time_now", "description": "Get current time" },
    { "name": "time_convert", "description": "Convert timezone" },
    { "name": "time_parse", "description": "Parse date string" },
    { "name": "time_diff", "description": "Calculate time difference" },
    { "name": "calendar_events", "description": "List calendar events" }
  ]
}
```

**工作量**: 小 (< 2hr)

---

### [优先级: LOW] 11. 图像处理工具插件

**当前状态**:
有截图功能，缺少图像处理。

**改进方案**:
```typescript
// plugins/image-tools/manifest.json
{
  "id": "cognia-image-tools",
  "name": "Image Tools",
  "tools": [
    { "name": "image_resize", "description": "Resize image" },
    { "name": "image_crop", "description": "Crop image" },
    { "name": "image_convert", "description": "Convert format" },
    { "name": "image_ocr", "description": "Extract text from image" },
    { "name": "image_compress", "description": "Compress image" }
  ]
}
```

**工作量**: 中 (2-8hr)

---

### [优先级: LOW] 12. 通知/提醒工具插件

**当前状态**:
有基础通知 API，缺少高级提醒功能。

**改进方案**:
```typescript
// plugins/notification-tools/manifest.json
{
  "id": "cognia-notification-tools",
  "name": "Notification & Reminder Tools",
  "tools": [
    { "name": "notify", "description": "Send notification" },
    { "name": "remind_at", "description": "Set reminder" },
    { "name": "remind_list", "description": "List reminders" },
    { "name": "remind_cancel", "description": "Cancel reminder" }
  ]
}
```

**工作量**: 小 (< 2hr)

---

## 快速优化 (高收益低成本)

1. **Time Tools 插件** — 1-2 小时即可完成
2. **Notification Tools 插件** — 1-2 小时
3. **Shell Tools 增强** — 基于现有 sandbox 扩展
4. **MCP Adapter 原型** — 复用现有 MCP 代码

---

## 总工作量估计

| 类型 | 数量 | 预计时间 |
|------|------|----------|
| 小型任务 (< 2hr) | 3 个 | ~5 hr |
| 中型任务 (2-8hr) | 6 个 | ~30 hr |
| 大型任务 (> 8hr) | 3 个 | ~30 hr |
| **总计** | **12 个插件** | **~65 hr** |

---

## 实施路线图

### Phase 1: 核心工具 (Week 1-2)
1. ✅ 完善现有 ai-tools 插件
2. 🔲 Filesystem Tools 插件
3. 🔲 Shell Tools 插件
4. 🔲 Time Tools 插件

### Phase 2: 开发者工具 (Week 3-4)
5. 🔲 Git Tools 插件
6. 🔲 Code Analysis 插件
7. 🔲 Docker Tools 插件

### Phase 3: MCP 生态集成 (Week 5-6)
8. 🔲 MCP Server Adapter
9. 🔲 Memory/Knowledge Graph 插件

### Phase 4: 扩展能力 (Week 7-8)
10. 🔲 Web Tools 插件
11. 🔲 Database Tools 插件
12. 🔲 Image Tools 插件
13. 🔲 Notification Tools 插件

---

## 相关文档

- `@/lib/plugin/index.ts` — 插件系统主入口
- `@/plugin-sdk/typescript/src/index.ts` — SDK 完整 API
- `@/plugins/ai-tools/` — 示例插件参考
- `@/types/plugin/plugin.ts` — 类型定义

---

## 附录: 插件模板

使用 SDK 创建新插件的基础模板：

```typescript
// plugins/my-plugin/src/index.ts
import { definePlugin } from '@cognia/plugin-sdk';
import type { PluginContext, PluginHooksAll } from '@cognia/plugin-sdk';

export default definePlugin({
  activate(context: PluginContext): PluginHooksAll | void {
    context.logger.info('My Plugin activated');

    // Register tools
    context.agent.registerTool({
      name: 'my_tool',
      pluginId: context.pluginId,
      definition: {
        name: 'my_tool',
        description: 'My custom tool',
        parametersSchema: {
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Input value' }
          },
          required: ['input']
        }
      },
      execute: async (args) => {
        return { result: `Processed: ${args.input}` };
      }
    });

    return {
      onEnable: async () => context.logger.info('Plugin enabled'),
      onDisable: async () => context.logger.info('Plugin disabled'),
    };
  }
});
```

---

*生成时间: 2026-02-02*
*工作流: /feature-optimize*
