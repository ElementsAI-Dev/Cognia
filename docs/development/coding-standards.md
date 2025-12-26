# Cognia Coding Standards

This document outlines the coding standards and best practices for the Cognia project. Following these guidelines ensures code quality, maintainability, and consistency across the codebase.

## Table of Contents

- [TypeScript Best Practices](#typescript-best-practices)
- [React Patterns](#react-patterns)
- [State Management Patterns](#state-management-patterns)
- [Error Handling Conventions](#error-handling-conventions)
- [Code Organization Principles](#code-organization-principles)
- [Comment and Documentation Standards](#comment-and-documentation-standards)
- [Git Commit Conventions](#git-commit-conventions)

## TypeScript Best Practices

### Strict Mode Configuration

The project uses TypeScript strict mode. Always write type-safe code:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true
  }
}
```

### Type Safety Rules

#### 1. Avoid `any` Type

```typescript
// ❌ Bad
function processData(data: any) {
  return data.value;
}

// ✅ Good
function processData(data: { value: string }) {
  return data.value;
}

// ✅ Better (with interface)
interface Data {
  value: string;
}

function processData(data: Data) {
  return data.value;
}
```

#### 2. Use Type Assertions Sparingly

```typescript
// ❌ Bad
const value = data as any;

// ✅ Good (type guard)
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

if (isString(data)) {
  // TypeScript knows data is string here
}
```

#### 3. Prefer Type Over Interface

```typescript
// ✅ Good for simple types
type User = {
  id: string;
  name: string;
};

// ✅ Use interface for object shapes that might be extended
interface UserSettings {
  theme: 'light' | 'dark';
  language: string;
}
```

#### 4. Use Readonly for Immutable Data

```typescript
// ✅ Good
type Message = Readonly<{
  id: string;
  content: string;
  createdAt: Date;
}>;

// Prevents accidental modification
const message: Message = {
  id: '1',
  content: 'Hello',
  createdAt: new Date()
};

// Error: Cannot assign to 'id' because it is a read-only property
// message.id = '2';
```

#### 5. Leverage Utility Types

```typescript
// Partial - make all properties optional
type UpdateUser = Partial<User>;

// Required - make all properties required
type CompleteUser = Required<PartialUser>;

// Pick - select specific properties
type UserPreview = Pick<User, 'id' | 'name'>;

// Omit - exclude specific properties
type CreateUser = Omit<User, 'id' | 'createdAt'>;

// Record - define object with specific value type
type ErrorMap = Record<string, string>;
```

### Generic Type Guidelines

```typescript
// ✅ Good: Use generics for reusable components
function createPromise<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

// ✅ Good: Constrain generics
function getId<T extends { id: string }>(obj: T): string {
  return obj.id;
}

// ✅ Good: Default type parameters
function createMap<K extends string = string, V = any>() {
  return new Map<K, V>();
}
```

### Type Imports

```typescript
// ✅ Good: Use `type` keyword for type-only imports
import type { Message, Session } from '@/types';
import { useMessages } from '@/hooks/use-messages';

// Enables better tree-shaking and prevents runtime inclusion
```

### enums vs const objects

```typescript
// ❌ Avoid enums in most cases
enum Theme {
  Light = 'light',
  Dark = 'dark'
}

// ✅ Prefer const objects (better tree-shaking)
const Theme = {
  Light: 'light',
  Dark: 'dark'
} as const;

type Theme = typeof Theme[keyof typeof Theme];
```

## React Patterns

### Functional Components Only

```typescript
// ✅ Good: Functional component with hooks
export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);

  return <div>...</div>;
}

// ❌ No class components
export class ChatContainer extends React.Component {
  // Not used in this project
}
```

### Component Structure

```typescript
/**
 * ChatInput component
 *
 * Handles message input with voice and file attachment support.
 */

import { useState, useCallback, useRef } from 'react';
import { useSettingsStore } from '@/stores';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  // 1. Hooks
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { streamingEnabled } = useSettingsStore();

  // 2. Event handlers
  const handleSubmit = useCallback(() => {
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  }, [input, onSend]);

  // 3. Effects
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 4. Render helpers
  const isDisabled = disabled || !input.trim();

  // 5. JSX return
  return (
    <div className="chat-input">
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <Button onClick={handleSubmit} disabled={isDisabled}>
        Send
      </Button>
    </div>
  );
}
```

### Custom Hooks Pattern

```typescript
// ✅ Good: Custom hook for reusable logic
export function useMessages(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  }, []);

  return {
    messages,
    loading,
    addMessage,
    updateMessage
  };
}

// Usage in component
function ChatComponent() {
  const { messages, addMessage } = useMessages(sessionId);
  // ...
}
```

### Props Destructuring

```typescript
// ✅ Good: Destructure props in function signature
export function ChatHeader({
  title,
  onBack,
  showActions = true
}: ChatHeaderProps) {
  // Use props directly
}

