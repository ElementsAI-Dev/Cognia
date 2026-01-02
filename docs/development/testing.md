# Testing Guide

This document covers the testing strategy, tools, and best practices for the Cognia project.

## Table of Contents

- [Testing Overview](#testing-overview)
- [Unit Testing with Jest](#unit-testing-with-jest)
- [E2E Testing with Playwright](#e2e-testing-with-playwright)
- [Coverage Requirements](#coverage-requirements)
- [Test File Locations](#test-file-locations)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Mocking Strategies](#mocking-strategies)

## Testing Overview

Cognia uses a multi-layered testing approach:

### Testing Pyramid

```
        /\
       /  \      E2E Tests (Playwright)
      /____\     - Critical user paths
     /      \    - Integration testing
    /        \
   /__________\  Unit Tests (Jest)
   Unit Tests    - Component logic
   - Utilities   - Store actions
   - Hooks       - Pure functions
```

### Test Categories

1. **Unit Tests**: Test individual functions, components, and hooks in isolation
2. **Integration Tests**: Test interactions between modules
3. **E2E Tests**: Test complete user flows in the browser

### Technology Stack

- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **Playwright**: E2E browser testing
- **fake-indexeddb**: Mock IndexedDB for testing

## Unit Testing with Jest

### Configuration

Jest is configured in `jest.config.ts`:

```typescript
export default {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup file
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Module path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Coverage collection
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 40,
      lines: 55,
      statements: 55,
    },
  },
};
```

### Jest Setup

`jest.setup.ts` configures the test environment:

```typescript
import '@testing-library/jest-dom';
import React from 'react';

// Polyfills
global.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

// Next.js mocks
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    return React.createElement('img', props);
  },
}));

jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
}));
```

### Unit Test Examples

#### Testing Utility Functions

```typescript
// lib/utils.test.ts
import { cn } from './utils';

describe('cn utility function', () => {
  it('merges class names correctly', () => {
    const result = cn('class1', 'class2');
    expect(result).toBe('class1 class2');
  });

  it('handles conditional classes', () => {
    const result = cn('base', true && 'conditional', false && 'excluded');
    expect(result).toBe('base conditional');
  });

  it('merges Tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toBe('py-1 px-4');
  });
});
```

#### Testing React Components

```typescript
// components/ui/button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    screen.getByText('Click me').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});
```

#### Testing Zustand Stores

```typescript
// stores/settings-store.test.ts
import { act, renderHook } from '@testing-library/react';
import { useSettingsStore } from './settings-store';

describe('Settings Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useSettingsStore.getState().resetSettings();
  });

  it('sets theme correctly', () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
  });

  it('updates provider settings', () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.setProviderSettings('openai', {
        apiKey: 'sk-test',
        defaultModel: 'gpt-4o',
        enabled: true
      });
    });

    expect(result.current.providerSettings.openai.apiKey).toBe('sk-test');
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.setTheme('dark');
    });

    // Check localStorage
    expect(localStorage.getItem('cognia-settings')).toContain('"theme":"dark"');
  });
});
```

#### Testing Custom Hooks

```typescript
// hooks/use-messages.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMessages } from './use-messages';

describe('useMessages Hook', () => {
  it('initializes with empty messages', () => {
    const { result } = renderHook(() => useMessages('session-123'));
    expect(result.current.messages).toEqual([]);
  });

  it('adds message correctly', async () => {
    const { result } = renderHook(() => useMessages('session-123'));

    await act(async () => {
      await result.current.addMessage({
        id: 'msg-1',
        role: 'user',
        content: 'Hello'
      });
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Hello');
  });

  it('updates message correctly', async () => {
    const { result } = renderHook(() => useMessages('session-123'));

    await act(async () => {
      await result.current.addMessage({
        id: 'msg-1',
        role: 'user',
        content: 'Hello'
      });
    });

    await act(async () => {
      await result.current.updateMessage('msg-1', { content: 'Hi' });
    });

    expect(result.current.messages[0].content).toBe('Hi');
  });
});
```

#### Testing Async Functions

```typescript
// lib/ai/client.test.ts
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

jest.mock('ai');
jest.mock('@ai-sdk/openai');

describe('AI Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates text successfully', async () => {
    const mockResponse = {
      text: 'Hello, world!',
      usage: { promptTokens: 10, completionTokens: 20 }
    };

    (generateText as jest.Mock).mockResolvedValue(mockResponse);

    const result = await generateText({
      model: createOpenAI({ apiKey: 'test' })('gpt-4o'),
      prompt: 'Say hello'
    });

    expect(result.text).toBe('Hello, world!');
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it('handles API errors', async () => {
    const mockError = new Error('API Error');
    (generateText as jest.Mock).mockRejectedValue(mockError);

    await expect(
      generateText({
        model: createOpenAI({ apiKey: 'test' })('gpt-4o'),
        prompt: 'Test'
      })
    ).rejects.toThrow('API Error');
  });
});
```

## E2E Testing with Playwright

### Configuration

Playwright is configured in `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Examples

#### Basic Page Test

```typescript
// e2e/core/landing-page.spec.ts
import { expect, test } from '@playwright/test';

test.describe('Landing Page', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Cognia/);
  });

  test('displays welcome message', async ({ page }) => {
    await page.goto('/');
    const welcome = page.getByText('Welcome to Cognia');
    await expect(welcome).toBeVisible();
  });
});
```

#### Chat Flow Test

```typescript
// e2e/features/chat.spec.ts
import { expect, test } from '@playwright/test';

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to chat
    await page.click('text=Chat');
  });

  test('sends and receives message', async ({ page }) => {
    // Type message
    await page.fill('[data-testid="chat-input"]', 'Hello, AI!');

    // Send message
    await page.click('[data-testid="send-button"]');

    // Wait for user message
    await expect(page.locator('text=Hello, AI!')).toBeVisible();

    // Wait for AI response (may take a few seconds)
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({
      timeout: 30000
    });
  });

  test('displays error when API key is missing', async ({ page }) => {
    await page.fill('[data-testid="chat-input"]', 'Test message');
    await page.click('[data-testid="send-button"]');

    // Should show error message
    await expect(page.locator('text=API key required')).toBeVisible();
  });
});
```

#### Settings Page Test

```typescript
// e2e/features/settings.spec.ts
import { expect, test } from '@playwright/test';

