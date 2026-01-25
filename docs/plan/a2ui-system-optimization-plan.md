# A2UI System Optimization Plan

## Overview

A2UI (Agent to UI) is a protocol-based system for AI-generated UI components. This plan outlines comprehensive improvements to optimize performance, expand capabilities, and enhance developer experience.

**Current Architecture:**
- **Store**: Zustand-based state management (`stores/a2ui/a2ui-store.ts`)
- **Types**: Comprehensive type definitions (`types/artifact/a2ui.ts`)
- **Components**: 30+ React components (`components/a2ui/`)
- **Utilities**: Parser, data model, events, catalog (`lib/a2ui/`)
- **Hooks**: Custom React hooks (`hooks/a2ui/`)
- **Templates**: 13 app templates (`lib/a2ui/templates.ts`)

**Location Reference:**
- Store: `stores/a2ui/a2ui-store.ts`
- Types: `types/artifact/a2ui.ts`
- Components: `components/a2ui/`
- Lib: `lib/a2ui/`
- Hooks: `hooks/a2ui/`

---

## 1. Performance Optimizations

### 1.1 Virtual Scrolling for Large Lists

**Problem:** List and Table components with thousands of rows cause performance issues.

**Solution:** Implement virtual scrolling.

**Files to modify:**
- `components/a2ui/data/a2ui-list.tsx` → Add virtual list mode
- `components/a2ui/data/a2ui-table.tsx` → Add virtual table mode
- `lib/a2ui/data-model.ts` → Add optimized array access

**Implementation:**
```typescript
// lib/a2ui/virtual-list.ts (new file)
export interface VirtualListConfig {
  itemHeight: number | ((index: number) => number);
  overscan: number;
  estimatedItemHeight: number;
}

export function calculateVisibleRange(
  scrollTop: number,
  viewportHeight: number,
  itemCount: number,
  config: VirtualListConfig
): { start: number; end: number }
```

### 1.2 Component Memoization Strategy

**Problem:** Unnecessary re-renders in nested component trees.

**Solution:** Strategic React.memo and useMemo usage.

**Files to modify:**
- `components/a2ui/a2ui-renderer.tsx`
- `components/a2ui/layout/a2ui-row.tsx`
- `components/a2ui/layout/a2ui-column.tsx`

**Implementation:**
```typescript
// Export memoized component variants
export const A2UIRow = memo(function A2UIRow({ component, ...props }: A2UIComponentProps<A2UIRowComponent>) {
  // Component implementation
}, (prevProps, nextProps) => {
  return shallowEqual(prevProps.component, nextProps.component);
});
```

### 1.3 Message Processing Optimization

**Problem:** Batch message processing can block the main thread.

**Solution:** Implement batched and async processing.

**Files to modify:**
- `stores/a2ui/a2ui-store.ts`
- `lib/a2ui/parser.ts`

**Implementation:**
```typescript
// lib/a2ui/batch-processor.ts (new file)
export class BatchProcessor {
  private queue: A2UIServerMessage[] = [];
  private processing = false;

  async enqueue(messages: A2UIServerMessage[]): Promise<void> {
    this.queue.push(...messages);
    if (!this.processing) {
      await this.process();
    }
  }

  private async process(): Promise<void> {
    this.processing = true;
    const BATCH_SIZE = 50;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, BATCH_SIZE);
      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to main thread
      // Process batch
    }
    
    this.processing = false;
  }
}
```

---

## 2. Component Library Expansion

### 2.1 New Layout Components

**Priority: High**

| Component | File | Description |
|-----------|------|-------------|
| Tabs | `components/a2ui/layout/a2ui-tabs.tsx` | Tabbed content container |
| Accordion | `components/a2ui/layout/a2ui-accordion.tsx` | Collapsible sections |
| Stepper | `components/a2ui/layout/a2ui-stepper.tsx` | Multi-step wizard |
| SplitView | `components/a2ui/layout/a2ui-split-view.tsx` | Resizable panes |
| Grid | `components/a2ui/layout/a2ui-grid.tsx` | CSS Grid layout |