// ✅ Good: Use spread for remaining props
export function Button({ children, className, ...props }: ButtonProps) {
  return (
    <button className={cn('base-class', className)} {...props}>
      {children}
    </button>
  );
}
```

### Conditional Rendering

```typescript
// ✅ Good: Early returns for conditions
function MessageComponent({ message }: { message: Message }) {
  if (!message) {
    return null;
  }

  if (message.role === 'user') {
    return <UserMessage content={message.content} />;
  }

  return <AssistantMessage content={message.content} />;
}

// ✅ Good: Ternary for simple conditions
<div>
  {loading ? <Spinner /> : <Content />}
</div>

// ✅ Good: && operator for optional rendering
<div>
  {showActions && <Actions />}
</div>
```

### Event Handlers

```typescript
// ✅ Good: Use useCallback for event handlers
const handleSubmit = useCallback((e: React.FormEvent) => {
  e.preventDefault();
  onSubmit(input);
}, [input, onSubmit]);

// ✅ Good: Event handler naming
function Button() {
  const handleClick = () => { /* ... */ };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };
  const handleFocus = () => { /* ... */ };

  return <button onClick={handleClick}>Click</button>;
}
```

### Component Naming

```typescript
// ✅ Good: PascalCase for components
export function ChatContainer() {}
export const ArtifactPanel = () => {};

// ❌ Bad: camelCase for components
export function chatContainer() {}
export const artifactPanel = () => {};
```

## State Management Patterns

### Zustand Store Pattern

```typescript
// stores/example-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ExampleState {
  // State
  items: Item[];
  filter: string;

  // Actions
  setItems: (items: Item[]) => void;
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
  setFilter: (filter: string) => void;
}

export const useExampleStore = create<ExampleState>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      filter: '',

      // Actions
      setItems: (items) => set({ items }),

      addItem: (item) =>
        set((state) => ({
          items: [...state.items, item]
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id)
        })),

      setFilter: (filter) => set({ filter })
    }),
    {
      name: 'cognia-example', // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist specific fields
        items: state.items,
        filter: state.filter
      })
    }
  )
);

// Selectors for memoized access
export const selectItems = (state: ExampleState) => state.items;
export const selectFilteredItems = (state: ExampleState) =>
  state.items.filter((item) =>
    item.name.toLowerCase().includes(state.filter.toLowerCase())
  );
```

### Store Usage

```typescript
// ✅ Good: Select only needed state
function Component() {
  const items = useExampleStore(selectItems);
  const addItem = useExampleStore((state) => state.addItem);

  return (
    <button onClick={() => addItem({ id: '1', name: 'Item' })}>
      Add Item
    </button>
  );
}

// ❌ Bad: Selects entire store (causes unnecessary re-renders)
function Component() {
  const state = useExampleStore();

  return <div>{state.items.length}</div>;
}
```

### Async State Management

```typescript
// ✅ Good: Handle async actions in stores
interface AsyncState {
  data: Data | null;
  loading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
}

export const useAsyncStore = create<AsyncState>()((set, get) => ({
  data: null,
  loading: false,
  error: null,

  fetchData: async () => {
    set({ loading: true, error: null });

    try {
      const data = await api.fetchData();
      set({ data, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      });
    }
  }
}));
```

## Error Handling Conventions

### Try-Catch Pattern

```typescript
// ✅ Good: Always handle errors
async function fetchData(id: string): Promise<Data> {
  try {
    const response = await fetch(`/api/data/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    // Log error for debugging
    console.error('Failed to fetch data:', error);

    // Re-throw with context
    throw new Error(
      `Failed to fetch data for ID ${id}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}
```

### Error Types

```typescript
// ✅ Good: Define custom error types
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

// Usage
if (!input) {
  throw new ValidationError('Input is required');
}
```

### Error Boundaries

```typescript
// ✅ Good: Use error boundaries for React components
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>;
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={<ErrorScreen />}>
  <App />
</ErrorBoundary>
```

### Async Error Handling in Hooks

```typescript
// ✅ Good: Handle errors in async hooks
export function useData(id: string) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.fetchData(id);
      setData(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
}
```

## Code Organization Principles

### Single Responsibility Principle

```typescript
// ❌ Bad: Component does too much
function ChatComponent() {
  // Handles UI
  // Manages state
  // Fetches data
  // Processes messages
  // Handles errors
  // ...
}

// ✅ Good: Separated concerns
function ChatComponent() {
  const { messages, loading } = useMessages(sessionId); // State management
  const { send } = useChat(); // Business logic

  return (
    <ChatLayout>
      {loading ? <Spinner /> : <MessageList messages={messages} />}
      <ChatInput onSend={send} />
    </ChatLayout>
  );
}
```

### DRY (Don't Repeat Yourself)

```typescript
// ❌ Bad: Repeated logic
function Button1() {
  const handleClick = () => {
    console.log('Button clicked');
    // ... other logic
  };
}

function Button2() {
  const handleClick = () => {
    console.log('Button clicked');
    // ... other logic
  };
}

// ✅ Good: Extract reusable logic
function useButtonClick() {
  return useCallback(() => {
    console.log('Button clicked');
    // ... shared logic
  }, []);
}

function Button1() {
  const handleClick = useButtonClick();
}

function Button2() {
  const handleClick = useButtonClick();
}
```

### Directory Structure

```typescript
// ✅ Good: Feature-based organization
components/
  chat/
    chat-container.tsx
    chat-input.tsx
    chat-header.tsx
    index.ts  // Barrel export
  settings/
    provider-settings.tsx
    appearance-settings.tsx
    index.ts
```

### Import Organization

```typescript
// ✅ Good: Grouped imports
// 1. External libraries
import React, { useState, useEffect } from 'react';
import { create } from 'zustand';

// 2. Internal types
import type { Message, Session } from '@/types';

// 3. Internal stores
import { useSettingsStore } from '@/stores';

// 4. Internal hooks
import { useMessages } from '@/hooks/use-messages';

// 5. Internal components
import { Button } from '@/components/ui/button';
import { ChatInput } from '@/components/chat/chat-input';

// 6. Utilities
import { cn } from '@/lib/utils';
```

## Comment and Documentation Standards

### JSDoc Comments

```typescript
/**
 * Fetches messages for a given session
 *
 * @param sessionId - The unique identifier of the session
 * @param options - Optional parameters for filtering
 * @param options.limit - Maximum number of messages to retrieve
 * @param options.before - Retrieve messages before this timestamp
 * @returns Promise resolving to an array of messages
 * @throws {Error} If sessionId is invalid or fetch fails
 *
 * @example
 * ```typescript
 * const messages = await fetchMessages('session-123', { limit: 10 });
 * ```
 */
async function fetchMessages(
  sessionId: string,
  options?: { limit?: number; before?: Date }
): Promise<Message[]> {
  // Implementation
}
```

### Component Documentation

```typescript
/**
 * ChatInput component
 *
 * Provides a text input field for composing and sending messages.
 * Supports voice input, file attachments, and keyboard shortcuts.
 *
 * @remarks
 * This component automatically focuses on mount. Voice input requires
 * browser SpeechRecognition API support.
 *
 * @example
 * ```tsx
 * <ChatInput
 *   onSend={(content) => sendMessage(content)}
 *   disabled={isLoading}
 *   placeholder="Type your message..."
 * />
 * ```
 */
export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type your message...'
}: ChatInputProps) {
  // Implementation
}
```

### Inline Comments

```typescript
// ✅ Good: Explain WHY, not WHAT
// Cache the user settings to avoid repeated localStorage reads
const settings = useSettingsStore.getState();

