# Jupyter 模块优化计划

## 执行摘要

Jupyter 模块为 Cognia 提供了完整的 Python 代码执行能力，包括内核管理、会话管理、代码执行、变量检查等功能。整体实现质量良好，架构清晰，但在以下方面存在优化空间：执行方式（subprocess vs ZeroMQ）、未使用代码清理、错误处理增强、性能优化。

## ✅ 已完成的改进 (2025-02)

### Phase 1: 持久化 Python REPL 进程 ✅
- **重写 `kernel.rs`**: 用持久化 Python REPL 子进程替代每次执行都创建新子进程的模式
- **JSON 命令协议**: 通过 `__COGNIA_EXEC_START__` / `__COGNIA_EXEC_END__` 哨兵标记分隔通信
- **Base64 编码**: 代码通过 base64 编码传输，避免转义问题（修复问题 5）
- **真正的中断**: Unix 上发送 SIGINT 信号中断执行（修复问题 1 的 interrupt 部分）
- **变量实时查询**: 直接从持久化进程的命名空间查询变量（修复问题 6）
- **AST 智能执行**: 自动显示最后一个表达式的结果（类似 IPython 行为）

### Phase 2: Notebook 文件 I/O ✅
- **Rust 命令**: `jupyter_open_notebook`, `jupyter_save_notebook`, `jupyter_get_notebook_info`
- **TypeScript 封装**: `openNotebook()`, `saveNotebook()`, `getNotebookInfo()` 
- **Tauri 文件对话框**: 支持通过系统文件选择器打开/保存 .ipynb 文件
- **键盘快捷键**: Ctrl+S 保存, Ctrl+Shift+S 另存为, Ctrl+O 打开
- **脏状态追踪**: 显示未保存更改标记
- **i18n**: 英文和中文翻译

### Phase 4: 单元格编辑 ✅
- **添加单元格**: 在任意位置插入代码或 Markdown 单元格（+ 按钮）
- **删除单元格**: 从笔记本中移除单元格（垃圾桶按钮）
- **移动单元格**: 上下移动单元格顺序（箭头按钮）
- **编辑源码**: 双击或点击铅笔图标进入编辑模式，Ctrl+Enter 保存，Esc 取消

### Phase 5: 自动包安装 ✅
- **ImportError 检测**: 当代码抛出 ImportError/ModuleNotFoundError 时自动安装
- **已知映射表**: cv2→opencv-python, sklearn→scikit-learn, PIL→Pillow 等
- **自动重试**: 安装成功后自动重新执行代码

### Phase 7: Matplotlib 增强 ✅
- **Agg 后端**: 启动时自动设置 `matplotlib.use('Agg')`
- **图形捕获**: `_capture_plots()` 自动捕获所有 matplotlib 图形为 base64 PNG
- **显示数据**: 图形作为 display_data 返回到前端

### 已解决的原始问题
| 问题 | 状态 | 说明 |
|------|------|------|
| 问题 1: Subprocess 执行方式 | ✅ 已修复 | 持久化 REPL 进程 + SIGINT 中断 |
| 问题 5: Python 代码转义 | ✅ 已修复 | 使用 base64 编码传输代码 |
| 问题 6: 变量缓存不准确 | ✅ 已修复 | 直接从进程命名空间查询 |

### 待完成
- **Phase 3: 流式输出** — 需要架构重构以支持实时逐行输出
- **Phase 8: ZeroMQ** — 长期目标，持久化 REPL 已覆盖大部分需求

---

## 模块依赖图

```
入口层
├── components/jupyter/interactive-notebook.tsx
├── components/artifacts/jupyter-renderer.tsx
└── app/(main)/notebook/page.tsx

Hooks 层
└── hooks/sandbox/use-jupyter-kernel.ts

Store 层
└── stores/tools/jupyter-store.ts

API 层
├── lib/jupyter/kernel.ts (Tauri invoke wrappers)
├── lib/jupyter/parser.ts (Notebook parsing)
└── lib/ai/tools/jupyter-tools.ts (Agent tools)

类型层
└── types/system/jupyter.ts

Rust 后端
├── src-tauri/src/jupyter/mod.rs (Re-exports)
├── src-tauri/src/jupyter/kernel.rs (Kernel process management)
├── src-tauri/src/jupyter/session.rs (Session manager)
├── src-tauri/src/jupyter/protocol.rs (Message protocol)
└── src-tauri/src/commands/devtools/jupyter.rs (Tauri commands)
```