**Type definitions to add in `types/artifact/a2ui.ts`:**
```typescript
export interface A2UITabsComponent extends A2UIBaseComponent {
  component: 'Tabs';
  tabs: Array<{ id: string; label: string; icon?: string }>;
  activeTab: A2UIStringOrPath;
  children: string[];
  variant?: 'line' | 'enclosed' | 'soft';
}

export interface A2UIAccordionComponent extends A2UIBaseComponent {
  component: 'Accordion';
  items: Array<{
    id: string;
    title: A2UIStringOrPath;
    children: string[];
    disabled?: A2UIBooleanOrPath;
  }>;
  multiple?: boolean;
  defaultOpen?: string[];
}
```

### 2.2 New Data Components

**Priority: High**

| Component | File | Description |
|-----------|------|-------------|
| TreeView | `components/a2ui/data/a2ui-tree-view.tsx` | Hierarchical data |
| Kanban | `components/a2ui/data/a2ui-kanban.tsx` | Kanban board |
| Timeline | `components/a2ui/data/a2ui-timeline.tsx` | Vertical timeline |
| Calendar | `components/a2ui/data/a2ui-calendar.tsx` | Date picker calendar |
| DataGrid | `components/a2ui/data/a2ui-data-grid.tsx` | Advanced table with virtualization |

### 2.3 New Input Components

**Priority: Medium**

| Component | File | Description |
|-----------|------|-------------|
| ColorPicker | `components/a2ui/form/a2ui-color-picker.tsx` | Color selection |
| FileUpload | `components/a2ui/form/a2ui-file-upload.tsx` | File upload |
| RichTextEditor | `components/a2ui/form/a2ui-rich-text.tsx` | WYSIWYG editor |
| Rating | `components/a2ui/form/a2ui-rating.tsx` | Star rating |
| ToggleGroup | `components/a2ui/form/a2ui-toggle-group.tsx` | Toggle button group |
| Autocomplete | `components/a2ui/form/a2ui-autocomplete.tsx` | Searchable select |

### 2.4 New Display Components

**Priority: Medium**

| Component | File | Description |
|-----------|------|-------------|
| Avatar | `components/a2ui/display/a2ui-avatar.tsx` | User avatar |
| Chip | `components/a2ui/display/a2ui-chip.tsx` | Dismissible tags |
| Skeleton | `components/a2ui/display/a2ui-skeleton.tsx` | Loading skeleton |
| Tooltip | `components/a2ui/display/a2ui-tooltip.tsx` | Hover tooltip |
| CodeBlock | `components/a2ui/display/a2ui-code-block.tsx` | Syntax-highlighted code |

---

## 3. State Management Improvements

### 3.1 Surface State Persistence

**Problem:** Surface state is lost on page refresh.

**Solution:** Implement persistence layer with localStorage.

**Files to modify:**
- `stores/a2ui/a2ui-store.ts` (add persistence middleware)

**Implementation:**
```typescript
// stores/a2ui/a2ui-store-persistence.ts (new file)
export const PERSISTENCE_KEY = 'a2ui-surfaces';

export function createPersistenceMiddleware() {
  return (config: StateCreator<A2UIState & A2UIActions>) => (set, get, api) => {
    const stored = localStorage.getItem(PERSISTENCE_KEY);
    const initialState = stored ? JSON.parse(stored) : undefined;
    
    const store = config(
      initialState ? { ...config, ...initialState } : set,
      get,
      api
    );
    
    api.subscribe((state) => {
      const persistable = {
        surfaces: state.surfaces,
        activeSurfaceId: state.activeSurfaceId,
      };
      localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(persistable));
    });
    
    return store;
  };
}
```

### 3.2 Undo/Redo System

**Problem:** No way to revert user actions.

**Solution:** Implement command pattern for undo/redo.

**Files to create:**
- `lib/a2ui/undo-redo.ts`
- `stores/a2ui/undo-redo-store.ts`

**Implementation:**
```typescript
// lib/a2ui/undo-redo.ts
export interface Command {
  execute(): void;
  undo(): void;
  canUndo(): boolean;
}

export class UndoManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private limit = 50;

  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = [];
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }
  }

  undo(): boolean {
    const command = this.undoStack.pop();
    if (command && command.canUndo()) {
      command.undo();
      this.redoStack.push(command);
      return true;
    }
    return false;
  }

  redo(): boolean {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
      return true;
    }
    return false;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1].canUndo();
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
```

### 3.3 Surface Snapshots

**Problem:** No way to save and restore surface states.

**Solution:** Add snapshot/restore functionality.

**Files to modify:**
- `stores/a2ui/a2ui-store.ts`

