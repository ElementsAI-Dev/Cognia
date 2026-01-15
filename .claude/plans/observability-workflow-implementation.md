# Langfuse + OpenTelemetry 集成与高级工作流功能实施计划

## 项目概述

在 Cognia AI 应用中充分集成 Langfuse 和 OpenTelemetry 以提升可观测性，并实现高级工作流功能（模板市场 + Git 集成）。

## 一、现有系统分析

### 1.1 现有可观测性系统

**文件位置：**
- `lib/ai/infrastructure/telemetry.ts` - 基础遥测系统
- `lib/ai/core/middleware.ts` - 遥测包装器

**现有功能：**
- 基于 OpenTelemetry 的遥测配置
- Span 追踪（开始、结束、错误）
- 事件记录
- 指标收集（成功率、延迟、Token 使用）
- 控制台遥测收集器

**局限性：**
- 缺乏 Langfuse 集成
- 没有分布式追踪
- 缺乏统一的仪表板
- 没有用户反馈闭环

### 1.2 现有工作流系统

**文件位置：**
- `components/workflow-editor/` - React Flow 编辑器
- `lib/workflow-editor/templates.ts` - 10+ 预构建模板
- `stores/workflow/workflow-editor-store.ts` - Zustand 状态管理
- `types/workflow/workflow-editor.ts` - 类型定义

**现有功能：**
- 可视化工作流编辑器
- 10+ 预构建模板（聊天、分析、翻译等）
- 节点类型：start, end, ai, tool, conditional, parallel, human, subworkflow, loop, delay, webhook, code, transform, merge, group, annotation
- 执行追踪和日志
- 版本控制（基础）

**局限性：**
- 缺乏模板市场
- 没有 Git 集成
- 缺乏工作流分享
- 没有社区模板库

### 1.3 现有 Git 集成

**文件位置：**
- `src-tauri/src/commands/git.rs` - Rust 后端
- `lib/native/git.ts` - TypeScript 包装器
- `stores/git/git-store.ts` - Zustand 存储

**现有功能：**
- 仓库初始化、克隆
- 提交、暂存、推送、拉取
- 分支管理
- 日志查看
- 差异查看
- 远程管理

**优势：**
- 完整的 Git 操作支持
- Tauri 原生集成
- 完善的错误处理

## 二、架构设计

### 2.1 可观测性架构

