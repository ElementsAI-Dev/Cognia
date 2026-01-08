# Intent Detection and Mode Switching

This document describes the intent detection system that provides intelligent mode switching suggestions in Cognia.

## Overview

The intent detection system analyzes user messages to identify their intent and suggests switching to a more appropriate mode when needed. This creates a seamless experience where users don't need to manually select the right mode for their task.

## Supported Modes

| Mode | Description | Typical Use Cases |
|------|-------------|-------------------|
| **Chat** | General conversation and Q&A | Casual chat, quick questions |
| **Learning** | Interactive learning and tutoring | Concept explanations, flashcards, quizzes |
| **Research** | Academic research and analysis | Paper search, literature review, citations |
| **Agent** | Autonomous task execution | PPT generation, file operations, automation |

## How It Works

### Intent Detection Flow

```
User sends message
       ↓
checkIntent(message) analyzes the content
       ↓
Pattern matching against intent keywords
       ↓
Calculate confidence score (0-1)
       ↓
If confidence ≥ 0.4 and mode mismatch detected
       ↓
Display ModeSwitchSuggestion component
       ↓
User chooses: Accept / Dismiss / Keep Current
```

### Bidirectional Suggestions

The system supports two types of mode transitions:

1. **Specialization**: Moving from general chat to a specialized mode
   - Example: User in Chat mode asks "教我机器学习" → Suggest Learning mode

2. **Generalization**: Moving from a specialized mode back to chat
   - Example: User in Learning mode says "你好" → Suggest Chat mode

## Intent Patterns

### Learning Intent

**Chinese Keywords:**
- 教我、学习、理解、解释、讲解
- 帮我理解、弄懂、搞清楚
- 教程、入门、基础、原理、概念
- flashcard、闪卡、测验、quiz

**English Keywords:**
- teach me, learn, understand, explain
- tutorial, beginner, introduction, basics
- help me understand, walk me through
- flashcard, quiz, study, practice

### Research Intent

**Chinese Keywords:**
- 论文、文献、研究、学术、期刊
- arXiv、引用、参考文献、文献综述
- 找论文、搜索文献、查找研究
- 科研、实验、数据分析

**English Keywords:**
- paper, research, academic, journal
- arXiv, citation, references, literature review
- find papers, search research
- semantic scholar, google scholar

### Agent Intent

**Chinese Keywords:**
- 帮我做PPT、创建演示文稿
- 帮我写文件、生成代码
- 执行、运行、自动化

**English Keywords:**
- create presentation, make PPT
- write file, generate code
- execute, automate, batch

### Chat Intent (for returning to general mode)

**Chinese Keywords:**
- 你好、嗨、聊聊、闲聊
- 今天、天气、心情
- 谢谢、再见

**English Keywords:**
- hi, hello, hey
- let's chat, casual
- thanks, bye

## API Reference

### Core Functions

```typescript
// Detect user intent from message
detectUserIntent(message: string): IntentDetectionResult

// Detect if user wants general chat
detectChatIntent(message: string): boolean

// Detect mode mismatch
detectModeMismatch(message: string, currentMode: ChatMode): {
  hasMismatch: boolean;
  suggestedMode: ChatMode | null;
  reason: string;
}

// Get enhanced mode suggestion (bidirectional)
getEnhancedModeSuggestion(
  message: string,
  currentMode: ChatMode,
  recentSuggestions: number
): {
  shouldSuggest: boolean;
  suggestedMode: ChatMode | null;
  reason: string;
  confidence: number;
  direction: 'specialize' | 'generalize' | null;
}
```

### React Hook

```typescript
import { useIntentDetection } from '@/hooks/chat';

const {
  detectionResult,    // Current detection result
  showSuggestion,     // Whether suggestion is showing
  checkIntent,        // Check message for intent
  acceptSuggestion,   // Accept mode switch
  dismissSuggestion,  // Dismiss suggestion
  keepCurrentMode,    // Keep current mode (don't suggest again)
  resetSuggestion,    // Reset all state
  suggestionCount,    // Number of suggestions shown
} = useIntentDetection({
  currentMode: 'chat',
  enabled: true,
  maxSuggestionsPerSession: 3,
  onModeSwitch: (mode) => switchMode(sessionId, mode),
});
```

### UI Component

```tsx
import { ModeSwitchSuggestion } from '@/components/chat/mode-switch-suggestion';

<ModeSwitchSuggestion
  result={detectionResult}
  currentMode={currentMode}
  onAccept={acceptSuggestion}
  onDismiss={dismissSuggestion}
  onKeepCurrent={keepCurrentMode}
/>
```

## User Control

The system respects user preferences:

1. **Dismiss**: Temporarily hides the suggestion for that specific mode
2. **Keep Current**: Prevents any further suggestions for the session
3. **Suggestion Limit**: Maximum 3 suggestions per session to avoid annoyance
4. **Mode Change Reset**: Switching modes resets dismissal state

## Configuration

In `chat-container.tsx`:

```typescript
const { ... } = useIntentDetection({
  currentMode,
  enabled: true,                    // Enable/disable detection
  maxSuggestionsPerSession: 3,      // Max suggestions before stopping
  onModeSwitch: (mode) => {
    switchMode(activeSessionId, mode);
  },
});
```

## Testing

The intent detection system has comprehensive test coverage:

```bash
pnpm jest lib/ai/tools/intent-detection.test.ts
```

Test categories:
- Learning intent detection (Chinese/English)
- Research intent detection (Chinese/English)
- Agent intent detection
- Chat intent detection
- Mode mismatch detection
- Enhanced mode suggestion

## File Structure

```
lib/ai/tools/
├── intent-detection.ts        # Core detection logic
├── intent-detection.test.ts   # Unit tests

hooks/chat/
├── use-intent-detection.ts    # React hook

components/chat/
├── mode-switch-suggestion.tsx # UI component
├── chat-container.tsx         # Integration point
```

## Future Improvements

1. **ML-based Detection**: Use embeddings for more accurate intent classification
2. **User Preference Learning**: Remember user preferences for mode switching
3. **Context-aware Detection**: Consider conversation history for better suggestions
4. **Customizable Patterns**: Allow users to define custom intent patterns
