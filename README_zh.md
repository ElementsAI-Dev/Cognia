# Cognia

Cognia 是一款现代化的 AI 原生聊天与创作平台，支持全面的多服务商集成。采用 Next.js 16 和 React 19.2 构建，通过 Tauri 2.9 实现跨平台桌面应用。

**技术栈**：Tailwind CSS v4、shadcn/ui、Zustand、Dexie、Vercel AI SDK v5，支持 **14 家 AI 服务商**（OpenAI、Anthropic、Google、Mistral、Groq、DeepSeek、Ollama、xAI、Together AI、OpenRouter、Cohere、Fireworks、Cerebras、SambaNova）。

[English Documentation](./README.md)

## 目录

- [概述](#概述)
- [核心特性](#核心特性)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
- [开发指南](#开发指南)
- [项目结构](#项目结构)
- [核心系统](#核心系统)
  - [AI 模型集成](#ai-模型集成)
  - [代理系统](#代理系统)
  - [MCP 支持](#mcp-支持)
  - [原生工具](#原生工具)
  - [设计器系统](#设计器系统)
  - [工作流编辑器](#工作流编辑器)
  - [技能系统](#技能系统)
  - [学习模式](#学习模式)
  - [工件与画布](#工件与画布)
  - [数据持久化](#数据持久化)
  - [项目管理](#项目管理)
- [配置说明](#配置说明)
- [生产构建](#生产构建)
- [部署指南](#部署指南)
- [测试策略](#测试策略)
- [故障排除](#故障排除)
- [资源链接](#资源链接)

## 概述

Cognia 是一款全面的 AI 原生聊天与创作平台，支持 **14 家 AI 服务商**，具备高级功能：

- **混合架构**：可作为 Next.js Web 应用或 Tauri 桌面应用运行
- **代理系统**：自主 AI 代理，支持工具调用、规划和子代理协调
- **原生工具**：桌面专属功能（选择、感知、上下文、截图）
- **可视化编辑器**：V0 风格设计器、工作流编辑器、AI 建议画布
- **学习模式**：交互式教育功能，含闪卡和测验
- **完整 MCP 支持**：模型上下文协议扩展 AI 能力

## 核心特性

### AI 能力

- **14 家 AI 服务商**：OpenAI、Anthropic、Google、Mistral、Groq、DeepSeek、Ollama、xAI、Together AI、OpenRouter、Cohere、Fireworks、Cerebras、SambaNova
- **智能自动路由**：三层路由（快速/平衡/强力），支持规则和 LLM 两种模式
- **流式响应**：实时显示 AI 生成内容
- **多模态支持**：视觉模型支持图像分析
- **图像生成**：集成 DALL-E 文生图功能
- **工具调用**：支持 Function Calling 和 MCP 工具调用

### 代理系统

- **自主代理**：多步骤任务执行，支持规划和工具调用
- **子代理协调**：协调多个代理完成复杂任务
- **后台代理**：异步队列执行任务
- **内置工具**：文件操作、搜索、网络访问
- **技能集成**：自定义技能执行框架

### 聊天体验

- **多种对话模式**：聊天模式、代理模式、研究模式、学习模式
- **对话分支**：从任意节点创建分支探索不同对话路径
- **消息管理**：编辑消息、重试响应、删除对话
- **语音输入**：集成 Web Speech API 语音转文字
- **文件上传**：支持拖拽上传和剪贴板粘贴图片
- **会话搜索**：全文搜索历史对话内容
- **记忆系统**：跨会话持久化 AI 记忆
- **自定义指令**：全局和会话级自定义指令

### 内容创作

- **工件系统**：AI 生成代码、文档、图表、数学公式
- **画布编辑器**：Monaco 编辑器集成 AI 建议和代码转换
- **设计器**：V0 风格可视化网页设计器，40+ 组件
- **工作流编辑器**：React Flow 可视化工作流自动化
- **版本历史**：文档自动保存和版本恢复

### 桌面能力（Tauri）

- **原生工具**：选择、感知、上下文、OCR 截图
- **MCP 集成**：完整支持 Model Context Protocol
- **沙箱**：Docker/Podman 代码执行环境
- **文件系统访问**：原生文件操作和对话框

### 数据与导出

- **项目组织**：将对话组织到项目中，支持知识库
- **多格式导出**：PDF、Markdown、JSON、HTML、Word、Excel、PowerPoint
- **预设管理**：保存和加载聊天配置预设
- **使用统计**：Token 计数和成本估算

## 技术架构

| 类别 | 技术 | 用途 |
| ---- | ---- | ---- |
| **前端框架** | Next.js 16 (App Router) | React SSR/SSG 框架 |
| | React 19.2 | UI 库 |
| | TypeScript 5 | 类型安全 |
| **UI 组件** | Tailwind CSS v4 | 原子化 CSS |
| | shadcn/ui + Radix UI | 组件库 |
| | Lucide Icons | 图标库 |
| | Monaco Editor | 代码编辑器 |
| **状态管理** | Zustand v5 | 客户端状态 |
| | Dexie | IndexedDB 封装 |
| **AI 集成** | Vercel AI SDK v5 | LLM 集成 |
| | 14 家服务商 | 多模型支持 |
| **桌面** | Tauri 2.9 | 跨平台应用 |
| | Rust | 原生后端 |
| **可视化** | Recharts | 数据图表 |
| | Xyflow | 流程图 |
| | KaTeX | 数学公式 |
| | Mermaid | 图表 |
| **测试** | Jest | 单元测试 |
| | Playwright | 端到端测试 |

## 快速开始

### 前置要求

**Web 开发**：

- Node.js 20.x 或更高版本
- pnpm 8.x 或更高版本

**桌面开发（额外要求）**：

- Rust 1.70 或更高版本

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

创建 `.env.local` 文件：

```env
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GOOGLE_API_KEY=your-google-api-key
```

### 4. 启动开发服务器

```bash
# Web 应用
pnpm dev

# 桌面应用
pnpm tauri dev
```

访问：<http://localhost:3000>

## 开发指南

### 可用脚本

```bash
# 开发
pnpm dev              # 启动 Next.js 开发服务器
pnpm tauri dev        # 启动 Tauri 桌面开发模式

# 构建
pnpm build            # 构建生产版本（静态导出到 out/）
pnpm tauri build      # 构建桌面应用安装包
pnpm tauri:android:init  # 初始化 Android 工程（一次性）
pnpm tauri:android:dev   # Android 开发构建
pnpm tauri:android:build # 构建 Android APK + AAB

# 代码质量
pnpm lint             # 运行 ESLint 检查
pnpm lint --fix       # 自动修复 ESLint 问题

# 测试
pnpm test             # 运行 Jest 单元测试
pnpm test:watch       # Jest 监视模式
pnpm test:coverage    # Jest 测试覆盖率
pnpm test:e2e         # 运行 Playwright 端到端测试
pnpm test:e2e:ui      # Playwright UI 模式
```

## 项目结构

```text
cognia/
├── app/                          # Next.js App Router
│   ├── (chat)/                   # 主聊天界面
│   ├── settings/                 # 设置页面（7 个标签页）
│   ├── projects/                 # 项目管理
│   ├── designer/                 # 可视化设计器
│   ├── native-tools/             # 原生工具 UI
│   ├── image-studio/             # 图像编辑
│   ├── video-editor/             # 视频编辑
│   ├── workflows/                # 工作流管理
│   └── globals.css               # Tailwind v4 主题
│
├── components/                   # React 组件（35+ 目录）
│   ├── ui/                       # shadcn/Radix（50+ 组件）
│   ├── chat/                     # 聊天界面
│   ├── ai-elements/              # AI 组件（30+）
│   ├── agent/                    # 代理模式
│   ├── artifacts/                # 工件系统
│   ├── canvas/                   # 画布编辑器
│   ├── designer/                 # 可视化设计器
│   ├── workflow/                  # 工作流组件
│   │   ├── editor/               # 工作流编辑器
│   │   └── marketplace/          # 模板市场
│   ├── native/                   # 原生功能 UI
│   ├── learning/                 # 学习模式
│   ├── skills/                   # 技能系统
│   ├── mcp/                      # MCP 管理
│   ├── ppt/                      # PPT 生成
│   └── settings/                 # 设置面板
│
├── hooks/                        # 模块化 React Hooks
│   ├── ai/                       # use-agent、use-background-agent、use-skills
│   ├── chat/                     # use-summary、聊天工具
│   ├── context/                  # use-clipboard-context、use-project-context
│   ├── designer/                 # use-workflow-editor、use-workflow-execution
│   ├── native/                   # use-native、use-notification、use-window
│   ├── rag/                      # RAG 相关 hooks
│   ├── sandbox/                  # use-environment、use-jupyter-kernel
│   └── ui/                       # use-learning-mode、use-global-shortcuts
│
├── stores/                       # 模块化 Zustand Stores
│   ├── agent/                    # 代理执行
│   ├── artifact/                 # 工件、画布、版本
│   ├── chat/                     # 聊天会话
│   ├── designer/                 # 设计器状态
│   ├── learning/                 # 学习模式
│   ├── mcp/                      # MCP 服务器
│   ├── project/                  # 项目、知识库
│   ├── settings/                 # 偏好、预设、主题
│   ├── system/                   # 原生、代理、使用统计
│   └── workflow/                 # 工作流定义
│
├── lib/                          # 核心工具库
│   ├── ai/                       # AI 集成
│   │   ├── agent/                # 代理执行器、循环、编排器
│   │   ├── tools/                # 工具定义
│   │   └── workflows/            # 工作流定义
│   ├── db/                       # Dexie 数据库
│   ├── export/                   # PDF、Markdown、HTML、Word、Excel、PPT
│   ├── designer/                 # 设计器工具
│   ├── native/                   # Tauri 原生调用
│   ├── skills/                   # 技能框架
│   └── i18n/                     # 国际化（en、zh-CN）
│
├── types/                        # TypeScript 类型定义
│
├── src-tauri/                    # Tauri Rust 后端
│   ├── src/
│   │   ├── mcp/                  # MCP 实现
│   │   ├── awareness/            # 系统监控
│   │   ├── context/              # 上下文检测
│   │   ├── screenshot/           # 截图捕获
│   │   ├── selection/            # 文本选择
│   │   └── sandbox/              # 代码执行
│   └── tauri.conf.json           # Tauri 配置
│
├── e2e/                          # Playwright 测试
├── docs/                         # 文档
└── [配置文件]                    # next、tailwind、jest、playwright 等
```

## 核心系统

### AI 模型集成

#### 支持的服务商（共 14 家）

| 服务商 | 模型示例 | 特性 |
| ------- | -------- | ---- |
| OpenAI | GPT-4o, GPT-4o-mini, o1 | 视觉、工具调用、流式 |
| Anthropic | Claude 4 Sonnet/Opus | 长上下文、视觉 |
| Google | Gemini 2.0 Flash, 1.5 Pro | 视觉、长上下文 |
| Mistral | Mistral Large, Small | 高性能 |
| DeepSeek | deepseek-chat, coder | 代码优化 |
| Groq | Llama 3.3, Mixtral | 低延迟 |
| xAI | Grok | OpenAI 兼容 |
| Together AI | 多种模型 | OpenAI 兼容 |
| OpenRouter | 多服务商 | 路由 |
| Cohere | Command | 企业级 |
| Fireworks | 多种模型 | 快速推理 |
| Cerebras | 多种模型 | 硬件优化 |
| SambaNova | 多种模型 | 企业级 |
| Ollama | 本地模型 | 离线、隐私 |

#### 智能自动路由

`lib/ai/auto-router.ts` 支持两种路由模式：

- **规则模式**：快速模式匹配检测简单/复杂任务
- **LLM 模式**：使用小模型进行精确分类

三层路由：

- **快速档**：Groq Llama 3.3、Gemini Flash、GPT-4o Mini、Claude Haiku
- **平衡档**：Gemini 1.5 Pro、GPT-4o、Claude Sonnet
- **强力档**：Claude Opus、OpenAI o1、DeepSeek Reasoner

### 代理系统

自主 AI 代理的三层架构：

1. **应用层**：React hooks（`useAgent`、`useBackgroundAgent`）、UI 面板
2. **编排层**：代理循环、规划、子代理协调
3. **执行层**：AgentExecutor 配合 AI SDK `generateText`，统一工具系统

#### 工具集成

- **内置工具**：文件操作、搜索、网络访问
- **MCP 工具**：完整 Model Context Protocol 集成
- **技能**：自定义技能执行框架
- **RAG**：从知识库检索增强生成

### MCP 支持

完整实现 Model Context Protocol，扩展 AI 能力。

#### 架构

```text
Cognia 前端 (React)
    ↓ Tauri IPC
Cognia 后端 (Rust)
    ↓ stdio / SSE
MCP 服务器 (Node.js, Python 等)
```

#### 内置服务器模板

Filesystem、GitHub、PostgreSQL、SQLite、Brave Search、Memory、Puppeteer、Slack

### 原生工具

Tauri 构建中可用的桌面专属功能：

| 功能 | 描述 | 平台支持 |
| ---- | ---- | -------- |
| **选择系统** | 12 种扩展模式、AI 操作、剪贴板历史 | Windows、macOS、Linux |
| **感知系统** | CPU、内存、磁盘、电池、网络监控 | Windows（完整）、其他（部分） |
| **上下文系统** | 窗口/应用/文件/浏览器检测 | Windows（完整）、其他（部分） |
| **截图系统** | 多模式捕获含 OCR | Windows、macOS、Linux |

### 设计器系统

V0 风格可视化网页设计器，支持 AI 编辑：

- **40+ 组件**：14 类组件，支持拖拽插入
- **实时预览**：CDN 备用的实时预览
- **AI 集成**：通过 `lib/designer/ai.ts` 实现 AI 内容生成
- **导出**：导出为 HTML、React 组件

### 工作流编辑器

React Flow 可视化工作流自动化：

- **可视化编辑器**：支持拖拽的节点图编辑器
- **节点类型**：注释、分组、自定义操作节点
- **执行引擎**：支持调试的分步执行
- **变量管理**：全局和局部作用域

### 技能系统

扩展 AI 的自定义技能框架：

- **技能定义**：带参数和执行逻辑的自定义技能
- **技能建议**：基于上下文的 AI 推荐
- **技能分析**：使用跟踪和指标
- **技能向导**：引导式创建界面

### 学习模式

交互式教育内容学习系统：

- **阶段**：问题分析、引导学习、总结
- **生成式学习工具**：10 个 `display_*` 工具统一渲染（闪卡/测验/复习/步骤指南/概念图/动画）
- **会话自动化**：自动记录尝试次数、提取子问题、阶段推进、总结闭环
- **Journey/Quick 联动**：Journey 自动创建学习路径与里程碑，Quick 结束自动归档
- **标准互通**：xAPI Statement 导出/导入、QTI 3 XML/包 导出/导入（保留旧格式兼容）
- **灰度开关**：支持 `learningModeV2Enabled`、`learningInteropV2Enabled`（环境变量 + localStorage）

### 工件与画布

#### 工件类型

- **code**：代码片段（17+ 语言）
- **document**：文本文档
- **svg/html/react**：可视化内容
- **mermaid/chart**：图表（Mermaid、Recharts）
- **math**：数学公式（KaTeX）

#### 画布编辑器

基于 Monaco 的编辑器：

- 语法高亮（Shiki，30+ 语言）
- AI 建议和代码转换
- 版本历史含差异对比

### 数据持久化

#### IndexedDB（Dexie）

消息和附件持久化到 IndexedDB。

#### Zustand + localStorage

所有 stores 使用 persist 中间件自动保存到 localStorage。

### 项目管理

每个项目可关联知识库文件，支持自定义指令和默认模型设置。

## 配置说明

详细配置请参见 **[配置指南](docs/features/configuration.md)**。

### 快速设置

1. **环境变量** - 创建 `.env.local` 文件配置 API 密钥
2. **服务商设置** - 在设置 > 服务商中配置 AI 服务商
3. **外观** - 在设置 > 外观中自定义主题和字体
4. **快捷键** - 在设置 > 快捷键中自定义快捷键

**安全提示**：

- 切勿提交 `.env.local` 到版本控制
- 密钥存储在浏览器 localStorage，未加密

## 生产构建

### Web 应用构建

```bash
pnpm build
# 输出目录：out/
```

### 桌面应用构建

```bash
pnpm tauri build

# 输出位置：
# - Windows: src-tauri/target/release/bundle/msi/
# - macOS: src-tauri/target/release/bundle/dmg/
# - Linux: src-tauri/target/release/bundle/appimage/
```

### Android 应用构建

```bash
# 一次性初始化 Android 工程
pnpm tauri:android:init

# 开发构建
pnpm tauri:android:dev

# 发布打包（APK + AAB）
pnpm tauri:android:build
```

Android 产物目录：

- `src-tauri/gen/android/app/build/outputs/apk/`
- `src-tauri/gen/android/app/build/outputs/bundle/`

## 部署指南

### Web 部署

`out/` 目录可部署到任何静态托管服务：

- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages
- Cloudflare Pages

### 桌面应用分发

- GitHub Releases
- 官网下载
- 应用商店（Windows Store、Mac App Store）

## 测试策略

### 单元测试（Jest）

```bash
pnpm test
pnpm test:coverage
```

覆盖率要求：语句 70%、分支 60%

### 端到端测试（Playwright）

```bash
pnpm test:e2e
pnpm test:e2e:ui
```

## 故障排除

### 端口被占用

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### Tauri 构建失败

```bash
pnpm tauri info
rustup update
cd src-tauri && cargo clean
```

Android 常见检查：

1. `JAVA_HOME` 指向 JDK 17。
2. `ANDROID_HOME` / SDK 安装并可访问。
3. 如工具链解析失败，设置 `NDK_HOME`。
4. Android 出现 `openssl-sys` 报错时，请使用当前 rustls 路线并避免移动端 `git2` 能力。

### Ollama 连接失败

1. 确保 Ollama 服务运行：`ollama serve`
2. 验证端口：`curl http://localhost:11434`
3. 检查防火墙设置

## 资源链接

### 官方文档

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev)
- [Tauri 文档](https://tauri.app/)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

### 项目文档

- **[文档索引](docs/README.md)** - 主要文档入口
- **[CLAUDE.md](CLAUDE.md)** - Claude AI 指令
- **[CHANGELOG.md](CHANGELOG.md)** - 变更日志

## 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 仓库
2. 创建功能分支
3. 提交更改（使用约定式提交）
4. 推送到分支
5. 创建 Pull Request

### 约定式提交规范

```text
feat: 新功能
fix: Bug 修复
docs: 文档更新
style: 代码格式（无功能变更）
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

---

**最后更新**：2026 年 1 月 12 日

**维护者**：Cognia 开发团队
