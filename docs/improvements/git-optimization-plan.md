# Git 组件优化计划

## 执行摘要

Git 模块是 Cognia 的版本控制核心，提供完整的 Git 操作支持。经过全面分析，发现该模块架构良好，但存在以下可优化方向：性能优化、使用 git2/libgit2 替代 CLI、增强错误处理、以及完善 workflow 集成。

---

## 模块依赖图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              UI Layer                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  components/git/                                                             │
│  ├── git-panel.tsx (主面板)                                                  │
│  ├── git-branch-manager.tsx (分支管理)                                       │
│  ├── git-commit-history.tsx (提交历史)                                       │
│  ├── git-file-tree.tsx (文件状态)                                            │
│  ├── git-stash-panel.tsx (暂存区)                                            │
│  ├── git-diff-viewer.tsx (差异查看)                                          │
│  └── git-status-panel.tsx (状态面板)                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  components/settings/system/git-settings.tsx                                 │
│  components/workflow/marketplace/git-integration-panel.tsx                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            React Hooks                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  hooks/native/use-git.ts                                                     │
│  └── 474 行，封装 Git 操作的 React hook                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            State Management                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  stores/git/git-store.ts                                                     │
│  └── 1032 行，Zustand store with persistence                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TypeScript API                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  lib/native/git.ts                                                           │
│  └── 652 行，Tauri invoke wrappers                                            │
│  lib/workflow/git-integration-service.ts                                     │
│  └── 357 行，Workflow 模板 Git 集成服务                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Type Definitions                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  types/system/git.ts                                                         │
│  └── 548 行，完整类型定义                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Rust Backend                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  src-tauri/src/commands/devtools/git.rs                                      │
│  └── 1657 行，Tauri commands 通过 CLI 执行 Git 操作                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 功能清单

| 子功能 | 状态 | 位置 | 备注 |
|--------|------|------|------|
| Git 安装检测 | ✅ 完善 | git.rs:417-468 | Windows/macOS/Linux 全平台支持 |
| Git 安装 | ✅ 完善 | git.rs:471-535 | winget/xcode-select 自动安装 |
| 仓库初始化 | ✅ 完善 | git.rs:578-611 | 支持 bare 仓库和自定义初始分支 |
| 仓库克隆 | ✅ 完善 | git.rs:614-657 | 支持分支/深度/递归克隆 |
| 仓库状态 | ✅ 完善 | git.rs:666-791 | 完整的 ahead/behind/dirty 检测 |
| 文件暂存 | ✅ 完善 | git.rs:794-826 | stage/unstage/stage-all |
| 提交操作 | ✅ 完善 | git.rs:829-895 | 支持 amend/allow-empty/author |
| 日志查询 | ✅ 完善 | git.rs:898-943 | 支持过滤和分页 |
| 差异查看 | ✅ 完善 | git.rs:957-1079 | 支持 staged/file-level diff |
| Push/Pull/Fetch | ✅ 完善 | git.rs:1149-1224 | 完整远程操作支持 |
| 分支管理 | ✅ 完善 | git.rs:1277-1422 | 创建/删除/切换/合并 |
| Stash 操作 | ✅ 完善 | git.rs:1424-1473 | save/pop/apply/drop/clear |
| Reset 操作 | ✅ 完善 | git.rs:1475-1497 | soft/mixed/hard |
| Chat/Designer 导出 | ⚠️ 基础 | git.rs:1532-1620 | 仅实现占位功能 |
| Workflow 集成 | ⚠️ 部分 | git-integration-service.ts | API 调用不匹配后端 |
| 凭证管理 | ❌ 缺失 | - | 需要 SSH/HTTPS 凭证管理 |
| 冲突解决 | ❌ 缺失 | - | 需要 merge conflict UI |
| 签名验证 | ❌ 缺失 | - | GPG 签名验证 |

---

## 发现问题

- **HIGH**: 1 个
- **MEDIUM**: 5 个
- **LOW**: 4 个

---

## 详细优化项

### [优先级: HIGH] 使用 git2/libgit2 替代 CLI 调用

**当前状态**:
当前通过 `std::process::Command` 调用系统 Git CLI 执行所有操作。

**问题**:
1. 每次操作启动新进程，性能开销大
2. 依赖系统安装的 Git，增加用户配置负担
3. 输出解析容易出错，不同 Git 版本可能有差异
4. 无法利用 libgit2 的高级功能（如进度回调、取消操作）

**改进方案**:
参考 GitButler 的实现，使用 `git2` crate 进行原生 Git 操作：

```rust
// 替代 run_git_command
use git2::{Repository, Signature, Index};

pub fn git_status_internal(repo_path: &str) -> Result<GitRepoInfo, git2::Error> {
    let repo = Repository::open(repo_path)?;
    let head = repo.head()?;
    let branch = head.shorthand().map(|s| s.to_string());
    
    let statuses = repo.statuses(None)?;
    let has_changes = statuses.iter().any(|s| !s.status().is_empty());
    
    // ... 更高效的实现
}
```

