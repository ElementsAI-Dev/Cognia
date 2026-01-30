# 原生功能 (Native Features) 优化计划

## 执行摘要

Cognia 的原生功能模块是桌面应用的核心竞争力，涵盖截图、OCR、屏幕录制、输入补全、系统感知等 15+ 个子系统。本次分析发现 **20 个 dead_code 标记**、**51 个失败测试**、**14 个 TODO 项**以及多处架构改进点。

---

## 模块依赖

### Rust 后端 (`src-tauri/src/`)

| 模块 | 文件数 | 代码量 | 状态 |
|------|--------|--------|------|
| `awareness/` | 5 | ~140KB | ✅ 完善 |
| `context/` | 7 | ~193KB | ✅ 完善 |
| `screenshot/` | 11 | ~207KB | ⚠️ 有 TODO |
| `selection/` | 12 | ~283KB | ✅ 完善 |
| `screen_recording/` | 8 | ~143KB | ⚠️ 4 个 dead_code |
| `input_completion/` | 6 | ~129KB | ⚠️ IME TODO |
| `sandbox/` | 7 | ~273KB | ⚠️ 10 个 dead_code |
| `mcp/` | 7 | ~212KB | ✅ 完善 |
| `skill_seekers/` | 3 | ~72KB | ⚠️ 2 个 TODO |
| `process/` | 3 | ~50KB | ✅ 完善 |

### TypeScript 前端 (`lib/native/`)

- **入口**: `lib/native/index.ts`
- **API 文件**: 32 个模块 (~320KB)
- **测试覆盖**: 30 个测试文件，678 通过 / 51 失败

### Hooks (`hooks/native/`)

- **13 个 hooks**，223 个测试全部通过
- 主要 hooks: `use-screenshot`, `use-screen-recording`, `use-window-controls`

### Store (`stores/system/native-store.ts`)

- 窗口状态、快捷键、原生工具配置
- 使用 Zustand persist 中间件

---

## 发现问题

- **HIGH**: 3 个
- **MEDIUM**: 8 个
- **LOW**: 5 个

---

## 高优先级改进 (HIGH)

### 1. [HIGH] 修复测试失败 - Input Completion API

**当前状态**:
`lib/native/input-completion.test.ts` 有多个测试失败，`isInputCompletionRunning` 命令名不匹配。

**问题**:
测试期望调用 `input_completion_is_running`，但实际 invoke 未正确 mock 或命令未注册。

**涉及文件**:
- `@/lib/native/input-completion.test.ts:230-238`
- `@/src-tauri/src/input_completion/mod.rs`

**改进方案**:
1. 检查 Rust 端是否注册了 `input_completion_is_running` 命令
2. 修复测试 mock 逻辑
3. 确保 API 与后端命令对齐

**预期收益**:
- 测试通过率从 93% 提升到 100%
- 避免运行时错误

**工作量**: 小 (< 2hr)

---

### 2. [HIGH] 修复 TypeScript 编译错误 - Sandbox Tests

**当前状态**:
`lib/native/sandbox.test.ts` 有 2 个 TypeScript 错误：
- 第 347 行: 未使用的 `@ts-expect-error`
- 第 403 行: `null` 不能赋值给 `string | undefined`

**问题**:
测试代码与类型定义不匹配。

**涉及文件**:
- `@/lib/native/sandbox.test.ts:347,403`

**改进方案**:
1. 移除多余的 `@ts-expect-error`
2. 修复 null 类型赋值问题

**预期收益**:
- TypeScript 编译无错误
- 类型安全

**工作量**: 小 (< 1hr)

---

### 3. [HIGH] 移除 Dead Code - Screen Recording Progress

**当前状态**:
`src-tauri/src/screen_recording/progress.rs` 有 4 个 `#[allow(dead_code)]` 标记的函数未被使用。

**问题**:
- `parse_ffmpeg_progress` - 未集成
- `monitor_ffmpeg_progress` - 未集成
- `emit_processing_started` - 未集成
- `emit_processing_completed` - 未集成

**涉及文件**:
- `@/src-tauri/src/screen_recording/progress.rs:55-203`
- `@/src-tauri/src/screen_recording/video_processor.rs`

**改进方案**:
1. 将进度函数集成到 `video_processor.rs`
2. 在视频处理时发射进度事件
3. 前端添加进度监听

**预期收益**:
- 视频处理有实时进度反馈
- 用户体验提升
- 消除 dead_code 警告

**工作量**: 中 (2-4hr)

---

## 中优先级改进 (MEDIUM)

### 4. [MEDIUM] 移除 Dead Code - Sandbox 模块

