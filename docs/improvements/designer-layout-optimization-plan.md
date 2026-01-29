# Designer 代码编辑器和预览布局优化计划

## 执行摘要

本文档分析了 Designer 模块的代码编辑器和预览功能的布局问题及操作逻辑，提出详细的优化方案。当前实现基于 Sandpack 和 Monaco Editor，采用可调整面板布局，但存在状态同步、响应式设计和用户体验等方面的问题。

## 模块依赖

- **入口页面**: `@/app/(main)/designer/page.tsx`
- **核心面板**: `@/components/designer/core/designer-panel.tsx`
- **编辑器**: `@/components/designer/editor/react-sandbox.tsx`
- **预览组件**: `@/components/designer/preview/designer-preview.tsx`
- **工具栏**: `@/components/designer/toolbar/designer-toolbar.tsx`
- **状态管理**: `@/stores/designer/designer-store.ts`
- **面板组件**: `@/components/designer/panels/` (element-tree, style-panel, etc.)
- **类型定义**: `@/types/designer/`

---

## 发现问题

- **HIGH**: 3 个
- **MEDIUM**: 5 个
- **LOW**: 3 个

---

## 问题详细列表

### 问题 1: Designer Page 与 DesignerPanel 状态不同步

**位置**: `@/app/(main)/designer/page.tsx:109-113` 和 `@/stores/designer/designer-store.ts`
**严重程度**: HIGH
**描述**: 
- Designer Page 使用本地 `useState` 管理 `showElementTree`, `showStylePanel`, `designerMode`, `viewport`
- DesignerPanel 组件使用 `useDesignerStore` 管理相同状态
- 两个组件的面板状态互相独立，导致不一致

**影响**: 
- 在独立页面和 Sheet 面板中打开 Designer 时，用户偏好设置丢失
- 切换模式时状态不同步

**改进方案**:
统一使用 `useDesignerStore` 管理所有面板状态，移除 Designer Page 中的本地状态：
```typescript
// page.tsx 应改为:
const showElementTree = useDesignerStore((state) => state.showElementTree);
const showStylePanel = useDesignerStore((state) => state.showStylePanel);
const mode = useDesignerStore((state) => state.mode);
const viewport = useDesignerStore((state) => state.viewport);
```

**涉及文件**:
- `@/app/(main)/designer/page.tsx:109-113`
- `@/stores/designer/designer-store.ts`

**工作量**: 小 (< 2hr)

---

### 问题 2: ReactSandbox 与 DesignerPreview 功能重叠

**位置**: 
- `@/components/designer/editor/react-sandbox.tsx`
- `@/components/designer/preview/designer-preview.tsx`

**严重程度**: HIGH
**描述**: 
- Designer Page 使用 `ReactSandbox` (Sandpack)
- DesignerPanel 使用 `DesignerPreview` (iframe blob URL)
- 两个组件实现了相似的预览功能，但机制不同
- ReactSandbox 缺少元素选择/交互功能
- DesignerPreview 缺少代码编辑功能

**影响**: 
- 用户在不同入口看到不同的预览体验
- Designer Page 无法进行可视化元素编辑

**改进方案**:
创建统一的 `DesignerWorkspace` 组件，整合编辑和预览功能：
1. 使用 Sandpack 作为底层运行时
2. 在 preview iframe 中注入元素选择脚本
3. 提供统一的 API 给两个入口使用

**涉及文件**:
- `@/components/designer/editor/react-sandbox.tsx`
- `@/components/designer/preview/designer-preview.tsx`
- 新建: `@/components/designer/core/designer-workspace.tsx`

**工作量**: 大 (> 8hr)

---

### 问题 3: 移动端响应式布局缺失

**位置**: `@/app/(main)/designer/page.tsx:570-651`
**严重程度**: HIGH
**描述**: 
- 当前布局强制使用水平分割面板
- 移动端屏幕宽度不足以显示多个面板
- 没有堆叠式布局或切换机制

**影响**: 
- 移动端用户无法有效使用 Designer
- 面板内容被压缩导致不可用

**改进方案**:
1. 添加响应式断点检测 (使用 `useMediaQuery` hook)
2. 小屏幕时切换为标签页模式而非并排面板
3. 优先显示预览，代码/样式作为 overlay 或 bottom sheet

