/**
 * Workflow Template Data Models
 *
 * Type definitions for workflow templates, categories, and marketplace features
 */

import type { VisualWorkflow } from '@/types/workflow';

/**
 * Workflow template
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  version: string;
  workflow: VisualWorkflow;
  metadata: TemplateMetadata;
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  rating: number;
  ratingCount: number;
  isOfficial: boolean;
  source: 'built-in' | 'user' | 'git' | 'community' | 'github';
  gitUrl?: string;
  gitBranch?: string;
  gitCommit?: string;
  lastSyncAt?: Date;
  thumbnail?: string;
  screenshots?: string[];
}

/**
 * Template category
 */
export interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  color?: string;
  templates: string[];
}

/**
 * Template search filters
 */
export interface TemplateFilters {
  category?: string;
  tags?: string[];
  author?: string;
  source?: ('built-in' | 'user' | 'git' | 'community' | 'github')[];
  minRating?: number;
  searchQuery?: string;
  sortBy?: 'name' | 'rating' | 'usage' | 'date' | 'author';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Template import options
 */
export interface TemplateImportOptions {
  source: 'file' | 'url' | 'git';
  data?: string;
  url?: string;
  gitUrl?: string;
  gitBranch?: string;
  overwrite?: boolean;
}

/**
 * Template export options
 */
export interface TemplateExportOptions {
  format: 'json' | 'yaml';
  includeMetadata?: boolean;
  includeUsageStats?: boolean;
}

/**
 * Git integration config
 */
export interface GitIntegrationConfig {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number;
  defaultBranch: string;
  credentials?: {
    username?: string;
    token?: string;
  };
}

/**
 * Git repository info
 */
export interface GitRepository {
  url: string;
  localPath: string;
  branch: string;
  commit: string;
  lastSyncAt: Date;
  hasUpdates: boolean;
  conflictCount: number;
}

/**
 * Template usage statistics
 */
export interface TemplateUsageStats {
  templateId: string;
  totalUses: number;
  lastUsedAt: Date;
  averageRating: number;
  completionRate: number;
  averageExecutionTime: number;
}