**涉及文件**:
- `@D:/Project/Cognia/src-tauri/src/commands/devtools/git.rs:309-336`
- `@D:/Project/Cognia/src-tauri/Cargo.toml` (添加 git2 依赖)

**预期收益**:
- 性能: 10x+ 提升（无进程开销）
- 体验: 可移除 Git 安装要求，嵌入式 Git
- 维护: 类型安全的 API，无需解析文本输出

**工作量**: 大 (> 8hr)

**依赖项**:
- 需要评估 git2 crate 的 Windows 兼容性
- 可能需要 bundled libgit2 feature

---

### [优先级: MEDIUM] 修复 GitIntegrationService API 不匹配

**当前状态**:
`lib/workflow/git-integration-service.ts` 的 invoke 调用与后端 API 不匹配。

**问题**:
```typescript
// git-integration-service.ts:33 - 错误的参数
await invoke<void>('git_clone', {
  url,
  path: destination,  // 后端期望 options: GitCloneOptions
  branch: branch || this.config.defaultBranch,
});
```

后端期望的参数结构：
```rust
// git.rs:614
pub async fn git_clone(options: GitCloneOptions) -> GitOperationResult<GitRepoInfo>
```

**改进方案**:
统一使用 `lib/native/git.ts` 中的正确 API，或修复参数结构。

**涉及文件**:
- `@D:/Project/Cognia/lib/workflow/git-integration-service.ts:24-48`
- `@D:/Project/Cognia/lib/workflow/git-integration-service.ts:53-71`
- `@D:/Project/Cognia/lib/workflow/git-integration-service.ts:76-93`

**预期收益**:
- 功能: 修复 workflow Git 集成
- 维护: 避免 API 重复和不一致

**工作量**: 小 (< 2hr)

---

### [优先级: MEDIUM] 增强错误处理和日志

**当前状态**:
错误处理较为基础，仅返回 Git CLI 的 stderr 输出。

**问题**:
1. 错误信息不够用户友好
2. 缺少错误分类（网络/权限/冲突等）
3. 日志级别使用不一致

**改进方案**:
创建结构化错误类型：

```rust
#[derive(Debug, thiserror::Error)]
pub enum GitError {
    #[error("Repository not found: {0}")]
    RepoNotFound(String),
    
    #[error("Authentication required for remote: {0}")]
    AuthRequired(String),
    
    #[error("Merge conflict in files: {files:?}")]
    MergeConflict { files: Vec<String> },
    
    #[error("Network error: {0}")]
    Network(String),
    
    #[error("Git operation failed: {0}")]
    OperationFailed(String),
}
```

**涉及文件**:
- `@D:/Project/Cognia/src-tauri/src/commands/devtools/git.rs:116-151`

**预期收益**:
- 体验: 更友好的错误提示
- 调试: 更好的错误追踪

**工作量**: 中 (2-8hr)

---

### [优先级: MEDIUM] 添加 Git 凭证管理

**当前状态**:
无凭证管理，push/pull 到私有仓库会失败。

**问题**:
用户无法 push/pull 到需要认证的远程仓库。

**改进方案**:
1. 集成 `tauri-plugin-stronghold` 存储凭证
2. 支持 SSH 密钥管理
3. 支持 HTTPS 凭证存储
4. 添加凭证 UI 配置页面

**涉及文件**:
- 新建 `src-tauri/src/git/credentials.rs`
- 新建 `components/git/git-credentials-dialog.tsx`
- `components/settings/system/git-settings.tsx`

**预期收益**:
- 功能: 完整的远程操作支持
- 安全: 安全存储凭证

**工作量**: 大 (> 8hr)

---

### [优先级: MEDIUM] 优化状态刷新性能

**当前状态**:
`refreshStatus` 调用 5 个独立的 API，且 60 秒轮询刷新。

**问题**:
```typescript
// use-git.ts:200-206
const refreshStatus = useCallback(async () => {
  await loadRepoStatus();
  await loadBranches();
  await loadCommitHistory();
  await loadFileStatus();
  await loadStashList();
}, [...]);
```

**改进方案**:
1. 后端添加 `git_full_status` 命令，一次性返回所有状态
2. 使用 file watcher 替代轮询
3. 前端使用并行 Promise.all

```rust
#[tauri::command]
pub async fn git_full_status(repo_path: String) -> GitOperationResult<GitFullStatus> {
    // 一次性收集所有状态
}
```

**涉及文件**:
- `@D:/Project/Cognia/hooks/native/use-git.ts:199-206`
- `@D:/Project/Cognia/src-tauri/src/commands/devtools/git.rs`

**预期收益**:
- 性能: 减少 5x IPC 调用
- 响应: 实时文件变更检测

**工作量**: 中 (2-8hr)

---

### [优先级: MEDIUM] 完善 Chat/Designer Git 导出

**当前状态**:
`git_export_chat` 和 `git_export_designer` 是基础实现。

**问题**:
1. 硬编码的目录结构 (`chats/`, `designer/`)
2. 无增量导出支持
3. 无导入/恢复 UI

