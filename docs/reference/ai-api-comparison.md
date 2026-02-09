# AI大模型API集成开发教程

> **版本**: 2026-01-31  
> **适用对象**: 希望集成多家AI厂商API的开发者  
> **预计学习时间**: 2-3小时

---

## 📚 课程简介

随着大语言模型(LLM)技术的快速发展，各大AI厂商纷纷推出自己的API服务。作为开发者，掌握这些API的异同点，能够帮助你：

- 快速选择适合项目需求的AI服务
- 实现多厂商API的统一调用
- 构建具有故障转移能力的AI应用
- 优化成本和性能

### 🎯 学习目标

完成本教程后，你将能够：

1. **理解** API设计的核心概念（认证、请求格式、响应结构）
2. **掌握** OpenAI、Anthropic、Google等主流厂商的API使用方法
3. **对比** 不同厂商API的差异，做出合理的技术选型
4. **实践** 编写兼容多厂商的统一API调用代码

### 📋 课程大纲

| 模块 | 内容 | 重点 |
|-----|------|------|
| **模块一** | API基础概念 | 认证、请求、响应 |
| **模块二** | 国际厂商API | OpenAI、Anthropic、Google |
| **模块三** | 国内厂商API | 阿里、智谱、DeepSeek |
| **模块四** | 其他厂商API | Mistral、Cohere、Meta Llama |
| **模块五** | 对比与选型 | 兼容性、技术选型 |
| **模块六** | 实战最佳实践 | 统一接口、错误处理、成本优化 |

---

## 模块一：API基础概念

在深入各厂商API之前，我们先了解AI API的通用架构。理解这些基础概念将帮助你更快地掌握后续内容。

### 1.1 API请求的基本构成

一个典型的AI API请求包含以下要素：

```
┌─────────────────────────────────────────────────────────────┐
│                     API 请求结构                             │
├─────────────────────────────────────────────────────────────┤
│  1. 端点 (Endpoint)    - API的访问地址                       │
│  2. 认证 (Auth)        - 证明你的身份和权限                   │
│  3. 请求头 (Headers)   - 元数据，如Content-Type              │
│  4. 请求体 (Body)      - 实际的请求内容                       │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心发现

通过对9家主流AI厂商的API分析，我们发现以下趋势：

| 趋势 | 说明 | 影响 |
|-----|------|------|
| **OpenAI格式成为事实标准** | 6/9家厂商提供OpenAI兼容接口 | 降低迁移成本 |
| **Bearer Token认证为主流** | 统一的认证方式 | 简化集成开发 |
| **SSE流式响应普及** | 实时输出成为标配 | 提升用户体验 |
| **结构化输出支持** | JSON Schema约束输出 | 便于程序处理 |

### 1.3 厂商API总览

下表展示了各厂商API的关键特性，供你快速参考：

| 厂商 | 端点格式 | 认证方式 | OpenAI兼容 | 流式支持 | 结构化输出 |
|------|---------|---------|-----------|---------|-----------|
| OpenAI | `/v1/responses` (新) / `/v1/chat/completions` | Bearer Token | ✅ 原生 | SSE | ✅ JSON Schema |
| Anthropic | `/v1/messages` | x-api-key | ❌ 自有格式 | SSE | ✅ JSON Schema |
| Google Gemini | `/v1beta/models/{model}:generateContent` | API Key | ❌ 自有格式 | SSE | ✅ JSON Schema |
| 阿里通义 | `/compatible-mode/v1/chat/completions` | Bearer Token | ✅ 完全兼容 | SSE | ✅ |
| 智谱AI | `/api/paas/v4/chat/completions` | Bearer Token | ✅ 完全兼容 | SSE | ✅ |
| DeepSeek | `/chat/completions` | Bearer Token | ✅ 完全兼容 | SSE | ✅ |
| Mistral | `/v1/chat/completions` | Bearer Token | ✅ 完全兼容 | SSE | ✅ |
| Cohere | `/v2/chat` | Bearer Token | ⚠️ 可选兼容 | SSE | ✅ |
| Meta Llama | 依托第三方平台 | 平台相关 | ✅ 通过平台 | SSE | ✅ |

---

## 模块二：国际主流厂商API

掌握了基础概念后，我们开始学习具体的API实现。本模块将详细介绍三大国际AI厂商的API：OpenAI、Anthropic和Google Gemini。这三家厂商代表了当前AI API设计的三种主要流派。

### 2.1 OpenAI - 行业标准制定者

OpenAI的API格式已成为事实上的行业标准，大多数其他厂商都提供兼容接口。

**官方文档**: <https://platform.openai.com/docs/api-reference>

> 💡 **学习重点**: OpenAI提供两套API，理解它们的区别对于技术选型至关重要：
>
> - **Chat Completions API**: 传统API，广泛兼容，适合简单对话场景
> - **Responses API** (2025新): 专为Agent设计，支持多步骤执行

---

#### 2.1.1 Chat Completions API

##### 端点信息

```
POST https://api.openai.com/v1/chat/completions
```

#### 认证方式

```http
Authorization: Bearer sk-xxxxxxxxxxxxxxxx
```

#### 请求格式

```json
{
  "model": "gpt-4o",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "top_p": 1,
  "frequency_penalty": 0,
  "presence_penalty": 0,
  "stream": false,
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "response",
      "schema": { "type": "object", "properties": {} }
    }
  }
}
```

#### 响应格式

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1706000000,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 10,
    "total_tokens": 30
  }
}
```

