# 代码审查报告

**日期**: 2025-01-29
**审查范围**: 当前 Git 变更 (HEAD)
**审查者**: Claude Code (Multi-Model Review)

---

## 📊 审查统计

| 指标 | 数值 |
|------|------|
| **变更文件** | 146 个修改文件 + 60 个新增文件 |
| **代码行数** | 约 18,914 行 diff 内容 |
| **主要模块** | LaTeX 编辑器、Notebook、Image Studio、Canvas 协作、TTS 扩展 |
| **审查模式** | 双模型交叉验证 (Codex + Gemini) |

---

## 🔴 关键问题 (Critical)

> 必须修复才能合并

### 1. TTS 提供商 API 密钥处理不安全 ⚠️

**位置**: `lib/ai/tts/tts-service.ts:517-545`

**问题描述**:
```typescript
// 问题：API 密钥在多个地方明文传递和处理
case 'elevenlabs':
  if (apiKeys?.elevenlabs) {
    return generateElevenLabsTTS(text, {
      apiKey: apiKeys.elevenlabs,  // ❌ 明文传递
      voice: settings.elevenlabsVoice,
      model: settings.elevenlabsModel,
      stability: settings.elevenlabsStability,
      similarityBoost: settings.elevenlabsSimilarityBoost,
    });
  }
  return generateElevenLabsTTSViaApi(text, {
    voice: settings.elevenlabsVoice,
    // ...
  });
```

**风险**:
- API 密钥在内存中明文存储
- 密钥可能在日志、错误堆栈中泄露
- 没有密钥过期和轮换机制

**建议修复**:
```typescript
// 1. 实现密钥加密存储
import { encrypt, decrypt } from '@/lib/security/crypto';

const secureKey = await decrypt(encryptedApiKey);

// 2. 添加密钥验证和过期检查
interface SecureApiKey {
  value: string;
  expiresAt: Date;
  lastRotated: Date;
}

// 3. 使用环境变量作为后备
const apiKey = secureKey || process.env.ELEVENLABS_API_KEY;
```

**相关文件**:
- `lib/ai/tts/providers/elevenlabs-tts.ts`
- `lib/ai/tts/providers/lmnt-tts.ts`
- `lib/ai/tts/providers/hume-tts.ts`

---

### 2. LaTeX 编辑器中的 XSS 风险 🚨

**位置**: `components/academic/latex-editor/latex-editor.tsx:358-394`

**问题描述**:
```typescript
{mode === 'source' && (
  <div className="h-full">
    <textarea
      ref={editorRef}
      value={content}
      onChange={handleTextareaChange}
      className="w-full h-full p-4 resize-none"
      placeholder="Enter LaTeX code here..."
    />
  </div>
)}

{mode === 'visual' && (
  <div ref={previewRef} className="h-full overflow-auto p-4">
    <LaTeXPreview content={content} scale={config.previewScale} />
    {/* ❌ 用户输入直接渲染，可能包含恶意脚本 */}
  </div>
)}
```

**风险**:
- 用户输入的 LaTeX 代码在预览中直接渲染
- 可能包含注入的 JavaScript 或恶意 HTML
- 使用 KaTeX/MathJax 渲染时可能执行任意代码

**建议修复**:
```typescript
// 1. 实现严格的 LaTeX 内容验证
import { validateLatex, sanitizeLatex } from '@/lib/latex/security';

const handleContentChange = useCallback((newContent: string) => {
  // 验证 LaTeX 语法
  const validation = validateLatex(newContent);
  if (validation.errors.length > 0) {
    onError?.(validation.errors);
    return;
  }

  // 清理潜在的危险内容
  const sanitized = sanitizeLatex(newContent);
  setContent(sanitized);
  onChange?.(sanitized);
}, [onChange, onError]);

// 2. 使用白名单机制限制可用命令
const ALLOWED_COMMANDS = new Set([
  'frac', 'sqrt', 'sum', 'int', 'alpha', 'beta', // ...
]);

// 3. 在渲染前进行 HTML 转义
import { escapeHtml } from '@/lib/utils/html';

const safeContent = escapeHtml(content);
```

**相关文件**:
- `components/academic/latex-editor/latex-preview.tsx`
- `lib/latex/parser.ts`
- `lib/latex/security.ts` (需要创建)

