/**
 * Chat Input Types
 * Types for chat input and settings
 * Note: Attachment base type exists in types/message.ts
 */

import type { Attachment } from './message';

// Upload settings
export interface UploadSettings {
  maxFileSize: number; // in bytes
  maxFiles: number;
  allowedTypes: string[]; // MIME types or patterns like 'image/*'
  autoUpload?: boolean;
}

export const DEFAULT_UPLOAD_SETTINGS: UploadSettings = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFiles: 10,
  allowedTypes: ['*/*'], // Allow all by default
};

// Pending message interface
export interface PendingMessage {
  id: string;
  content: string;
  status: 'queued' | 'processing' | 'retrying' | 'failed';
  timestamp: Date;
  retryCount?: number;
  error?: string;
  attachments?: Attachment[];
}

// AI settings
export interface AISettings {
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences?: string[];
}

// Web source for citations
export interface WebSource {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  favicon?: string;
  publishedDate?: Date;
}

// Alert types for markdown rendering
export type AlertType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

// Sandpack template types
export type SandpackTemplate =
  | 'react'
  | 'react-ts'
  | 'vanilla'
  | 'vanilla-ts'
  | 'vue'
  | 'vue-ts'
  | 'svelte'
  | 'angular'
  | 'solid'
  | 'nextjs'
  | 'astro'
  | 'node';

// Text selection feature toggle
export interface TextSelectionFeatures {
  /** Enable copy button (default: true) */
  copy?: boolean;
  /** Enable quote button (default: true) */
  quote?: boolean;
  /** Enable search button (default: true) */
  search?: boolean;
  /** Enable AI actions (default: true) */
  aiActions?: boolean;
}