#### 流式响应 (SSE)

```
data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"}}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[{"delta":{"content":"!"}}]}

data: [DONE]
```

#### 核心参数

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| model | string | ✅ | 模型名称 (gpt-4o, gpt-4o-mini等) |
| messages | array | ✅ | 对话消息列表 |
| temperature | float | ❌ | 采样温度 0-2, 默认1 |
| max_tokens | int | ❌ | 最大生成token数 |
| top_p | float | ❌ | 核采样参数 |
| stream | bool | ❌ | 是否流式输出 |
| tools | array | ❌ | 工具/函数调用定义 |
| response_format | object | ❌ | 输出格式约束 |

---

#### 1.2 Responses API (新一代，推荐)

OpenAI 的 Responses API 是面向 Agent 的新一代 API，具有以下特点:

- **有状态对话**: 服务端维护对话状态，无需每次传递完整历史
- **内置工具**: 原生支持 Web Search、Code Interpreter、File Search 等
- **推理透明**: 支持显示模型推理过程 (reasoning)
- **结构化输出**: 原生 JSON Schema 支持

##### 端点信息

```
POST https://api.openai.com/v1/responses
```

##### 请求格式

```json
{
  "model": "gpt-4o",
  "input": "What is the weather in San Francisco?",
  "instructions": "You are a helpful assistant.",
  "tools": [
    {"type": "web_search_preview"},
    {"type": "code_interpreter"},
    {"type": "file_search", "vector_store_ids": ["vs_xxx"]}
  ],
  "temperature": 0.7,
  "max_output_tokens": 1024,
  "reasoning": {
    "effort": "medium"
  },
  "text": {
    "format": {
      "type": "json_schema",
      "json_schema": {
        "name": "weather_response",
        "schema": {
          "type": "object",
          "properties": {
            "temperature": {"type": "number"},
            "conditions": {"type": "string"}
          }
        }
      }
    }
  }
}
```

##### 响应格式

```json
{
  "id": "resp_abc123",
  "object": "response",
  "created_at": 1706000000,
  "model": "gpt-4o",
  "status": "completed",
  "output": [
    {
      "type": "message",
      "id": "msg_001",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "{\"temperature\": 65, \"conditions\": \"Partly cloudy\"}"
        }
      ]
    }
  ],
  "usage": {
    "input_tokens": 50,
    "output_tokens": 25,
    "total_tokens": 75
  }
}
```

##### 多轮对话 (有状态)

```json
// 首次请求
{
  "model": "gpt-4o",
  "input": "Hello, my name is Alice."
}
// 响应包含 conversation_id

// 后续请求 - 引用 previous_response_id
{
  "model": "gpt-4o",
  "input": "What is my name?",
  "previous_response_id": "resp_abc123"
}
```

##### Chat Completions vs Responses 对比

| 特性 | Chat Completions | Responses API |
|-----|-----------------|---------------|
| 端点 | `/v1/chat/completions` | `/v1/responses` |
| 状态管理 | 无状态，需传递完整历史 | 有状态，服务端维护 |
| 系统提示 | `messages[0].role="system"` | `instructions` 字段 |
| 用户输入 | `messages` 数组 | `input` 字段 |
| 内置工具 | 需手动实现 | `web_search`, `code_interpreter`, `file_search` |
| 推理控制 | 无 | `reasoning.effort` |
| 适用场景 | 简单对话 | Agent、复杂工作流 |

##### Responses API 核心参数

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| model | string | ✅ | 模型名称 |
| input | string/array | ✅ | 用户输入内容 |
| instructions | string | ❌ | 系统指令 (替代 system message) |
| tools | array | ❌ | 工具列表 (web_search, code_interpreter等) |
| previous_response_id | string | ❌ | 上一个响应ID，用于多轮对话 |
| reasoning | object | ❌ | 推理配置 {effort: "low"/"medium"/"high"} |
| max_output_tokens | int | ❌ | 最大输出token数 |
| text.format | object | ❌ | 输出格式 (json_schema等) |

---

#### 1.3 Videos API (Sora 视频生成)

OpenAI 的 Sora 视频生成模型通过 Videos API 提供，支持文本到视频、图片到视频、视频混剪等功能。

##### 端点信息

```
POST https://api.openai.com/v1/videos           # 创建视频
POST https://api.openai.com/v1/videos/remix     # 混剪视频
GET  https://api.openai.com/v1/videos           # 列出视频
GET  https://api.openai.com/v1/videos/{id}      # 获取视频详情
DELETE https://api.openai.com/v1/videos/{id}    # 删除视频
GET  https://api.openai.com/v1/videos/{id}/content  # 获取视频内容
```

##### 支持的模型

| 模型 | 说明 |
|-----|------|
| `sora-2` | 标准版，平衡质量和速度 |
| `sora-2-pro` | 专业版，更高质量输出 |

##### 创建视频请求