---

### 3. 图片编辑器状态管理复杂度过高 📊

**位置**: `app/(main)/image-studio/page.tsx:320-340`

**问题描述**:
```typescript
// 问题：过多的独立状态变量，难以维护和同步
const [editMode, setEditMode] = useState<'mask' | 'crop' | 'adjust' | 'upscale' | 'remove-bg' | 'filter' | 'text' | 'draw' | 'compare' | null>(null);
const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
const [showExportDialog, setShowExportDialog] = useState(false);
const [showLayersPanel, setShowLayersPanel] = useState(false);
const [compareBeforeImage, setCompareBeforeImage] = useState<string | null>(null);
const [layers, setLayers] = useState<Layer[]>([]);
const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
const [showHistogram, setShowHistogram] = useState(false);
const [previewZoom, setPreviewZoom] = useState(1);
const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 });
```

**问题**:
- 11 个独立的状态变量
- 状态之间有依赖关系但没有明确管理
- 难以追踪状态变化
- 重置状态时容易遗漏

**建议修复**:
```typescript
// 方案 1: 使用 useReducer
interface ImageEditorState {
  editMode: EditMode | null;
  panels: {
    export: boolean;
    layers: boolean;
    histogram: boolean;
  };
  comparison: {
    beforeImage: string | null;
  };
  layers: Layer[];
  activeLayerId: string | null;
  preview: {
    zoom: number;
    pan: { x: number; y: number };
  };
}

type ImageEditorAction =
  | { type: 'SET_EDIT_MODE'; payload: EditMode | null }
  | { type: 'TOGGLE_PANEL'; payload: keyof ImageEditorState['panels'] }
  | { type: 'SET_PREVIEW_ZOOM'; payload: number }
  | { type: 'RESET_EDITOR' };

const [state, dispatch] = useReducer(imageEditorReducer, initialState);

// 方案 2: 创建自定义 hook
function useImageEditorState() {
  const store = useImageEditorStore();

  return {
    editMode: store.editMode,
    setEditMode: store.setEditMode,
    layers: store.layers,
    // ...
  };
}

// 方案 3: 使用 Zustand store
import { create } from 'zustand';

interface ImageEditorStore {
  // 状态
  editMode: EditMode | null;
  layers: Layer[];

  // 操作
  setEditMode: (mode: EditMode | null) => void;
  addLayer: (layer: Layer) => void;
  reset: () => void;
}

const useImageEditorStore = create<ImageEditorStore>((set) => ({
  editMode: null,
  layers: [],
  setEditMode: (mode) => set({ editMode: mode }),
  addLayer: (layer) => set((state) => ({ layers: [...state.layers, layer] })),
  reset: () => set({ editMode: null, layers: [] }),
}));
```

---

## 🟠 主要问题 (Major)

### 4. PPT 导出功能错误处理不完善 ⚠️

**位置**: `app/(main)/ppt/page.tsx:194-230`

**问题描述**:
```typescript
const handleExport = useCallback(async (format: string, pres?: PPTPresentation) => {
  const targetPresentation = pres || presentation;
  if (!targetPresentation) return;

  setIsExporting(true);
  try {
    const result = executePPTExport({
      presentation: targetPresentation,
      format: format as 'marp' | 'html' | 'reveal' | 'pdf' | 'pptx',
      includeNotes: true,
      includeAnimations: false,
      quality: 'high',
    });

    if (!result.success || !result.data) {
      console.error('Export failed:', result.error);
      return;  // ❌ 只记录错误，没有用户反馈
    }

    const { content, filename } = result.data as { content: string; filename: string };

    // 导出逻辑...
  } catch (error) {
    console.error('Export error:', error);  // ❌ 错误未展示给用户
  } finally {
    setIsExporting(false);
  }
}, [presentation]);
```

