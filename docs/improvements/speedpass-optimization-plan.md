# SpeedPass 速过学习模式优化计划

## 执行摘要

本文档详细分析了 SpeedPass（速过学习）模式的当前状态，识别了未完善和缺失的功能，并制定了完整的优化方案，重点确保速通模式(extreme mode)被完整使用，并支持自动路由到速通模式。

---

## 已完成的优化 (2026-01-29)

### ✅ Mode Router 定位功能增强

**文件**: `@/lib/learning/speedpass/mode-router.ts`

已完成的改进:

1. **中文数字解析增强**
   - 新增 `parseChineseNumber()` 函数支持复合数字
   - 支持: 十一(11), 十二(12), 十五(15), 二十(20), 二十五(25)
   - 支持 零-十 基本数字

2. **时间提取增强**
   - 新增 "半小时" = 30分钟
   - 新增 "半天" = 240分钟 (4小时)
   - 新增 "一下午/一上午" = 180分钟
   - 支持中文分钟: "三十分钟"
   - 支持混合语言: "I have 2小时"

3. **考试紧迫程度检测**
   - 新增 `detectExamUrgency()` 函数
   - 返回距离考试的天数: 今天(0), 明天(1), 后天(2), 这周(3), 下周(7)
   - 支持 N天格式: "3天后考试"

4. **置信度计算优化**
   - 使用递减权重算法避免过度堆叠
   - 根据紧迫程度动态提升置信度
   - 极速模式: 考试在今天/明天时 +0.4 置信度
   - 全面模式: 考试在一周后时 +0.2 置信度

5. **新增返回字段**
   - `detectedUrgencyDays?: number` - 检测到的考试紧迫程度

6. **测试覆盖提升**
   - 新增 9 个测试用例 (16 → 25)
   - 覆盖半小时、复合数字、紧迫程度检测、混合语言

---

## 模块依赖

- **入口**: `app/(main)/speedpass/page.tsx`
- **状态**: `stores/learning/speedpass-store.ts`
- **Hooks**: `hooks/learning/use-speedpass.ts`
- **工具**: `lib/learning/speedpass/tutorial-generator.ts`
- **类型**: `types/learning/speedpass.ts`
- **路由配置**: `lib/ai/routing/feature-routes-config.ts`
- **自动路由器**: `lib/ai/generation/auto-router.ts`
- **测试**: `stores/learning/speedpass-store.test.ts`

---

## 发现问题

- **HIGH**: 3 个
- **MEDIUM**: 5 个
- **LOW**: 2 个

---

## 功能清单

| 子功能 | 状态 | 位置 | 备注 |
|--------|------|------|------|
| 极速模式(extreme) 配置 | ✅ 完善 | `types/learning/speedpass.ts:416-424` | 配置完整 |
| 速成模式(speed) 配置 | ✅ 完善 | `types/learning/speedpass.ts:426-434` | 配置完整 |
| 全面模式(comprehensive) 配置 | ✅ 完善 | `types/learning/speedpass.ts:435-443` | 配置完整 |
| 教程生成逻辑 | ✅ 完善 | `lib/learning/speedpass/tutorial-generator.ts` | 基于模式配置 |
| Store 教程创建 | ⚠️ 部分 | `stores/learning/speedpass-store.ts:512-611` | 工作但缺少 AI 增强 |
| 教师重点匹配 | ❌ 缺失 | `stores/learning/speedpass-store.ts:468` | TODO: 未实现 AI 匹配逻辑 |
| 自动路由到 SpeedPass | ⚠️ 部分 | `lib/ai/routing/feature-routes-config.ts:191-226` | 有配置，缺少模式自动选择 |
| 速通模式自动路由 | ❌ 缺失 | - | 无法根据时间/场景自动选择极速模式 |
| QuickActionCard 点击事件 | ❌ 缺失 | `app/(main)/speedpass/page.tsx:350-375` | 卡片不可交互 |
| 用户认证集成 | ❌ 缺失 | 多处 | 多个 TODO: Get from auth |
| 教材上传功能 | ❌ 缺失 | `app/(main)/speedpass/page.tsx:382-403` | 占位符组件 |

---

## 优化项详情

### [优先级: HIGH] 1. 实现速通模式自动路由