```
┌─────────────────────────────────────────────────────────────┐
│                     应用层 (Next.js)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  AI Chat     │  │   Agents     │  │   Workflows  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
┌─────────┼─────────────────┼─────────────────┼───────────────┐
│         │    OpenTelemetry API              │               │
│  ┌──────▼─────────────────▼─────────────────▼──────┐       │
│  │              Langfuse Client                  │       │
│  │  - Trace management                           │       │
│  │  - Generation tracking                        │       │
│  │  - Span management                            │       │
│  │  - Session tracking                           │       │
│  └──────────────────┬────────────────────────────┘       │
│                     │                                     │
│  ┌──────────────────▼────────────────────────────┐       │
│  │         OpenTelemetry SDK                    │       │
│  │  - Distributed tracing                       │       │
│  │  - Metrics collection                        │       │
│  │  - Automatic instrumentation                  │       │
│  └──────────────────┬────────────────────────────┘       │
│                     │                                     │
│  ┌──────────────────▼────────────────────────────┐       │
│  │         LangfuseExporter (OTLP)               │       │
│  └──────────────────┬────────────────────────────┘       │
└─────────────────────┼─────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Langfuse Server (Cloud/Self-hosted)            │
│  - Trace storage                                            │
│  - Metrics aggregation                                      │
│  - Dashboard UI                                             │
│  - Evaluation                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 工作流模板市场架构

```
┌─────────────────────────────────────────────────────────────┐
│                    前端 (Next.js)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Template     │  │ Template     │  │ Template     │      │
│  │ Gallery      │  │ Details      │  │ Editor       │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
┌─────────┼─────────────────┼─────────────────┼───────────────┐
│         │      Template Store (Zustand)      │               │
│  ┌──────▼─────────────────▼─────────────────▼──────┐       │
│  │         Template Repository                 │       │
│  │  - Local templates                            │       │
│  │  - Community templates                        │       │
│  │  - Template metadata                          │       │
│  │  - Usage statistics                           │       │
│  └──────────────────┬────────────────────────────┘       │
│                     │                                     │
│  ┌──────────────────▼────────────────────────────┐       │
│  │         Git Integration Service               │       │
│  │  - Clone templates from Git                  │       │
│  │  - Push templates to Git                     │       │
│  │  - Version control                            │       │
│  │  - Branch management                         │       │
│  └──────────────────┬────────────────────────────┘       │
│                     │                                     │
└─────────────────────┼─────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Git Repositories (GitHub/GitLab/Local)          │
│  - Template repositories                                     │
│  - Version history                                          │
│  - Collaboration                                             │
└─────────────────────────────────────────────────────────────┘
```

## 三、实施计划

### 阶段 1：依赖安装（立即执行）

```bash
pnpm add langfuse @langfuse/node @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/sdk-metrics @opentelemetry/sdk-trace-node
```

### 阶段 2：Langfuse 集成

#### 2.1 创建 Langfuse 客户端

**文件：** `lib/ai/observability/langfuse-client.ts`

**功能：**
- 初始化 Langfuse 客户端
- 配置 API 密钥和主机
- 提供追踪、生成、会话管理接口
- 错误处理和重试逻辑

#### 2.2 集成到 AI Chat

**修改文件：** `lib/ai/generation/use-ai-chat.ts`

**功能：**
- 为每个聊天会话创建 Langfuse trace
- 追踪每个 AI 生成（generation）
- 记录 Token 使用和成本
- 捕获错误和异常

#### 2.3 集成到 Agent 系统

**修改文件：** `lib/ai/agent/agent-executor.ts`, `lib/ai/agent/agent-loop.ts`

**功能：**
- 追踪 Agent 执行过程
- 记录工具调用（spans）
- 追踪子 Agent 执行
- 记录 Agent 性能指标

### 阶段 3：OpenTelemetry 集成

#### 3.1 创建 OpenTelemetry 初始化

**文件：** `lib/ai/observability/tracing.ts`

**功能：**
- 初始化 OpenTelemetry SDK
- 配置自动 instrumentation
- 设置 OTLP exporter
- 配置资源属性

#### 3.2 创建分布式追踪

**文件：** `lib/ai/observability/distributed-tracing.ts`

**功能：**
- 跨服务追踪
- 上下文传播
- Span 链接
- Trace ID 生成

### 阶段 4：可观测性仪表板

#### 4.1 创建仪表板 UI

**文件：** `components/observability/dashboard.tsx`

**功能：**
- 实时指标显示
- Trace 列表和详情
- 性能图表
- 错误追踪
- 成本分析

#### 4.2 创建 Trace 详情页面

**文件：** `components/observability/trace-details.tsx`

**功能：**
- 显示完整的 trace 树
- 每个 span 的详细信息
- 时间线可视化
- 属性和事件查看

### 阶段 5：工作流模板市场

#### 5.1 创建模板存储

**文件：** `stores/workflow/template-store.ts`

**功能：**
- 管理本地和社区模板
- 模板元数据存储
- 使用统计
- 搜索和过滤

#### 5.2 创建模板市场 UI

**文件：** `components/workflow/template-marketplace.tsx`

**功能：**
- 模板画廊
- 分类和标签
- 搜索和过滤
- 模板预览
- 一键使用

#### 5.3 创建模板详情页面

**文件：** `components/workflow/template-details.tsx`

**功能：**
- 模板详细信息
- 使用说明
- 评分和评论
- 版本历史
- 使用统计

### 阶段 6：Git 集成

#### 6.1 创建 Git 工作流服务

**文件：** `lib/workflow/git-integration.ts`

**功能：**
- 从 Git 仓库克隆模板
- 推送工作流到 Git
- 创建分支
- 合并变更
- 冲突解决

#### 6.2 创建 Git 集成 UI

**文件：** `components/workflow/git-panel.tsx`

**功能：**
- Git 仓库管理
- 分支切换
- 提交和推送
- 拉取更新
- 历史查看

#### 6.3 集成到工作流编辑器

**修改文件：** `components/workflow-editor/workflow-editor-panel.tsx`

**功能：**
- 添加 Git 操作按钮
- 显示当前分支
- 提示未提交的变更
- 自动保存到 Git

## 四、技术细节

### 4.1 Langfuse 配置

```typescript
// lib/ai/observability/langfuse-client.ts
import { Langfuse } from '@langfuse/node';

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
});