**Implementation:**
```typescript
// Add to A2UIActions
interface A2UIActions {
  // ... existing actions
  createSnapshot: (surfaceId: string) => string;
  restoreSnapshot: (surfaceId: string, snapshotId: string) => boolean;
  listSnapshots: (surfaceId: string) => SurfaceSnapshot[];
}

interface SurfaceSnapshot {
  id: string;
  surfaceId: string;
  timestamp: number;
  components: Record<string, A2UIComponent>;
  dataModel: Record<string, unknown>;
}
```

---

## 4. Developer Experience

### 4.1 Component Inspector

**Problem:** Difficult to debug component trees and data bindings.

**Solution:** Create dev tools panel for A2UI inspection.

**Files to create:**
- `components/a2ui/devtools/a2ui-inspector.tsx`
- `components/a2ui/devtools/inspector-sidebar.tsx`
- `lib/a2ui/devtools.ts`

**Implementation:**
```typescript
// components/a2ui/devtools/a2ui-inspector.tsx
export function A2UIInspector({ surfaceId }: { surfaceId: string }) {
  const surface = useA2UIStore(state => state.surfaces[surfaceId]);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  return (
    <div className="a2ui-inspector">
      <ComponentTree 
        components={surface.components} 
        onSelect={setSelectedComponentId}
      />
      {selectedComponentId && (
        <ComponentDetails 
          component={surface.components[selectedComponentId]}
          dataModel={surface.dataModel}
        />
      )}
    </div>
  );
}
```

### 4.2 Validation Warnings

**Problem:** Invalid component definitions fail silently.

**Solution:** Add validation with developer warnings.

**Files to modify:**
- `lib/a2ui/catalog.ts` (add strict mode)

**Implementation:**
```typescript
// lib/a2ui/validation.ts (new file)
export interface ValidationContext {
  strict: boolean;
  devMode: boolean;
}

export function validateComponentTree(
  components: A2UIComponent[],
  context: ValidationContext = { strict: false, devMode: true }
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const component of components) {
    // Validate required fields
    if (!component.id) {
      errors.push({ component, message: 'Missing required field: id' });
    }

    // Validate component type
    if (!isKnownComponentType(component.component)) {
      warnings.push({ 
        component, 
        message: `Unknown component type: ${component.component}` 
      });
    }

    // Validate children references
    if ('children' in component && Array.isArray(component.children)) {
      for (const childId of component.children) {
        if (!components.find(c => c.id === childId)) {
          errors.push({ 
            component, 
            message: `Missing child component: ${childId}` 
          });
        }
      }
    }

    // Validate data bindings
    const paths = extractReferencedPaths([component]);
    for (const path of paths) {
      if (!isValidJsonPointer(path)) {
        errors.push({ 
          component, 
          message: `Invalid JSON Pointer: ${path}` 
        });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
```

### 4.3 Error Boundaries

**Problem:** Component errors crash entire surfaces.

**Solution:** Add error boundaries with recovery options.

**Files to modify:**
- `components/a2ui/a2ui-surface.tsx`
- `components/a2ui/a2ui-renderer.tsx`

**Implementation:**
```typescript
// components/a2ui/a2ui-error-boundary.tsx (new file)
interface A2UIErrorBoundaryProps {
  surfaceId: string;
  componentId: string;
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export function A2UIErrorBoundary({ 
  surfaceId, 
  componentId, 
  children, 
  fallback 
}: A2UIErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null);

  const retry = useCallback(() => {
    setError(null);
  }, []);

  return (
    <ReactErrorBoundary
      fallback={fallback ? ({ error }) => fallback({ error, retry }) : undefined}
      onError={(err) => {
        setError(err);
        console.error(`[A2UI] Error in component ${componentId}:`, err);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
```

---

## 5. Testing Improvements

### 5.1 E2E Test Scenarios

**Files to create:**
- `e2e/a2ui/basic-interactions.spec.ts`
- `e2e/a2ui/form-validation.spec.ts`
- `e2e/a2ui/data-binding.spec.ts`
- `e2e/a2ui/surface-lifecycle.spec.ts`

**Example:**
```typescript
// e2e/a2ui/basic-interactions.spec.ts
import { test, expect } from '@playwright/test';

test.describe('A2UI Basic Interactions', () => {
  test('button click triggers user action', async ({ page }) => {
    await page.goto('/chat');
    
    // Create a surface with a button
    await page.evaluate(() => {
      window.a2ui.createQuickSurface('test', [
        { id: 'btn', component: 'Button', text: 'Click Me', action: 'test_action' }
      ]);
    });
    
    // Click the button
    await page.click('[data-component-id="btn"]');
    
    // Verify action was emitted
    const actions = await page.evaluate(() => window.a2ui.getActions());
    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe('test_action');
  });
});
```

