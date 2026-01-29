'use client';

/**
 * Chat Renderers - Export all specialized renderers for chat messages
 * 
 * This module provides comprehensive rendering support for various content types:
 * - Code blocks with syntax highlighting
 * - Math equations (block and inline)
 * - Diagrams (Mermaid, VegaLite)
 * - Media (images, videos, audio)
 * - Interactive elements (task lists, alerts, details)
 * - Rich content (link cards, diffs, footnotes)
 */

// Code rendering
export { CodeBlock } from './code-block';
export { DiffBlock } from './diff-block';
export { SandpackBlock, SimplePlayground } from './sandpack-block';

// Math rendering
export { MathBlock } from './math-block';
export { MathInline } from './math-inline';

// Diagram rendering
export { MermaidBlock, type MermaidBlockViewMode } from './mermaid-block';
export { MermaidEditor, type MermaidEditorProps, type MermaidEditorViewMode } from './mermaid-editor';
export { MermaidEditorModal, type MermaidEditorModalProps } from './mermaid-editor-modal';
export { MERMAID_TEMPLATES, TEMPLATE_CATEGORIES, getTemplatesByCategory, type MermaidTemplate } from './mermaid-templates';
export { VegaLiteBlock } from './vegalite-block';

// Table rendering
export { DataTable } from './data-table';

// Media rendering
export { ImageBlock } from './image-block';
export { VideoBlock } from './video-block';
export { AudioBlock } from './audio-block';

// Alert and callout rendering
export { AlertBlock, parseAlertFromBlockquote } from './alert-block';
export type { AlertType } from './alert-block';

// Collapsible content
export { DetailsBlock, DetailsGroup } from './details-block';

// Task lists
export { TaskList, TaskListItem } from './task-list';

// Link previews
export { LinkCard, LinkCardSkeleton, LinkGroup } from './link-card';

// Footnotes
export { FootnoteRef, FootnoteSection, InlineFootnote } from './footnote-block';

// Keyboard shortcuts
export { KbdInline, KeyboardShortcut, parseShortcut } from './kbd-inline';

// Emoji rendering
export { EmojiBlock, shouldRenderAsEmoji } from './emoji-block';

// Loading animations
export { LoadingAnimation, SkeletonShimmer } from './loading-animation';