**当前状态**:
SpeedPass 功能已在 feature-routes-config.ts 中配置了意图检测模式，但缺少根据用户场景（如考试临近、时间紧迫）自动选择极速模式的能力。

**问题**:
- 用户说"我只有1小时复习"时，无法自动推荐极速模式
- 缺少时间感知的模式选择逻辑
- Auto-router 未与 SpeedPass 学习模式集成

**改进方案**:

1. 在 `types/provider/auto-router.ts` 添加学习模式上下文:
```typescript
export interface RoutingContext {
  // ... existing fields
  
  // Learning mode context
  learningMode?: {
    availableTime?: number; // minutes
    examDate?: Date;
    targetScore?: number;
    preferredMode?: 'extreme' | 'speed' | 'comprehensive';
  };
}
```

2. 在 `lib/ai/generation/auto-router.ts` 添加学习模式检测模式:
```typescript
const SPEEDPASS_MODE_PATTERNS = {
  extreme: [
    /(?:只有|仅有|就)?\s*(?:1|一|2|两|几十分钟|半小时|一小时)/i,
    /(?:马上|立刻|即将|明天|今天).*?(?:考试|测验|期末)/i,
    /(?:突击|临时|抱佛脚|速成|快速过关|及格就行)/i,
  ],
  speed: [
    /(?:2|3|4|两三|几).*?(?:小时|hours)/i,
    /(?:中等|七八十分|70|80).*?(?:分|目标)/i,
  ],
  comprehensive: [
    /(?:充足|足够|很多).*?(?:时间)/i,
    /(?:高分|90|85).*?(?:分|目标)/i,
    /(?:全面|系统|深入).*?(?:复习|学习)/i,
  ],
};
```

3. 创建 `lib/learning/speedpass/mode-router.ts`:
```typescript
export function detectSpeedLearningMode(input: string, context?: RoutingContext): {
  detected: boolean;
  recommendedMode: SpeedLearningMode;
  confidence: number;
  reason: string;
};
```

**涉及文件**:
- `@/types/provider/auto-router.ts:183-206`
- `@/lib/ai/generation/auto-router.ts` (新增模式)
- `@/lib/learning/speedpass/mode-router.ts` (新建)
- `@/lib/ai/routing/feature-routes-config.ts:191-226`

**预期收益**:
- 用户体验: 根据紧迫程度自动推荐合适的学习模式
- 效率: 减少用户手动选择步骤
- 智能化: 考试临近时自动推荐极速模式

**工作量**: 中 (4-6hr)

**依赖项**: 无

---

### [优先级: HIGH] 2. 实现 QuickActionCard 点击功能

**当前状态**:
Overview 页面的三个快速操作卡片（极速模式、速成模式、全面模式）仅展示，无法点击创建教程。

**问题**:
- `QuickActionCard` 组件没有 `onClick` 处理
- 未连接到 `createTutorial` 动作
- 用户无法快速开始学习

**改进方案**:

1. 修改 `QuickActionCard` 组件添加点击处理:
```typescript
interface QuickActionCardProps {
  // ... existing props
  mode: SpeedLearningMode;
  onSelect: (mode: SpeedLearningMode) => void;
  disabled?: boolean;
}
```

2. 在 `OverviewTab` 中实现模式选择逻辑:
```typescript
const handleModeSelect = useCallback(async (mode: SpeedLearningMode) => {
  if (!currentTextbook) {
    // 提示选择教材
    toast.info('请先选择一本教材');
    setActiveTab('textbooks');
    return;
  }
  
  const tutorial = await createTutorial({
    courseId: currentTextbook.courseId || '',
    textbookId: currentTextbook.id,
    mode,
  });
  
  // 导航到教程页面
  router.push(`/speedpass/tutorial/${tutorial.id}`);
}, [currentTextbook, createTutorial, router]);
```

**涉及文件**:
- `@/app/(main)/speedpass/page.tsx:236-261` (QuickActionCard 使用)
- `@/app/(main)/speedpass/page.tsx:341-376` (QuickActionCard 组件)

**预期收益**:
- 用户体验: 一键开始学习
- 功能完整: 核心交互可用

**工作量**: 小 (1-2hr)

**依赖项**: 无

---

### [优先级: HIGH] 3. 实现教师重点 AI 匹配逻辑