**当前状态**:
Sandbox 模块有 10 个 dead_code 标记。

**问题**:
- `SandboxError` 枚举未使用
- `ExecutionRequest` 结构未使用
- `execute_with_limits` 方法未使用
- `detect_available_languages` 未集成
- `get_all_languages` 未集成
- `update_session`, `get_session_executions` 未集成

**涉及文件**:
- `@/src-tauri/src/sandbox/runtime.rs:16-668`
- `@/src-tauri/src/sandbox/native.rs:117-154`
- `@/src-tauri/src/sandbox/languages.rs:346-358`
- `@/src-tauri/src/sandbox/db.rs:169-1172`

**改进方案**:
参考之前的 Sandbox 集成方案，确保所有组件有完整调用链。

**预期收益**:
- 零 dead_code
- 完整功能暴露

**工作量**: 中 (4-6hr)

---

### 5. [MEDIUM] 实现 IME 检测 - 非 Windows 平台

**当前状态**:
`src-tauri/src/input_completion/ime_state.rs:213` 有 TODO：macOS/Linux IME 检测未实现。

**问题**:
输入补全在非 Windows 平台不能检测 IME 状态，可能导致中文输入时误触发补全。

**涉及文件**:
- `@/src-tauri/src/input_completion/ime_state.rs:210-215`

**改进方案**:
1. macOS: 使用 `CGEventSourceStateID` 或 `NSTextInputContext`
2. Linux: 使用 `ibus` 或 `fcitx` D-Bus API

**预期收益**:
- 跨平台 CJK 输入支持
- 更好的用户体验

**工作量**: 大 (8-12hr)

---

### 6. [MEDIUM] 实现 DPI 缩放检测 - Screenshot

**当前状态**:
`src-tauri/src/screenshot/capture.rs:358` 有 TODO：DPI scale_factor 硬编码为 1.0。

**问题**:
高 DPI 显示器截图坐标可能不准确。

**涉及文件**:
- `@/src-tauri/src/screenshot/capture.rs:355-360`

**改进方案**:
使用 Windows `GetDpiForMonitor` API 获取实际 DPI。

**预期收益**:
- 高 DPI 显示器准确截图
- 坐标计算正确

**工作量**: 小 (2-3hr)

---

### 7. [MEDIUM] 实现 Model Download 配置持久化

**当前状态**:
`src-tauri/src/commands/storage/model_download.rs:366-376` 有 2 个 TODO：配置加载/保存未实现。

**问题**:
下载配置每次重启丢失。

**涉及文件**:
- `@/src-tauri/src/commands/storage/model_download.rs:363-376`

**改进方案**:
使用 `tauri::api::path::app_config_dir` 保存 JSON 配置。

**预期收益**:
- 配置持久化
- 用户设置保留

**工作量**: 小 (1-2hr)

---

### 8. [MEDIUM] 实现 Skill Seekers CLI 输出解析

**当前状态**:
`src-tauri/src/skill_seekers/service.rs:663` 有 TODO：估算解析使用默认值。

**问题**:
页面估算不准确，返回硬编码值。

**涉及文件**:
- `@/src-tauri/src/skill_seekers/service.rs:660-666`

**改进方案**:
解析 skill-seekers CLI 的 JSON 输出。

**预期收益**:
- 准确的抓取估算
- 更好的用户预期管理

**工作量**: 小 (1-2hr)

---

### 9. [MEDIUM] 实现视频处理取消功能

**当前状态**:
`lib/native/video-processing.ts:210` 有 TODO：取消视频处理未实现。

**问题**:
用户无法取消长时间的视频处理。

**涉及文件**:
- `@/lib/native/video-processing.ts:207-213`
- `@/src-tauri/src/screen_recording/video_processor.rs`

**改进方案**:
1. Rust 端添加 `video_cancel_processing` 命令
2. 使用 `Child.kill()` 终止 FFmpeg 进程
3. 前端调用取消 API

**预期收益**:
- 可取消长时间处理
- 更好的用户控制

**工作量**: 中 (2-4hr)

---

### 10. [MEDIUM] 减少 Console.log 调用

**当前状态**:
`lib/native/` 目录有 49 处 console.log/warn/error 调用，主要在：
- `tray.ts` (12)
- `stronghold.ts` (11)
- `shortcuts.ts` (5)
- `system.ts` (5)

**问题**:
生产环境不应有过多日志输出。

**改进方案**:
1. 创建统一日志工具 `lib/native/logger.ts`
2. 根据环境变量控制日志级别
3. 替换直接 console 调用

**预期收益**:
- 可控日志输出
- 生产环境更干净