```json
{
  "model": "sora-2",
  "prompt": "A cinematic shot of a golden retriever running through autumn leaves in slow motion, warm lighting, shallow depth of field",
  "duration": 10,
  "aspect_ratio": "16:9",
  "resolution": "1080p",
  "style": "cinematic",
  "audio": {
    "enabled": true,
    "music_style": "ambient"
  },
  "n": 1
}
```

##### 图片到视频

```json
{
  "model": "sora-2",
  "prompt": "The camera slowly zooms in as the leaves begin to fall",
  "image": {
    "url": "https://example.com/image.jpg"
  },
  "duration": 8,
  "aspect_ratio": "16:9"
}
```

##### 响应格式 (异步任务)

```json
{
  "id": "video_abc123",
  "object": "video.job",
  "status": "processing",
  "model": "sora-2",
  "created_at": 1706000000,
  "prompt": "A cinematic shot...",
  "duration": 10,
  "aspect_ratio": "16:9",
  "resolution": "1080p"
}
```

##### 完成后的视频对象

```json
{
  "id": "video_abc123",
  "object": "video",
  "status": "completed",
  "model": "sora-2",
  "created_at": 1706000000,
  "completed_at": 1706000120,
  "prompt": "A cinematic shot...",
  "duration": 10,
  "aspect_ratio": "16:9",
  "resolution": "1080p",
  "url": "https://api.openai.com/v1/videos/video_abc123/content",
  "audio": {
    "has_audio": true,
    "type": "generated"
  }
}
```

##### Python SDK 示例

```python
from openai import OpenAI
import time

client = OpenAI()

# 创建视频任务
video_job = client.videos.create(
    model="sora-2",
    prompt="A drone shot flying over a beautiful mountain landscape at sunset",
    duration=10,
    aspect_ratio="16:9",
    resolution="1080p"
)

# 轮询等待完成
while video_job.status == "processing":
    time.sleep(10)
    video_job = client.videos.retrieve(video_job.id)

# 下载视频
if video_job.status == "completed":
    video_content = client.videos.content(video_job.id)
    with open("output.mp4", "wb") as f:
        f.write(video_content.read())
```

##### Sora 技术规格

| 参数 | Sora 2 | Sora 2 Pro |
|-----|--------|------------|
| 最大时长 | 20秒 | 60秒 |
| 分辨率 | 720p, 1080p | 720p, 1080p, 4K |
| 宽高比 | 16:9, 9:16, 1:1 | 16:9, 9:16, 1:1 |
| 原生音频 | ✅ | ✅ |
| 图片转视频 | ✅ | ✅ |
| 视频混剪 | ✅ | ✅ |
| 物理模拟 | 增强 | 高级 |

##### Videos API 核心参数

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| model | string | ✅ | 模型名称 (sora-2, sora-2-pro) |
| prompt | string | ✅ | 视频描述文本 |
| duration | int | ❌ | 视频时长 (秒)，默认5 |
| aspect_ratio | string | ❌ | 宽高比，默认16:9 |
| resolution | string | ❌ | 分辨率 (720p, 1080p, 4k) |
| style | string | ❌ | 风格 (cinematic, anime, realistic等) |
| audio | object | ❌ | 音频配置 |
| image | object | ❌ | 参考图片 (图片转视频) |
| n | int | ❌ | 生成数量，默认1 |

---

### 2.2 Anthropic (Claude) - 安全导向的设计

学完OpenAI后，我们来看Anthropic的API。虽然两者功能相似，但Anthropic采用了独立的API设计，有几个关键差异需要特别注意。

**官方文档**: <https://docs.anthropic.com/>

> 💡 **对比学习**: Anthropic的API在认证方式和消息结构上与OpenAI有显著不同，理解这些差异是实现多厂商兼容的关键。

#### 端点信息

```
POST https://api.anthropic.com/v1/messages
```

#### 认证方式

```http
x-api-key: sk-ant-xxxxxxxxxxxxxxxx
anthropic-version: 2023-06-01
```

#### 请求格式

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "system": "You are a helpful assistant.",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "top_p": 1,
  "stream": false
}
```

#### 响应格式

```json
{
  "id": "msg_01XFDUDYJgAACzvnptvVoYEL",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Hello! How can I help you today?"
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 25,
    "output_tokens": 15
  }
}
```

#### 与OpenAI的主要差异

| 特性 | OpenAI | Anthropic |
|-----|--------|-----------|
| 认证头 | `Authorization: Bearer` | `x-api-key` |
| 系统消息 | messages数组中 | 独立`system`字段 |
| 响应内容 | `message.content` (string) | `content` (array) |
| 停止原因 | `finish_reason` | `stop_reason` |
| Token计数 | `prompt_tokens/completion_tokens` | `input_tokens/output_tokens` |

#### 特色功能与扩展API

##### 2.1 Extended Thinking (扩展思考)

Claude 支持"扩展思考"模式，允许模型在回答前进行深度推理，并显示推理过程。

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 16000,
  "thinking": {
    "type": "enabled",
    "budget_tokens": 10000
  },
  "messages": [
    {"role": "user", "content": "Solve this complex math problem..."}
  ]
}
```