---

## 功能清单

| 子功能 | 状态 | 位置 | 备注 |
|--------|------|------|------|
| 创建会话 | ✅ 完善 | `jupyter_create_session` | - |
| 列出会话 | ✅ 完善 | `jupyter_list_sessions` | - |
| 删除会话 | ✅ 完善 | `jupyter_delete_session` | - |
| 列出内核 | ✅ 完善 | `jupyter_list_kernels` | - |
| 重启内核 | ✅ 完善 | `jupyter_restart_kernel` | - |
| 中断内核 | ⚠️ 部分 | `jupyter_interrupt_kernel` | 仅设置状态，不真正中断 subprocess |
| 执行代码 | ✅ 完善 | `jupyter_execute` | - |
| 快速执行 | ✅ 完善 | `jupyter_quick_execute` | - |
| 执行单元格 | ✅ 完善 | `jupyter_execute_cell` | - |
| 执行整个笔记本 | ✅ 完善 | `jupyter_execute_notebook` | 支持超时和错误中断 |
| 获取变量 | ✅ 完善 | `jupyter_get_variables` | - |
| 检查变量 | ✅ 完善 | `jupyter_inspect_variable` | - |
| 缓存变量 | ✅ 完善 | `jupyter_get_cached_variables` | - |
| 检查内核可用 | ✅ 完善 | `jupyter_check_kernel_available` | - |
| 安装 ipykernel | ✅ 完善 | `jupyter_ensure_kernel` | 支持 uv 和 pip |
| 清理内核 | ✅ 完善 | `jupyter_cleanup` | 清理死亡和空闲内核 |
| 关闭所有 | ✅ 完善 | `jupyter_shutdown_all` | - |
| Notebook 解析 | ✅ 完善 | `lib/jupyter/parser.ts` | 支持 nbformat v4 |
| Agent 工具 | ✅ 完善 | `lib/ai/tools/jupyter-tools.ts` | 6 个工具 |

---

## 发现问题

### HIGH: 0 个
### MEDIUM: 5 个
### LOW: 3 个

---

## 问题详情

### 问题 1: Subprocess 执行方式限制

**位置**: `@D:/Project/Cognia/src-tauri/src/jupyter/kernel.rs:252-349`
**严重程度**: MEDIUM
**描述**: 当前使用 subprocess 方式执行 Python 代码，每次执行都创建新进程，无法保持真正的 kernel 状态
**影响**: 
- 变量状态依赖缓存而非真实 kernel namespace
- 无法使用 matplotlib 的交互式图形
- 执行性能受进程创建开销影响
- `interrupt()` 方法无法真正中断执行

### 问题 2: 未使用的代码和 dead_code 标记

**位置**: 
- `@D:/Project/Cognia/src-tauri/src/jupyter/mod.rs:16-19` - `#[allow(unused_imports)]`
- `@D:/Project/Cognia/src-tauri/src/jupyter/protocol.rs:21` - `#[allow(dead_code)]`
**严重程度**: LOW
**描述**: 存在未使用的 imports 和 dead_code 标记，说明 protocol.rs 中的 MessageHeader::new() 未被使用
**影响**: 代码维护性降低

### 问题 3: 错误信息吞没

**位置**: `@D:/Project/Cognia/lib/jupyter/kernel.ts:38-40`（多处类似）
**严重程度**: MEDIUM
**描述**: 多处 catch 块仅返回默认值而不记录错误
```typescript
} catch {
  return [];
}
```
**影响**: 调试困难，错误原因不可追踪

### 问题 4: console.error 在生产代码中

**位置**: `@D:/Project/Cognia/hooks/sandbox/use-jupyter-kernel.ts:482,501`
**严重程度**: LOW
**描述**: 使用 `console.error` 而非统一的日志系统
**影响**: 生产环境中可能泄露敏感信息