### 5.2 Visual Regression Testing

**Files to create:**
- `e2e/a2ui/visual/component-screenshots.spec.ts`

**Implementation:**
```typescript
// e2e/a2ui/visual/component-screenshots.spec.ts
import { test, expect } from '@playwright/test';

test.describe('A2UI Visual Regression', () => {
  test('button variants match snapshots', async ({ page }) => {
    await page.goto('/a2ui-test');
    
    for (const variant of ['default', 'primary', 'secondary', 'destructive', 'outline', 'ghost']) {
      await page.evaluate((v) => {
        window.renderComponent({
          id: 'test-btn',
          component: 'Button',
          text: v,
          variant: v
        });
      }, variant);
      
      await expect(page.locator('[data-component-id="test-btn"]')).toHaveScreenshot(`button-${variant}.png`);
    }
  });
});
```

### 5.3 Performance Benchmarking

**Files to create:**
- `lib/a2ui/benchmark.ts`
- `test/a2ui/performance.spec.ts`

**Implementation:**
```typescript
// lib/a2ui/benchmark.ts
export interface BenchmarkConfig {
  surfaceId: string;
  componentCount: number;
  dataPoints: number;
  iterations: number;
}

export interface BenchmarkResult {
  setupTime: number;
  renderTime: number;
  interactionTime: number;
  memoryUsage: number;
}

export async function runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
  const startTime = performance.now();
  
  // Setup surface with many components
  const setupStart = performance.now();
  // ... create surface
  const setupTime = performance.now() - setupStart;
  
  // Measure render time
  const renderStart = performance.now();
  // ... trigger render
  const renderTime = performance.now() - renderStart;
  
  // Measure interaction time
  const interactionStart = performance.now();
  // ... simulate interactions
  const interactionTime = performance.now() - interactionStart;
  
  return {
    setupTime,
    renderTime,
    interactionTime,
    memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
  };
}
```

---

## 6. Type Safety Improvements

### 6.1 Schema-Based Validation

**Files to create:**
- `lib/a2ui/schema.ts`
- `lib/a2ui/schema-registry.ts`

**Implementation:**
```typescript
// lib/a2ui/schema.ts
import type { JSONSchema7 } from 'json-schema';

export const componentSchemas: Record<A2UIComponentType, JSONSchema7> = {
  Button: {
    type: 'object',
    required: ['id', 'component', 'text', 'action'],
    properties: {
      id: { type: 'string' },
      component: { const: 'Button' },
      text: { oneOf: [{ type: 'string' }, { type: 'object', required: ['path'] }] },
      action: { type: 'string' },
      variant: { enum: ['default', 'primary', 'secondary', 'destructive', 'outline', 'ghost', 'link'] },
      icon: { type: 'string' },
      loading: { oneOf: [{ type: 'boolean' }, { type: 'object', required: ['path'] }] },
    },
    additionalProperties: false,
  },
  // ... other component schemas
};

export function validateComponentAgainstSchema<T extends A2UIComponent>(
  component: T,
  schema: JSONSchema7
): { valid: boolean; errors: string[] } {
  // Use AJV or similar for JSON Schema validation
  return { valid: true, errors: [] };
}
```

### 6.2 Typed Data Binding

**Problem:** Data binding values lose type information.

**Solution:** Create typed path helpers.

**Files to create:**
- `lib/a2ui/typed-paths.ts`
- `types/artifact/a2ui-typed.ts`

**Implementation:**
```typescript
// lib/a2ui/typed-paths.ts
export type DataModelPaths<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends object 
        ? `${K & string}/${DataModelPaths<T[K]>}` 
        : K & string;
    }[keyof T]
  : never;

export interface TypedSurface<TDataModel extends Record<string, unknown>> {
  getValue<K extends DataModelPaths<TDataModel>>(
    path: K
  ): PathValue<TDataModel, K>;
  
  setValue<K extends DataModelPaths<TDataModel>>(
    path: K,
    value: PathValue<TDataModel, K>
  ): void;
}

// Usage example:
interface TodoDataModel {
  newTask: string;
  tasks: Array<{ id: string; title: string; completed: boolean }>;
  stats: { completed: number; pending: number };
}

const surface: TypedSurface<TodoDataModel> = createTypedSurface<TodoDataModel>('todo');
const newTask = surface.getValue('newTask'); // Type is string
const completed = surface.getValue('stats/completed'); // Type is number
```

