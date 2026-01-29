# LaTeX 渲染优化计划

## 执行摘要

当前 LaTeX 渲染存在核心问题：**rehype 插件顺序错误**导致 KaTeX 生成的 HTML 被 sanitize 删除。需要调整插件顺序并扩展 sanitization schema 以支持 KaTeX 元素。

## 发现问题

- **HIGH**: 1 个（插件顺序错误）
- **MEDIUM**: 2 个（sanitize schema 不完整、缺少预处理）
- **LOW**: 1 个（样式优化）

---

## 问题详情

### 问题 1: [HIGH] rehype 插件顺序错误

**位置**: `@/components/chat/utils/markdown-renderer.tsx:146-155`

**严重程度**: HIGH

**描述**: 
当前代码将 `rehypeKatex` 放在 `rehypeSanitize` **之后**：

```typescript
const plugins = [
  rehypeRaw,
  [rehypeSanitize, sanitizeSchema]  // sanitize 先执行
];
if (enableMath) {
  plugins.push(rehypeKatex);  // katex 后执行 ❌
}
```

**影响**: 
- KaTeX 生成的 HTML (`<span class="katex">`, `<annotation>`, `<math>` 等) 在 sanitize 阶段被删除
- LaTeX 公式无法正常渲染，显示为原始文本或被清空

**改进方案**:
调整顺序为：`rehypeRaw` → `rehypeKatex` → `rehypeSanitize`

```typescript
const rehypePlugins = useMemo(() => {
  const plugins: Parameters<typeof ReactMarkdown>[0]['rehypePlugins'] = [
    rehypeRaw,
  ];
  if (enableMath) {
    plugins.push([rehypeKatex, { 
      throwOnError: false,
      strict: false,
      trust: true,
      output: 'htmlAndMathml'
    }]);
  }
  // Sanitize 必须在 KaTeX 之后
  plugins.push([rehypeSanitize, sanitizeSchema]);
  return plugins;
}, [enableMath]);
```

**涉及文件**:
- `@/components/chat/utils/markdown-renderer.tsx:146-155`

**预期收益**:
- 修复所有因插件顺序导致的 LaTeX 渲染失败
- 正确保留 KaTeX 生成的 HTML 结构

**工作量**: 小 (< 30min)

---

### 问题 2: [MEDIUM] sanitizeSchema 缺少 KaTeX 必需元素

**位置**: `@/components/chat/utils/markdown-renderer.tsx:62-105`

**严重程度**: MEDIUM

**描述**: 
当前 sanitizeSchema 未显式允许 KaTeX 生成的元素和属性：
- 缺少 `math`, `annotation`, `semantics`, `mrow`, `mi`, `mo`, `mn` 等 MathML 元素
- 缺少 `aria-hidden`, `xmlns`, `encoding` 等必要属性
- 未允许 `katex`, `katex-html`, `katex-mathml` 等 class 名

**影响**: 
即使修复插件顺序，sanitize 仍可能删除 KaTeX 生成的部分 HTML 结构

**改进方案**:
扩展 sanitizeSchema 以支持 KaTeX 输出：

```typescript
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'div', 'span', 'summary', 'details', 'figure', 'figcaption', 'sup', 'sub',
    // KaTeX MathML elements
    'math', 'annotation', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'ms', 'mtext',
    'mspace', 'msqrt', 'mroot', 'mfrac', 'msub', 'msup', 'msubsup', 'munder',
    'mover', 'munderover', 'mtable', 'mtr', 'mtd', 'menclose', 'maction',
  ],
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    '*': [
      ...(defaultSchema.attributes?.['*'] ?? []),
      'className', 'class', 'style', 'aria-hidden',
    ],
    // KaTeX-specific attributes
    span: [...(defaultSchema.attributes?.span ?? []), 'aria-hidden'],
    math: ['xmlns', 'display'],
    annotation: ['encoding'],
    // ... other elements
  },
};
```