**响应包含思考过程**:

```json
{
  "content": [
    {
      "type": "thinking",
      "thinking": "Let me break this down step by step..."
    },
    {
      "type": "text", 
      "text": "The answer is 42."
    }
  ],
  "usage": {
    "input_tokens": 100,
    "output_tokens": 500,
    "cache_creation_input_tokens": 0,
    "cache_read_input_tokens": 0
  }
}
```

##### 2.2 Message Batches API (批量处理)

处理大量非实时请求，成本降低 50%。

```
POST https://api.anthropic.com/v1/messages/batches
```

```json
{
  "requests": [
    {
      "custom_id": "request-1",
      "params": {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": "Hello"}]
      }
    }
  ]
}
```

##### 2.3 内置工具 (Beta)

| 工具 | 类型标识 | 说明 |
|-----|---------|------|
| Computer Use | `computer_20241022` | 控制计算机屏幕、鼠标、键盘 |
| Text Editor | `text_editor_20241022` | 文件编辑操作 |
| Bash | `bash_20241022` | 执行 shell 命令 |
| Web Search | `web_search` | 网络搜索 |
| Code Execution | `code_execution` | 代码执行沙箱 |
| Memory | `memory` | 跨会话记忆存储 |
| Tool Search | `tool_search` | 动态工具发现 |

**Computer Use 示例**:

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "tools": [
    {
      "type": "computer_20241022",
      "name": "computer",
      "display_width_px": 1024,
      "display_height_px": 768,
      "display_number": 1
    }
  ],
  "messages": [{"role": "user", "content": "Open the browser and search for weather"}]
}
```

##### 2.4 Prompt Caching (提示缓存)

缓存重复使用的上下文，降低成本和延迟。

```json
{
  "model": "claude-sonnet-4-20250514",
  "system": [
    {
      "type": "text",
      "text": "You are an expert...(long context)...",
      "cache_control": {"type": "ephemeral"}
    }
  ],
  "messages": [{"role": "user", "content": "Question"}]
}
```

---

### 2.3 Google Gemini - 多模态原生设计

作为本模块的最后一个厂商，Google Gemini代表了另一种API设计思路。它从一开始就为多模态场景设计，API结构与前两者都有明显区别。

**官方文档**: <https://ai.google.dev/api>

> 💡 **多模态优势**: Gemini的`parts`数组设计天然支持混合输入（文本+图片+视频），这是其API设计的核心优势。

#### 端点信息

```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent
```

#### 认证方式

```http
# 方式1: URL参数
?key=AIzaSyxxxxxxxxxxxxxxxx

# 方式2: Header
Authorization: Bearer {access_token}
```

#### 请求格式

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {"text": "Hello!"}
      ]
    }
  ],
  "systemInstruction": {
    "parts": [
      {"text": "You are a helpful assistant."}
    ]
  },
  "generationConfig": {
    "temperature": 0.7,
    "topP": 1,
    "topK": 40,
    "maxOutputTokens": 1024,
    "responseMimeType": "application/json",
    "responseSchema": {}
  },
  "safetySettings": [
    {
      "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
      "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    }
  ]
}
```

#### 响应格式

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {"text": "Hello! How can I help you?"}
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "index": 0,
      "safetyRatings": []
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 10,
    "candidatesTokenCount": 8,
    "totalTokenCount": 18
  }
}
```

#### 与OpenAI的主要差异

| 特性 | OpenAI | Google Gemini |
|-----|--------|---------------|
| 消息结构 | `messages[].content` | `contents[].parts[].text` |
| 角色名称 | `assistant` | `model` |
| 配置位置 | 请求根级别 | `generationConfig`对象 |
| 安全设置 | 无 | `safetySettings`数组 |

#### 特色功能与扩展API

##### 3.1 Live API (实时双向通信)

Gemini Live API 提供低延迟的实时语音和视频交互，使用 **WebSocket** 协议。

**端点信息**:

```
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent
```

**会话配置**:

```json
{
  "setup": {
    "model": "models/gemini-2.5-flash-native-audio-preview",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
        "voiceConfig": {
          "prebuiltVoiceConfig": {
            "voiceName": "Kore"
          }
        }
      }
    },
    "systemInstruction": {
      "parts": [{"text": "You are a helpful assistant."}]
    }
  }
}
```

**音频输入 (客户端发送)**:

```json
{
  "realtimeInput": {
    "mediaChunks": [
      {
        "mimeType": "audio/pcm",
        "data": "<base64_encoded_audio>"
      }
    ]
  }
}
```

**服务端响应事件**:

```json
{
  "serverContent": {
    "modelTurn": {
      "parts": [
        {
          "inlineData": {
            "mimeType": "audio/pcm",
            "data": "<base64_encoded_audio>"
          }
        }
      ]
    },
    "turnComplete": true
  }
}
```

##### 3.2 Thinking Level (思考级别控制)

Gemini 3 引入 `thinking_level` 参数控制推理深度。

```json
{
  "contents": [{"role": "user", "parts": [{"text": "Complex problem..."}]}],
  "generationConfig": {
    "thinkingConfig": {
      "thinkingLevel": "HIGH"
    }
  }
}
```

| 级别 | 说明 |
|-----|------|
| `LOW` | 快速响应，适合简单任务 |
| `MEDIUM` | 平衡模式 |
| `HIGH` | 深度推理，适合复杂问题 |

##### 3.3 Grounding with Google Search (搜索增强)

将模型连接到实时网络内容，减少幻觉。

```json
{
  "contents": [{"role": "user", "parts": [{"text": "What's the latest news about AI?"}]}],
  "tools": [
    {
      "googleSearch": {}
    }
  ]
}
```

**响应包含来源引用**:

```json
{
  "candidates": [{
    "content": {...},
    "groundingMetadata": {
      "groundingChunks": [
        {
          "web": {
            "uri": "https://example.com/article",
            "title": "AI News Article"
          }
        }
      ],
      "groundingSupports": [...]
    }
  }]
}
```

##### 3.4 Code Execution (代码执行)

内置 Python 代码执行环境。

```json
{
  "contents": [{"role": "user", "parts": [{"text": "Calculate fibonacci(10)"}]}],
  "tools": [
    {"codeExecution": {}}
  ]
}
```

##### 3.5 Video Understanding (视频理解)

Gemini 支持直接处理视频文件进行分析、问答、内容提取。

**上传视频文件**:

```
POST https://generativelanguage.googleapis.com/upload/v1beta/files
```

```python
from google import genai