---

## 7. Accessibility Improvements

### 7.1 ARIA Attributes

**Files to modify:**
- All form components in `components/a2ui/form/`
- All interactive components

**Implementation:**
```typescript
// components/a2ui/form/a2ui-button.tsx
export function A2UIButton({ component, ...props }: A2UIComponentProps<A2UIButtonComponent>) {
  return (
    <button
      id={component.id}
      aria-label={component.text} // Should be separate prop for a11y
      aria-describedby={component.helperText ? `${component.id}-helper` : undefined}
      aria-busy={loading ? 'true' : undefined}
      {...props}
    >
      {/* Button content */}
    </button>
  );
}
```

### 7.2 Keyboard Navigation

**Files to create:**
- `lib/a2ui/keyboard.ts`
- `components/a2ui/a2ui-focus-trap.tsx`

**Implementation:**
```typescript
// lib/a2ui/keyboard.ts
export interface KeyboardNavigationConfig {
  enableArrowKeys: boolean;
  enableHomeEnd: boolean;
  enablePageKeys: boolean;
  wrapNavigation: boolean;
}

export class KeyboardNavigator {
  private focusable: Set<string> = new Set();
  private currentIndex = 0;

  register(componentId: string): void {
    this.focusable.add(componentId);
  }

  unregister(componentId: string): void {
    this.focusable.delete(componentId);
  }

  navigate(direction: 'next' | 'previous' | 'first' | 'last'): string | null {
    const items = Array.from(this.focusable);
    
    switch (direction) {
      case 'next':
        this.currentIndex = (this.currentIndex + 1) % items.length;
        break;
      case 'previous':
        this.currentIndex = (this.currentIndex - 1 + items.length) % items.length;
        break;
      case 'first':
        this.currentIndex = 0;
        break;
      case 'last':
        this.currentIndex = items.length - 1;
        break;
    }
    
    return items[this.currentIndex];
  }
}
```

### 7.3 Screen Reader Support

**Files to create:**
- `lib/a2ui/announcer.ts`
- `components/a2ui/a2ui-live-region.tsx`

**Implementation:**
```typescript
// lib/a2ui/announcer.ts
export class A2UIAnnouncer {
  private element: HTMLElement | null = null;

  init(): void {
    this.element = document.createElement('div');
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');
    this.element.setAttribute('aria-atomic', 'true');
    this.element.className = 'sr-only';
    document.body.appendChild(this.element);
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.element) return;
    
    this.element.setAttribute('aria-live', priority);
    this.element.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      this.element!.textContent = '';
    }, 1000);
  }

  destroy(): void {
    this.element?.remove();
    this.element = null;
  }
}
```

---

## 8. Internationalization

### 8.1 Message Extraction

**Files to create:**
- `lib/a2ui/i18n-extractor.ts`

**Implementation:**
```typescript
// lib/a2ui/i18n-extractor.ts
export interface TranslatableString {
  componentId: string;
  property: string;
  value: string;
  context?: string;
}

export function extractTranslatableStrings(
  components: A2UIComponent[]
): TranslatableString[] {
  const strings: TranslatableString[] = [];
  
  function traverse(component: A2UIComponent) {
    // Extract text content
    if ('text' in component && typeof component.text === 'string') {
      strings.push({
        componentId: component.id,
        property: 'text',
        value: component.text,
      });
    }
    
    // Extract labels
    if ('label' in component && typeof component.label === 'string') {
      strings.push({
        componentId: component.id,
        property: 'label',
        value: component.label,
      });
    }
    
    // Extract placeholders
    if ('placeholder' in component && typeof component.placeholder === 'string') {
      strings.push({
        componentId: component.id,
        property: 'placeholder',
        value: component.placeholder,
      });
    }
  }
  
  for (const component of components) {
    traverse(component);
  }
  
  return strings;
}
```

### 8.2 RTL Layout Support

**Files to modify:**
- All layout components (Row, Column, etc.)