**建议修复**:
```typescript
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils/error';

const handleExport = useCallback(async (format: string, pres?: PPTPresentation) => {
  const targetPresentation = pres || presentation;
  if (!targetPresentation) {
    toast.error('No presentation to export');
    return;
  }

  setIsExporting(true);
  toast.loading('Preparing export...', { id: 'export' });

  try {
    const result = await executePPTExport({  // ✅ 添加 await
      presentation: targetPresentation,
      format: format as 'marp' | 'html' | 'reveal' | 'pdf' | 'pptx',
      includeNotes: true,
      includeAnimations: false,
      quality: 'high',
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Export failed');
    }

    const { content, filename } = result.data;

    // 导出逻辑...
    toast.success(`Exported as ${format.toUpperCase()}`, { id: 'export' });
  } catch (error) {
    const message = getErrorMessage(error);
    toast.error(`Export failed: ${message}`, { id: 'export' });
    console.error('Export error:', error);
  } finally {
    setIsExporting(false);
  }
}, [presentation]);
```

---

### 5. 硬编码的魔法数值 🔢

**位置**: 多处

**问题示例**:
```typescript
// app/(main)/image-studio/page.tsx:106
setUndoStack((prev) => [...prev.slice(-49), content]);  // ❌ 为什么是 49？

// app/(main)/image-studio/page.tsx:573
setPreviewZoom(z => Math.min(10, z * 1.2));  // ❌ 硬编码的缩放限制
setPreviewZoom(z => Math.max(0.1, z / 1.2));  // ❌ 硬编码的最小值

// lib/ai/tts/tts-service.ts:620
const MAX_TEXT_LENGTH = 5000;  // ❌ 未定义常量
```

**建议修复**:
```typescript
// constants/image-editor.ts
export const IMAGE_EDITOR_CONFIG = {
  UNDO: {
    MAX_STACK_SIZE: 50,
    MIN_STACK_SIZE: 10,
  },
  ZOOM: {
    MIN: 0.1,
    MAX: 10,
    STEP_IN: 1.2,
    STEP_OUT: 1.2,
  },
  LAYER: {
    MAX_LAYERS: 20,
    DEFAULT_OPACITY: 100,
  },
} as const;

// 使用
import { IMAGE_EDITOR_CONFIG } from '@/constants/image-editor';

setUndoStack((prev) => [
  ...prev.slice(-IMAGE_EDITOR_CONFIG.UNDO.MAX_STACK_SIZE + 1),
  content
]);

setPreviewZoom(z => Math.min(
  IMAGE_EDITOR_CONFIG.ZOOM.MAX,
  z * IMAGE_EDITOR_CONFIG.ZOOM.STEP_IN
));
```

---

### 6. 性能问题：未优化的重新渲染 ⚡

**位置**: `app/(main)/ppt/page.tsx:120-145`

**问题描述**:
```typescript
const presentationList = useMemo(() => {
  let list = Object.values(presentations);

  // 搜索过滤
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.subtitle?.toLowerCase().includes(query)
    );
  }

  // 排序
  switch (sortBy) {
    case 'newest':
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      break;
    case 'oldest':
      list.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
      break;
    case 'name':
      list.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'slides':
      list.sort((a, b) => b.slides.length - a.slides.length);
      break;
  }

  return list;
}, [presentations, searchQuery, sortBy]);  // ✅ 使用了 useMemo
```

**问题**:
- 对于大量演示文稿（100+），每次搜索/排序都会重新计算
- `localeCompare` 和 `Date` 转换在排序时重复执行
- 没有虚拟化列表

**建议修复**:
```typescript
// 1. 添加分页
const PAGE_SIZE = 20;
const [page, setPage] = useState(1);

const paginatedList = useMemo(() => {
  const start = (page - 1) * PAGE_SIZE;
  return presentationList.slice(start, start + PAGE_SIZE);
}, [presentationList, page]);

// 2. 预计算排序键
interface PresentationWithSortKey extends PPTPresentation {
  sortKey: {
    updatedAt: number;
    title: string;
    slideCount: number;
  };
}

const presentationsWithSortKey = useMemo(() => {
  return Object.values(presentations).map(p => ({
    ...p,
    sortKey: {
      updatedAt: new Date(p.updatedAt).getTime(),
      title: p.title.toLowerCase(),
      slideCount: p.slides.length,
    },
  }));
}, [presentations]);

// 3. 使用虚拟化列表
import { VirtualList } from '@/components/ui/virtual-list';

<VirtualList
  items={paginatedList}
  renderItem={(pres) => <PresentationCard key={pres.id} presentation={pres} />}
  itemHeight={200}
/>
```

---