client = genai.Client()
# 上传视频文件
video_file = client.files.upload(file="path/to/video.mp4")

# 等待处理完成
while video_file.state == "PROCESSING":
    video_file = client.files.get(name=video_file.name)

# 分析视频
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[
        video_file,
        "Summarize this video and identify key moments."
    ]
)
```

**内联视频数据 (小于20MB)**:

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "inlineData": {
            "mimeType": "video/mp4",
            "data": "<base64_encoded_video>"
          }
        },
        {"text": "What happens in this video?"}
      ]
    }
  ]
}
```

**YouTube URL 分析**:

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "fileData": {
            "fileUri": "https://www.youtube.com/watch?v=VIDEO_ID"
          }
        },
        {"text": "Summarize this YouTube video."}
      ]
    }
  ]
}
```

**时间戳引用**:

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {"fileData": {"fileUri": "gs://bucket/video.mp4"}},
        {"text": "What happens at timestamp 01:30?"}
      ]
    }
  ]
}
```

##### 3.6 Veo Video Generation (视频生成)

Veo 是 Google 的视频生成模型，通过 Gemini API 提供。

**端点信息**:

```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:predictLongRunning
```

**支持的模型**:

| 模型 | 说明 |
|-----|------|
| `veo-3.1-generate-001` | 最新版本，支持原生音频 |
| `veo-3.1-fast-generate-001` | 快速版本 |
| `veo-3.0-generate-001` | 稳定版本，支持音效生成 |
| `veo-2.0-generate-001` | 基础版本 |

**文本到视频 (Text-to-Video)**:

```json
{
  "instances": [
    {
      "prompt": "A cinematic shot of a golden retriever running through autumn leaves in slow motion"
    }
  ],
  "parameters": {
    "aspectRatio": "16:9",
    "personGeneration": "dont_allow",
    "numberOfVideos": 1,
    "durationSeconds": 8,
    "resolution": "1080p",
    "frameRate": 24,
    "enablePromptRewriting": true,
    "addWatermark": true
  }
}
```

**图片到视频 (Image-to-Video)**:

```json
{
  "instances": [
    {
      "prompt": "The camera slowly zooms in as leaves fall gently",
      "image": {
        "bytesBase64Encoded": "<base64_encoded_image>"
      }
    }
  ],
  "parameters": {
    "aspectRatio": "16:9",
    "durationSeconds": 8
  }
}
```

**响应格式 (异步)**:

```json
{
  "name": "projects/{project}/locations/{location}/operations/{operation_id}",
  "metadata": {
    "@type": "type.googleapis.com/google.cloud.aiplatform.v1.GenerateVideoOperationMetadata"
  }
}
```

**获取生成结果**:

```
GET https://generativelanguage.googleapis.com/v1beta/{operation_name}
```

```json
{
  "done": true,
  "response": {
    "videos": [
      {
        "uri": "gs://bucket/generated_video.mp4",
        "mimeType": "video/mp4"
      }
    ]
  }
}
```

**Veo 技术规格**:

| 参数 | Veo 3.1 | Veo 3.0 | Veo 2.0 |
|-----|---------|---------|---------|
| 视频时长 | 4/6/8秒 | 4/6/8秒 | 5-8秒 |
| 分辨率 | 720p, 1080p | 720p, 1080p | 720p |
| 宽高比 | 9:16, 16:9 | 9:16, 16:9 | 9:16, 16:9 |
| 帧率 | 24 FPS | 24 FPS | 24 FPS |
| 原生音频 | ✅ | ✅ | ❌ |
| 图片转视频 | ✅ | ⚠️ Preview | ✅ |

---

## 模块三：国内厂商API

完成了国际主流厂商的学习后，我们来看国内厂商的API实现。**好消息是**：国内主流厂商（阿里、智谱、DeepSeek）都提供了OpenAI兼容接口，这意味着你可以用相同的代码调用它们！

