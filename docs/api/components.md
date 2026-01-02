# Component API Reference

This document provides a comprehensive reference for major components in the Cognia application. Components are organized by feature area in the `components/` directory. For each component, you'll find the props interface, usage examples, and links to related components.

## Table of Contents

### Core Components

- [Chat Components](#chat-components) - Chat interface (121 items)
- [AI Elements](#ai-elements) - AI-specific components (30+ items)
- [Agent Components](#agent-components) - Agent mode UI (19 items)
- [Artifacts Components](#artifacts-components) - Artifact system
- [Canvas Components](#canvas-components) - Monaco-based canvas editor

### Feature Components

- [Chat Widget Components](#chat-widget-components) - Embeddable widget (8 items)
- [Designer Components](#designer-components) - Visual designer (70 items)
- [Image Studio Components](#image-studio-components) - Image editing (15 items)
- [Jupyter Components](#jupyter-components) - Notebook integration (7 items)
- [Learning Components](#learning-components) - Learning mode (23 items)
- [Screen Recording Components](#screen-recording-components) - Recording UI (5 items)
- [Skills Components](#skills-components) - Skills system (25 items)
- [Workflow Editor Components](#workflow-editor-components) - Visual workflow editor (50 items)

### Settings & Configuration

- [Settings Components](#settings-components) - Settings pages (96 items)
- [Project Components](#project-components) - Project management

### Base Components

- [UI Components](#ui-components) - shadcn/ui base components (41 items)

---

## Chat Components

### ChatContainer

Main orchestrator component for the chat interface with AI integration, message persistence, and multimodal support.

**Location**: `components/chat/chat-container.tsx`

#### Props

```typescript
interface ChatContainerProps {
  sessionId?: string; // Optional session ID to load existing session
}
```

#### Features

- Streaming and non-streaming chat responses
- Message persistence to IndexedDB
- Voice input and file attachment support
- Branch management and conversation search
- Artifact and canvas integration
- Agent mode with tool visualization
- Project context integration
- Memory system and skill injection

#### Usage Example

```typescript
import { ChatContainer } from '@/components/chat';

function ChatPage() {
  return <ChatContainer sessionId="session-123" />;
}
```

---

### ChatInput

Enhanced message input with voice recognition, file attachments, drag-and-drop, and MCP tool mentions.

**Location**: `components/chat/chat-input.tsx`

#### Props

```typescript
interface ChatInputProps {
  sessionId?: string;
  onSend: (content: string, attachments?: Attachment[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'file' | 'archive';
  url: string;
  size: number;
  mimeType: string;
  file?: File;
}

export interface UploadSettings {
  maxFileSize: number; // in bytes
  maxFiles: number;
  allowedTypes?: string[];
}
```

#### Features

- Voice input via Web Speech Recognition API
- File drag-and-drop and clipboard paste
- Image preview and thumbnail generation
- @ mention support for MCP tools, resources, and prompts
- Recent files popover
- Prompt optimization
- Multi-line auto-resize textarea

#### Usage Example

```typescript
import { ChatInput } from '@/components/chat';

function ChatInterface() {
  const handleSend = (content: string, attachments?: Attachment[]) => {
    console.log('Sending:', content, attachments);
  };

  return (
    <ChatInput
      sessionId="session-123"
      onSend={handleSend}
      placeholder="Type a message..."
      maxLength={10000}
    />
  );
}
```

---

### ChatHeader

Displays session info, model selector, mode switcher, and quick actions.

**Location**: `components/chat/chat-header.tsx`

#### Props

```typescript
interface ChatHeaderProps {
  sessionId?: string;
}
```

#### Features

- Chat mode display (Chat, Agent, Research, Learning)
- Model picker with provider selection
- Preset selector and manager
- Branch selector
- Export, image generation, and batch copy dialogs
- Conversation search
- Session stats
- Panel toggle

#### Usage Example

```typescript
import { ChatHeader } from '@/components/chat';

function ChatLayout() {
  return <ChatHeader sessionId="session-123" />;
}
```

---

### WelcomeState

Mode-specific welcome pages with dynamic content, feature highlights, and contextual starter prompts.

**Location**: `components/chat/welcome-state.tsx`

#### Props

```typescript
interface WelcomeStateProps {
  mode: ChatMode;
  onSuggestionClick?: (suggestion: string) => void;
  onModeChange?: (mode: ChatMode) => void;
  onSelectTemplate?: (template: ChatTemplate) => void;
}
```

#### Supported Modes

- `chat` - General chat mode
- `agent` - Agent mode with tool calling
- `research` - Research mode with web search
- `learning` - Learning mode with Socratic method

#### Usage Example

```typescript
import { WelcomeState } from '@/components/chat';

function ChatHome() {
  const handleSuggestionClick = (suggestion: string) => {
    console.log('Suggestion:', suggestion);
  };

  return (
    <WelcomeState
      mode="chat"
      onSuggestionClick={handleSuggestionClick}
    />
  );
}
```

---

### BranchSelector

Conversation branching UI for creating and switching between conversation branches.

**Location**: `components/chat/branch-selector.tsx`

#### Features

- Visual branch tree display
- Create branch from any message
- Switch between branches
- Branch comparison view
- Delete branches

---

### ExportDialog

Export dialog supporting multiple formats (Markdown, PDF, JSON, HTML, Word, Excel).

**Location**: `components/chat/export-dialog.tsx`

#### Supported Export Formats

- Markdown (.md)
- PDF (via browser print)
- JSON (.json)
- HTML (.html)
- Plain Text (.txt)
- Word (.docx)
- Excel (.xlsx)
- Google Sheets

---

## AI Elements

### Message

Chat message component with role-based styling, markdown rendering, and attachment support.

**Location**: `components/ai-elements/message.tsx`

#### Props

```typescript
export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"]; // 'user' | 'assistant' | 'system'
};

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export type MessageActionsProps = ComponentProps<"div">;

export type MessageActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
};
```

#### Features

- Role-based styling (user/assistant)
- Markdown rendering with Streamdown
- Attachment display
- Message actions (copy, edit, delete, etc.)
- Citation support
- Hover-reveal action buttons

#### Usage Example

```typescript
import { Message, MessageContent, MessageActions, MessageAction } from '@/components/ai-elements/message';

function ChatMessage() {
  return (
    <Message from="assistant">
      <MessageContent>
        Hello! How can I help you today?
      </MessageContent>
      <MessageActions>
        <MessageAction variant="ghost" size="sm">Copy</MessageAction>
      </MessageActions>
    </Message>
  );
}
```

---

### CodeBlock

Syntax-highlighted code block with Shiki, supporting 30+ languages.

**Location**: `components/ai-elements/code-block.tsx`

#### Props

```typescript
type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: BundledLanguage;
  showLineNumbers?: boolean;
  showCanvasButton?: boolean;
  title?: string;
};
```

#### Supported Languages

JavaScript, TypeScript, Python, HTML, CSS, JSON, Markdown, JSX, TSX, SQL, Bash, YAML, XML, SVG, Mermaid, LaTeX, and 15+ more.

#### Features

- Syntax highlighting with Shiki
- Dual theme support (light/dark)
- Copy button with feedback
- Line numbers
- Open in Canvas button
- Language badge

#### Usage Example

```typescript
import { CodeBlock } from '@/components/ai-elements/code-block';

function CodeExample() {
  return (
    <CodeBlock
      code="console.log('Hello, World!');"
      language="typescript"
      showLineNumbers={true}
      title="example.ts"
    />
  );
}
```

---

### Reasoning

Displays AI reasoning/thinking process for models that expose their chain of thought.

**Location**: `components/ai-elements/reasoning.tsx`

#### Props

```typescript
interface ReasoningProps {
  reasoning: string;
  expanded?: boolean;
}
```

#### Features

- Collapsible reasoning display
- Markdown rendering
- Distinct visual styling
- Character/word count

---

### Artifact

AI-generated artifact container with header, actions, and content display.

**Location**: `components/ai-elements/artifact.tsx`

#### Components

```typescript
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactActions,
  ArtifactAction,
  ArtifactContent,
  ArtifactClose,
} from '@/components/ai-elements/artifact';
```

#### Usage Example

```typescript
import { Artifact, ArtifactHeader, ArtifactTitle, ArtifactContent } from '@/components/ai-elements/artifact';

function ArtifactDisplay() {
  return (
    <Artifact>
      <ArtifactHeader>
        <ArtifactTitle>My Artifact</ArtifactTitle>
      </ArtifactHeader>
      <ArtifactContent>
        {/* Artifact content here */}
      </ArtifactContent>
    </Artifact>
  );
}
```

---

### Plan

Displays structured plans or steps with progress tracking.

**Location**: `components/ai-elements/plan.tsx`

#### Props

```typescript
interface PlanProps {
  steps: PlanStep[];
  onStepClick?: (step: PlanStep) => void;
}

interface PlanStep {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  description?: string;
}
```

---

### Suggestion

Interactive suggestion chip for quick prompt actions.

**Location**: `components/ai-elements/suggestion.tsx`

#### Props

```typescript
interface SuggestionProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}
```

#### Usage Example

```typescript
import { Suggestion } from '@/components/ai-elements/suggestion';

function Suggestions() {
  return (
    <div className="flex gap-2">
      <Suggestion onClick={() => console.log('Explain')}>
        Explain this code
      </Suggestion>
      <Suggestion onClick={() => console.log('Refactor')}>
        Refactor
      </Suggestion>
    </div>
  );
}
```

---

## Artifacts Components

### ArtifactPanel

Right-side panel for viewing and managing AI-generated artifacts.

**Location**: `components/artifacts/artifact-panel.tsx`

#### Features

- Display artifacts (code, document, svg, html, react, mermaid, chart, math)
- Code/Preview tab toggle
- Syntax highlighting with Shiki
- Copy, download, open in new tab actions
- Live preview for HTML/React/SVG
- Monaco editor for canvas documents
- Version history integration

#### Usage

The panel is automatically opened when an artifact is created via `useArtifactStore().createArtifact()`.

---

### CanvasPanel

Monaco editor panel for canvas documents with AI suggestions and code transformations.

**Location**: `components/canvas/canvas-panel.tsx`

#### Features

- Monaco editor integration
- Syntax highlighting for 17+ languages
- AI suggestions display
- Apply/reject suggestions
- Save version button
- Diff view for changes

---

### VersionHistoryPanel

Version history panel for canvas documents with restore functionality.

**Location**: `components/canvas/version-history-panel.tsx`

#### Features

- List all saved versions
- Version metadata (timestamp, description)
- Restore previous version
- Compare versions
- Delete versions

---

### ArtifactPreview

Live preview component for HTML, React, and SVG artifacts.

**Location**: `components/artifacts/artifact-preview.tsx`

#### Supported Types

- HTML - Rendered in iframe
- React - Rendered with CDN fallback
- SVG - Direct rendering
- Mermaid - Diagram rendering
- Chart - Recharts visualization
- Math - KaTeX rendering

---

## Settings Components

### ProviderSettings

Provider configuration UI for all supported AI providers.

**Location**: `components/settings/provider-settings.tsx`

#### Features

- API key input for each provider
- Test connection button
- Default model selection
- Enable/disable provider
- Provider health status
- Custom provider dialog
- Import/export settings

#### Supported Providers

- OpenAI (GPT-4o, GPT-4o Mini, o1, o1 Mini)
- Anthropic (Claude 4 Sonnet/Opus, Claude 3.5 Haiku)
- Google (Gemini 2.0 Flash, Gemini 1.5 Pro/Flash)
- Mistral (Mistral Large, Mistral Small)
- DeepSeek (deepseek-chat, deepseek-coder)
- Groq (Llama 3.3, Mixtral)
- Ollama (local models)

---

### McpSettings

MCP server management UI for adding, configuring, and monitoring MCP servers.

**Location**: `components/settings/mcp-settings.tsx`

#### Features

- Server list with status indicators
- Add/edit server dialog
- Connect/disconnect servers
- View server tools and resources
- Install wizard for quick setup
- Server health monitoring

---

### AppearanceSettings

Theme and appearance configuration.

**Location**: `components/settings/appearance-settings.tsx`

#### Features

- Theme selection (light, dark, system)
- Font selection
- Font size adjustment
- Custom theme editor
- Color customization

---

### DataSettings

Data management interface for import/export and clear functionality.

**Location**: `components/settings/data-settings.tsx`

#### Features

- Export all data
- Import data
- Clear chat history
- Clear all data
- Storage usage display

---

## Project Components

### ProjectList

Project list view with search and filter capabilities.

**Location**: `components/projects/project-list.tsx`

#### Features

- Grid/list view toggle
- Search projects
- Filter by tags
- Sort options
- Project cards with metadata

---

### ProjectCard

Project card component for displaying project information.

**Location**: `components/projects/project-card.tsx`

#### Props

```typescript
interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}
```

---

### KnowledgeBase

Knowledge base management component for adding and viewing project files.

**Location**: `components/projects/knowledge-base.tsx`

#### Features

- Add text/file/URL knowledge
- File upload with processing
- Knowledge list with search
- Delete knowledge entries
- Character count display

---

### CreateProjectDialog

Dialog for creating new projects.

**Location**: `components/projects/create-project-dialog.tsx`

#### Features

- Project name and description
- Icon and color selection
- Custom instructions
- Default provider/model selection
- Initial knowledge base setup

---

## UI Components

Cognia uses shadcn/ui components built on Radix UI primitives. All components are located in `components/ui/`.

### Common UI Components

- **Button** - Button with variants (default, ghost, outline, etc.)
- **Dialog** - Modal dialog
- **DropdownMenu** - Dropdown menu
- **Popover** - Popover content
- **Tooltip** - Tooltip on hover
- **Tabs** - Tabbed content
- **ScrollArea** - Custom scrollable area
- **Sheet** - Side sheet (used for artifact panel)
- **Input** - Text input
- **Textarea** - Multiline text input
- **Select** - Select dropdown
- **Switch** - Toggle switch
- **Slider** - Range slider
- **Badge** - Badge/label
- **Separator** - Visual separator
- **Avatar** - User avatar
- **Progress** - Progress bar
- **Alert** - Alert message

#### Usage Example

```typescript
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function Example() {
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
        </DialogHeader>
        {/* Dialog content */}
      </DialogContent>
    </Dialog>
  );
}
```

#### Adding New UI Components

```bash
pnpm dlx shadcn@latest add <component-name>
```

---

## Related Documentation

- [Utilities Reference](utilities.md)
- [Configuration Guide](../features/configuration.md)
- [AI Elements Library](../../llmdoc/feature/ai-elements-library.md)
- [Artifacts System](../../llmdoc/feature/artifacts-system.md)
- [Project Documentation Index](../../llmdoc/index.md)

---

**Last Updated**: December 25, 2025