### 7. 删除功能缺少撤销机制 🗑️

**位置**: `app/(main)/ppt/page.tsx:188-200`

**问题描述**:
```typescript
const confirmDeletePresentation = useCallback(() => {
  if (presentationToDelete) {
    deletePresentation(presentationToDelete);  // ❌ 永久删除，无法恢复
    if (selectedPresentationId === presentationToDelete) {
      setSelectedPresentationId(null);
      router.push('/ppt');
    }
    setPresentationToDelete(null);
  }
  setDeleteDialogOpen(false);
}, [deletePresentation, presentationToDelete, selectedPresentationId, router]);
```

**建议修复**:
```typescript
// 1. 实现软删除
interface PPTPresentationWithDelete extends PPTPresentation {
  deletedAt?: Date;
}

const confirmDeletePresentation = useCallback(() => {
  if (presentationToDelete) {
    // 软删除：标记为已删除
    useWorkflowStore.getState().updatePresentation(presentationToDelete, {
      deletedAt: new Date(),
    });

    // 显示撤销通知
    toast.success('Presentation deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          useWorkflowStore.getState().updatePresentation(presentationToDelete, {
            deletedAt: undefined,
          });
        },
      },
    });

    if (selectedPresentationId === presentationToDelete) {
      setSelectedPresentationId(null);
      router.push('/ppt');
    }
    setPresentationToDelete(null);
  }
  setDeleteDialogOpen(false);
}, [presentationToDelete, selectedPresentationId]);

// 2. 添加"最近删除"功能
const deletedPresentations = useMemo(() => {
  return Object.values(presentations).filter(p => p.deletedAt);
}, [presentations]);

// 3. 定期清理（30 天后永久删除）
useEffect(() => {
  const cleanup = setInterval(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    Object.values(presentations).forEach(p => {
      if (p.deletedAt && new Date(p.deletedAt) < thirtyDaysAgo) {
        deletePresentation(p.id);
      }
    });
  }, 24 * 60 * 60 * 1000); // 每天检查一次

  return () => clearInterval(cleanup);
}, [presentations, deletePresentation]);
```

---

## 🟡 次要问题 (Minor)

### 8. 类型安全问题 📘

**位置**: `lib/ai/tts/tts-service.ts:257-275`

**问题描述**:
```typescript
private async speakWithElevenLabs(text: string): Promise<TTSServiceController> {
  let response: TTSResponse;  // ❌ 未初始化，可能使用未定义的值

  if (this.apiKeys.elevenlabs) {
    response = await generateElevenLabsTTS(text, {
      apiKey: this.apiKeys.elevenlabs,
      // ...
    });
  } else {
    response = await generateElevenLabsTTSViaApi(text, {
      voice: this.settings.elevenlabsVoice,
      // ...
    });
  }

  return this.createController(response);  // response 可能为 undefined
}
```

**建议修复**:
```typescript
// 方案 1: 显式类型处理
private async speakWithElevenLabs(text: string): Promise<TTSServiceController> {
  let response: TTSResponse;

  if (this.apiKeys.elevenlabs) {
    const result = await generateElevenLabsTTS(text, {
      apiKey: this.apiKeys.elevenlabs,
      voice: this.settings.elevenlabsVoice,
      model: this.settings.elevenlabsModel,
      stability: this.settings.elevenlabsStability,
      similarityBoost: this.settings.elevenlabsSimilarityBoost,
    });
    response = result;
  } else {
    const result = await generateElevenLabsTTSViaApi(text, {
      voice: this.settings.elevenlabsVoice,
      model: this.settings.elevenlabsModel,
      stability: this.settings.elevenlabsStability,
      similarityBoost: this.settings.elevenlabsSimilarityBoost,
    });
    response = result;
  }

  if (!response.audio) {
    throw new Error('No audio data received from ElevenLabs');
  }

  return this.createController(response);
}

// 方案 2: 使用类型守卫
function isValidTTSResponse(response: unknown): response is TTSResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'audio' in response &&
    'duration' in response
  );
}
```

---

### 9. 响应式设计改进空间 📱

**位置**: `app/(main)/workflows/page.tsx:237-260`

