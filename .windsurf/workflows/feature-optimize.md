---
description: 通用功能优化工作流 - 研究现有代码，联网搜索最佳实践，制定详细更新计划
---

# 功能优化工作流

对指定功能进行全面研究、分析和优化规划。

## 用户输入

```text
$ARGUMENTS
```

**必须先理解用户输入的优化目标**，然后按以下流程执行。

---

## Phase 1: 代码研究

### 1.1 语义搜索

使用 `mcp0_search_context` 搜索相关代码：

```javascript
mcp0_search_context({
  project_root_path: "<项目根目录>",
  query: "<用户描述的功能关键词>"
})
```

### 1.2 文件定位

根据搜索结果，使用 `grep_search` 精确定位：

```bash
grep_search "<关键函数/组件名>" --includes "*.ts,*.tsx,*.rs"
```

### 1.3 深入阅读

使用 `read_file` 逐个阅读关键文件：

- 入口文件 / 主模块
- 类型定义 (`types/`)
- Store 状态管理 (`stores/`)
- Hooks (`hooks/`)
- 工具函数 (`lib/`)

### 1.4 绘制依赖图

记录以下内容：

```markdown
## 模块依赖

- **入口**: `path/to/entry.tsx`
- **状态**: `stores/xxx-store.ts`
- **Hooks**: `hooks/xxx/use-xxx.ts`
- **工具**: `lib/xxx/xxx.ts`
- **类型**: `types/xxx/xxx.ts`
- **测试**: `xxx.test.ts`
```

---

## Phase 2: 现状评估

### 2.1 功能清单

列出该功能的所有子功能：

| 子功能 | 状态 | 位置 | 备注 |
|--------|------|------|------|
| 功能 A | ✅ 完善 | file.ts | - |
| 功能 B | ⚠️ 部分 | file.ts | 缺少 X |
| 功能 C | ❌ 缺失 | - | 需新增 |

### 2.2 代码质量检查

```bash
# 类型检查
pnpm tsc --noEmit

# 测试覆盖
pnpm test <相关目录>

# Lint 检查
pnpm lint <相关文件>
```

### 2.3 问题扫描

```bash
# 搜索 TODO/FIXME
grep_search "TODO|FIXME|HACK|XXX" --includes "*.ts,*.tsx"

# 搜索 console.log (生产代码不应有)
grep_search "console\.(log|warn|error)" --includes "*.ts,*.tsx"

# 搜索 any 类型
grep_search ": any" --includes "*.ts,*.tsx"
```

---

## Phase 3: 联网研究

### 3.1 最佳实践搜索

```javascript
// 使用 exa 搜索
mcp2_web_search_exa({
  query: "<功能名> best practices implementation patterns"
})

// 获取代码示例
mcp2_get_code_context_exa({
  query: "<框架/库名> <功能名> implementation example"
})
```

### 3.2 深度研究

```javascript
// 使用 perplexity 综合研究
mcp10_perplexity_ask({
  messages: [{
    role: "user",
    content: "What are the best practices for implementing <功能描述>? Include: architecture patterns, performance considerations, common pitfalls, and modern approaches."
  }]
})
```

### 3.3 开源项目参考

```javascript
// 查询相关 GitHub 项目
mcp1_ask_question({
  repoName: "<owner>/<repo>",
  question: "How does this project implement <功能>?"
})
```

### 3.4 官方文档

```javascript
// 获取官方文档
mcp3_fetch({
  url: "<官方文档 URL>"
})
```

---

## Phase 4: 问题识别

### 4.1 通用检查清单

- [ ] **性能**: 是否有性能瓶颈？
- [ ] **内存**: 是否有内存泄漏风险？
- [ ] **类型安全**: 是否有 `any` 或类型断言？
- [ ] **错误处理**: 是否有空 catch 块？
- [ ] **边界情况**: 是否处理了边界条件？
- [ ] **可测试性**: 是否有足够的测试覆盖？
- [ ] **可维护性**: 代码是否清晰易懂？
- [ ] **可扩展性**: 是否易于扩展？
- [ ] **一致性**: 是否符合项目规范？
- [ ] **安全性**: 是否有安全隐患？

### 4.2 具体问题记录

```markdown
### 问题 1: [问题标题]

**位置**: `@/path/to/file.ts:line-range`
**严重程度**: HIGH / MEDIUM / LOW
**描述**: 具体问题描述
**影响**: 对用户/系统的影响
```

---

## Phase 5: 制定更新计划

### 5.1 优化项模板

为每个改进点生成：

```markdown
### [优先级: HIGH/MEDIUM/LOW] 改进标题

**当前状态**:
现有实现简述

**问题**:
具体问题描述

**改进方案**:
详细技术方案

**涉及文件**:

- `@/path/to/file1.ts:line-range`
- `@/path/to/file2.ts:line-range`

**预期收益**:

- 性能: 具体提升
- 体验: 具体改善
- 维护: 具体好处

**工作量**: 小 (< 2hr) / 中 (2-8hr) / 大 (> 8hr)

**依赖项**:

- 需先完成的其他项
```

### 5.2 优先级指南

**HIGH**:

- 影响用户体验的 Bug
- 数据丢失/损坏风险
- 严重性能问题
- 安全漏洞

**MEDIUM**:

- 功能增强
- 代码质量改进
- 测试覆盖提升
- 性能优化

**LOW**:

- 代码风格
- 文档完善
- 小型重构

---

## Phase 6: 输出汇总

### 6.1 执行报告

```markdown
# [功能名] 优化计划

## 执行摘要

[2-3 句话概述]

## 发现问题

- HIGH: X 个
- MEDIUM: Y 个
- LOW: Z 个

## 推荐行动

1. [最优先的改进]
2. [次优先的改进]
3. ...

## 快速优化 (高收益低成本)

- [改进 A]
- [改进 B]

## 总工作量估计

- 小型任务: X 个 (~Y hr)
- 中型任务: X 个 (~Y hr)
- 大型任务: X 个 (~Y hr)
- **总计**: ~Z hr
```

### 6.2 保存计划

```bash
# 输出到项目文档
docs/improvements/<功能名>-optimization-plan.md
```

---

## 重要提示

- **研究阶段不修改代码** — 仅分析和规划
- **优先使用 MCP 工具** — `mcp0_search_context` 优先于 grep
- **记录所有发现** — 便于后续实施
- **考虑向后兼容** — 特别是数据库/API 变更
- **验证假设** — 对不确定的地方求证

---

## 相关工作流

- `/refactor` — 代码重构实施
- `/optimize` — 性能优化实施
- `/code-audit` — 深度代码审计
- `/test` — 测试运行
- `/review` — 代码审查