**涉及文件**:
- `@/components/chat/utils/markdown-renderer.tsx:62-105`

**预期收益**:
- 确保 KaTeX 生成的所有 HTML/MathML 元素被保留
- 保持安全性同时支持数学渲染

**工作量**: 小 (< 1hr)

---

### 问题 3: [MEDIUM] 缺少 LaTeX 分隔符预处理

**位置**: `@/components/chat/utils/markdown-renderer.tsx`

**严重程度**: MEDIUM

**描述**: 
AI 模型输出的 LaTeX 常使用 `\[...\]` 和 `\(...\)` 分隔符，但 `remark-math` 默认只支持 `$...$` 和 `$$...$$`。

**影响**: 
使用反斜杠分隔符的 LaTeX 公式无法被识别和渲染

**改进方案**:
添加预处理函数将反斜杠分隔符转换为美元符号分隔符：

```typescript
function preprocessLatex(content: string): string {
  // Convert \[...\] to $$...$$
  let processed = content.replace(/\\\[([\s\S]*?)\\\]/g, (_, eq) => `$$${eq}$$`);
  // Convert \(...\) to $...$
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, eq) => `$${eq}$`);
  return processed;
}
```

**涉及文件**:
- `@/components/chat/utils/markdown-renderer.tsx`

**预期收益**:
- 支持更多 LaTeX 分隔符格式
- 提高与 AI 输出的兼容性

**工作量**: 小 (< 30min)

---

### 问题 4: [LOW] KaTeX 渲染选项优化

**位置**: `@/components/chat/renderers/math-block.tsx:78-84`

**严重程度**: LOW

**描述**: 
当前 KaTeX 配置可以优化以提供更好的渲染效果和错误处理

**改进方案**:
```typescript
const katexOptions: KatexOptions = {
  displayMode: true,
  throwOnError: false,
  errorColor: '#cc0000',
  strict: 'warn',  // 而不是 false
  trust: true,
  output: 'htmlAndMathml',  // 添加 MathML 支持以提高可访问性
  macros: {
    // 添加常用宏
    '\\R': '\\mathbb{R}',
    '\\N': '\\mathbb{N}',
    '\\Z': '\\mathbb{Z}',
  },
};
```

**涉及文件**:
- `@/components/chat/renderers/math-block.tsx:78-84`
- `@/components/chat/renderers/math-inline.tsx:50-56`

**预期收益**:
- 更好的可访问性（MathML 输出）
- 更清晰的错误信息
- 支持常用数学宏

**工作量**: 小 (< 30min)

---

## 推荐行动

1. **[最优先]** 修复 rehype 插件顺序 - 这是根本原因
2. **[次优先]** 扩展 sanitizeSchema 支持 KaTeX 元素
3. **[可选]** 添加 LaTeX 分隔符预处理
4. **[可选]** 优化 KaTeX 渲染选项

## 快速优化 (高收益低成本)

- 修复插件顺序 (~10 行代码改动)
- 扩展 sanitize schema (~20 行代码改动)

## 总工作量估计

- 小型任务: 4 个 (~2 hr)
- **总计**: ~2 hr

## 现有库使用

项目已安装所需的所有库：
- `katex@0.16.27` - LaTeX 渲染引擎
- `remark-math@6.0.0` - Markdown 数学语法解析
- `rehype-katex@7.0.1` - KaTeX rehype 插件
- `rehype-sanitize@6.0.0` - HTML 消毒

**无需引入新依赖**，只需正确配置现有库。

---

## 相关文件

| 文件 | 作用 |
|------|------|
| `components/chat/utils/markdown-renderer.tsx` | Markdown 渲染器主文件 |
| `components/chat/renderers/math-block.tsx` | 块级数学渲染组件 |
| `components/chat/renderers/math-inline.tsx` | 行内数学渲染组件 |
| `app/globals.css` | KaTeX 样式定义 |
| `lib/latex/parser.ts` | LaTeX 解析器（编辑器用） |

---

*生成时间: 2026-01-29*