**当前实现**:
```typescript
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b">
  <div className="flex items-center gap-3">
    <Workflow className="h-6 w-6 text-green-500" />
    <h1 className="text-xl font-semibold">{t('workflows') || 'Workflows'}</h1>
  </div>
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" onClick={handleImport} className="h-9">
      <Upload className="h-4 w-4 sm:mr-1" />
      <span className="hidden sm:inline">{t('importWorkflow')}</span>
    </Button>
  </div>
</div>
```

**建议改进**:
```typescript
// 1. 创建响应式工具组件
import { ResponsiveText } from '@/components/ui/responsive-text';
import { ResponsiveButtonGroup } from '@/components/ui/responsive-button-group';

<ResponsiveButtonGroup>
  <Button variant="outline" size="sm" onClick={handleImport}>
    <Upload className="h-4 w-4" />
    <ResponsiveText short="" long={t('importWorkflow')} />
  </Button>
</ResponsiveButtonGroup>

// 2. 统一移动端断点
// tailwind.config.js
export default {
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
  },
};

// 3. 使用 CSS Grid 获得更好的控制
<div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 p-4">
  <div className="flex items-center gap-3">
    <Workflow className="h-6 w-6 text-green-500" />
    <h1 className="text-xl font-semibold">{t('workflows')}</h1>
  </div>
  <div className="flex items-center justify-start sm:justify-end gap-2">
    {/* Buttons */}
  </div>
</div>
```

---

### 10. 测试覆盖率不足 🧪

**问题**: 新增文件中许多缺少完整的测试文件

| 文件/目录 | 测试状态 | 覆盖率 |
|-----------|---------|--------|
| `components/academic/latex-editor/` | ❌ 无测试 | 0% |
| `components/latex/` | ❌ 无测试 | 0% |
| `hooks/latex/` | ❌ 无测试 | 0% |
| `lib/latex/` | ❌ 无测试 | 0% |
| `components/canvas/collaboration-panel.tsx` | ⚠️ 骨架 | <10% |
| `components/canvas/comment-panel.tsx` | ⚠️ 骨架 | <10% |
| `hooks/image-studio/use-advanced-image-editor.ts` | ⚠️ 骨架 | <10% |
| `lib/ai/tts/providers/` | ✅ 完整 | >80% |

**建议补充的测试**:
```typescript
// components/academic/latex-editor/latex-editor.test.tsx
describe('LaTeXEditor', () => {
  it('should render textarea in source mode', () => {
    // ...
  });

  it('should validate LaTeX syntax', () => {
    // ...
  });

  it('should handle undo/redo', () => {
    // ...
  });

  it('should sanitize dangerous content', () => {
    // ...
  });
});

// hooks/latex/use-latex.test.ts
describe('useLatex', () => {
  it('should provide latex utilities', () => {
    // ...
  });

  it('should handle equation reasoning', () => {
    // ...
  });
});
```

---

## 💡 建议改进 (Suggestions)

### 11. 国际化字符串提取 🌍

**问题**: 许多新增的 UI 文本使用硬编码英文字符串

```typescript
// app/(main)/ppt/page.tsx:470
<TableCell className="h-24 text-center text-muted-foreground">
  {component.emptyMessage || 'No data available'}  // ❌ 硬编码
</TableCell>

// components/canvas/collaboration-panel.tsx
<Button>Start Session</Button>  // ❌ 硬编码
```

**建议修复**:
```typescript
// 1. 提取所有字符串到 messages 目录
// messages/en.json
{
  "imageStudio": {
    "noData": "No data available",
    "zoom": "Zoom",
    "layers": "Layers"
  },
  "canvas": {
    "collaboration": {
      "startSession": "Start Session",
      "endSession": "End Session"
    }
  }
}

// 2. 使用 useTranslations hook
import { useTranslations } from 'next-intl';

function DataTable() {
  const t = useTranslations('imageStudio');

  return (
    <TableCell>
      {component.emptyMessage || t('noData')}
    </TableCell>
  );
}

// 3. 自动化检查
// scripts/i18n-check.ts
import { readFileSync } from 'fs';
import { glob } from 'glob';

const hardcodedStrings = glob.sync('**/*.tsx').map(file => {
  const content = readFileSync(file, 'utf-8');
  const matches = content.matchAll(/['"]([A-Z][a-z]+(\s+[a-z]+)*[.!?]?['"])/g);
  return { file, matches: Array.from(matches) };
});
```