test.describe('Settings Page', () => {
  test('configures OpenAI API key', async ({ page }) => {
    await page.goto('/settings');

    // Navigate to provider settings
    await page.click('text=Providers');

    // Enter API key
    await page.fill('[data-testid="openai-api-key"]', 'sk-test-key');

    // Save settings
    await page.click('text=Save');

    // Verify success message
    await expect(page.locator('text=Settings saved')).toBeVisible();
  });

  test('switches theme', async ({ page }) => {
    await page.goto('/settings');

    // Navigate to appearance
    await page.click('text=Appearance');

    // Select dark theme
    await page.click('[data-testid="theme-selector"]');

    // Verify dark mode is active
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
  });
});
```

#### Projects Feature Test

```typescript
// e2e/features/projects.spec.ts
import { expect, test } from '@playwright/test';

test.describe('Projects Feature', () => {
  test('creates new project', async ({ page }) => {
    await page.goto('/projects');

    // Click create button
    await page.click('[data-testid="create-project-button"]');

    // Fill project details
    await page.fill('[data-testid="project-name"]', 'Test Project');
    await page.fill('[data-testid="project-description"]', 'A test project');

    // Save project
    await page.click('text=Create');

    // Verify project appears in list
    await expect(page.locator('text=Test Project')).toBeVisible();
  });

  test('adds knowledge base file', async ({ page }) => {
    await page.goto('/projects');

    // Open project
    await page.click('text=Test Project');

    // Click add knowledge file
    await page.click('[data-testid="add-knowledge-file"]');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-files/document.txt');

    // Verify file appears
    await expect(page.locator('text=document.txt')).toBeVisible();
  });
});
```

## Coverage Requirements

### Coverage Thresholds

Defined in `jest.config.ts`:

```typescript
coverageThreshold: {
  global: {
    branches: 50,
    functions: 40,
    lines: 55,
    statements: 55,
  },
}
```

### Excluded from Coverage

Some modules are excluded from coverage as they require external services:

```typescript
coveragePathIgnorePatterns: [
  '/node_modules/',
  '/.next/',
  '/out/',
  '/coverage/',
  // External services and runtime-dependent modules
  'lib/search/',            // Search APIs
  'lib/vector/',            // Vector DB clients
  'lib/native/',            // Tauri runtime
  'lib/project/import-export.ts', // File system operations
],
```

### Viewing Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/lcov-report/index.html  # macOS
xdg-open coverage/lcov-report/index.html  # Linux
start coverage/lcov-report/index.html  # Windows
```

### Improving Coverage

1. **Write tests for new code**: Maintain >70% coverage for new code
2. **Test edge cases**: Handle null, undefined, error states
3. **Mock external dependencies**: Focus on business logic
4. **Test branches**: Cover all conditional branches

## Test File Locations

### Unit Tests

**Location**: Co-located with source files

```
lib/
  utils.ts
  utils.test.ts          # Unit test

stores/
  settings-store.ts
  settings-store.test.ts # Unit test

components/
  chat/
    chat-input.tsx
    chat-input.test.tsx  # Unit test
```

**Naming**: `[filename].test.ts` or `[filename].test.tsx`

### E2E Tests

**Location**: `e2e/` directory organized by feature

