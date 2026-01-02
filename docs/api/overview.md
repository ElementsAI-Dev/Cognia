# API Reference Overview

This section provides comprehensive documentation for all APIs in the Cognia application, including server routes, client-side hooks, state management stores, components, and utility functions.

## Table of Contents

- [API Categories](#api-categories)
- [Common Patterns](#common-patterns)
- [Type Conventions](#type-conventions)
- [Error Handling](#error-handling)
- [File Organization](#file-organization)

## API Categories

Cognia's API is organized into several categories:

### 1. Server API Routes

**Location**: `app/api/`

RESTful API endpoints for server-side operations:

- Web search with multiple providers
- Speech transcription
- OAuth integration
- Prompt enhancement and optimization
- Preset generation

**Documentation**: [routes.md](routes.md)

### 2. React Hooks

**Location**: `hooks/`

Custom React hooks for reusable stateful logic:

- AI agent execution
- Message management
- Vector database operations
- RAG (Retrieval Augmented Generation)
- Speech recognition
- Workflow automation

**Documentation**: [hooks.md](hooks.md)

### 3. Zustand Stores

**Location**: `stores/`

Global state management with persistence:

- Settings and preferences
- Chat sessions
- Artifacts and canvas
- Projects and memory
- MCP servers

**Documentation**: [stores.md](stores.md)

### 4. Components

**Location**: `components/`

React components organized by feature:

- Chat interface
- AI elements
- Settings panels
- Project management
- UI primitives

**Documentation**: [components.md](components.md)

### 5. Utility Functions

**Location**: `lib/`

Pure functions and helper utilities:

- AI client creation
- Auto-routing logic
- Export functionality
- Vector operations
- Common utilities

**Documentation**: [utilities.md](utilities.md)

## Common Patterns

### Async/Await Pattern

All async operations use modern async/await syntax:

```typescript
// Good
async function fetchData(id: string): Promise<Data> {
  try {
    const response = await fetch(`/api/data/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error;
  }
}

// Also acceptable with proper error handling
function fetchData(id: string): Promise<Data> {
  return fetch(`/api/data/${id}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error('Failed to fetch data:', error);
      throw error;
    });
}
```

### Error Handling Pattern

Consistent error handling across all async operations:

```typescript
import { Logger } from '@/lib/utils/logger';

type Result<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: Error;
};

async function safeOperation<T>(
  operation: () => Promise<T>,
  context: string
): Promise<Result<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    Logger.error(context, error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

// Usage
const result = await safeOperation(
  () => fetchUserData(userId),
  'fetchUserData'
);

if (result.success) {
  // Use result.data
} else {
  // Handle result.error
}
```

### Type Safety Pattern

TypeScript strict mode with comprehensive type definitions:

```typescript
// Type definitions
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
}

// Type-safe API function
async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }

  // Validate response structure
  const data: unknown = await response.json();
  if (!isValidUser(data)) {
    throw new Error('Invalid user data received');
  }

  return data;
}

// Type guard
function isValidUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'email' in data &&
    'role' in data &&
    'createdAt' in data
  );
}
```

## Type Conventions

### TypeScript Types

All code uses TypeScript with strict mode enabled:

```typescript
// Primitive types
type MessageRole = 'user' | 'assistant' | 'system';

// Interface for objects
interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

// Type for function signatures
type MessageHandler = (message: Message) => void;

// Generic types
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Union types for multiple possibilities
type ArtifactType =
  | 'code'
  | 'document'
  | 'svg'
  | 'html'
  | 'react'
  | 'mermaid'
  | 'chart'
  | 'math';

// Intersection types for combining
type BaseMessage = {
  id: string;
  role: MessageRole;
};

type TimestampedMessage = BaseMessage & {
  createdAt: Date;
  updatedAt: Date;
};
```

### Enums vs Const Objects

Prefer const objects over enums for better tree-shaking:

```typescript
// Preferred: const object
export const MessageRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
} as const;

export type MessageRole = typeof MessageRole[keyof typeof MessageRole];

// Avoid: enum (use only if needed for runtime reflection)
// export enum MessageRole {
//   User = 'user',
//   Assistant = 'assistant',
//   System = 'system'
// }
```

### Type Imports

Use type-only imports when possible:

```typescript
// Preferred
import type { Message } from '@/types/message';
import { useMessageStore } from '@/stores/message-store';

// When mixing types and values
import { Message, useMessageStore } from '@/stores/message-store';
```

## Error Handling

### Standard Error Types

```typescript
// Custom error classes
class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Usage
try {
  const user = await createUser(data);
} catch (error) {
  if (error instanceof APIError) {
    console.error(`API error at ${error.endpoint}:`, error.message);
  } else if (error instanceof ValidationError) {
    console.error(`Validation failed for ${error.field}:`, error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Error Boundaries

React components should use error boundaries:

```typescript
'use client';

import React from 'react';
import { Logger } from '@/lib/utils/logger';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Logger.error('ErrorBoundary', error, { componentStack: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 border border-red-500 rounded">
      <h2 className="text-lg font-semibold text-red-600">Something went wrong</h2>
      <p className="text-sm text-gray-600">{error.message}</p>
    </div>
  );
}
```

### Async Error Handling in Hooks

```typescript
import { useState, useEffect } from 'react';

function useUserData(userId: string) {
  const [data, setData] = useState<Data | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        const result = await fetchUserData(userId);

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { data, isLoading, error };
}
```

## File Organization

### Import Order

Organize imports in this order:

```typescript
// 1. React and core libraries
import React, { useState, useEffect } from 'react';
import { Logger } from '@/lib/utils/logger';

// 2. Third-party libraries
import { z } from 'zod';
import { clsx } from 'clsx';

// 3. Type imports
import type { Message } from '@/types/message';
import type { UserSettings } from '@/types/settings';

// 4. Internal imports (grouped by location)
import { useMessageStore } from '@/stores/message-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 5. Relative imports
import { LocalComponent } from './local-component';
import { localHelper } from './local-helper';
import type { LocalType } from './local-types';
```

### Path Aliases

Use configured path aliases for cleaner imports:

```typescript
// Configured in tsconfig.json
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

// Usage
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/settings-store';
import { createArtifact } from '@/lib/artifacts/create-artifact';
```

### File Naming Conventions

```
# Components: PascalCase with .tsx extension
components/chat/ChatContainer.tsx
components/ui/button.tsx

# Utilities: kebab-case with .ts extension
lib/utils/cn-helper.ts
lib/artifacts/create-artifact.ts

# Hooks: camelCase with 'use' prefix and .ts extension
hooks/use-agent.ts
hooks/use-messages.ts

# Stores: kebab-case with '-store' suffix and .ts extension
stores/settings-store.ts
stores/session-store.ts

# Types: kebab-case or camelCase with .ts extension
types/message.ts
types/userSettings.ts

# Tests: same as source with .test.ts or .spec.ts extension
hooks/use-agent.test.ts
components/chat/ChatContainer.spec.ts
```

## Best Practices

### 1. Immutability

Always update state immutably:

```typescript
// Good: immutable update
const updatedMessages = [
  ...messages.slice(0, index),
  newMessage,
  ...messages.slice(index + 1)
];

// Bad: mutation
messages[index] = newMessage;

// Good: with libraries
import { produce } from 'immer';

const updatedState = produce(state, draft => {
  draft.messages[index] = newMessage;
});
```

### 2. Dependency Injection

Prefer dependency injection for testability:

```typescript
// Good: injectable dependency
interface Dependencies {
  apiClient: APIClient;
  logger: Logger;
}

function createUserService(deps: Dependencies) {
  return {
    async getUser(id: string): Promise<User> {
      deps.logger.info('Fetching user', { id });
      return await deps.apiClient.get(`/users/${id}`);
    }
  };
}

// Usage
const userService = createUserService({
  apiClient: new APIClient(),
  logger: console
});
```

### 3. Single Responsibility

Each function/module should have one clear purpose:

```typescript
// Good: focused functions
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

async function checkEmailExists(email: string): Promise<boolean> {
  const response = await fetch(`/api/users/check-email?email=${email}`);
  return response.json().then(data => data.exists);
}

// Bad: doing too many things
async function handleEmail(email: string): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    throw new Error('Invalid email');
  }
  const response = await fetch(`/api/users/check-email?email=${normalized}`);
  const data = await response.json();
  return data.exists;
}
```

### 4. Documentation

Document public APIs with JSDoc:

```typescript
/**
 * Creates a new artifact in the artifact store.
 *
 * @param params - The artifact creation parameters
 * @param params.sessionId - The ID of the session this artifact belongs to
 * @param params.messageId - The ID of the message that generated this artifact
 * @param params.type - The type of artifact to create
 * @param params.title - The title of the artifact
 * @param params.content - The content of the artifact
 * @param params.language - The programming language (for code artifacts)
 * @returns The created artifact object
 * @throws {Error} If required parameters are missing
 *
 * @example
 * ```typescript
 * const artifact = createArtifact({
 *   sessionId: 'session-123',
 *   messageId: 'msg-456',
 *   type: 'code',
 *   title: 'Quick Sort',
 *   content: 'function quickSort(arr) { ... }',
 *   language: 'typescript'
 * });
 * ```
 */
export function createArtifact(params: CreateArtifactParams): Artifact {
  // Implementation
}
```

## Related Documentation

- [API Routes](routes.md) - Server-side API endpoints
- [React Hooks](hooks.md) - Custom React hooks reference
- [Zustand Stores](stores.md) - State management stores
- [Components](components.md) - React component API
- [Utilities](utilities.md) - Utility function reference

---

**Next**: [API Routes](routes.md)
