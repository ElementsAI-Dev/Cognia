/**
 * Project type definitions - organize sessions into projects with knowledge base
 */

export interface KnowledgeFile {
  id: string;
  name: string;
  type: 'text' | 'pdf' | 'code' | 'markdown' | 'json' | 'word' | 'excel' | 'csv' | 'html';
  content: string;
  size: number;
  mimeType?: string;
  originalSize?: number;
  pageCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;

  // Project-specific settings
  customInstructions?: string;
  defaultProvider?: string;
  defaultModel?: string;
  defaultMode?: 'chat' | 'agent' | 'research';

  // Tags for organization
  tags?: string[];

  // Archive status
  isArchived?: boolean;
  archivedAt?: Date;

  // Knowledge base
  knowledgeBase: KnowledgeFile[];

  // Session associations (stored as IDs)
  sessionIds: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;

  // Stats
  sessionCount: number;
  messageCount: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  customInstructions?: string;
  defaultProvider?: string;
  defaultModel?: string;
  defaultMode?: 'chat' | 'agent' | 'research';
  tags?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  customInstructions?: string;
  defaultProvider?: string;
  defaultModel?: string;
  defaultMode?: 'chat' | 'agent' | 'research';
  tags?: string[];
  isArchived?: boolean;
}

// Project colors for visual distinction
export const PROJECT_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Gray', value: '#6B7280' },
];

// Project icons (using Lucide icon names)
export const PROJECT_ICONS = [
  'Folder',
  'Code',
  'BookOpen',
  'Briefcase',
  'GraduationCap',
  'Heart',
  'Home',
  'Lightbulb',
  'Music',
  'Palette',
  'PenTool',
  'Rocket',
  'Star',
  'Target',
  'Zap',
];

// Predefined tag colors
export const TAG_COLORS = [
  { name: 'Gray', value: '#6B7280', bg: '#F3F4F6' },
  { name: 'Red', value: '#EF4444', bg: '#FEE2E2' },
  { name: 'Orange', value: '#F97316', bg: '#FFEDD5' },
  { name: 'Yellow', value: '#EAB308', bg: '#FEF9C3' },
  { name: 'Green', value: '#22C55E', bg: '#DCFCE7' },
  { name: 'Blue', value: '#3B82F6', bg: '#DBEAFE' },
  { name: 'Purple', value: '#8B5CF6', bg: '#EDE9FE' },
  { name: 'Pink', value: '#EC4899', bg: '#FCE7F3' },
];

// Common project tags
export const SUGGESTED_TAGS = [
  'work',
  'personal',
  'learning',
  'research',
  'development',
  'writing',
  'design',
  'important',
  'urgent',
  'archived',
];