### 问题 5: Python 代码字符串转义潜在问题

**位置**: `@D:/Project/Cognia/src-tauri/src/jupyter/kernel.rs:264-292`
**严重程度**: MEDIUM
**描述**: wrapper_code 中的字符串转义逻辑可能在特殊输入时失败
```rust
code.replace("'''", r#"\'\'\'"#).replace("\\", "\\\\")
```
**影响**: 包含特殊字符的代码可能执行失败

### 问题 6: 变量缓存逻辑过于简单

**位置**: `@D:/Project/Cognia/src-tauri/src/jupyter/kernel.rs:652-667`
**严重程度**: MEDIUM
**描述**: `cache_variables_from_output` 使用简单的 `=` 分割来解析变量，可能误判
**影响**: 变量缓存不准确

### 问题 7: 内核空闲超时硬编码

**位置**: `@D:/Project/Cognia/src-tauri/src/commands/devtools/jupyter.rs:32`
**严重程度**: LOW
**描述**: 空闲超时 3600 秒（1小时）硬编码，不可配置
**影响**: 用户无法自定义清理策略

### 问题 8: 缺少 ZeroMQ 真正的 Jupyter 协议支持

**位置**: `@D:/Project/Cognia/src-tauri/src/jupyter/protocol.rs`
**严重程度**: MEDIUM
**描述**: protocol.rs 定义了完整的 Jupyter 消息协议，但实际未使用 ZeroMQ 通信
**影响**: 功能受限，无法支持真正的 IPython 内核特性

---

## 优化项

### [优先级: HIGH] 改进为真正的 IPython Kernel 通信

**当前状态**:
使用 subprocess 执行 Python 代码，每次创建新进程

**问题**:
无法保持真正的 kernel 状态，interrupt 无效，无法支持交互式输出

**改进方案**:
1. 使用 `jupyter_client` 或直接实现 ZeroMQ 通信
2. 在虚拟环境中启动真正的 IPython kernel
3. 通过 ZeroMQ sockets (shell, iopub, stdin, control) 通信
4. 利用已有的 `protocol.rs` 消息定义

**涉及文件**:
- `@D:/Project/Cognia/src-tauri/src/jupyter/kernel.rs:89-133` (start)
- `@D:/Project/Cognia/src-tauri/src/jupyter/kernel.rs:136-250` (execute)
- `@D:/Project/Cognia/src-tauri/src/jupyter/protocol.rs` (整个文件)
- `Cargo.toml` (添加 zeromq 依赖)

**预期收益**:
- 性能: 单次进程启动，后续执行快 10-100x
- 体验: 支持真正的 interrupt，流式输出
- 功能: 支持 IPython magics，交互式图形

**工作量**: 大 (> 8hr)

**依赖项**:
- 需要添加 `zeromq` 或 `zmq` crate
- 需要更新 kernel 连接文件解析

---

### [优先级: MEDIUM] 清理未使用代码

**当前状态**:
存在 `#[allow(unused_imports)]` 和 `#[allow(dead_code)]` 标记

**问题**:
代码维护性降低，不清楚哪些代码真正被使用

**改进方案**:
1. 移除 `mod.rs` 中的 `#[allow(unused_imports)]`
2. 将 `protocol.rs` 中的 `MessageHeader::new()` 集成到实际代码中
3. 或者移除未使用的协议代码

**涉及文件**:
- `@D:/Project/Cognia/src-tauri/src/jupyter/mod.rs:16-19`
- `@D:/Project/Cognia/src-tauri/src/jupyter/protocol.rs:21-31`

**预期收益**:
- 维护: 代码更清晰
- 编译: 减少未使用代码警告

**工作量**: 小 (< 2hr)

**依赖项**: 无

---

### [优先级: MEDIUM] 增强错误处理和日志

**当前状态**:
多处 catch 块吞没错误，使用 console.error

**问题**:
调试困难，错误原因不可追踪

**改进方案**:
1. 在 TypeScript 中添加错误日志
2. 在 Rust 中使用 `log::warn!` 或 `log::error!`
3. 考虑在 catch 中记录错误到统一日志系统
4. 替换 `console.error` 为项目统一的日志方法