```typescript
// 响应式布局示例
const isMobile = useMediaQuery('(max-width: 768px)');

{isMobile ? (
  <Tabs defaultValue="preview">
    <TabsList>
      <TabsTrigger value="preview">Preview</TabsTrigger>
      <TabsTrigger value="code">Code</TabsTrigger>
      <TabsTrigger value="styles">Styles</TabsTrigger>
    </TabsList>
    {/* Tab contents */}
  </Tabs>
) : (
  <ResizablePanelGroup direction="horizontal">
    {/* Current layout */}
  </ResizablePanelGroup>
)}
```

**涉及文件**:
- `@/app/(main)/designer/page.tsx:567-651`
- `@/components/designer/core/designer-panel.tsx:286-421`

**工作量**: 中 (2-8hr)

---

### 问题 4: 代码变更未正确添加到历史

**位置**: `@/app/(main)/designer/page.tsx:244-248`
**严重程度**: MEDIUM
**描述**: 
- `handleCodeChange` 只是设置代码，没有添加到历史记录
- 注释说 "Debounce history updates for manual edits" 但未实现
- AI 编辑正确添加历史，但手动编辑没有

**影响**: 
- 用户手动编辑代码后，无法正确使用 Undo/Redo
- 历史记录不完整

**改进方案**:
实现防抖历史记录：
```typescript
const debouncedAddToHistory = useDebouncedCallback((newCode: string) => {
  addToHistory(newCode);
}, 1000);

const handleCodeChange = useCallback((newCode: string) => {
  setCode(newCode);
  debouncedAddToHistory(newCode);
}, []);
```

**涉及文件**:
- `@/app/(main)/designer/page.tsx:244-248`

**工作量**: 小 (< 2hr)

---

### 问题 5: 面板默认尺寸配置混乱

**位置**: 
- `@/app/(main)/designer/page.tsx:574,595,610,633`
- `@/components/designer/core/designer-panel.tsx:312,348,370,397,407`

**严重程度**: MEDIUM
**描述**: 
- 面板默认尺寸在多处硬编码，不一致
- Page: Element Tree 18%, Style Panel 22%, History 18%
- Panel: Element Tree 20%, Preview 55%/80%, Style Panel 25%, History 20%
- 没有持久化用户调整的面板尺寸

**影响**: 
- 不同入口体验不一致
- 用户每次打开都需要重新调整面板大小

**改进方案**:
1. 在 designer-store 中定义默认布局配置
2. 使用 localStorage 持久化用户调整后的尺寸
3. 参考 react-resizable-panels 的 `onLayout` callback 示例

```typescript
// designer-store.ts
interface PanelLayout {
  elementTreeSize: number;
  previewSize: number;
  stylePanelSize: number;
  historyPanelSize: number;
}

const DEFAULT_LAYOUT: PanelLayout = {
  elementTreeSize: 20,
  previewSize: 55,
  stylePanelSize: 25,
  historyPanelSize: 20,
};
```

**涉及文件**:
- `@/stores/designer/designer-store.ts`
- `@/app/(main)/designer/page.tsx`
- `@/components/designer/core/designer-panel.tsx`

**工作量**: 中 (2-8hr)

---

### 问题 6: Mode/Viewport 控件在 Page 和 Panel 重复

**位置**: 
- `@/app/(main)/designer/page.tsx:407-504` (header 中的模式/视口控件)
- `@/components/designer/toolbar/designer-toolbar.tsx:125-172` (工具栏中的相同控件)

**严重程度**: MEDIUM
**描述**: 
- Designer Page 在 header 中实现了模式切换和视口控件
- DesignerToolbar 也实现了相同的控件
- Page 使用本地状态，Toolbar 使用 store 状态

**影响**: 
- 代码重复，维护困难
- 两处控件样式和行为可能不一致

**改进方案**:
1. 将通用控件提取为独立组件 (如 `ModeSwitch`, `ViewportControls`)
2. Designer Page 直接使用 DesignerToolbar 而不是自行实现
3. 或创建 `DesignerHeader` 组件供两处使用