> 🎯 **学习目标**: 理解国内厂商API的特点，掌握如何利用OpenAI兼容性实现快速集成。

### 3.1 阿里通义千问 - 企业级服务

通义千问是阿里云推出的大模型服务，提供两种调用方式：OpenAI兼容模式（推荐）和DashScope原生模式。

**官方文档**: <https://help.aliyun.com/zh/model-studio/>

#### 端点信息

**OpenAI兼容模式** (推荐):

```
POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
```

**DashScope原生模式**:

```
POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
```

#### 认证方式

```http
Authorization: Bearer sk-xxxxxxxxxxxxxxxx
```

#### 请求格式 (OpenAI兼容)

```json
{
  "model": "qwen-plus",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "你好"}
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "stream": false
}
```

#### 请求格式 (DashScope原生)

```json
{
  "model": "qwen-plus",
  "input": {
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "你好"}
    ]
  },
  "parameters": {
    "temperature": 0.7,
    "max_tokens": 1024,
    "result_format": "message"
  }
}
```

#### 响应格式 (OpenAI兼容)

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1706000000,
  "model": "qwen-plus",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "你好！有什么可以帮助你的吗？"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 15,
    "total_tokens": 35
  }
}
```

#### 多地域端点

| 地域 | Base URL |
|-----|----------|
| 华北2(北京) | `https://dashscope.aliyuncs.com` |
| 新加坡 | `https://dashscope-intl.aliyuncs.com` |
| 美国(弗吉尼亚) | `https://dashscope-us.aliyuncs.com` |

---

### 3.2 智谱AI (ChatGLM) - 国产开源先驱

智谱AI是国内最早开源大模型的厂商之一，其GLM系列模型在中文任务上表现优异。

**官方文档**: <https://open.bigmodel.cn/dev/api>

#### 端点信息

```
POST https://open.bigmodel.cn/api/paas/v4/chat/completions
```

#### 认证方式

```http
Authorization: Bearer {API_KEY}
```

> 注: API Key需要进行JWT编码处理

#### 请求格式

```json
{
  "model": "glm-4",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "你好"}
  ],
  "temperature": 0.7,
  "top_p": 0.7,
  "max_tokens": 1024,
  "stream": false,
  "do_sample": true
}
```

#### 响应格式

```json
{
  "id": "8888888888888",
  "created": 1706000000,
  "model": "glm-4",
  "choices": [
    {
      "index": 0,
      "finish_reason": "stop",
      "message": {
        "role": "assistant",
        "content": "你好！有什么可以帮助你的吗？"
      }
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 15,
    "total_tokens": 25
  }
}
```

#### 特有参数

| 参数 | 说明 |
|-----|------|
| `do_sample` | 是否启用采样策略 |
| `request_id` | 用户自定义请求ID |

---

### 3.3 DeepSeek - 性价比之王

DeepSeek以极高的性价比著称，其deepseek-chat模型在多项基准测试中表现优异，价格却远低于同类产品。

**官方文档**: <https://api-docs.deepseek.com/>

#### 端点信息

```
POST https://api.deepseek.com/chat/completions
POST https://api.deepseek.com/v1/chat/completions  # OpenAI兼容
```

#### 认证方式

```http
Authorization: Bearer sk-xxxxxxxxxxxxxxxx
```

#### 请求格式

```json
{
  "model": "deepseek-chat",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 1.0,
  "max_tokens": 4096,
  "top_p": 1,
  "stream": false
}
```