**涉及文件**:
- `@D:/Project/Cognia/lib/jupyter/kernel.ts` (多处 catch 块)
- `@D:/Project/Cognia/hooks/sandbox/use-jupyter-kernel.ts:482,501`

**预期收益**:
- 调试: 更容易追踪问题
- 监控: 可以收集错误统计

**工作量**: 小 (< 2hr)

**依赖项**: 无

---

### [优先级: MEDIUM] 改进 Python 代码包装安全性

**当前状态**:
简单的字符串替换来转义代码

**问题**:
特殊字符可能导致执行失败或注入

**改进方案**:
1. 使用 base64 编码传递代码
2. 或使用临时文件传递代码
3. 改进转义逻辑，处理更多边界情况

**涉及文件**:
- `@D:/Project/Cognia/src-tauri/src/jupyter/kernel.rs:264-292`

**预期收益**:
- 安全: 避免代码注入风险
- 稳定: 支持更多特殊字符

**工作量**: 中 (2-8hr)

**依赖项**: 无

---

### [优先级: LOW] 配置化空闲超时

**当前状态**:
硬编码 3600 秒

**问题**:
用户无法自定义

**改进方案**:
1. 添加配置选项到 `KernelConfig`
2. 在前端设置中暴露配置
3. 持久化到用户设置

**涉及文件**:
- `@D:/Project/Cognia/src-tauri/src/jupyter/kernel.rs:38-45`
- `@D:/Project/Cognia/src-tauri/src/commands/devtools/jupyter.rs:32`
- `@D:/Project/Cognia/types/system/jupyter.ts:92-106`

**预期收益**:
- 体验: 用户可自定义清理策略
- 资源: 可以更积极或更保守地清理

**工作量**: 小 (< 2hr)

**依赖项**: 无

---

### [优先级: LOW] 改进变量缓存逻辑

**当前状态**:
简单的 `=` 分割解析

**问题**:
可能误判，例如字符串中包含 `=`

**改进方案**:
1. 不依赖输出解析，而是执行后主动查询变量
2. 或改进解析逻辑，使用 AST 分析
3. 或完全依赖 kernel 的 `get_variables()`

**涉及文件**:
- `@D:/Project/Cognia/src-tauri/src/jupyter/kernel.rs:652-667`

**预期收益**:
- 准确: 变量缓存更准确
- 体验: 变量检查更可靠

**工作量**: 中 (2-8hr)

**依赖项**: 可能依赖 ZeroMQ 改进

---

## 快速优化 (高收益低成本)

1. **清理未使用代码** - 移除 `#[allow(unused_imports)]` 和 `#[allow(dead_code)]`
2. **增强错误日志** - 在 catch 块中添加错误日志
3. **配置化超时** - 将硬编码值改为可配置

---

## 总工作量估计

| 类型 | 数量 | 估计时间 |
|------|------|----------|
| 小型任务 | 3 个 | ~6 hr |
| 中型任务 | 3 个 | ~15 hr |
| 大型任务 | 1 个 | ~16 hr |
| **总计** | 7 个 | **~37 hr** |

---

## 推荐行动顺序

1. **清理未使用代码** (LOW, 小) - 快速完成，改善代码质量
2. **增强错误处理** (MEDIUM, 小) - 提高可调试性
3. **配置化空闲超时** (LOW, 小) - 提供用户灵活性
4. **改进代码包装安全性** (MEDIUM, 中) - 提高稳定性
5. **改进变量缓存** (LOW, 中) - 提高准确性
6. **升级到 ZeroMQ 通信** (HIGH, 大) - 长期目标，根本性改进

---

## 相关文档

- [Jupyter Messaging Protocol](https://jupyter-client.readthedocs.io/en/stable/messaging.html)
- [IPython Kernel](https://ipython.readthedocs.io/en/stable/development/wrapperkernels.html)
- [Enterprise Gateway Architecture](https://jupyter-enterprise-gateway.readthedocs.io/en/latest/contributors/system-architecture.html)

---

*生成时间: 2026-01-29*