export function createChatTrace(sessionId: string, userId?: string) {
  return langfuse.trace({
    name: 'ai-chat',
    sessionId,
    userId,
    metadata: {
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION,
    },
  });
}
```

### 4.2 OpenTelemetry 配置

```typescript
// lib/ai/observability/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
  resource: {
    serviceName: 'cognia-ai',
    serviceVersion: process.env.APP_VERSION,
  },
});

sdk.start();
```

### 4.3 模板存储结构

```typescript
interface TemplateStore {
  // 本地模板
  localTemplates: WorkflowEditorTemplate[];
  
  // 社区模板
  communityTemplates: WorkflowEditorTemplate[];
  
  // 模板使用统计
  templateStats: Map<string, TemplateStats>;
  
  // 操作
  loadTemplate: (id: string) => Promise<WorkflowEditorTemplate>;
  saveTemplate: (template: WorkflowEditorTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  cloneFromGit: (url: string) => Promise<WorkflowEditorTemplate>;
  pushToGit: (id: string, repo: string) => Promise<void>;
}
```

### 4.4 Git 工作流集成

```typescript
// lib/workflow/git-integration.ts
export class WorkflowGitIntegration {
  async cloneTemplate(
    repoUrl: string,
    templatePath: string
  ): Promise<WorkflowEditorTemplate> {
    // 1. Clone repository
    const repoInfo = await cloneRepo({
      url: repoUrl,
      targetPath: templatePath,
    });
    
    // 2. Read template file
    const template = await this.readTemplateFile(templatePath);
    
    // 3. Add Git metadata
    template.gitMetadata = {
      repoUrl,
      branch: repoInfo.currentBranch,
      commit: repoInfo.currentCommit,
      lastSync: new Date(),
    };
    
    return template;
  }
  
  async pushWorkflow(
    workflow: VisualWorkflow,
    repoUrl: string,
    branch: string,
    message: string
  ): Promise<void> {
    // 1. Commit workflow
    await commit(repoUrl, [workflow.id], message);
    
    // 2. Push to remote
    await push({
      repoPath: repoUrl,
      branch,
      set_upstream: true,
    });
  }
}
```

## 五、环境变量配置

```env
# Langfuse
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=cognia-ai
OTEL_RESOURCE_ATTRIBUTES=service.version=1.0.0

# Git Integration
GIT_DEFAULT_BRANCH=main
GIT_AUTO_COMMIT=true
GIT_AUTO_PUSH=false
```

## 六、测试策略

### 6.1 单元测试

- Langfuse 客户端测试
- OpenTelemetry 追踪测试
- 模板存储测试
- Git 集成测试（mock）

### 6.2 集成测试

- AI Chat + Langfuse 集成
- Agent + Langfuse 集成
- 模板市场端到端测试
- Git 工作流集成测试

### 6.3 E2E 测试

- 完整的可观测性流程
- 模板市场使用流程
- Git 集成工作流

## 七、性能考虑

- 异步发送遥测数据，不阻塞主流程
- 批量处理追踪数据
- 采样策略（生产环境）
- 本地缓存和重试机制

## 八、安全考虑

- API 密钥加密存储
- 敏感数据脱敏
- 访问控制
- 审计日志

## 九、时间估算

- 阶段 1：依赖安装 - 30 分钟
- 阶段 2：Langfuse 集成 - 4-6 小时
- 阶段 3：OpenTelemetry 集成 - 3-4 小时
- 阶段 4：可观测性仪表板 - 6-8 小时
- 阶段 5：工作流模板市场 - 8-10 小时
- 阶段 6：Git 集成 - 6-8 小时
- 测试和调试 - 4-6 小时

**总计：** 约 32-42 小时

## 十、下一步行动

1. 立即安装依赖
2. 创建 Langfuse 客户端
3. 集成到 AI Chat
4. 创建模板存储
5. 实现 Git 集成
6. 创建 UI 组件
7. 测试和优化
