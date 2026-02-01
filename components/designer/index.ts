/**
 * Designer components index
 * V0-style web page designer
 * 
 * Components organized by function:
 * - core/     - Main designer components (DesignerPanel, V0Designer, etc.)
 * - ai/       - AI-related components (AIChatPanel, AISuggestionsPanel)
 * - editor/   - Code editing (MonacoSandpackEditor, ReactSandbox, etc.)
 * - panels/   - Side panels (StylePanel, ElementTree, ComponentLibrary, etc.)
 * - preview/  - Preview components (DesignerPreview, ResponsiveControls, etc.)
 * - toolbar/  - Toolbar components (DesignerToolbar, InlineTextEditor, etc.)
 * - dnd/      - Drag and drop system
 * 
 * Performance optimizations:
 * - Heavy components use React.lazy() for code splitting
 * - Element tree supports virtualization for 1000+ elements
 * - Monaco editor has preloading and progress tracking
 */

import { lazy } from 'react';

// Core components
export { DesignerPanel } from './core';
export { V0Designer } from './core';
export { DesignerCard } from './core';
export { DesignerBrowser } from './core';
export { FloatingPromptBar } from './core';
export { MobileDesignerLayout } from './core';

// AI components
export { AIChatPanel } from './ai';
export { AISuggestionsPanel } from './ai';

// Editor components
export { MonacoSandpackEditor } from './editor';
export { ReactSandbox } from './editor';
export { SandboxFileExplorer } from './editor';
export { SandboxErrorBoundary, useErrorBoundaryReset, useConsoleErrorInterceptor } from './editor';

// Panel components
export { StylePanel } from './panels';
export { ElementTree } from './panels';
export { ElementTreeVirtual } from './panels';
export { ElementActionsPopover } from './panels';
export { VersionHistoryPanel } from './panels';
export { ComponentLibrary } from './panels';
export { DesignTokensPanel } from './panels';
export { ExportOptionsPanel } from './panels';

// Preview components
export { DesignerPreview } from './preview';
export { PreviewLoading, usePreviewStatus } from './preview';
export { ResponsiveControls } from './preview';
export { LayoutGridOverlay } from './preview';
export { BreadcrumbNav } from './preview';

// Toolbar components
export { DesignerToolbar } from './toolbar';
export { InlineTextEditor, useInlineTextEditor } from './toolbar';
export { KeyboardShortcuts, useDesignerShortcuts } from './toolbar';
export { KeyboardShortcutsDialog } from './toolbar';

// DnD exports
export { DesignerDndProvider, useDesignerDnd, useDesignerDndStrict } from './dnd';

// Lazy-loaded components for code splitting (heavy components)
export const LazyDesignerPanel = lazy(() => import('./core/designer-panel'));
export const LazyComponentLibrary = lazy(() => import('./panels/component-library'));
export const LazyVersionHistoryPanel = lazy(() => import('./panels/version-history-panel'));
export const LazyAIChatPanel = lazy(() => import('./ai/ai-chat-panel'));
export const LazyAISuggestionsPanel = lazy(() => import('./ai/ai-suggestions-panel'));
export const LazyStylePanel = lazy(() => import('./panels/style-panel'));
export const LazyMonacoEditor = lazy(() => import('./editor/monaco-sandpack-editor'));

// Re-export submodule namespaces for direct access
export * as CoreComponents from './core';
export * as AIComponents from './ai';
export * as EditorComponents from './editor';
export * as PanelComponents from './panels';
export * as PreviewComponents from './preview';
export * as ToolbarComponents from './toolbar';
export * as DndComponents from './dnd';