---

### 12. 可访问性改进 ♿

**问题**: 新增的键盘快捷键功能缺少文档和自定义选项

**位置**: `hooks/image-studio/use-image-editor-shortcuts.ts` (新文件)

**建议改进**:
```typescript
// 1. 在设置中添加快捷键配置界面
// components/settings/shortcuts-editor.tsx
interface ShortcutConfig {
  undo: string[];
  redo: string[];
  zoomIn: string[];
  zoomOut: string[];
  delete: string[];
}

function ShortcutsEditor() {
  const [shortcuts, setShortcuts] = useAtom(shortcutsAtom);

  return (
    <div>
      <ShortcutInput
        label="Undo"
        value={shortcuts.undo}
        onChange={(keys) => setShortcuts(prev => ({ ...prev, undo: keys }))}
      />
      {/* ... */}
    </div>
  );
}

// 2. 添加快捷键帮助提示
// components/image-studio/shortcuts-help.tsx
import { Keyboard } from '@/components/ui/keyboard';

function ShortcutsHelp() {
  return (
    <Dialog>
      <DialogContent>
        <h2>Keyboard Shortcuts</h2>
        <dl>
          <dt>Undo</dt>
          <dd><Keyboard>Ctrl+Z</Keyboard></dd>
          <dt>Redo</dt>
          <dd><Keyboard>Ctrl+Shift+Z</Keyboard></dd>
          {/* ... */}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

// 3. 确保所有功能都可通过键盘访问
// 使用 ARIA 属性
<Button
  aria-label="Zoom in"
  onClick={handleZoomIn}
>
  <PlusIcon aria-hidden="true" />
</Button>
```

---

### 13. 代码重复 🔄

**问题**: 多个地方有相似的图层/状态管理模式

**建议提取通用 hook**:
```typescript
// hooks/common/use-layer-manager.ts
interface LayerManagerOptions<T extends Layer> {
  initialLayers?: T[];
  maxLayers?: number;
  onLayersChange?: (layers: T[]) => void;
}

interface LayerManagerState<T> {
  layers: T[];
  activeLayerId: string | null;
  selectedIds: string[];
}

export function useLayerManager<T extends Layer>(
  options: LayerManagerOptions<T> = {}
) {
  const { initialLayers = [], maxLayers = 20, onLayersChange } = options;

  const [state, setState] = useState<LayerManagerState<T>>({
    layers: initialLayers,
    activeLayerId: null,
    selectedIds: [],
  });

  const addLayer = useCallback((layer: T) => {
    setState(prev => {
      if (prev.layers.length >= maxLayers) {
        toast.error(`Maximum ${maxLayers} layers allowed`);
        return prev;
      }

      const newLayers = [...prev.layers, layer];
      onLayersChange?.(newLayers);

      return {
        ...prev,
        layers: newLayers,
        activeLayerId: layer.id,
      };
    });
  }, [maxLayers, onLayersChange]);

  const removeLayer = useCallback((id: string) => {
    setState(prev => {
      const newLayers = prev.layers.filter(l => l.id !== id);
      onLayersChange?.(newLayers);

      return {
        ...prev,
        layers: newLayers,
        activeLayerId: prev.activeLayerId === id ? null : prev.activeLayerId,
        selectedIds: prev.selectedIds.filter(sid => sid !== id),
      };
    });
  }, [onLayersChange]);

  const duplicateLayer = useCallback((id: string) => {
    setState(prev => {
      const layer = prev.layers.find(l => l.id === id);
      if (!layer) return prev;

      const newLayer: T = {
        ...layer,
        id: `layer-${Date.now()}`,
        name: `${layer.name} copy`,
        order: prev.layers.length,
      };

      const newLayers = [...prev.layers, newLayer];
      onLayersChange?.(newLayers);

      return {
        ...prev,
        layers: newLayers,
        activeLayerId: newLayer.id,
      };
    });
  }, [onLayersChange]);

  const reorderLayers = useCallback((fromIdx: number, toIdx: number) => {
    setState(prev => {
      const newLayers = [...prev.layers];
      const [removed] = newLayers.splice(fromIdx, 1);
      newLayers.splice(toIdx, 0, removed);

      const reordered = newLayers.map((l, i) => ({ ...l, order: i }));
      onLayersChange?.(reordered);

      return { ...prev, layers: reordered };
    });
  }, [onLayersChange]);

  return {
    ...state,
    addLayer,
    removeLayer,
    duplicateLayer,
    reorderLayers,
    setActiveLayer: (id: string) => setState(prev => ({ ...prev, activeLayerId: id })),
    toggleSelect: (id: string) => setState(prev => ({
      ...prev,
      selectedIds: prev.selectedIds.includes(id)
        ? prev.selectedIds.filter(sid => sid !== id)
        : [...prev.selectedIds, id],
    })),
  };
}

// 使用示例
// app/(main)/image-studio/page.tsx
const layerManager = useLayerManager<Layer>({
  initialLayers: [],
  maxLayers: 20,
  onLayersChange: (layers) => setLayers(layers),
});
```

