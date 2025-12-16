/**
 * Project type definitions - organize sessions into projects with knowledge base
 */

export interface KnowledgeFile {
  id: string;
  name: string;
  type: 'text' | 'pdf' | 'code' | 'markdown' | 'json';
  content: string;
  size: number;
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