**工作量**: 中 (2-3hr)

---

### 11. [MEDIUM] 实现 Screen Recording 元数据

**当前状态**:
`src-tauri/src/screen_recording/recorder.rs:1041-1042` 有 2 个 TODO：
- `has_audio` 硬编码为 false
- `thumbnail` 未生成

**涉及文件**:
- `@/src-tauri/src/screen_recording/recorder.rs:1038-1043`

**改进方案**:
1. 从录制配置读取 `has_audio`
2. 使用 FFmpeg 生成缩略图

**预期收益**:
- 准确的录制元数据
- 录制历史有预览图

**工作量**: 小 (2-3hr)

---

## 低优先级改进 (LOW)

### 12. [LOW] 实现 PDF 文本提取

**当前状态**:
`src-tauri/src/commands/academic/mod.rs:887` 有 TODO：PDF 提取未实现。

**涉及文件**:
- `@/src-tauri/src/commands/academic/mod.rs:885-889`

**改进方案**:
集成 `lopdf` 或 `pdf-extract` crate。

**工作量**: 大 (6-8hr)

---

### 13. [LOW] 实现插件通知系统

**当前状态**:
`src-tauri/src/commands/extensions/plugin.rs:209` 有 TODO：通知系统未集成。

**涉及文件**:
- `@/src-tauri/src/commands/extensions/plugin.rs:206-211`

**改进方案**:
使用 `tauri-plugin-notification` 或系统 API。

**工作量**: 小 (1-2hr)

---

### 14. [LOW] 实现 Skill 自动安装

**当前状态**:
`src-tauri/src/skill_seekers/service.rs:957` 有 TODO：自动安装未实现。

**涉及文件**:
- `@/src-tauri/src/skill_seekers/service.rs:955-959`

**改进方案**:
调用 skill 安装服务。

**工作量**: 中 (2-4hr)

---

### 15. [LOW] 清理未使用类型

**当前状态**:
- `SkillError` 枚举有 dead_code 标记
- `TransportType` 枚举有 dead_code 标记
- `MessageHeader::new` 有 dead_code 标记

**涉及文件**:
- `@/src-tauri/src/skill/types.rs:241`
- `@/src-tauri/src/mcp/transport/mod.rs:31`
- `@/src-tauri/src/jupyter/protocol.rs:22`

**改进方案**:
评估是否需要这些类型，移除或集成。

**工作量**: 小 (1-2hr)

---

### 16. [LOW] 添加 Snap Layouts Hook 测试

**当前状态**:
`hooks/native/use-snap-layouts.ts` 有完整测试，但测试中有 act() 警告。

**涉及文件**:
- `@/hooks/native/use-snap-layouts.test.ts`

**改进方案**:
使用 `waitFor` 或 `act()` 包装异步更新。

**工作量**: 小 (1hr)

---

## 快速优化 (高收益低成本)

| 改进项 | 工作量 | 收益 |
|--------|--------|------|
| 修复 Sandbox 测试 TS 错误 | 1hr | 编译无错误 |
| 修复 Input Completion 测试 | 2hr | 测试通过率 +7% |
| 实现 Model Download 持久化 | 2hr | 配置保留 |
| 实现 DPI 缩放检测 | 2hr | 高 DPI 支持 |
| 实现 Skill Seekers 解析 | 2hr | 准确估算 |

---

## 总工作量估计

| 类别 | 数量 | 预估工时 |
|------|------|----------|
| 小型任务 (< 2hr) | 8 个 | ~12 hr |
| 中型任务 (2-8hr) | 6 个 | ~24 hr |
| 大型任务 (> 8hr) | 2 个 | ~20 hr |
| **总计** | 16 个 | **~56 hr** |

---

## 推荐行动

### 第一阶段 (本周)
1. 修复 TypeScript 编译错误
2. 修复 Input Completion 测试
3. 实现 DPI 缩放检测

### 第二阶段 (下周)
4. 集成 Screen Recording 进度事件
5. 实现视频处理取消功能
6. 清理 Sandbox dead_code

### 第三阶段 (后续)
7. 实现跨平台 IME 检测
8. 统一日志系统
9. 其他低优先级改进

---

## 参考资料

- [Tauri 2.0 架构文档](https://v2.tauri.app/concept/architecture/)
- [Tauri IPC 最佳实践](https://v2.tauri.app/develop/calling-rust/)
- [Tauri 事件系统](https://v2.tauri.app/develop/calling-frontend/)

---

*生成时间: 2026-01-29*
*分析范围: src-tauri/src/, lib/native/, hooks/native/, stores/system/*