**当前状态**:
`processTeacherKeyPoints` 方法中有 TODO 注释，返回空的 mock 数据。

**问题**:
```typescript
// @/stores/learning/speedpass-store.ts:468
// TODO: Implement actual AI matching logic
```

**改进方案**:

1. 使用 AI SDK 实现知识点匹配:
```typescript
async function matchTeacherKeyPoints(
  teacherNotes: string,
  knowledgePoints: TextbookKnowledgePoint[],
  provider: ProviderName,
  model: string
): Promise<MatchedKnowledgePoint[]>;
```

2. 集成向量搜索进行语义匹配:
```typescript
// 使用现有的 vector search 能力
import { semanticSearch } from '@/lib/vector';

const matches = await semanticSearch(
  teacherNotes,
  knowledgePoints.map(kp => ({ id: kp.id, content: kp.content })),
  { topK: 10 }
);
```

**涉及文件**:
- `@/stores/learning/speedpass-store.ts:453-501`
- `@/lib/learning/speedpass/knowledge-matcher.ts` (新建)

**预期收益**:
- 功能完整: 教师划重点功能可用
- 智能化: AI 匹配提高准确率

**工作量**: 中 (4-6hr)

**依赖项**: 向量搜索功能

---

### [优先级: MEDIUM] 4. 添加学习模式选择对话框

**当前状态**:
没有统一的模式选择 UI，用户需要手动理解三种模式的区别。

**改进方案**:

创建 `components/speedpass/mode-selector-dialog.tsx`:
```typescript
interface ModeSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  textbook: Textbook;
  availableTime?: number;
  examDate?: Date;
  onSelect: (mode: SpeedLearningMode) => void;
}
```

功能:
- 显示三种模式的对比
- 根据可用时间推荐模式
- 显示预计学习内容和时长

**涉及文件**:
- `@/components/speedpass/mode-selector-dialog.tsx` (新建)
- `@/app/(main)/speedpass/page.tsx`

**预期收益**:
- 用户体验: 清晰的模式选择引导
- 决策支持: 帮助用户选择最合适的模式

**工作量**: 中 (3-4hr)

---

### [优先级: MEDIUM] 5. 集成 Auto-Router 的 SpeedPass 路由策略

**当前状态**:
Auto-router 的 `RoutingStrategy` 中有 `speed` 策略，但未与 SpeedPass 学习模式关联。

**改进方案**:

1. 在 `lib/ai/routing/feature-routes-config.ts` 扩展 SpeedPass 路由:
```typescript
{
  id: 'speedpass',
  // ... existing config
  subRoutes: [
    {
      mode: 'extreme',
      patterns: {
        chinese: [/极速|快速过关|及格就行|临时抱佛脚/i],
        english: [/quick pass|just pass|last minute/i],
      },
    },
    // ... speed, comprehensive
  ],
}
```

2. 添加时间感知路由:
```typescript
// 检测可用时间并推荐模式
if (detectedTime <= 120) { // 2 hours
  recommendMode = 'extreme';
} else if (detectedTime <= 240) { // 4 hours
  recommendMode = 'speed';
} else {
  recommendMode = 'comprehensive';
}
```

**涉及文件**:
- `@/lib/ai/routing/feature-routes-config.ts:191-226`
- `@/types/routing/feature-router.ts`

**预期收益**:
- 智能路由: 自动选择最合适的学习模式
- 用户体验: 减少决策负担

**工作量**: 中 (3-4hr)

---

### [优先级: MEDIUM] 6. 实现教材解析功能

**当前状态**:
TextbooksTab 是占位符组件，无法上传和解析教材。

**改进方案**:

1. 创建教材上传组件:
```typescript
// components/speedpass/textbook-uploader.tsx
interface TextbookUploaderProps {
  onUpload: (file: File) => Promise<void>;
  onProgress: (progress: ParseProgress) => void;
}
```

2. 集成 PDF 解析:
- 使用现有的 PDF 解析能力
- 提取章节、知识点、例题

**涉及文件**:
- `@/components/speedpass/textbook-uploader.tsx` (新建)
- `@/components/speedpass/textbook-library.tsx`
- `@/hooks/learning/use-textbook-processor.ts`

**预期收益**:
- 功能完整: 用户可以上传自己的教材
- 自动化: AI 自动提取知识点

**工作量**: 大 (8-12hr)