**Implementation:**
```typescript
// components/a2ui/layout/a2ui-row.tsx
export function A2UIRow({ component, ...props }: A2UIComponentProps<A2UIRowComponent>) {
  const { dir } = useA2UIContext();
  
  const rowStyles = {
    flexDirection: dir === 'rtl' ? 'row-reverse' : 'row',
    // ... other styles
  };
  
  return (
    <div style={rowStyles} dir={dir}>
      {/* Children */}
    </div>
  );
}
```

---

## 9. Animation & Transitions

### 9.1 Animation Library

**Files to create:**
- `lib/a2ui/animations.ts`
- `components/a2ui/display/a2ui-motion-container.tsx`

**Implementation:**
```typescript
// lib/a2ui/animations.ts
export type AnimationType = 
  | 'fade'
  | 'slide'
  | 'scale'
  | 'rotate'
  | 'bounce'
  | 'shake';

export interface AnimationConfig {
  type: AnimationType;
  duration?: number;
  delay?: number;
  easing?: string;
  repeat?: number;
}

export const animationPresets: Record<string, AnimationConfig> = {
  fadeIn: { type: 'fade', duration: 300, easing: 'ease-in' },
  slideUp: { type: 'slide', duration: 400, easing: 'ease-out' },
  scaleIn: { type: 'scale', duration: 200, easing: 'ease-out' },
  bounce: { type: 'bounce', duration: 500, repeat: 1 },
};

export function getAnimationKeyframes(type: AnimationType): Keyframe[] {
  switch (type) {
    case 'fade':
      return [
        { opacity: 0 },
        { opacity: 1 }
      ];
    case 'slide':
      return [
        { transform: 'translateY(20px)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 }
      ];
    case 'scale':
      return [
        { transform: 'scale(0.8)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 }
      ];
    // ... more animations
  }
}
```

### 9.2 Skeleton Loading

**Files to create:**
- `components/a2ui/display/a2ui-skeleton.tsx`

**Implementation:**
```typescript
// components/a2ui/display/a2ui-skeleton.tsx
export interface A2UISkeletonComponent extends A2UIBaseComponent {
  component: 'Skeleton';
  variant?: 'text' | 'circular' | 'rectangular';
  width?: number | string;
  height?: number | string;
  count?: number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function A2UISkeleton({ component }: A2UIComponentProps<A2UISkeletonComponent>) {
  const { variant = 'text', width, height, count = 1, animation = 'pulse' } = component;
  
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn('a2ui-skeleton', `a2ui-skeleton-${variant}`, `a2ui-skeleton-${animation}`)}
          style={{ width, height }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
```

---

## 10. Data Management

### 10.1 Computed Values

**Problem:** No way to derive values from data model.

**Solution:** Add computed field system.

**Files to create:**
- `lib/a2ui/computed.ts`

**Implementation:**
```typescript
// lib/a2ui/computed.ts
export interface ComputedField<T = unknown> {
  path: string;
  compute: (dataModel: Record<string, unknown>) => T;
  dependencies: string[];
}

export class ComputedValueManager {
  private computedFields: Map<string, ComputedField> = new Map();

  register(field: ComputedField): void {
    this.computedFields.set(field.path, field);
  }

  computeAll(
    dataModel: Record<string, unknown>
  ): Map<string, unknown> {
    const results = new Map<string, unknown>();
    
    for (const [path, field] of this.computedFields) {
      try {
        results.set(path, field.compute(dataModel));
      } catch (error) {
        console.error(`[A2UI] Error computing ${path}:`, error);
        results.set(path, undefined);
      }
    }
    
    return results;
  }

  getDependencies(path: string): string[] {
    return this.computedFields.get(path)?.dependencies ?? [];
  }
}

// Usage example:
const computedManager = new ComputedValueManager();
computedManager.register({
  path: '/stats/completedCount',
  compute: (data) => {
    const tasks = data.tasks as Array<{ completed: boolean }>;
    return tasks.filter(t => t.completed).length;
  },
  dependencies: ['/tasks'],
});
```

### 10.2 Data Validation Framework

**Files to create:**
- `lib/a2ui/validation.ts`
- `lib/a2ui/validators.ts`