**涉及文件**:
- `@/app/(main)/designer/page.tsx:277-506`
- `@/components/designer/toolbar/designer-toolbar.tsx`
- 新建: `@/components/designer/toolbar/mode-switch.tsx`
- 新建: `@/components/designer/toolbar/viewport-controls.tsx`

**工作量**: 中 (2-8hr)

---

### 问题 7: Preview iframe 没有防抖更新

**位置**: `@/components/designer/preview/designer-preview.tsx:398-438`
**严重程度**: MEDIUM
**描述**: 
- 每次代码变更都会创建新的 blob URL 并设置 iframe.src
- 没有防抖机制，输入时可能频繁刷新
- 可能导致性能问题和闪烁

**影响**: 
- 用户输入时预览频繁刷新
- 浏览器内存压力 (blob URL 可能未及时释放)

**改进方案**:
使用 `useDeferredValue` 或手动防抖：
```typescript
const deferredCode = useDeferredValue(code);

useEffect(() => {
  // 使用 deferredCode 而不是 code
  const wrappedCode = wrapCodeForPreview(deferredCode, isDarkMode);
  // ...
}, [deferredCode, isDarkMode]);
```

**涉及文件**:
- `@/components/designer/preview/designer-preview.tsx:398-438`

**工作量**: 小 (< 2hr)

---

### 问题 8: StylePanel 缺少折叠状态持久化

**位置**: `@/components/designer/panels/style-panel.tsx:233`
**严重程度**: MEDIUM
**描述**: 
- Accordion 默认值只展开 `['layout']`
- 用户展开的其他分类在切换元素后会重置
- 没有记住用户的展开偏好

**影响**: 
- 每次选择新元素都需要重新展开常用的样式分类

**改进方案**:
在 store 中保存展开的分类：
```typescript
// designer-store.ts
expandedStyleCategories: string[];
setExpandedStyleCategories: (categories: string[]) => void;
```

**涉及文件**:
- `@/components/designer/panels/style-panel.tsx:233`
- `@/stores/designer/designer-store.ts`

**工作量**: 小 (< 2hr)

---

### 问题 9: 元素选择与代码定位未关联

**位置**: 
- `@/components/designer/panels/element-tree.tsx`
- `@/components/designer/editor/react-sandbox.tsx`

**严重程度**: LOW
**描述**: 
- 在 ElementTree 中选择元素不会在代码编辑器中高亮对应代码
- 没有 "双击跳转到代码" 功能
- 缺少代码与可视元素的双向导航

**影响**: 
- 用户难以理解视觉元素与代码的对应关系

**改进方案**:
1. 解析代码时记录每个元素的行号范围
2. 选择元素时在编辑器中滚动到对应位置并高亮
3. 添加 Monaco decoration 来标记选中元素的代码

**涉及文件**:
- `@/stores/designer/designer-store.ts`
- `@/components/designer/editor/monaco-sandpack-editor.tsx`
- `@/components/designer/panels/element-tree.tsx`

**工作量**: 大 (> 8hr)

---

### 问题 10: 拖放组件插入代码位置不准确

**位置**: `@/components/designer/preview/designer-preview.tsx:365-389`
**严重程度**: LOW
**描述**: 
- 组件拖放后使用正则替换插入代码
- 正则 `data-element-id` 匹配可能失败
- 没有考虑嵌套结构和缩进

**影响**: 
- 拖放组件可能插入到错误位置
- 生成的代码格式不正确

**改进方案**:
使用 AST 解析替代正则：
```typescript
import { parse } from '@babel/parser';
import generate from '@babel/generator';
import traverse from '@babel/traverse';

// 使用 AST 定位并插入新节点
```

**涉及文件**:
- `@/components/designer/preview/designer-preview.tsx:365-389`
- `@/stores/designer/designer-store.ts` (代码解析逻辑)

**工作量**: 大 (> 8hr)

---

### 问题 11: 缺少键盘快捷键文档

**位置**: 全局
**严重程度**: LOW
**描述**: 
- 支持 Ctrl+Z/Y 撤销重做，但没有提示用户
- 缺少快捷键帮助面板
- 没有其他常用快捷键 (如 Ctrl+S 保存)

**影响**: 
- 用户无法发现和使用快捷键
- 生产力降低

