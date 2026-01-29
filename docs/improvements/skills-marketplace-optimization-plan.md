# Skills Marketplace (SkillsMP) Integration - Optimization Plan

## 执行摘要

当前项目拥有完整的 Skills 基础设施（本地创建、导入、GitHub 仓库发现），但缺少与真实 Skills 市场的集成。本计划将集成 [SkillsMP](https://skillsmp.com) API，使用户能够浏览、搜索和安装来自全球最大的 Agent Skills 市场的 112,000+ 开源技能。

---

## 发现问题

| 严重程度 | 数量 | 说明 |
|---------|------|------|
| HIGH | 1 | 无真实 Skills 市场集成 |
| MEDIUM | 3 | 缺少市场 API、Store、UI 组件 |
| LOW | 2 | 类型扩展、国际化支持 |

---

## SkillsMP API 规格

### Base URL
```
https://skillsmp.com/api/v1
```

### 认证
```
Authorization: Bearer sk_live_your_api_key
```

### 端点

#### 1. 关键词搜索
```
GET /api/v1/skills/search
```
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| q | string | ✓ | 搜索关键词 |
| page | number | - | 页码 (默认: 1) |
| limit | number | - | 每页数量 (默认: 20, 最大: 100) |
| sortBy | string | - | 排序: `stars` | `recent` |

#### 2. AI 语义搜索
```
GET /api/v1/skills/ai-search
```
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| q | string | ✓ | AI 搜索查询 |

### 错误码
| 错误码 | HTTP | 说明 |
|--------|------|------|
| MISSING_API_KEY | 401 | 未提供 API Key |
| INVALID_API_KEY | 401 | API Key 无效 |
| MISSING_QUERY | 400 | 缺少查询参数 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

## 推荐行动

### [优先级: HIGH] 1. 创建 Skills Marketplace API 库

**当前状态**:
无 SkillsMP API 集成

**问题**:
用户无法访问 112,000+ 开源技能

**改进方案**:
创建 `lib/skills/marketplace.ts`，实现：
- `fetchSkillsMarketplace()` - 关键词搜索
- `fetchSkillsAiSearch()` - AI 语义搜索
- `fetchSkillDetail()` - 获取技能详情
- `downloadSkillFromMarketplace()` - 下载并安装技能

**涉及文件**:
- `@/lib/skills/marketplace.ts` (新建)
- `@/lib/skills/marketplace.test.ts` (新建)
- `@/lib/skills/index.ts` (更新导出)

**预期收益**:
- 功能: 访问全球最大 Skills 市场
- 体验: 一键搜索和安装技能

**工作量**: 中 (4-6hr)

---

### [优先级: HIGH] 2. 创建 Skills Marketplace 类型定义

**当前状态**:
仅有本地 Skill 类型定义

**问题**:
需要市场特定的类型支持

**改进方案**:
创建 `types/skill/skill-marketplace.ts`：

```typescript
/** SkillsMP 市场技能 */
export interface SkillsMarketplaceItem {
  id: string;
  name: string;
  description: string;
  author: string;
  repository: string;          // owner/repo
  directory: string;           // skill 在仓库中的路径
  stars: number;
  downloads?: number;
  tags?: string[];
  category?: string;
  createdAt: string;
  updatedAt: string;
  readmeUrl?: string;
  skillmdUrl?: string;
}

/** 市场搜索响应 */
export interface SkillsMarketplaceResponse {
  success: boolean;
  data: SkillsMarketplaceItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

/** 市场筛选器 */
export interface SkillsMarketplaceFilters {
  query: string;
  sortBy: 'stars' | 'recent';
  page: number;
  limit: number;
  useAiSearch: boolean;
}
```

**涉及文件**:
- `@/types/skill/skill-marketplace.ts` (新建)
- `@/types/skill/index.ts` (新建)
- `@/types/index.ts` (更新导出)

**预期收益**:
- 类型安全: 完整的 TypeScript 支持
- 开发体验: 自动补全和类型检查

**工作量**: 小 (1-2hr)

---

### [优先级: HIGH] 3. 创建 Skills Marketplace Store

**当前状态**:
`skill-store.ts` 仅管理本地技能

**问题**:
需要独立的市场状态管理

**改进方案**:
创建 `stores/skills/skill-marketplace-store.ts`：

```typescript
interface SkillMarketplaceState {
  // 状态
  items: SkillsMarketplaceItem[];
  filters: SkillsMarketplaceFilters;
  isLoading: boolean;
  error: string | null;
  
  // 分页
  currentPage: number;
  totalPages: number;
  totalItems: number;
  
  // 选中项
  selectedItem: SkillsMarketplaceItem | null;
  
  // API Key
  apiKey: string | null;
  
  // 收藏
  favorites: Set<string>;
  
  // 搜索历史
  searchHistory: string[];
  
  // Actions
  searchSkills: (query: string) => Promise<void>;
  aiSearchSkills: (query: string) => Promise<void>;
  setFilters: (filters: Partial<SkillsMarketplaceFilters>) => void;
  selectItem: (item: SkillsMarketplaceItem | null) => void;
  installSkill: (item: SkillsMarketplaceItem) => Promise<void>;
  setApiKey: (key: string | null) => void;
  toggleFavorite: (id: string) => void;
}
```

**涉及文件**:
- `@/stores/skills/skill-marketplace-store.ts` (新建)
- `@/stores/skills/skill-marketplace-store.test.ts` (新建)
- `@/stores/skills/index.ts` (更新导出)
- `@/stores/index.ts` (更新导出)

**预期收益**:
- 状态: 独立管理市场数据
- 缓存: 搜索结果和收藏持久化

**工作量**: 中 (3-4hr)

---

### [优先级: HIGH] 4. 创建 Skills Marketplace UI 组件

**当前状态**:
`skill-discovery.tsx` 仅支持 GitHub 仓库

**问题**:
需要市场浏览和搜索界面

**改进方案**:
创建市场 UI 组件：

1. **主浏览器组件** `components/skills/skill-marketplace.tsx`:
   - 搜索栏（关键词/AI 切换）
   - 排序选择器（stars/recent）
   - 技能卡片网格
   - 分页控件

2. **技能卡片** `components/skills/skill-marketplace-card.tsx`:
   - 技能名称、描述、作者
   - Stars 数量、仓库链接
   - 安装/已安装状态
   - 收藏按钮

3. **详情对话框** `components/skills/skill-marketplace-detail.tsx`:
   - 完整描述
   - README 预览
   - SKILL.md 预览
   - 安装按钮
   - 资源文件列表

**涉及文件**:
- `@/components/skills/skill-marketplace.tsx` (新建)
- `@/components/skills/skill-marketplace-card.tsx` (新建)
- `@/components/skills/skill-marketplace-detail.tsx` (新建)
- `@/components/skills/index.ts` (更新导出)

**预期收益**:
- 体验: 现代化市场浏览界面
- 功能: AI 语义搜索能力

**工作量**: 大 (6-8hr)

---

### [优先级: MEDIUM] 5. 扩展现有 Skill 类型支持市场来源

**当前状态**:
```typescript
export type SkillSource = 'builtin' | 'custom' | 'imported' | 'generated';
```

**问题**:
无法区分市场来源的技能

**改进方案**:
扩展 SkillSource 类型：

```typescript
export type SkillSource = 
  | 'builtin' 
  | 'custom' 
  | 'imported' 
  | 'generated'
  | 'marketplace';  // 新增

// Skill 接口扩展
export interface Skill {
  // ... 现有字段
  
  // 市场相关字段
  marketplaceId?: string;      // SkillsMP ID
  marketplaceUrl?: string;     // 市场页面 URL
  stars?: number;              // GitHub stars
  downloads?: number;          // 下载次数
}
```

**涉及文件**:
- `@/types/system/skill.ts:45` (更新 SkillSource)
- `@/types/system/skill.ts:77-125` (扩展 Skill 接口)
- `@/stores/skills/skill-store.ts` (处理 marketplace 来源)

**预期收益**:
- 追踪: 区分市场安装的技能
- 更新: 可检查市场版本更新

**工作量**: 小 (1-2hr)

---

### [优先级: MEDIUM] 6. 集成到设置页面

**当前状态**:
Skills 设置仅显示本地技能

**问题**:
需要市场入口

**改进方案**:
在 Skills 设置页面添加 Marketplace Tab：

```tsx
<Tabs>
  <TabsList>
    <TabsTrigger value="installed">已安装</TabsTrigger>
    <TabsTrigger value="discovery">发现</TabsTrigger>
    <TabsTrigger value="marketplace">市场</TabsTrigger>  {/* 新增 */}
  </TabsList>
  
  <TabsContent value="marketplace">
    <SkillMarketplace />
  </TabsContent>
</Tabs>
```

**涉及文件**:
- `@/components/settings/tools/skill-settings.tsx` (添加 Tab)
- `@/lib/i18n/messages/en.json` (添加翻译)
- `@/lib/i18n/messages/zh.json` (添加翻译)

**预期收益**:
- 可发现性: 用户可轻松访问市场
- 一致性: 与 MCP Marketplace 体验一致

**工作量**: 小 (1-2hr)

---

### [优先级: MEDIUM] 7. API Key 管理

**当前状态**:
无 SkillsMP API Key 管理

**问题**:
需要安全存储和管理 API Key

**改进方案**:
1. 在设置中添加 API Key 输入
2. 使用 localStorage 加密存储
3. 在市场 UI 中显示 Key 状态

**涉及文件**:
- `@/stores/skills/skill-marketplace-store.ts` (apiKey 状态)
- `@/components/skills/skill-marketplace.tsx` (Key 输入 UI)
- `@/stores/settings/api-keys-store.ts` (可选: 统一管理)

**预期收益**:
- 安全: API Key 安全存储
- 体验: 清晰的配置流程

**工作量**: 小 (1-2hr)

---

### [优先级: LOW] 8. 国际化支持

**当前状态**:
Skills 相关翻译不完整

**问题**:
市场 UI 需要中英文支持

**改进方案**:
添加翻译键：

```json
{
  "skillMarketplace": {
    "title": "Skills 市场",
    "description": "浏览并安装来自 SkillsMP 的 112,000+ 开源技能",
    "search": "搜索技能...",
    "aiSearch": "AI 语义搜索",
    "sortByStars": "按热度排序",
    "sortByRecent": "按最新排序",
    "install": "安装",
    "installed": "已安装",
    "stars": "Stars",
    "configureApiKey": "配置 API Key",
    "apiKeyRequired": "需要 API Key 才能搜索"
  }
}
```

**涉及文件**:
- `@/lib/i18n/messages/en.json`
- `@/lib/i18n/messages/zh.json`

**预期收益**:
- 国际化: 完整的中英文支持

**工作量**: 小 (< 1hr)

---

### [优先级: LOW] 9. 添加使用 Hook

**当前状态**:
无市场专用 Hook

**问题**:
需要封装市场逻辑

**改进方案**:
创建 `hooks/skills/use-skill-marketplace.ts`：

```typescript
export function useSkillMarketplace() {
  const store = useSkillMarketplaceStore();
  const skillStore = useSkillStore();
  
  const installFromMarketplace = async (item: SkillsMarketplaceItem) => {
    // 下载 SKILL.md
    // 解析并创建 Skill
    // 添加到 skillStore
  };
  
  const isInstalled = (item: SkillsMarketplaceItem) => {
    // 检查是否已安装
  };
  
  return {
    ...store,
    installFromMarketplace,
    isInstalled,
  };
}
```

**涉及文件**:
- `@/hooks/skills/use-skill-marketplace.ts` (新建)
- `@/hooks/skills/use-skill-marketplace.test.ts` (新建)
- `@/hooks/skills/index.ts` (更新导出)

**预期收益**:
- 复用: 组件间共享逻辑
- 测试: 易于单元测试

**工作量**: 小 (1-2hr)

---

## 快速优化 (高收益低成本)

1. **类型定义** — 1-2hr，立即提供类型安全
2. **扩展 SkillSource** — 1hr，最小改动
3. **国际化** — 1hr，完整语言支持

---

## 实施顺序

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: 基础设施 (Day 1)                                    │
├─────────────────────────────────────────────────────────────┤
│ 1. 类型定义 (1-2hr)                                          │
│ 2. 扩展 SkillSource (1hr)                                    │
│ 3. API 库 (4-6hr)                                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: 状态管理 (Day 2)                                    │
├─────────────────────────────────────────────────────────────┤
│ 4. Marketplace Store (3-4hr)                                 │
│ 5. API Key 管理 (1-2hr)                                      │
│ 6. Hook (1-2hr)                                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: UI 组件 (Day 3)                                     │
├─────────────────────────────────────────────────────────────┤
│ 7. UI 组件 (6-8hr)                                           │
│ 8. 设置页面集成 (1-2hr)                                      │
│ 9. 国际化 (1hr)                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 总工作量估计

| 任务类型 | 数量 | 预估时间 |
|---------|------|---------|
| 小型任务 | 5 个 | ~6 hr |
| 中型任务 | 2 个 | ~8 hr |
| 大型任务 | 1 个 | ~7 hr |
| **总计** | 8 个 | **~21 hr** |

---

## 文件变更清单

### 新建文件 (10 个)
```
types/skill/skill-marketplace.ts
types/skill/index.ts
lib/skills/marketplace.ts
lib/skills/marketplace.test.ts
stores/skills/skill-marketplace-store.ts
stores/skills/skill-marketplace-store.test.ts
hooks/skills/use-skill-marketplace.ts
hooks/skills/use-skill-marketplace.test.ts
components/skills/skill-marketplace.tsx
components/skills/skill-marketplace-card.tsx
components/skills/skill-marketplace-detail.tsx
```

### 修改文件 (8 个)
```
types/system/skill.ts
types/index.ts
lib/skills/index.ts
stores/skills/index.ts
stores/index.ts
hooks/skills/index.ts
components/settings/tools/skill-settings.tsx
lib/i18n/messages/{en,zh}.json
```

---

## 依赖项

- 无外部依赖
- 复用现有 UI 组件（Card, Button, Badge, Dialog 等）
- 复用现有基础设施（fetchWithTimeout, Zustand persist）

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| SkillsMP API 变更 | 中 | 版本化 API 调用，错误处理 |
| API Rate Limiting | 低 | 本地缓存，防抖搜索 |
| SKILL.md 格式不兼容 | 中 | 使用现有 parser，容错处理 |

---

## 验证检查清单

- [ ] 搜索功能正常（关键词 + AI）
- [ ] 分页正常工作
- [ ] 技能安装成功
- [ ] 安装的技能出现在本地列表
- [ ] API Key 安全存储
- [ ] 收藏功能正常
- [ ] 搜索历史保存
- [ ] 错误提示友好
- [ ] 中英文切换正常
- [ ] 单元测试通过
- [ ] E2E 测试通过

---

## 相关工作流

- `/refactor` — 代码重构实施
- `/component` — 组件生成
- `/test` — 测试运行
- `/i18n` — 国际化支持
