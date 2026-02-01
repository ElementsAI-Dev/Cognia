# 输入补全功能优化计划

## 执行摘要

输入补全功能是一个桌面端 AI 驱动的实时文本补全系统，类似于 GitHub Copilot 的 Tab 补全。经过全面分析，发现该功能已具备良好的架构基础，但在跨平台支持、性能优化、用户体验和功能集成方面存在优化空间。

## 模块依赖

- **入口**: `src-tauri/src/input_completion/mod.rs` (InputCompletionManager)
- **状态**: `stores/input-completion/input-completion-store.ts`
- **Hooks**: `hooks/input-completion/use-input-completion.ts`
- **工具**: `lib/native/input-completion.ts`
- **类型**: `types/input-completion/index.ts`
- **组件**: `components/input-completion/completion-overlay.tsx`, `completion-settings.tsx`
- **测试**: `**/input-completion/*.test.ts`, `e2e/features/input-completion.spec.ts`
- **文档**: `llmdoc/architecture/input-completion-system.md`

---

## 发现问题

- **HIGH**: 2 个
- **MEDIUM**: 6 个
- **LOW**: 4 个

---

## 详细优化项

### [优先级: HIGH] 1. 跨平台 IME 支持

**当前状态**:
`@/src-tauri/src/input_completion/ime_state.rs:210-215` 中存在 TODO 注释，macOS/Linux 平台的 IME 检测未实现，返回默认状态。

**问题**:
- macOS 和 Linux 用户无法获得正确的 IME 状态检测
- CJK 语言用户在非 Windows 平台上可能遇到补全与输入法冲突

**改进方案**:
1. macOS: 使用 `InputMethodKit` 或 Carbon API 检测 IME 状态
2. Linux: 使用 IBus/Fcitx D-Bus 接口检测 IME 状态
3. 添加平台特定的 IME 状态轮询实现

**涉及文件**:
- `@/src-tauri/src/input_completion/ime_state.rs:210-215`

**预期收益**:
- 性能: 无直接影响
- 体验: macOS/Linux CJK 用户体验大幅提升
- 维护: 完善跨平台支持

**工作量**: 大 (> 8hr)

**依赖项**: 无

---

### [优先级: HIGH] 2. 统一输入补全系统整合

**当前状态**:
存在两套补全系统:
- `hooks/input-completion/use-input-completion.ts` - 原生 AI 补全 (Tauri)
- `hooks/chat/use-input-completion-unified.ts` - Web 层统一补全 (@mention, /slash, :emoji)

两套系统独立运行，未整合。

**问题**:
- AI ghost text 补全与 @mention/slash/emoji 补全未统一
- 用户需要理解两套不同的补全触发机制
- 代码重复，维护成本高

**改进方案**:
1. 将原生 AI 补全作为 `use-input-completion-unified.ts` 的 `ai-text` provider 整合
2. 实现 provider 优先级和冲突解决机制
3. 统一 ghost text 渲染逻辑

**涉及文件**:
- `@/hooks/chat/use-input-completion-unified.ts:28` (ai-text provider 默认 disabled)
- `@/hooks/input-completion/use-input-completion.ts`
- `@/components/input-completion/completion-overlay.tsx`

**预期收益**:
- 性能: 减少重复事件监听
- 体验: 统一的补全体验
- 维护: 单一入口，易于维护

**工作量**: 大 (> 8hr)

**依赖项**: 无

---

### [优先级: MEDIUM] 3. 智能上下文窗口管理

**当前状态**:
`@/src-tauri/src/input_completion/completion_service.rs:469-484` 中 `build_completion_prompt` 方法简单拼接文本，无智能上下文管理。

**问题**:
- 缺少文件类型/语言自动检测
- 缺少代码结构分析（函数、类、导入等）
- 上下文长度硬编码，未根据模型能力动态调整

**改进方案**:
1. 添加语言检测器，根据文件扩展名和内容自动识别
2. 实现上下文结构分析，优先包含相关的导入、函数签名
3. 根据不同 provider 的 token 限制动态调整上下文长度
4. 添加滑动窗口机制，保留最相关的上下文

**涉及文件**:
- `@/src-tauri/src/input_completion/completion_service.rs:469-484`
- `@/types/input-completion/index.ts:36-48` (CompletionContext)

**预期收益**:
- 性能: 更精准的补全请求
- 体验: 更准确的代码补全建议
- 维护: 无影响

**工作量**: 中 (2-8hr)

**依赖项**: 无

---

### [优先级: MEDIUM] 4. 补全缓存优化

**当前状态**:
`@/src-tauri/src/input_completion/completion_service.rs:17-24` 中缓存实现简单:
- 固定 100 条缓存上限
- 固定 60 秒 TTL
- 简单 LRU 淘汰策略