**改进方案**:
1. 添加快捷键帮助按钮和弹窗
2. 在 Tooltip 中显示快捷键 (已部分实现)
3. 添加更多快捷键：Ctrl+E 切换编辑器/预览，Ctrl+B 切换侧边栏

**涉及文件**:
- `@/components/designer/toolbar/designer-toolbar.tsx`
- `@/components/designer/core/designer-panel.tsx`
- 新建: `@/components/designer/toolbar/keyboard-shortcuts-dialog.tsx`

**工作量**: 小 (< 2hr)

---

## 推荐行动

### 优先级 1 - 快速优化 (高收益低成本)

1. **统一状态管理** - 修改 page.tsx 使用 store 状态
2. **添加代码变更防抖** - 实现防抖历史记录
3. **添加预览防抖** - 使用 useDeferredValue
4. **持久化样式面板折叠状态**

### 优先级 2 - 中期改进

5. **响应式布局** - 添加移动端 Tab 布局
6. **面板尺寸持久化** - 保存用户调整的布局
7. **重构重复控件** - 提取为共享组件

### 优先级 3 - 长期重构

8. **统一预览组件** - 创建 DesignerWorkspace
9. **代码-元素双向导航** - 实现点击跳转
10. **AST 代码操作** - 替换正则为 AST

---

## 总工作量估计

- 小型任务: 5 个 (~8 hr)
- 中型任务: 3 个 (~15 hr)
- 大型任务: 3 个 (~30 hr)
- **总计**: ~53 hr

---

## 快速启动建议

建议首先完成以下改动，可以在 4 小时内显著提升用户体验：

1. 修改 `page.tsx` 使用 `useDesignerStore` 管理面板状态
2. 在 `handleCodeChange` 中添加防抖历史记录
3. 在 `designer-preview.tsx` 中使用 `useDeferredValue`

这三项改动互相独立，可以并行实施，且不会影响现有功能。

---

## 新增: 多方法元素定位系统

### 概述

为解决问题 9（元素选择与代码定位未关联）和问题 10（拖放组件插入代码位置不准确），实现了全新的多方法定位系统。

### 核心模块

**文件位置**: `@/lib/designer/element-locator.ts`

### 定位模式

| 模式 | 用途 | 方法 | 速度 | 精度 |
|------|------|------|------|------|
| **Rough (粗略)** | 实时交互、拖放 | `getBoundingClientRect` | 快 | 中 |
| **Precise (精确)** | 代码操作、AI编辑 | AST + Pattern | 慢 | 高 |

### 定位方法组合

```
┌─────────────────────────────────────────────────────────┐
│                    元素定位请求                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  模式选择: rough (快速) / precise (精确)                 │
└─────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌────────────┐   ┌────────────┐   ┌────────────┐
   │  Visual    │   │    AST     │   │  Pattern   │
   │ 视觉定位   │   │  语法树    │   │  模式匹配  │
   └────────────┘   └────────────┘   └────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│          Combined (组合) - 置信度加权                    │
└─────────────────────────────────────────────────────────┘
```

### API 接口

#### 1. 视觉定位 (Rough Mode)

```typescript
import { getVisualBounds, calculateDropPosition } from '@/lib/designer';

// 获取元素视觉边界
const bounds = getVisualBounds(element, containerRect);

// 计算拖放位置
const position = calculateDropPosition(mouseY, bounds, {
  edgeZone: 0.25,           // 边缘区域比例
  enableChildPositions: true // 启用 first-child/last-child
});
```

#### 2. AST 定位 (Precise Mode)

```typescript
import { parseCodeToAst, findElementInAst } from '@/lib/designer';

// 解析代码为 AST
const ast = await parseCodeToAst(code);

// 查找元素源码位置
const sourceLocation = findElementInAst(ast, elementId, code);
// 返回: { startLine, endLine, startColumn, endColumn, startOffset, endOffset }
```

#### 3. 组合定位

```typescript
import { getElementLocation, getInsertionPoint } from '@/lib/designer';

// 获取完整元素定位信息
const location = await getElementLocation(code, elementId, visualBounds, 'precise');
// 返回: { elementId, tagName, className, visual, source, confidence, method }

// 获取代码插入点
const insertPoint = await getInsertionPoint(code, targetElementId, 'inside');
// 返回: { line, column, offset, indentation, position, targetElementId }
```