---

### 14. 性能监控和指标 📈

**建议**: 添加性能监控以识别瓶颈

```typescript
// lib/performance/monitor.ts
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    this.record(name, duration);
    return result;
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    this.record(name, duration);
    return result;
  }

  private record(name: string, duration: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);

    // 警告慢操作
    if (duration > 100) {
      console.warn(`Slow operation: ${name} took ${duration.toFixed(2)}ms`);
    }
  }

  getStats(name: string) {
    const durations = this.metrics.get(name) || [];
    if (durations.length === 0) return null;

    return {
      count: durations.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      p95: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)],
    };
  }
}

// 使用
const monitor = new PerformanceMonitor();

const handleExport = useCallback(async (format: string) => {
  await monitor.measureAsync('ppt-export', async () => {
    const result = await executePPTExport({ ... });
    return result;
  });
}, []);
```

---

### 15. 文档完善 📚

**建议**: 为新功能添加完整文档

```markdown
<!-- docs/features/latex-editor.md -->
# LaTeX Editor

## 概述

LaTeX 编辑器是一个实时预览的 LaTeX 编辑组件，支持语法高亮、自动完成和错误检查。

## 功能

- **实时预览**: 使用 KaTeX 渲染数学公式
- **语法高亮**: 基于 CodeMirror 的语法高亮
- **自动完成**: 常用命令和符号的自动完成
- **错误检查**: 实时验证 LaTeX 语法
- **撤销/重做**: 完整的历史记录管理

## 使用示例

```tsx
import { LaTeXEditor } from '@/components/academic/latex-editor';

function MyComponent() {
  const [content, setContent] = useState('\\frac{a}{b}');

  return (
    <LaTeXEditor
      initialContent={content}
      onChange={setContent}
      config={{
        theme: 'dark',
        fontSize: 14,
        livePreview: true,
      }}
    />
  );
}
```

## API

### LaTeXEditorProps

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `initialContent` | `string` | `''` | 初始内容 |
| `onChange` | `(content: string) => void` | - | 内容变化回调 |
| `onSave` | `(content: string) => void` | - | 保存回调 |
| `onError` | `(errors: LaTeXError[]) => void` | - | 错误回调 |
| `config` | `LaTeXEditorConfig` | - | 编辑器配置 |
| `readOnly` | `boolean` | `false` | 只读模式 |

### LaTeXEditorConfig

```typescript
interface LaTeXEditorConfig {
  theme?: 'light' | 'dark' | 'system';
  fontFamily?: string;
  fontSize?: number;
  tabSize?: number;
  wordWrap?: boolean;
  lineNumbers?: boolean;
  livePreview?: boolean;
  previewDelay?: number;
  vimMode?: boolean;
}
```

## 安全注意事项

⚠️ **重要**: LaTeX 编辑器会渲染用户输入的内容，因此需要特别注意安全性：

1. **验证输入**: 使用 `validateLatex()` 验证 LaTeX 语法
2. **清理内容**: 使用 `sanitizeLatex()` 清理危险内容
3. **限制命令**: 使用白名单限制可用的 LaTeX 命令

```typescript
import { validateLatex, sanitizeLatex } from '@/lib/latex/security';

const handleContentChange = (content: string) => {
  const validation = validateLatex(content);
  if (validation.errors.length > 0) {
    console.error('Invalid LaTeX:', validation.errors);
    return;
  }

  const sanitized = sanitizeLatex(content);
  setContent(sanitized);
};
```
```