#### 响应格式

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1706000000,
  "model": "deepseek-chat",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 10,
    "total_tokens": 30
  }
}
```

#### 特色功能

- **deepseek-reasoner**: 深度推理模型，类似OpenAI o1
- **prefix参数**: 强制模型以指定前缀开始回答

```json
{
  "messages": [
    {"role": "assistant", "content": "```python\n", "prefix": true}
  ]
}
```

---

## 模块四：其他国际厂商API

本模块介绍其他值得关注的国际AI厂商，它们各有特色，可以作为主流厂商的补充选择。

### 4.1 Mistral AI - 欧洲开源力量

Mistral是来自法国的AI公司，其开源模型在效率和性能之间取得了出色平衡。

**官方文档**: <https://docs.mistral.ai/api>

#### 端点信息

```
POST https://api.mistral.ai/v1/chat/completions
```

#### 认证方式

```http
Authorization: Bearer {API_KEY}
```

#### 请求格式

```json
{
  "model": "mistral-large-latest",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "top_p": 1,
  "stream": false,
  "safe_prompt": false
}
```

#### 响应格式

```json
{
  "id": "cmpl-xxx",
  "object": "chat.completion",
  "created": 1706000000,
  "model": "mistral-large-latest",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 10,
    "total_tokens": 25
  }
}
```

#### 特有参数

| 参数 | 说明 |
|-----|------|
| `safe_prompt` | 是否在系统提示前注入安全提示 |
| `random_seed` | 用于确定性输出的随机种子 |

---

### 4.2 Cohere - 企业RAG专家

Cohere专注于企业级应用，其Embed和Rerank模型在RAG（检索增强生成）场景中表现出色。

**官方文档**: <https://docs.cohere.com/>

#### 端点信息

**V2 API** (推荐):

```
POST https://api.cohere.com/v2/chat
```

**V1 API** (旧版):

```
POST https://api.cohere.com/v1/chat
```

#### 认证方式

```http
Authorization: Bearer {API_KEY}
```

#### 请求格式 (V2)

```json
{
  "model": "command-a-03-2025",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "stream": false
}
```

#### 请求格式 (V1)

```json
{
  "model": "command-a-03-2025",
  "message": "Hello!",
  "chat_history": [],
  "temperature": 0.7,
  "max_tokens": 1024
}
```

#### 响应格式 (V2)

```json
{
  "id": "c14c80c3-xxx",
  "finish_reason": "COMPLETE",
  "message": {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "Hello! How can I help you today?"
      }
    ]
  },
  "usage": {
    "billed_units": {
      "input_tokens": 10,
      "output_tokens": 8
    },
    "tokens": {
      "input_tokens": 10,
      "output_tokens": 8
    }
  }
}
```

#### 与OpenAI的主要差异

| 特性 | OpenAI | Cohere V2 |
|-----|--------|-----------|
| 消息格式 | `message.content` (string) | `message.content` (array) |
| 停止原因 | `finish_reason: "stop"` | `finish_reason: "COMPLETE"` |
| Token计费 | `usage.total_tokens` | `usage.billed_units` |

#### 特色功能

- **RAG支持**: 原生支持检索增强生成
- **Connectors**: 支持连接外部数据源
- **Rerank**: 独立的重排序API

---

### 4.3 Meta Llama - 开源模型生态

Meta的Llama系列是目前最成功的开源大模型。由于Meta不提供官方API服务，你需要通过第三方平台访问：

#### 主要托管平台

| 平台 | API格式 | 认证方式 |
|-----|---------|---------|
| Together.ai | OpenAI兼容 | Bearer Token |
| Replicate | 自有格式 | Bearer Token |
| AWS Bedrock | AWS Signature | IAM |
| Azure AI | OpenAI兼容 | Bearer Token |
| Groq | OpenAI兼容 | Bearer Token |

#### Together.ai 示例

```
POST https://api.together.xyz/v1/chat/completions
```

```json
{
  "model": "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 1024
}
```

#### Replicate 示例

```
POST https://api.replicate.com/v1/predictions
```

```json
{
  "version": "meta/meta-llama-3-70b-instruct",
  "input": {
    "prompt": "Hello!",
    "system_prompt": "You are a helpful assistant.",
    "max_tokens": 1024,
    "temperature": 0.7
  }
}
```

---

## 模块五：对比分析与技术选型

学完了各厂商的API后，本模块将帮助你整理学到的知识，做出明智的技术选型。

> 🎯 **学习目标**: 理解各厂商API的优势和局限，掌握多厂商集成的最佳实践。

### 5.1 标准化程度

#### OpenAI兼容性等级

| 等级 | 厂商 | 说明 |
|-----|------|------|
| **完全兼容** | 通义千问、智谱AI、DeepSeek、Mistral | 可直接使用OpenAI SDK |
| **部分兼容** | Cohere | 提供可选兼容接口 |
| **不兼容** | Anthropic、Google Gemini | 独立API设计 |

### 5.2 消息格式对比

```
┌─────────────────────────────────────────────────────────────┐
│                      消息格式差异                            │
├─────────────────────────────────────────────────────────────┤
│ OpenAI类:     messages: [{role, content}]                   │
│ Anthropic:    system: "...", messages: [{role, content}]    │
│ Google:       contents: [{role, parts: [{text}]}]           │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 认证方式对比

| 认证类型 | 厂商 | 复杂度 |
|---------|------|-------|
| Bearer Token | OpenAI, Anthropic, 通义, 智谱, DeepSeek, Mistral, Cohere | 低 |
| API Key Header | Anthropic (x-api-key) | 低 |
| URL参数 | Google Gemini | 低 |

### 5.4 流式响应对比

| 厂商 | 协议 | 格式 |
|-----|------|------|
| OpenAI/兼容厂商 | SSE | `data: {json}\n\ndata: [DONE]` |
| Anthropic | SSE | `event: content_block_delta\ndata: {json}` |
| Google Gemini | SSE | 自定义JSON流 |

### 5.5 错误处理对比

```json
// OpenAI类错误格式
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded"
  }
}

// Anthropic错误格式
{
  "type": "error",
  "error": {
    "type": "rate_limit_error",
    "message": "Rate limit exceeded"
  }
}

// Google Gemini错误格式
{
  "error": {
    "code": 429,
    "message": "Resource exhausted",
    "status": "RESOURCE_EXHAUSTED"
  }
}
```

---

### 5.6 兼容性矩阵

下表展示了各厂商与OpenAI SDK的兼容性，这是实现多厂商统一调用的基础：

#### OpenAI SDK 兼容性