**问题**:
- 缓存策略不够智能，未考虑补全使用频率
- 缺少前缀匹配缓存（如 "cons" 的结果可用于 "conso"）
- 缓存命中率可能较低

**改进方案**:
1. 实现前缀树(Trie)缓存结构，支持前缀匹配
2. 添加 LFU (Least Frequently Used) 淘汰策略
3. 支持可配置的缓存大小和 TTL
4. 添加缓存预热机制（常用补全模式）

**涉及文件**:
- `@/src-tauri/src/input_completion/completion_service.rs:17-24`
- `@/src-tauri/src/input_completion/completion_service.rs:486-533`

**预期收益**:
- 性能: 提高缓存命中率 30-50%
- 体验: 减少重复请求延迟
- 维护: 无影响

**工作量**: 中 (2-8hr)

**依赖项**: 无

---

### [优先级: MEDIUM] 5. 流式补全支持

**当前状态**:
当前实现等待完整响应后才显示建议，未支持流式输出。

**问题**:
- 用户需要等待完整响应，感知延迟高
- 无法实现"打字机效果"的渐进式建议显示

**改进方案**:
1. Ollama: 使用 `"stream": true` 选项
2. OpenAI/Groq: 使用 SSE 流式 API
3. 前端实现渐进式 ghost text 渲染
4. 添加流式取消机制

**涉及文件**:
- `@/src-tauri/src/input_completion/completion_service.rs:111-179` (Ollama)
- `@/src-tauri/src/input_completion/completion_service.rs:181-262` (OpenAI)
- `@/components/input-completion/completion-overlay.tsx`

**预期收益**:
- 性能: 感知延迟降低 50%+
- 体验: 更流畅的补全展示
- 维护: 增加少量复杂度

**工作量**: 中 (2-8hr)

**依赖项**: 无

---

### [优先级: MEDIUM] 6. 多建议支持

**当前状态**:
`@/types/input-completion/index.ts:204` 中 `max_suggestions` 默认为 1，仅显示单一建议。

**问题**:
- 用户无法在多个补全选项中选择
- 缺少类似 VS Code 的多建议切换机制