---

## ✅ 代码亮点

### 功能完整性 ✨

1. **LaTeX 编辑器**: 完整的实时预览编辑器，支持语法高亮、自动完成
2. **Notebook 集成**: Jupyter notebook 支持，包括变量检查和代码执行
3. **TTS 扩展**: 新增 ElevenLabs、LMNT、Hume 三个 TTS 提供商
4. **Image Studio 增强**: 文本叠加、绘图工具、图层管理、图像对比
5. **PPT 功能**: 搜索、排序、预览、演示模式、导出

### 用户体验 🎨

1. **响应式设计**: 改进了移动端适配
2. **键盘快捷键**: 图片编辑器快捷键支持
3. **撤销/重做**: 完整的历史记录管理
4. **实时预览**: 多处实时预览功能
5. **加载反馈**: 导出等操作的加载指示器

### 性能优化 ⚡

1. **useMemo/useCallback**: 广泛使用记忆化优化
2. **代码分割**: 动态导入大型组件
3. **虚拟化**: 列表虚拟化（部分实现）

### 类型安全 📘

1. **TypeScript**: 完整的类型定义
2. **类型守卫**: 关键处的类型验证
3. **枚举使用**: 合理使用枚举类型

### 测试覆盖 🧪

1. **TTS 提供商**: 完整的单元测试
2. **工具函数**: 核心工具的测试覆盖

---

## 📊 总体评价

### 评分矩阵

| 维度 | 评分 | 说明 |
|------|:----:|------|
| **代码质量** | 🟡 7/10 | 功能完整但状态管理需优化 |
| **安全性** | 🟠 5/10 | 存在 API 密钥和 XSS 风险 |
| **性能** | 🟡 7/10 | 有优化但不均衡 |
| **可维护性** | 🟡 6/10 | 代码重复，复杂度较高 |
| **测试覆盖** | 🟠 5/10 | 新功能测试不足 |
| **文档** | 🟠 4/10 | 缺少完整文档 |

### 合并建议

⚠️ **建议修复关键问题后合并**

**必须修复 (阻塞性)**:
1. ✅ TTS API 密钥安全处理
2. ✅ LaTeX 编辑器 XSS 防护
3. ✅ 导出功能的错误处理

**强烈建议 (高优先级)**:
4. 图片编辑器状态管理重构
5. 补充核心功能的测试用例
6. 完善国际化字符串提取

**建议改进 (中优先级)**:
7. 提取重复代码为通用 hook
8. 添加性能监控
9. 完善功能文档

**可选优化 (低优先级)**:
10. 响应式设计统一
11. 可访问性改进
12. 添加撤销机制

---

## 🎯 后续行动计划

### 立即行动 (本周)

- [ ] 创建安全检查清单
- [ ] 实现 API 密钥加密存储
- [ ] 添加 LaTeX 内容验证和清理
- [ ] 改进导出错误处理

### 短期计划 (本月)

- [ ] 重构图片编辑器状态管理
- [ ] 补充 LaTeX 相关测试
- [ ] 提取通用图层管理 hook
- [ ] 完善国际化字符串

### 中期计划 (本季度)

- [ ] 建立性能监控体系
- [ ] 完善功能文档
- [ ] 统一响应式设计模式
- [ ] 改进可访问性

### 长期规划

- [ ] 建立代码审查流程
- [ ] 设置代码质量标准
- [ ] 自动化安全扫描
- [ ] 持续集成测试

---

## 📚 参考资源

### 安全

- [OWASP XSS 防护](https://owasp.org/www-community/attacks/xss/)
- [API 密钥管理最佳实践](https://cwe.mitre.org/data/definitions/798.html)

### 性能

- [React 性能优化](https://react.dev/learn/render-and-commit)
- [Web 性能最佳实践](https://web.dev/performance/)

### 可访问性

- [WCAG 2.1 指南](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA 实践](https://www.w3.org/WAI/ARIA/apg/)

### 测试

- [Jest 最佳实践](https://jestjs.io/docs/tutorial-react)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

---

**审查完成时间**: 2025-01-29
**下次审查建议**: 修复关键问题后进行复审