**改进方案**:
1. 可配置的导出目录
2. 增量导出（仅导出变更）
3. 添加导入功能到 UI
4. 支持分支策略（每个会话一个分支）

**涉及文件**:
- `@D:/Project/Cognia/src-tauri/src/commands/devtools/git.rs:1532-1620`
- `@D:/Project/Cognia/lib/native/git.ts:507-577`

**预期收益**:
- 功能: 完整的版本控制工作流
- 体验: 更灵活的备份策略

**工作量**: 中 (2-8hr)

---

### [优先级: LOW] 添加 Git 操作进度回调

**当前状态**:
Clone/Push/Pull 等长时间操作无进度显示。

**问题**:
用户不知道操作进度，可能误以为程序卡死。

**改进方案**:
使用 Tauri 事件发送进度：

```rust
use tauri::Emitter;

// 在 clone 操作中发送进度
app.emit("git-progress", GitProgress {
    operation: "clone",
    stage: "receiving",
    percent: 45,
    message: "Receiving objects: 45%",
})?;
```

**涉及文件**:
- `@D:/Project/Cognia/src-tauri/src/commands/devtools/git.rs`
- `@D:/Project/Cognia/lib/native/git.ts:417-440` (已有 listener)

**预期收益**:
- 体验: 操作进度可视化

**工作量**: 中 (2-8hr)

**依赖项**:
- 需要 git2 crate 才能实现真正的进度回调

---

### [优先级: LOW] 添加 .gitignore 模板选择

**当前状态**:
`git_create_gitignore` 接受原始模板字符串。

**问题**:
用户需要手动输入 .gitignore 内容。

**改进方案**:
1. 预置常用模板（Node.js, Python, Rust 等）
2. 从 github/gitignore 获取模板
3. UI 模板选择器

**涉及文件**:
- `@D:/Project/Cognia/src-tauri/src/commands/devtools/git.rs:1521-1530`
- 新建 `components/git/gitignore-template-selector.tsx`

**预期收益**:
- 体验: 快速配置项目忽略规则

**工作量**: 小 (< 2hr)

---

### [优先级: LOW] 优化 Hook 依赖数组

**当前状态**:
`useGit` hook 有大量 Store selector 调用。

**问题**:
每个 selector 调用都可能触发重渲染。

**改进方案**:
使用 shallow 比较的聚合 selector：

```typescript
// 使用 useShallow
const { gitStatus, branches, commits } = useGitStore(
  useShallow(state => ({
    gitStatus: state.gitStatus,
    branches: state.branches,
    commits: state.commits,
  }))
);
```

**涉及文件**:
- `@D:/Project/Cognia/hooks/native/use-git.ts:117-162`

**预期收益**:
- 性能: 减少不必要的重渲染

**工作量**: 小 (< 2hr)

---

### [优先级: LOW] 添加 Git 操作历史记录

**当前状态**:
无操作历史，无法撤销危险操作。

**问题**:
用户误操作（如 hard reset）后无法恢复。

**改进方案**:
1. 记录关键操作到 reflog
2. 提供 undo 功能
3. 操作历史 UI

**涉及文件**:
- `@D:/Project/Cognia/stores/git/git-store.ts`
- 新建 `components/git/git-operation-history.tsx`

**预期收益**:
- 安全: 可撤销危险操作

**工作量**: 中 (2-8hr)

---

## 推荐行动

### 立即执行 (Quick Wins)

1. **修复 GitIntegrationService API** - 小工作量，高影响
2. **优化 Hook 依赖数组** - 小工作量，性能提升
3. **添加 .gitignore 模板** - 小工作量，体验提升

### 短期计划 (1-2 周)

4. **优化状态刷新性能** - 中工作量，性能提升
5. **增强错误处理** - 中工作量，体验提升
6. **完善 Chat/Designer 导出** - 中工作量，功能完善

### 中期计划 (1-2 月)

7. **使用 git2 替代 CLI** - 大工作量，核心改进
8. **添加凭证管理** - 大工作量，功能必需
9. **添加进度回调** - 中工作量，体验提升

### 长期计划

10. **添加操作历史** - 中工作量，安全功能
11. **冲突解决 UI** - 大工作量，高级功能
12. **GPG 签名支持** - 中工作量，安全功能

---

## 总工作量估计

| 类型 | 数量 | 预计时间 |
|------|------|---------|
| 小型任务 | 3 个 | ~4 hr |
| 中型任务 | 5 个 | ~25 hr |
| 大型任务 | 2 个 | ~20 hr |
| **总计** | **10 个** | **~49 hr** |

---

## 相关资源

- **GitButler**: https://github.com/gitbutlerapp/gitbutler - Tauri + git2 最佳实践
- **git2 crate**: https://docs.rs/git2 - Rust libgit2 绑定
- **isomorphic-git**: https://isomorphic-git.org - JavaScript 原生 Git 实现参考
- **github/gitignore**: https://github.com/github/gitignore - .gitignore 模板

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2025-01-29 | 1.0 | 初始优化计划 |