**改进方案**:
1. 支持配置多个建议 (建议 1-5 个)
2. 添加 Alt+] / Alt+[ 快捷键切换建议
3. 实现建议列表 UI（可选显示模式）
4. 添加建议置信度可视化

**涉及文件**:
- `@/types/input-completion/index.ts:202-209` (CompletionUiConfig)
- `@/components/input-completion/completion-overlay.tsx`
- `@/src-tauri/src/input_completion/mod.rs`

**预期收益**:
- 性能: 无影响
- 体验: 更多选择，更高接受率
- 维护: 增加少量复杂度

**工作量**: 中 (2-8hr)

**依赖项**: 无

---

### [优先级: MEDIUM] 7. 补全质量反馈机制

**当前状态**:
`@/stores/input-completion/input-completion-store.ts:29-33` 仅记录基础统计（接受/拒绝数量）。

**问题**:
- 缺少补全质量评估机制
- 无法追踪哪些补全场景效果好/差
- 无法基于反馈优化提示词

**改进方案**:
1. 记录补全上下文与结果的关联
2. 添加隐式反馈（用户是否修改了接受的补全）
3. 添加显式反馈（可选的 👍/👎 按钮）
4. 生成补全效果报告

**涉及文件**:
- `@/stores/input-completion/input-completion-store.ts:29-33`
- `@/hooks/input-completion/use-input-completion.ts`
- `@/types/input-completion/index.ts:166-182` (CompletionStats)

**预期收益**:
- 性能: 无直接影响
- 体验: 基于反馈持续优化
- 维护: 增加少量复杂度

**工作量**: 中 (2-8hr)

**依赖项**: 无

---

### [优先级: MEDIUM] 8. 键盘监听优化

**当前状态**:
`@/src-tauri/src/input_completion/keyboard_monitor.rs:176-179` 中注释指出 `rdev::listen` 无法优雅停止。

**问题**:
- 键盘监听器无法正常停止，只能标记忽略
- 可能存在资源泄漏风险
- 停止后重启需要创建新线程

**改进方案**:
1. 探索使用 `windows-rs` 的 `SetWindowsHookEx` 替代 rdev (Windows)
2. 实现可取消的事件循环
3. 添加监听器健康检查机制
4. 添加自动重启机制

**涉及文件**:
- `@/src-tauri/src/input_completion/keyboard_monitor.rs`

**预期收益**:
- 性能: 资源管理更健壮
- 体验: 无直接影响
- 维护: 减少潜在内存泄漏

**工作量**: 中 (2-8hr)

**依赖项**: 无

---

### [优先级: LOW] 9. 补全触发智能化

**当前状态**:
`@/types/input-completion/index.ts:194-201` 中触发配置相对简单。

**问题**:
- 固定的 debounce 延迟，未考虑用户打字速度
- 缺少基于代码语义的触发时机判断
- 在注释/字符串中也会触发补全

**改进方案**:
1. 自适应 debounce：根据用户打字速度动态调整
2. 语义感知：在注释、字符串中禁用补全
3. 智能触发：在特定模式后触发（如 `.`、`(`、`=` 等）
4. 添加"触发模式"配置（自动/半自动/手动）

**涉及文件**:
- `@/types/input-completion/index.ts:112-126` (CompletionTriggerConfig)
- `@/src-tauri/src/input_completion/mod.rs:265-343`

**预期收益**:
- 性能: 减少无效请求
- 体验: 更智能的触发时机
- 维护: 增加少量复杂度

**工作量**: 小 (< 2hr)

**依赖项**: 无

---

### [优先级: LOW] 10. Ghost Text 渲染优化

**当前状态**:
`@/components/input-completion/completion-overlay.tsx` 使用固定定位的 overlay 显示建议。

**问题**:
- 当前实现需要传入 position，定位逻辑在组件外部
- 未实现真正的"内联 ghost text"效果（在光标处直接渲染）
- 多行补全的显示效果可能不理想

**改进方案**:
1. 实现真正的内联 ghost text（与 Monaco Editor 集成）
2. 支持多行补全的折叠/展开显示
3. 添加补全预览动画效果
4. 优化长文本截断显示

**涉及文件**:
- `@/components/input-completion/completion-overlay.tsx`

**预期收益**:
- 性能: 无直接影响
- 体验: 更接近 GitHub Copilot 的体验
- 维护: 无影响

**工作量**: 小 (< 2hr)

**依赖项**: 无

---

### [优先级: LOW] 11. 错误恢复机制

**当前状态**:
错误处理通过 event 发送，但缺少自动恢复机制。

**问题**:
- Provider 失败后需要用户手动重试
- 缺少自动降级机制
- 缺少错误重试策略

**改进方案**:
1. 实现指数退避重试策略
2. 添加 provider 健康检查和自动切换
3. 实现错误分类（网络错误/API 错误/超时）
4. 添加错误恢复建议提示

**涉及文件**:
- `@/src-tauri/src/input_completion/completion_service.rs:59-109`
- `@/hooks/input-completion/use-input-completion.ts`

**预期收益**:
- 性能: 无直接影响
- 体验: 更可靠的补全服务
- 维护: 减少用户投诉

**工作量**: 小 (< 2hr)

**依赖项**: 无

---

### [优先级: LOW] 12. 测试覆盖增强

**当前状态**:
存在单元测试和 E2E 测试，但部分场景未覆盖。

**问题**:
- 缺少 provider 集成测试
- 缺少 IME 状态变化的测试
- E2E 测试使用 mock 而非真实 Tauri 环境

**改进方案**:
1. 添加 provider 集成测试（使用 mock server）
2. 添加 IME 状态模拟测试
3. 添加性能基准测试
4. 添加压力测试（高频输入场景）

**涉及文件**:
- `@/hooks/input-completion/use-input-completion.test.ts`
- `@/e2e/features/input-completion.spec.ts`
- `@/src-tauri/src/input_completion/completion_service.rs` (tests module)

**预期收益**:
- 性能: 无直接影响
- 体验: 无直接影响
- 维护: 提高代码质量和可靠性

**工作量**: 小 (< 2hr)

**依赖项**: 无

---

## 推荐行动

### 快速优化 (高收益低成本)

1. **补全触发智能化** - 添加语义感知触发，在注释/字符串中禁用
2. **错误恢复机制** - 实现自动重试和 provider 降级
3. **Ghost Text 渲染优化** - 改进多行补全显示

### 优先实施

1. **跨平台 IME 支持** - 解决 macOS/Linux 用户痛点
2. **统一输入补全系统整合** - 提升整体架构质量
3. **智能上下文窗口管理** - 提高补全准确性

### 中期规划

1. **流式补全支持** - 降低感知延迟
2. **多建议支持** - 提升用户选择灵活性
3. **补全缓存优化** - 提高性能

---

## 总工作量估计

| 类型 | 数量 | 预估时间 |
|------|------|---------|
| 小型任务 | 4 个 | ~6 hr |
| 中型任务 | 6 个 | ~30 hr |
| 大型任务 | 2 个 | ~20 hr |
| **总计** | 12 个 | **~56 hr** |

---

## 相关文档

- `@/llmdoc/architecture/input-completion-system.md` - 架构文档
- `@/AGENTS.md` - 项目开发规范（Input Completion System 章节）

---

*生成时间: 2026-02-02*