| 厂商 | base_url | 需修改 |
|-----|----------|--------|
| OpenAI | `https://api.openai.com/v1` | - |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | ✅ |
| 智谱AI | `https://open.bigmodel.cn/api/paas/v4` | ✅ |
| DeepSeek | `https://api.deepseek.com` | ✅ |
| Mistral | `https://api.mistral.ai/v1` | ✅ |
| Together.ai | `https://api.together.xyz/v1` | ✅ |
| Groq | `https://api.groq.com/openai/v1` | ✅ |

### 使用OpenAI SDK调用其他厂商示例

```python
from openai import OpenAI

# 通义千问
client = OpenAI(
    api_key="sk-xxx",
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
)

# DeepSeek
client = OpenAI(
    api_key="sk-xxx",
    base_url="https://api.deepseek.com"
)

# 智谱AI
client = OpenAI(
    api_key="xxx.xxx",
    base_url="https://open.bigmodel.cn/api/paas/v4"
)

# 调用方式完全相同
response = client.chat.completions.create(
    model="qwen-plus",  # 或 deepseek-chat, glm-4
    messages=[{"role": "user", "content": "Hello!"}]
)
```

---

## 模块六：实战最佳实践

学完理论知识后，本模块提供实际开发中的最佳实践代码示例。这些代码可以直接应用到你的项目中。

> 💻 **实战练习**: 尝试将以下代码集成到你的项目中，体验多厂商API的统一调用。

### 6.1 统一接口封装

```typescript
interface UnifiedChatRequest {
  model: string;
  messages: Array<{role: string; content: string}>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

interface UnifiedChatResponse {
  id: string;
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// 适配器模式
interface AIProvider {
  chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse>;
  chatStream(request: UnifiedChatRequest): AsyncIterable<string>;
}
```

### 6.2 错误处理与重试

```typescript
// 统一错误类型
enum AIErrorType {
  RATE_LIMIT = 'rate_limit',
  INVALID_REQUEST = 'invalid_request',
  AUTHENTICATION = 'authentication',
  SERVER_ERROR = 'server_error',
  CONTENT_FILTER = 'content_filter'
}

// 重试策略
const retryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableErrors: [AIErrorType.RATE_LIMIT, AIErrorType.SERVER_ERROR]
};
```

### 6.3 流式响应处理

```typescript
async function* parseSSEStream(response: Response): AsyncIterable<string> {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        yield data;
      }
    }
  }
}
```

### 6.4 多厂商切换策略

```typescript
// 配置驱动的厂商选择
const providerConfig = {
  default: 'openai',
  fallback: ['deepseek', 'qwen'],
  routing: {
    'code-generation': 'deepseek',
    'chinese-content': 'qwen',
    'reasoning': 'anthropic'
  }
};
```

### 6.5 成本优化建议

| 策略 | 说明 |
|-----|------|
| **Token缓存** | 对重复查询进行结果缓存 |
| **Prompt压缩** | 使用摘要减少上下文长度 |
| **模型分层** | 简单任务用小模型,复杂任务用大模型 |
| **批量处理** | 使用Batch API降低单价 |
| **流量监控** | 设置用量告警和限额 |

---

## 📝 课程总结

恭喜你完成了本教程！让我们回顾一下学到的核心内容：

### 关键收获

1. **API设计趋势**: OpenAI格式已成为行业标准，6/9家厂商提供兼容接口
2. **三种设计流派**: OpenAI（标准）、Anthropic（安全导向）、Google（多模态原生）
3. **统一调用策略**: 使用OpenAI SDK + base_url切换实现多厂商兼容
4. **选型建议**:
   - 通用场景: OpenAI GPT-4o 或 DeepSeek
   - 中文优化: 通义千问、智谱AI
   - 复杂推理: Anthropic Claude、OpenAI o1
   - 成本敏感: DeepSeek（性价比最高）
   - 企业RAG: Cohere

### 下一步学习

- 尝试集成2-3家厂商的API到你的项目
- 实现故障转移和负载均衡
- 探索各厂商的高级功能（视频生成、扩展思考等）

---

## 附录：参考链接

### 官方文档

| 厂商 | 文档地址 |
|-----|---------|
| OpenAI | <https://platform.openai.com/docs> |
| Anthropic | <https://docs.anthropic.com> |
| Google Gemini | <https://ai.google.dev/docs> |
| 阿里通义 | <https://help.aliyun.com/zh/model-studio> |
| 智谱AI | <https://open.bigmodel.cn/dev/api> |
| DeepSeek | <https://api-docs.deepseek.com> |
| Mistral | <https://docs.mistral.ai> |
| Cohere | <https://docs.cohere.com> |

### SDK资源

| 厂商 | Python | JavaScript |
|-----|--------|-----------|
| OpenAI | `openai` | `openai` |
| Anthropic | `anthropic` | `@anthropic-ai/sdk` |
| Google | `google-generativeai` | `@google/generative-ai` |
| 通义 | `dashscope` | `@alicloud/dashscope` |
| 智谱 | `zhipuai` | `zhipuai` |
| Cohere | `cohere` | `cohere-ai` |

---

## 更新日志

| 日期 | 版本 | 更新内容 |
|-----|------|---------|
| 2026-01-31 | 1.0 | 初始版本，涵盖9家主流AI厂商 |

---

*本文档基于2026年1月的公开API文档编写,各厂商API可能会持续更新,请以官方文档为准。*