// ❌ Bad: Explains obvious code
// Set input value to empty string
setInput('');

// ✅ Good: Explain complex logic
// Use requestAnimationFrame to ensure DOM update is complete
// before measuring element dimensions
requestAnimationFrame(() => {
  const height = element.offsetHeight;
});
```

### TODO Comments

```typescript
// TODO[max]: Add validation for file size limits
// FIXME: Handle edge case where sessionId is undefined
// HACK: Temporary workaround for upstream bug
// NOTE: This function runs in O(n) time, optimize for large datasets
```

## Git Commit Conventions

### Conventional Commits

The project uses [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add dark mode support` |
| `fix` | Bug fix | `fix: resolve memory leak in useEffect` |
| `docs` | Documentation only | `docs: update getting-started guide` |
| `style` | Code style (no functional change) | `style: format code with prettier` |
| `refactor` | Code refactoring | `refactor: simplify message handling logic` |
| `perf` | Performance improvement | `perf: optimize rendering for large message lists` |
| `test` | Adding or updating tests | `test: add unit tests for utils` |
| `build` | Build system or dependencies | `build: upgrade to Next.js 16` |
| `ci` | CI/CD configuration | `ci: add GitHub actions workflow` |
| `chore` | Routine tasks | `chore: update dependencies` |
| `revert` | Revert previous commit | `revert: feat: remove experimental feature` |

### Commit Examples

```bash
# Simple feature
git commit -m "feat: add voice input support"

# Feature with scope
git commit -m "feat(chat): add message editing capability"

# Bug fix
git commit -m "fix: prevent duplicate message submissions"

# Detailed commit with body
git commit -m "feat(artifacts): add PDF export for code artifacts

- Add PDF generation using jsPDF library
- Include syntax highlighting in exported PDFs
- Support both light and dark themes

Closes #123"

# Breaking change
git commit -m "feat!: redesign settings page layout

BREAKING CHANGE: Settings page now uses new component structure.
Existing custom settings components need to be updated."
```

### Commit Message Guidelines

1. **Use imperative mood**: "add" not "added" or "adds"
2. **Limit to 72 characters** for subject line
3. **Capitalize subject**: "Add feature" not "add feature"
4. **No period** at end of subject
5. **Separate body** from subject with blank line
6. **Explain WHAT and WHY** in body, not HOW

### Pre-commit Hooks

The project uses Husky with lint-staged to enforce code quality:

```bash
# .husky/pre-commit
pnpm exec lint-staged
```

Staged files are automatically linted before commit.

## Code Quality Tools

### ESLint

```bash
# Run ESLint
pnpm lint

# Auto-fix issues
pnpm lint:fix
```

### Type Checking

```bash
# Type check without compilation
pnpm exec tsc --noEmit
```

### Formatting

The project uses Prettier for code formatting. Configure in `.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

---

**Last Updated**: December 25, 2025