#### 4. 模型输出优化

```typescript
import { optimizeForModelOutput, generateCompactTree } from '@/lib/designer';

// 优化单个位置数据
const optimized = optimizeForModelOutput(location);
// 输出: { ref: "el-1@L5-10", tag: "div", cls: "container", box: [10,20,200,100], conf: 95 }

// 生成紧凑元素树
const tree = generateCompactTree(elements, 3);
// 输出:
// div.container[L1-5]
// ├─p.text[L2-2]
// └─img[L3]
```

### 类型定义

```typescript
// 定位模式
type PositioningMode = 'rough' | 'precise';

// 拖放位置
type DropPosition = 'before' | 'after' | 'inside' | 'first-child' | 'last-child';

// 源码位置
interface SourceLocation {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  startOffset?: number;
  endOffset?: number;
}

// 完整元素定位
interface ElementLocation {
  elementId: string;
  tagName: string;
  className?: string;
  visual: VisualBounds | null;
  source: SourceLocation | null;
  confidence: number;          // 0-1
  method: 'ast' | 'visual' | 'pattern' | 'combined';
  parentId: string | null;
  childIds: string[];
}

// 插入点
interface InsertionPoint {
  line: number;
  column: number;
  offset: number;
  indentation: string;
  position: DropPosition;
  targetElementId: string | null;
}

// 优化后的模型输出
interface OptimizedElementLocation {
  ref: string;                 // "el-1@L5-10"
  tag: string;                 // "div"
  cls?: string;                // "container"
  box?: [number, number, number, number]; // [top, left, width, height]
  src?: [number, number];      // [startLine, endLine]
  conf: number;                // 0-100
}
```

### 置信度评分

| 方法 | 置信度 | 说明 |
|------|--------|------|
| AST | 0.95 | Babel 解析成功 |
| Combined | 0.95-1.0 | AST + Visual |
| Pattern | 0.70 | 正则匹配成功 |
| Visual | 0.50 | 仅视觉边界 |

### 缓存机制

- AST 解析结果自动缓存
- 基于代码哈希的 LRU 缓存
- 最大缓存 100 个条目
- 可手动清除: `clearAstCache()`

### 迁移指南

#### 现有代码更新

1. **selection-overlay.tsx** 中的 `getElementBounds`:
```typescript
// 旧方式
const bounds = getElementBounds(elementId);

// 新方式
import { getIframeElementBounds } from '@/lib/designer';
const bounds = getIframeElementBounds(iframe, elementId, containerRect);
```

2. **use-designer-drag-drop.ts** 中的 `getDropPosition`:
```typescript
// 旧方式
const position = y < height * 0.25 ? 'before' : y > height * 0.75 ? 'after' : 'inside';

// 新方式
import { calculateDropPosition } from '@/lib/designer';
const position = calculateDropPosition(y, rect, { edgeZone: 0.25 });
```

3. **designer-preview.tsx** 中的代码插入:
```typescript
// 旧方式 (正则替换)
const newCode = code.replace(
  new RegExp(`(<[^>]*data-element-id="${targetId}"[^>]*>)([\\s\\S]*?)(</[^>]+>)`),
  `$1$2\n${droppedCode}\n$3`
);

// 新方式 (AST 定位)
import { getInsertionPoint } from '@/lib/designer';
const point = await getInsertionPoint(code, targetId, 'inside');
const newCode = insertCodeAtPoint(code, droppedCode, point);
```

### 测试覆盖

- `lib/designer/element-locator.test.ts` 包含完整测试
- 覆盖所有定位方法
- 边界条件测试
- 模型输出格式验证

### 工作量变化

原问题 9 和 10 的工作量估计已更新:

| 问题 | 原工作量 | 新工作量 | 原因 |
|------|----------|----------|------|
| 问题 9 | 大 (>8hr) | 中 (2-8hr) | 基础设施已就绪 |
| 问题 10 | 大 (>8hr) | 中 (2-8hr) | AST 定位可复用 |

**新增总工作量**: 约 8hr (已完成)