```
e2e/
  ai/                    # AI feature tests
  core/                  # Core functionality
  features/              # Feature-specific tests
    settings.spec.ts
    projects.spec.ts
  ui/                    # UI component tests
```

**Naming**: `[feature].spec.ts`

## Running Tests

### Unit Tests

```bash
# Run all tests once
pnpm test

# Run in watch mode (re-runs on file changes)
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test lib/utils.test.ts

# Run tests matching pattern
pnpm test --testNamePattern="should merge"

# Run tests in verbose mode
pnpm test --verbose
```

### E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI mode (interactive)
pnpm test:e2e:ui

# Run in headed browser (show browser)
pnpm test:e2e:headed

# Run specific test file
pnpm test:e2e e2e/features/chat.spec.ts

# Run tests matching pattern
pnpm test:e2e --grep "Chat Flow"

# Debug tests
pnpm test:e2e --debug
```

### CI/CD Tests

Tests run automatically on:

- Pull requests
- Push to main/develop branches

See `.github/workflows/ci.yml` for configuration.

## Writing Tests

### AAA Pattern (Arrange-Act-Assert)

```typescript
describe('Feature', () => {
  it('should do something', () => {
    // Arrange: Set up test data and conditions
    const input = 'test';
    const expected = 'TEST';

    // Act: Execute the function being tested
    const result = toUpperCase(input);

    // Assert: Verify expected outcome
    expect(result).toBe(expected);
  });
});
```

### Testing Best Practices

1. **Test behavior, not implementation**

   ```typescript
   // ✅ Good: Tests user behavior
   it('displays error when API key is missing', () => {
     render(<ChatInput />);
     fireEvent.click(screen.getByText('Send'));
     expect(screen.getByText('API key required')).toBeInTheDocument();
   });

   // ❌ Bad: Tests implementation details
   it('calls setError with error message', () => {
     const setError = jest.fn();
     // Tests internal state instead of behavior
   });
   ```

2. **Use descriptive test names**

   ```typescript
   // ✅ Good: Clear description
   it('should add message to store when user submits valid input', () => {});

   // ❌ Bad: Vague description
   it('works', () => {});
   ```

3. **Test edge cases**

   ```typescript
   it('handles empty input', () => {});
   it('handles null input', () => {});
   it('handles very long input', () => {});
   it('handles special characters', () => {});
   ```

4. **Keep tests independent**

   ```typescript
   beforeEach(() => {
     // Reset state before each test
     useSettingsStore.getState().resetSettings();
   });
   ```

5. **Use waitFor for async operations**

   ```typescript
   it('updates message after API call', async () => {
     render(<MessageComponent />);
     fireEvent.click(screen.getByText('Send'));

     // Wait for async update
     await waitFor(() => {
       expect(screen.getByText('Response')).toBeInTheDocument();
     });
   });
   ```

## Mocking Strategies

### Mocking External Services

```typescript
// Mock OpenAI API
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => (model: string) => ({
    model,
    provider: 'openai'
  }))
}));

// Mock in test
import { createOpenAI } from '@ai-sdk/openai';

it('uses OpenAI client', () => {
  const client = createOpenAI({ apiKey: 'test' });
  expect(client).toBeDefined();
});
```

### Mocking Browser APIs

```typescript
// Mock SpeechRecognition
const mockSpeechRecognition = jest.fn();
mockSpeechRecognition.prototype.start = jest.fn();
mockSpeechRecognition.prototype.stop = jest.fn();

(window as any).SpeechRecognition = mockSpeechRecognition;
(window as any).webkitSpeechRecognition = mockSpeechRecognition;
```

### Mocking Tauri Plugins

```typescript
// __mocks__/tauri-plugin-fs.js
export const readFile = jest.fn();
export const writeFile = jest.fn();
export const exists = jest.fn();

// Usage in test
jest.mock('@tauri-apps/plugin-fs', () => ({
  readFile: jest.fn(() => Promise.resolve('file content')),
  writeFile: jest.fn(() => Promise.resolve()),
  exists: jest.fn(() => Promise.resolve(true))
}));
```

### Mocking IndexedDB

```typescript
import 'fake-indexeddb/auto';

// Use fake-indexeddb in tests
it('stores messages in IndexedDB', async () => {
  const db = new Dexie('TestDB');
  // Use fake IndexedDB
});
```

### Manual Mocks

Create manual mocks in `__mocks__/` directory:

```typescript
// __mocks__/shiki.js
export const highlight = jest.fn(() => '<span>highlighted</span>');
export const getHighlighter = jest.fn(async () => ({
  loadLanguage: jest.fn(),
  loadTheme: jest.fn(),
  codeToHtml: jest.fn(() => '<span>code</span>')
}));
```

---

**Last Updated**: December 25, 2025