**Implementation:**
```typescript
// lib/a2ui/validators.ts
export type Validator<T = unknown> = (value: T) => ValidationResult;

export interface ValidationRule<T = unknown> {
  validator: Validator<T>;
  message: string;
}

export const validators = {
  required: (value: unknown) => ({
    valid: value !== null && value !== undefined && value !== '',
    error: 'This field is required',
  }),
  
  minLength: (min: number) => (value: string) => ({
    valid: value.length >= min,
    error: `Must be at least ${min} characters`,
  }),
  
  email: (value: string) => ({
    valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    error: 'Must be a valid email address',
  }),
  
  pattern: (regex: RegExp) => (value: string) => ({
    valid: regex.test(value),
    error: 'Format is invalid',
  }),
};

// lib/a2ui/validation.ts
export class FormValidator {
  private rules: Map<string, ValidationRule[]> = new Map();

  addRule(path: string, rule: ValidationRule): void {
    const existing = this.rules.get(path) ?? [];
    this.rules.set(path, [...existing, rule]);
  }

  validate(
    dataModel: Record<string, unknown>
  ): Record<string, string> {
    const errors: Record<string, string> = {};
    
    for (const [path, rules] of this.rules) {
      const value = getValueByPath(dataModel, path);
      
      for (const rule of rules) {
        const result = rule.validator(value);
        if (!result.valid) {
          errors[path] = result.error;
          break;
        }
      }
    }
    
    return errors;
  }
}
```

### 10.3 Async Data Loading

**Files to create:**
- `lib/a2ui/async-data.ts`
- `hooks/a2ui/use-a2ui-async-data.ts`

**Implementation:**
```typescript
// lib/a2ui/async-data.ts
export interface AsyncDataSource<T = unknown> {
  path: string;
  load: () => Promise<T>;
  refresh?: () => Promise<T>;
  pollInterval?: number;
}

export class AsyncDataManager {
  private sources: Map<string, AsyncDataSource> = new Map();
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private loading: Set<string> = new Set();

  register(source: AsyncDataSource): void {
    this.sources.set(source.path, source);
  }

  async load(path: string): Promise<unknown> {
    if (this.loading.has(path)) {
      // Return existing promise
      return this.cache.get(path)?.data;
    }

    const source = this.sources.get(path);
    if (!source) {
      throw new Error(`No data source registered for ${path}`);
    }

    this.loading.add(path);
    
    try {
      const data = await source.load();
      this.cache.set(path, { data, timestamp: Date.now() });
      
      // Set up polling if configured
      if (source.pollInterval) {
        this.startPolling(path, source.pollInterval);
      }
      
      return data;
    } finally {
      this.loading.delete(path);
    }
  }

  private startPolling(path: string, interval: number): void {
    const source = this.sources.get(path);
    if (!source?.refresh) return;

    const timer = setInterval(async () => {
      const data = await source.refresh!();
      this.cache.set(path, { data, timestamp: Date.now() });
    }, interval);

    // Store timer for cleanup
    // ...
  }

  isLoading(path: string): boolean {
    return this.loading.has(path);
  }

  getData<T = unknown>(path: string): T | undefined {
    return this.cache.get(path)?.data as T;
  }
}
```

---

## Implementation Priority

### Phase 1 (Critical Performance)
1. Virtual scrolling for List and Table
2. Component memoization
3. Batch message processing
4. Error boundaries

### Phase 2 (Developer Experience)
1. Component inspector
2. Validation warnings
3. Undo/redo system
4. Surface persistence

### Phase 3 (Feature Expansion)
1. New layout components (Tabs, Accordion, Stepper)
2. New data components (TreeView, Kanban, Timeline)
3. New input components (ColorPicker, FileUpload, RichTextEditor)
4. Animation library

### Phase 4 (Quality & Polish)
1. Accessibility improvements (ARIA, keyboard navigation)
2. Internationalization support
3. Visual regression testing
4. Performance benchmarking

### Phase 5 (Advanced Features)
1. Computed values
2. Data validation framework
3. Async data loading
4. Type-safe data bindings

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Component render time (100 items) | < 100ms | TBD |
| Message processing throughput | 1000 msg/sec | TBD |
| Bundle size (components) | < 200KB | TBD |
| Test coverage | 80%+ | TBD |
| Accessibility score (Lighthouse) | 95+ | TBD |
| Component count | 50+ | 30 |

---

## Related Files

- Store: `stores/a2ui/a2ui-store.ts`
- Types: `types/artifact/a2ui.ts`
- Components: `components/a2ui/`
- Lib: `lib/a2ui/`
- Hooks: `hooks/a2ui/`
- Tests: `components/a2ui/**/*.test.tsx`, `lib/a2ui/**/*.test.ts`, `hooks/a2ui/**/*.test.ts`
