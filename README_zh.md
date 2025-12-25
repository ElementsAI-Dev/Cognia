# Cognia

Cognia 是一款现代化的 AI 原生聊天与创作应用，支持多种 AI 模型和服务商。项目采用 Next.js 16 和 React 19.2 构建前端，通过 Tauri 2.9 实现跨平台桌面应用。同一代码库可同时部署为 Web 应用和桌面原生应用。

技术栈包括：Tailwind CSS v4、shadcn/ui、Zustand 状态管理、Dexie 持久化存储，以及 Vercel AI SDK v5 对接 OpenAI、Anthropic、Google、Mistral、Groq、DeepSeek、Ollama 等主流 AI 服务商。

[English Documentation](./README.md)

## 目录

- [核心特性](#核心特性)
- [技术架构](#技术架构)
- [前置要求](#前置要求)
- [快速开始](#快速开始)
- [开发指南](#开发指南)
- [项目结构](#项目结构)
- [核心功能](#核心功能)
  - [AI 模型集成](#ai-模型集成)
  - [工件系统](#工件系统)
  - [画布编辑器](#画布编辑器)
  - [MCP 支持](#mcp-支持)
  - [数据持久化](#数据持久化)
  - [项目管理](#项目管理)
- [配置说明](#配置说明)
- [生产构建](#生产构建)
- [部署指南](#部署指南)
- [测试策略](#测试策略)
- [故障排除](#故障排除)
- [资源链接](#资源链接)

## 核心特性

### AI 能力

- **多模型支持**：集成 7 家主流 AI 服务商（OpenAI、Anthropic、Google、Mistral、Groq、DeepSeek、Ollama）
- **智能路由**：自动根据任务复杂度选择最优模型（快速/平衡/强力三档）
- **流式响应**：实时显示 AI 生成内容
- **多模态支持**：视觉模型支持图像分析
- **图像生成**：集成 DALL-E 文生图功能
- **工具调用**：支持 Function Calling 和 MCP 工具调用

### 聊天体验

- **多种对话模式**：聊天模式、代理模式、研究模式
- **对话分支**：从任意节点创建分支探索不同对话路径
- **消息管理**：编辑消息、重试响应、删除对话
- **语音输入**：集成 Web Speech API 语音转文字
- **文件上传**：支持拖拽上传和剪贴板粘贴图片
- **会话搜索**：全文搜索历史对话内容
- **记忆系统**：跨会话持久化 AI 记忆
- **自定义指令**：全局和会话级自定义指令

### 内容创作

- **工件系统**：AI 可生成代码、文档、图表、数学公式等独立内容
- **画布编辑器**：Monaco 编辑器集成 AI 建议和代码转换
- **版本历史**：画布文档自动保存和版本恢复
- **多格式预览**：支持 HTML、React、SVG、Mermaid、图表等预览

### 数据管理

- **项目组织**：将对话组织到项目中，支持知识库
- **导出功能**：导出为 PDF、Markdown、JSON、HTML 等格式
- **预设管理**：保存和加载聊天配置预设
- **使用统计**：Token 计数和成本估算

### 桌面能力

- **MCP 集成**：完整支持 Model Context Protocol，扩展 AI 能力
- **原生功能**：文件系统访问、系统对话框、剪贴板等
- **离线运行**：静态导出支持离线使用

## 技术架构

### 技术栈

#### 前端框架

- Next.js 16（App Router）
- React 19.2
- TypeScript 5

#### UI 组件

- Tailwind CSS v4（PostCSS）
- shadcn/ui + Radix UI（50+ 组件）
- Lucide 图标库
- Monaco 编辑器（代码编辑）
- Shiki 语法高亮（30+ 语言）

#### 状态管理

- Zustand v5（客户端状态）
- Dexie（IndexedDB 持久化）
- localStorage 持久化中间件

#### AI 集成

- Vercel AI SDK v5
- 7 家服务商支持
- 流式响应处理
- 工具调用支持

#### 桌面应用

- Tauri 2.9（跨平台）
- Rust 后端
- 原生能力封装

#### 可视化

- Recharts（数据图表）
- Xyflow（流程图）
- KaTeX（数学公式）
- Mermaid（图表）

#### 测试

- Jest（单元测试）
- React Testing Library
- Playwright（端到端测试）

### 架构原则

- **静态优先**：生产环境使用静态导出，无服务器依赖
- **客户端主导**：状态管理和数据持久化均在客户端完成
- **渐进增强**：Web 端可通过 Tauri 增强为桌面应用
- **类型安全**：全面使用 TypeScript 类型系统
- **组件化**：功能模块化和 UI 组件复用

## 前置要求

### Web 开发

- **Node.js** 20.x 或更高版本
- **pnpm** 8.x 或更高版本（推荐）

```bash
# 安装 pnpm
npm install -g pnpm
```

### 桌面开发（额外要求）

- **Rust** 1.70 或更高版本

```bash
# 验证安装
rustc --version
cargo --version
```

- **系统依赖**
  - Windows：Microsoft Visual Studio C++ 构建工具
  - macOS：Xcode 命令行工具（`xcode-select --install`）
  - Linux：参见 [Tauri 前置要求](https://tauri.app/v1/guides/getting-started/prerequisites)

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/your-username/cognia.git
cd cognia
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

创建 `.env.local` 文件并添加必要的 API 密钥：

```env
# OpenAI（可选）
OPENAI_API_KEY=sk-your-openai-key

# Anthropic（可选）
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Google Gemini（可选）
GOOGLE_API_KEY=your-google-api-key

# DeepSeek（可选）
DEEPSEEK_API_KEY=sk-your-deepseek-key

# Groq（可选）
GROQ_API_KEY=gsk-your-groq-key
```

### 4. 启动开发服务器

#### Web 应用

```bash
pnpm dev
```

访问：<http://localhost:3000>

#### 桌面应用

```bash
pnpm tauri dev
```

### 5. 验证安装

- 检查 Next.js：访问开发服务器
- 检查 Tauri：运行 `pnpm tauri info`
- 运行测试：`pnpm test`

## 开发指南

### 可用脚本

```bash
# 开发
pnpm dev              # 启动 Next.js 开发服务器（localhost:3000）
pnpm tauri dev        # 启动 Tauri 桌面开发模式

# 构建
pnpm build            # 构建生产版本（静态导出到 out/）
pnpm start            # 启动生产服务（需先运行 pnpm build）
pnpm tauri build      # 构建桌面应用安装包

# 代码质量
pnpm lint             # 运行 ESLint 检查
pnpm lint:fix         # 自动修复 ESLint 问题

# 测试
pnpm test             # 运行 Jest 单元测试
pnpm test:watch       # Jest 监视模式
pnpm test:coverage    # Jest 测试覆盖率
pnpm test:e2e         # 运行 Playwright 端到端测试
pnpm test:e2e:ui      # Playwright UI 模式
pnpm test:e2e:headed  # Playwright 有头浏览器模式
```

### 添加 UI 组件

使用 shadcn CLI 添加 Radix UI 组件：

```bash
pnpm dlx shadcn@latest add <component-name>
```

示例：

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add dropdown-menu
```

### 创建新 Store

Zustand stores 位于 `/stores/` 目录：

```typescript
// stores/example-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ExampleState {
  data: string;
  setData: (data: string) => void;
}

export const useExampleStore = create<ExampleState>()(
  persist(
    (set) => ({
      data: '',
      setData: (data) => set({ data }),
    }),
    {
      name: 'cognia-example', // localStorage key
    }
  )
);
```

### 添加新功能模块

1. 在 `/components/` 创建功能组件
2. 在 `/types/` 添加类型定义
3. 在 `/stores/` 创建状态管理
4. 在 `/hooks/` 创建自定义 Hook（如需要）
5. 在 `/lib/` 添加工具函数（如需要）

## 项目结构

```text
cognia/
├── app/                          # Next.js App Router
│   ├── (chat)/                   # 聊天界面路由组
│   │   └── page.tsx              # 主聊天界面
│   ├── settings/                 # 设置页面
│   │   └── page.tsx              # 设置主页面（7 个标签页）
│   ├── projects/                 # 项目管理页面
│   │   └── page.tsx              # 项目列表和详情
│   ├── designer/                 # 设计器页面
│   ├── api/                      # API 路由（开发时使用）
│   ├── skills/                   # 技能路由
│   ├── page.tsx                  # 应用主页
│   ├── layout.tsx                # 根布局和全局配置
│   ├── providers.tsx             # 客户端 Provider 包装器
│   └── globals.css               # 全局样式和 Tailwind 配置
│
├── components/                   # React 组件
│   ├── ai-elements/              # AI 专用组件库（30+ 组件）
│   │   ├── message.tsx           # 消息渲染
│   │   ├── code-block.tsx        # 代码块显示
│   │   ├── reasoning.tsx         # 推理过程可视化
│   │   ├── artifact.tsx          # 工件卡片
│   │   ├── plan.tsx              # 计划显示
│   │   └── ...                   # 更多 AI 组件
│   ├── artifacts/                # 工件系统
│   │   ├── artifact-panel.tsx    # 工件面板
│   │   ├── artifact-preview.tsx  # 工件预览
│   │   └── artifact-renderers.tsx # 各类型工件渲染器
│   ├── canvas/                   # 画布编辑器
│   │   ├── canvas-panel.tsx      # Monaco 编辑器面板
│   │   ├── version-history-panel.tsx # 版本历史面板
│   │   └── index.ts
│   ├── agent/                    # 代理模式组件
│   │   ├── agent-mode-selector.tsx
│   │   ├── agent-plan-editor.tsx
│   │   ├── agent-steps.tsx       # 执行步骤可视化
│   │   └── workflow-selector.tsx
│   ├── chat/                     # 聊天界面组件
│   │   ├── chat-container.tsx    # 主容器和编排器
│   │   ├── chat-input.tsx        # 输入框（语音+文件）
│   │   ├── chat-header.tsx       # 模式/模型/预设选择器
│   │   ├── welcome-state.tsx     # 模式特定欢迎页
│   │   ├── branch-selector.tsx   # 对话分支选择器
│   │   ├── export-dialog.tsx     # 导出对话框
│   │   ├── image-generation-dialog.tsx # 图像生成对话框
│   │   ├── context-settings-dialog.tsx  # 上下文设置
│   │   ├── preset-manager-dialog.tsx    # 预设管理
│   │   ├── model-picker-dialog.tsx      # 模型选择
│   │   ├── mention-popover.tsx   # 提及功能
│   │   ├── markdown-renderer.tsx # Markdown 渲染
│   │   └── renderers/            # 专用渲染器
│   │       ├── code-block.tsx
│   │       ├── math-block.tsx
│   │       ├── mermaid-block.tsx
│   │       ├── vegalite-block.tsx
│   │       └── enhanced-table.tsx
│   ├── projects/                 # 项目管理组件
│   │   ├── project-list.tsx      # 项目列表
│   │   ├── project-card.tsx      # 项目卡片
│   │   ├── create-project-dialog.tsx
│   │   ├── knowledge-base.tsx    # 知识库管理
│   │   ├── project-templates.tsx # 项目模板
│   │   └── import-export-dialog.tsx
│   ├── presets/                  # 预设系统
│   │   ├── preset-selector.tsx   # 快速预设选择
│   │   ├── preset-card.tsx       # 预设卡片
│   │   ├── create-preset-dialog.tsx
│   │   └── presets-manager.tsx
│   ├── settings/                 # 设置页面组件
│   │   ├── provider-settings.tsx # 服务商配置
│   │   ├── custom-instructions-settings.tsx # 自定义指令
│   │   ├── memory-settings.tsx   # 记忆管理
│   │   ├── usage-settings.tsx    # 使用统计
│   │   ├── keyboard-settings.tsx # 快捷键设置
│   │   ├── speech-settings.tsx   # 语音设置
│   │   ├── data-settings.tsx     # 数据管理
│   │   ├── mcp-settings.tsx      # MCP 服务器管理
│   │   ├── mcp-server-dialog.tsx # MCP 服务器对话框
│   │   ├── mcp-install-wizard.tsx # MCP 快速安装向导
│   │   └── setup-wizard.tsx      # 首次设置向导
│   ├── export/                   # 导出功能
│   │   ├── document-export-dialog.tsx
│   │   └── index.ts
│   ├── layout/                   # 布局组件
│   │   ├── command-palette.tsx   # 命令面板
│   │   ├── keyboard-shortcuts-dialog.tsx
│   │   └── mobile-nav.tsx
│   ├── sidebar/                  # 侧边栏组件
│   │   └── app-sidebar.tsx
│   ├── learning/                 # 学习模式组件
│   ├── skills/                   # 技能组件
│   ├── providers/                # Provider 组件
│   │   ├── skill-provider.tsx
│   │   └── index.ts
│   └── ui/                       # shadcn/ui 基础组件（50+）
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       └── ...
│
├── hooks/                        # 自定义 React Hooks
│   ├── use-agent.ts              # 代理模式 Hook
│   ├── use-messages.ts           # 消息持久化
│   ├── use-session-search.ts     # 会话搜索
│   ├── use-keyboard-shortcuts.ts # 全局快捷键
│   ├── use-rag.ts                # RAG 检索
│   ├── use-vector-db.ts          # 向量数据库
│   ├── use-speech.ts             # 语音输入
│   ├── use-learning-mode.ts      # 学习模式
│   ├── use-workflow.ts           # 工作流
│   ├── use-skills.ts             # 技能系统
│   ├── use-structured-output.ts  # 结构化输出
│   ├── use-translate.ts          # 翻译
│   ├── use-global-shortcuts.test.ts
│   └── index.ts
│
├── lib/                          # 工具库
│   ├── ai/                       # AI 集成
│   │   ├── client.ts             # 服务商客户端创建
│   │   ├── use-ai-chat.ts        # 聊天 Hook（含使用跟踪）
│   │   ├── auto-router.ts        # 智能模型路由
│   │   ├── image-utils.ts        # 视觉支持工具
│   │   ├── image-generation.ts   # DALL-E 集成
│   │   ├── speech-api.ts         # 语音 API
│   │   ├── agent-tools.ts        # 代理工具
│   │   ├── tools/                # 工具定义
│   │   ├── workflows/            # 工作流定义
│   │   └── index.ts
│   ├── db/                       # 数据库
│   │   ├── index.ts              # Dexie 设置
│   │   └── message-repository.ts # 消息持久化
│   ├── document/                 # 文档处理
│   │   └── table-extractor.ts    # 表格提取
│   ├── export/                   # 导出功能
│   │   ├── pdf-export.ts         # PDF 导出
│   │   ├── markdown-export.ts    # Markdown 导出
│   │   ├── json-export.ts        # JSON 导出
│   │   ├── html-export.ts        # HTML 导出
│   │   ├── word-export.ts        # Word 导出
│   │   ├── excel-export.ts       # Excel 导出
│   │   └── google-sheets-export.ts # Google Sheets 导出
│   ├── file/                     # 文件工具
│   ├── i18n/                     # 国际化
│   │   └── messages/
│   │       ├── en.json
│   │       └── zh-CN.json
│   ├── learning/                 # 学习模式
│   ├── native/                   # Tauri 原生调用
│   ├── search/                   # 搜索工具
│   ├── skills/                   # 技能系统
│   ├── themes/                   # 主题配置
│   ├── vector/                   # 向量数据库集成
│   │   ├── store.ts
│   │   └── index.ts
│   └── utils.ts                  # 通用工具（cn 等）
│
├── stores/                       # Zustand 状态管理
│   ├── artifact-store.ts         # 工件、画布、版本历史
│   ├── settings-store.ts         # 用户设置和服务商配置
│   ├── session-store.ts          # 会话和分支
│   ├── agent-store.ts            # 代理执行跟踪
│   ├── memory-store.ts           # 跨会话记忆
│   ├── project-store.ts          # 项目管理
│   ├── preset-store.ts           # 预设管理
│   ├── usage-store.ts            # Token 和成本跟踪
│   ├── mcp-store.ts              # MCP 服务器管理
│   ├── workflow-store.ts         # 工作流管理
│   ├── learning-store.ts         # 学习模式状态
│   └── index.ts                  # Store 导出
│
├── types/                        # TypeScript 类型定义
│   ├── artifact.ts               # 工件类型（8 种类型、17+ 语言）
│   ├── session.ts                # 会话和分支类型
│   ├── message.ts                # 消息类型（含分支支持）
│   ├── provider.ts               # 服务商配置
│   ├── memory.ts                 # 记忆类型
│   ├── project.ts                # 项目类型
│   ├── preset.ts                 # 预设类型
│   ├── usage.ts                  # 使用跟踪类型
│   ├── mcp.ts                    # MCP 类型
│   ├── agent-mode.ts             # 代理模式类型
│   ├── learning.ts               # 学习模式类型
│   ├── skill.ts                  # 技能类型
│   ├── speech.ts                 # 语音类型
│   ├── workflow.ts               # 工作流类型
│   └── index.ts
│
├── e2e/                          # Playwright 端到端测试
│   ├── ai/                       # AI 功能测试
│   ├── core/                     # 核心功能测试
│   ├── features/                 # 特性测试
│   │   ├── math-renderer.spec.ts
│   │   ├── settings-ollama.spec.ts
│   │   ├── projects-knowledge-base.spec.ts
│   │   ├── learning-mode.spec.ts
│   │   ├── ppt-enhanced.spec.ts
│   │   ├── ppt.spec.ts
│   │   └── skills-enhanced.spec.ts
│   └── ui/                       # UI 测试
│
├── src-tauri/                    # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs               # Rust 入口点
│   │   ├── lib.rs                # 库代码
│   │   ├── commands/             # Tauri 命令
│   │   │   ├── mod.rs
│   │   │   └── vector.rs         # 向量数据库命令
│   │   └── mcp/                  # MCP 实现
│   │       ├── mod.rs
│   │       ├── manager.rs        # 服务器生命周期管理
│   │       ├── client.rs         # MCP 客户端
│   │       ├── config.rs         # 配置管理
│   │       ├── transport/        # 传输层
│   │       └── protocol/         # 协议实现
│   ├── tauri.conf.json           # Tauri 配置
│   ├── Cargo.toml                # Rust 依赖
│   └── capabilities/             # 权限配置
│
├── llmdoc/                       # 项目文档
│   ├── index.md                  # 文档索引
│   └── feature/                  # 功能文档
│       ├── phase-2-overview.md
│       ├── enhanced-features.md
│       ├── mcp-system.md
│       └── ...
│
├── public/                       # 静态资源
├── __mocks__/                    # Jest Mocks
├── .github/                      # GitHub 配置
├── components.json               # shadcn/ui 配置
├── next.config.ts                # Next.js 配置
├── tailwind.config.ts            # Tailwind 配置
├── tsconfig.json                 # TypeScript 配置
├── jest.config.ts                # Jest 配置
├── playwright.config.ts          # Playwright 配置
├── package.json                  # 依赖和脚本
├── pnpm-lock.yaml                # pnpm 锁文件
├── CLAUDE.md                     # Claude AI 指令
├── CHANGELOG.md                  # 变更日志
└── README_zh.md                  # 中文文档
```

## 核心功能

### AI 模型集成

#### 支持的服务商

Cognia 通过 Vercel AI SDK v5 集成以下服务商：

| 服务商 | 模型示例 | 特性 |
| ------- | -------- | ---- |
| OpenAI | GPT-4o, GPT-4o-mini, o1, o1-mini | 视觉、工具调用、流式 |
| Anthropic | Claude 4 Sonnet/Opus, Claude 3.5 Haiku | 长上下文、视觉 |
| Google | Gemini 2.0 Flash, Gemini 1.5 Pro/Flash | 视觉、长上下文 |
| Mistral | Mistral Large, Mistral Small | 高性能 |
| DeepSeek | deepseek-chat, deepseek-coder | 代码优化 |
| Groq | Llama 3.3, Mixtral | 低延迟 |
| Ollama | 本地模型 | 离线、隐私 |

#### 智能自动路由

`lib/ai/auto-router.ts` 实现三层智能路由：

```typescript
// 快速档：简单查询
- Groq Llama 3.3 (70 tokens/M)
- Gemini Flash
- GPT-4o Mini
- Claude Haiku

// 平衡档：常规任务
- Gemini 1.5 Pro
- GPT-4o
- Claude Sonnet

// 强力档：复杂推理
- Claude Opus
- OpenAI o1
- DeepSeek Reasoner
```

#### 流式响应

所有服务商支持流式响应，实时显示 AI 生成内容：

```typescript
const { messages, handleSubmit, isLoading } = useAIChat({
  api: '/api/chat',
  stream: true,
  onFinish: (message) => {
    // 记录使用统计
    addUsageRecord({ ... });
  }
});
```

### 工件系统

工件系统允许 AI 生成独立的、可预览的内容片段。

#### 支持的工件类型

```typescript
type ArtifactType =
  | 'code'        // 代码片段（17+ 语言）
  | 'document'    // 文本文档
  | 'svg'         // SVG 矢量图
  | 'html'        // HTML 页面
  | 'react'       // React 组件
  | 'mermaid'     // Mermaid 图表
  | 'chart'       // 数据图表（Recharts）
  | 'math';       // 数学公式（KaTeX）
```

#### 工件存储

工件持久化到 localStorage（key: `cognia-artifacts`）：

```typescript
interface Artifact {
  id: string;
  sessionId: string;
  messageId: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string;
  createdAt: Date;
}
```

#### 使用示例

```typescript
import { useArtifactStore } from '@/stores/artifact-store';

// 创建工件
const { createArtifact } = useArtifactStore();
createArtifact({
  sessionId: 'session-123',
  messageId: 'msg-456',
  type: 'code',
  title: '快速排序算法',
  content: 'function quickSort(arr) { ... }',
  language: 'typescript'
});

// 工件面板自动打开并显示工件
```

### 画布编辑器

基于 Monaco 编辑器的代码编辑器，支持 AI 建议和版本历史。

#### 核心功能

- **Monaco 编辑器**：VS Code 同款编辑器
- **语法高亮**：Shiki 支持 30+ 语言
- **AI 建议**：AI 可添加改进建议
- **代码转换**：重构、优化、解释等操作
- **版本历史**：自动保存和手动版本点
- **差异对比**：版本间对比

#### 画布操作

```typescript
// 添加 AI 建议
useArtifactStore().addSuggestion(documentId, {
  type: 'fix', // fix | improve | refactor | explain
  range: { startLine: 10, endLine: 15 },
  originalText: 'const x = 1;',
  suggestedText: 'const x: number = 1;',
  explanation: '添加类型注解',
  status: 'pending'
});

// 保存版本
saveCanvasVersion(documentId, '优化性能', false);

// 恢复版本
restoreCanvasVersion(documentId, versionId);
```

### MCP 支持

完整实现 Model Context Protocol，可扩展 AI 能力。

#### MCP 架构

```text
Frontend (React)
  ↓ Tauri IPC
Rust Backend (Tauri)
  ↓ stdio/SSE
MCP Servers (External)
```

#### Rust 后端

位置：`src-tauri/src/mcp/`

- `manager.rs` - 服务器生命周期管理
- `client.rs` - JSON-RPC 2.0 协议实现
- `transport/stdio.rs` - stdio 传输
- `transport/sse.rs` - SSE 传输
- `protocol/tools.rs` - 工具协议
- `protocol/resources.rs` - 资源协议
- `protocol/prompts.rs` - 提示协议

#### 前端 Store

位置：`stores/mcp-store.ts`

```typescript
interface McpState {
  servers: McpServerState[];
  initialize: () => Promise<void>;
  addServer: (id: string, config: McpServerConfig) => Promise<void>;
  connectServer: (id: string) => Promise<void>;
  callTool: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<ToolCallResult>;
  // ...
}
```

#### 支持的服务器模板

内置快速安装模板：

1. **Filesystem** - 本地文件操作
2. **GitHub** - GitHub API 访问
3. **PostgreSQL** - 数据库查询
4. **SQLite** - 数据库查询
5. **Brave Search** - 网页搜索
6. **Memory** - 持久化记忆
7. **Puppeteer** - 浏览器自动化
8. **Slack** - Slack 集成

#### 配置文件

位置：`{app_data}/mcp_servers.json`

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
      "env": {},
      "connectionType": "stdio"
    }
  }
}
```

### 数据持久化

#### IndexedDB（Dexie）

消息和附件持久化到 IndexedDB：

```typescript
// lib/db/message-repository.ts
export const messageRepository = {
  async create(sessionId: string, message: CreateMessageInput): Promise<UIMessage>;
  async update(id: string, updates: Partial<UIMessage>): Promise<void>;
  async delete(id: string): Promise<void>;
  async findBySession(sessionId: string): Promise<UIMessage[]>;
};
```

#### Zustand + localStorage

所有 stores 使用 persist 中间件自动保存到 localStorage：

```typescript
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({ ... }),
    { name: 'cognia-settings' }
  )
);
```

#### 存储 Keys

| Store | localStorage Key |
| ----- | ---------------- |
| settings | `cognia-settings` |
| sessions | `cognia-sessions` |
| artifacts | `cognia-artifacts` |
| memory | `cognia-memory` |
| projects | `cognia-projects` |
| usage | `cognia-usage` |
| presets | `cognia-presets` |
| mcp | `cognia-mcp` |

### 项目管理

#### 项目数据结构

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  customInstructions?: string;
  defaultProvider?: string;
  defaultModel?: string;
  knowledgeBase: KnowledgeFile[];
  sessionIds: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### 知识库

每个项目可关联知识库文件：

```typescript
interface KnowledgeFile {
  id: string;
  name: string;
  type: 'text' | 'file' | 'url';
  content: string;
  size?: number;
  addedAt: Date;
}
```

#### 项目操作示例

```typescript
import { useProjectStore } from '@/stores/project-store';

// 创建项目
createProject({ name: '新项目', description: '...' });

// 添加知识库文件
addKnowledgeFile(projectId, { name: 'doc.txt', content: '...' });

// 添加会话到项目
addSessionToProject(projectId, sessionId);
```

## 配置说明

### 环境变量

创建 `.env.local` 文件：

```env
# 仅服务器端可访问（构建时）
DATABASE_URL=postgresql://...
API_SECRET_KEY=your-secret-key

# 客户端可访问（以 NEXT_PUBLIC_ 开头）
NEXT_PUBLIC_APP_NAME=Cognia
NEXT_PUBLIC_API_URL=https://api.example.com

# AI 服务商密钥
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
DEEPSEEK_API_KEY=sk-...
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=...
```

**安全提示**：

- 切勿提交 `.env.local` 到版本控制
- 仅添加使用的服务商密钥
- 密钥存储在浏览器 localStorage，不加密

### Tauri 配置

编辑 `src-tauri/tauri.conf.json`：

```json
{
  "productName": "Cognia",
  "version": "1.0.0",
  "identifier": "com.cognia.app",
  "build": {
    "frontendDist": "../out",
    "devUrl": "http://localhost:3000"
  },
  "app": {
    "windows": [{
      "title": "Cognia",
      "width": 1280,
      "height": 800,
      "resizable": true,
      "fullscreen": false
    }]
  }
}
```

### 路径别名

在 `tsconfig.json` 中配置：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/stores/*": ["./stores/*"],
      "@/types/*": ["./types/*"],
      "@/ui/*": ["./components/ui/*"]
    }
  }
}
```

### Tailwind CSS

使用 Tailwind v4 和 CSS 变量主题化：

```css
/* app/globals.css */
@theme inline {
  --color-primary: *;
  --color-secondary: *;
  --radius: 0.5rem;
}

.dark {
  --color-background: oklch(0.1 0 0);
  --color-foreground: oklch(0.95 0 0);
}
```

## 生产构建

### Web 应用构建

```bash
# 构建静态导出
pnpm build

# 输出目录：out/
# 优化内容：HTML、CSS、JS、字体、图片

# 预览生产构建
pnpm start
```

### 桌面应用构建

```bash
# 为当前平台构建
pnpm tauri build

# 输出位置：
# - Windows: src-tauri/target/release/bundle/msi/
# - macOS: src-tauri/target/release/bundle/dmg/
# - Linux: src-tauri/target/release/bundle/appimage/

# 构建选项
pnpm tauri build --target x86_64-pc-windows-msvc  # 特定目标
pnpm tauri build --debug                           # 调试符号
pnpm tauri build --bundles none                    # 不打包
```

## 部署指南

### Web 部署

`out/` 目录可部署到任何静态托管服务：

#### Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

#### Netlify

```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 部署
netlify deploy --prod --dir=out
```

#### 静态 CDN

直接上传 `out/` 目录到：

- AWS S3 + CloudFront
- Azure Static Web Apps
- GitHub Pages
- Cloudflare Pages

### 桌面应用分发

构建产物位置：

- Windows：`.msi` / `.exe`
- macOS：`.dmg` / `.app`
- Linux：`.AppImage` / `.deb`

分发渠道：

- GitHub Releases
- 官网下载
- 应用商店（Windows Store、Mac App Store）

## 测试策略

### 单元测试（Jest）

```bash
# 运行所有测试
pnpm test

# 监视模式
pnpm test:watch

# 覆盖率报告
pnpm test:coverage
```

覆盖率要求：

- 语句覆盖率：70%
- 分支覆盖率：60%
- 函数覆盖率：60%

### 端到端测试（Playwright）

```bash
# 运行所有 E2E 测试
pnpm test:e2e

# UI 模式
pnpm test:e2e:ui

# 有头浏览器
pnpm test:e2e:headed
```

测试组织：

- `e2e/ai/` - AI 功能测试
- `e2e/core/` - 核心功能测试
- `e2e/features/` - 特性测试
- `e2e/ui/` - UI 测试

### Lint 检查

```bash
# 运行 ESLint
pnpm lint

# 自动修复
pnpm lint:fix
```

## 故障排除

### 端口被占用

#### Windows

```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### macOS/Linux

```bash
lsof -ti:3000 | xargs kill -9
```

### Tauri 构建失败

```bash
# 检查环境
pnpm tauri info

# 更新 Rust
rustup update

# 清理构建缓存
cd src-tauri
cargo clean
```

### 模块未找到

```bash
# 清除 Next.js 缓存
rm -rf .next

# 重新安装依赖
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Ollama 连接失败

1. 确保 Ollama 服务运行：`ollama serve`
2. 验证端口：`curl http://localhost:11434`
3. 检查防火墙设置
4. 确认模型已下载：`ollama list`

### MCP 服务器启动失败

1. 检查命令路径：`which <command>`
2. 验证环境变量配置
3. 查看服务器日志
4. 手动测试命令：`npx @modelcontextprotocol/server-filesystem --help`

## 资源链接

### 官方文档

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev)
- [Tauri 文档](https://tauri.app/)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

### 相关技术

- [Radix UI](https://www.radix-ui.com/)
- [Lucide 图标](https://lucide.dev/)
- [Monaco 编辑器](https://microsoft.github.io/monaco-editor/)
- [Dexie.js](https://dexie.org/)
- [Playwright](https://playwright.dev/)
- [Jest](https://jestjs.io/)

### 项目文档

- [llmdoc/index.md](llmdoc/index.md) - 项目文档索引
- [CLAUDE.md](CLAUDE.md) - Claude AI 指令
- [CHANGELOG.md](CHANGELOG.md) - 变更日志

## 开发工作流

### 典型开发流程

1. 启动开发服务器

   ```bash
   pnpm dev        # Web 开发
   pnpm tauri dev  # 桌面开发
   ```

2. 在 `app/`、`components/`、`lib/`、`stores/`、`hooks/` 中开发

3. 添加 UI 组件（如需要）

   ```bash
   pnpm dlx shadcn@latest add <component>
   ```

4. 代码检查

   ```bash
   pnpm lint
   pnpm lint:fix
   ```

5. 运行测试

   ```bash
   pnpm test
   pnpm test:e2e
   ```

6. 构建验证

   ```bash
   pnpm build
   pnpm tauri build
   ```

### 代码规范

- **TypeScript**：使用严格模式
- **组件**：函数组件 + Hooks
- **样式**：Tailwind CSS + cn() 工具
- **状态**：Zustand stores + persist
- **类型**：使用 `/types/` 中的类型定义
- **导入**：使用路径别名（@/components、@/lib 等）

### Git 工作流

```bash
# 创建功能分支
git checkout -b feature/amazing-feature

# 提交更改（使用约定式提交）
git commit -m 'feat: add amazing feature'

# 推送分支
git push origin feature/amazing-feature

# 创建 Pull Request
```

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支
3. 提交更改（使用约定式提交）
4. 推送到分支
5. 创建 Pull Request

### 约定式提交规范

```text
feat: 新功能
fix: 修复 Bug
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

---

**最后更新**：2025 年 12 月 25 日

**维护者**：Cognia 开发团队