---

### [优先级: MEDIUM] 7. 完善教程详情页面

**当前状态**:
没有教程详情页面，无法展示和学习生成的教程。

**改进方案**:

创建 `app/(main)/speedpass/tutorial/[id]/page.tsx`:
- 显示教程章节列表
- 知识点卡片展示
- 进度跟踪
- 例题练习

**涉及文件**:
- `@/app/(main)/speedpass/tutorial/[id]/page.tsx` (新建)
- `@/components/speedpass/tutorial-viewer.tsx` (新建)
- `@/components/speedpass/section-card.tsx` (新建)

**预期收益**:
- 功能完整: 完整的学习流程
- 用户体验: 沉浸式学习界面

**工作量**: 大 (8-10hr)

---

### [优先级: MEDIUM] 8. 添加极速模式专属优化

**当前状态**:
极速模式使用与其他模式相同的 UI，未针对时间紧迫场景优化。

**改进方案**:

1. 极速模式专属 UI:
- 更紧凑的知识点展示
- 倒计时提醒
- 一键跳过非核心内容
- 公式速记卡片

2. 极速复习引擎:
```typescript
// lib/learning/speedpass/extreme-mode-engine.ts
export class ExtremeModeEngine {
  // 只展示 critical 知识点
  // 自动跳过已掌握内容
  // 智能分配时间
}
```

**涉及文件**:
- `@/lib/learning/speedpass/extreme-mode-engine.ts` (新建)
- `@/components/speedpass/extreme-mode-viewer.tsx` (新建)

**预期收益**:
- 效率: 极速模式真正"极速"
- 差异化: 不同模式有不同体验

**工作量**: 中 (4-6hr)

---

### [优先级: LOW] 9. 添加用户认证集成

**当前状态**:
多处有 `// TODO: Get from auth` 注释。

**改进方案**:

集成现有认证系统，从 store 或 context 获取 userId。

**涉及文件**:
- `@/stores/learning/speedpass-store.ts` (多处)

**工作量**: 小 (1-2hr)

---

### [优先级: LOW] 10. 添加学习数据分析

**当前状态**:
AnalyticsTab 是占位符。

**改进方案**:

实现学习数据可视化:
- 学习时间图表
- 正确率趋势
- 知识点掌握度热力图

**涉及文件**:
- `@/app/(main)/speedpass/page.tsx:479-496`
- `@/components/speedpass/analytics-dashboard.tsx` (新建)

**工作量**: 中 (4-6hr)

---

## 快速优化 (高收益低成本)

1. **QuickActionCard 点击事件** - 1-2hr，立即可用
2. **模式选择对话框** - 3-4hr，提升用户体验
3. **用户认证集成** - 1-2hr，消除 TODO

---

## 总工作量估计

| 类型 | 数量 | 预计时间 |
|------|------|----------|
| 小型任务 | 2 个 | ~4 hr |
| 中型任务 | 6 个 | ~26 hr |
| 大型任务 | 2 个 | ~20 hr |
| **总计** | 10 个 | **~50 hr** |

---

## 推荐实施顺序

### Phase 1: 核心功能 (Week 1)
1. QuickActionCard 点击事件
2. 模式选择对话框
3. 教程详情页面

### Phase 2: AI 集成 (Week 2)
4. 教师重点 AI 匹配
5. 速通模式自动路由
6. Auto-Router 集成

### Phase 3: 完善功能 (Week 3)
7. 教材解析功能
8. 极速模式专属优化
9. 学习数据分析
10. 用户认证集成

---

## 技术依赖

- **AI SDK**: 用于知识点匹配和教程生成
- **Vector Search**: 用于语义匹配
- **PDF Parser**: 用于教材解析
- **Chart Library**: 用于数据可视化

---

## 验证清单

- [ ] 极速模式可以通过 QuickActionCard 启动
- [ ] 用户输入时间限制时自动推荐极速模式
- [ ] 教师重点可以与教材知识点匹配
- [ ] 教程可以正常显示和学习
- [ ] 学习进度正确保存
- [ ] 错题本功能正常工作
- [ ] 测验功能完整可用

---

*初始生成: 2026-01-29*
*最后更新: 2026-01-29*
*分析范围: SpeedPass 学习模式 - 定位功能 (mode-router)*
