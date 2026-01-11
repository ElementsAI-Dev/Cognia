/**
 * Project Template Types
 * Types for project templates used in project creation
 */

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultMode: 'chat' | 'agent' | 'research';
  customInstructions?: string;
  tags: string[];
  category: 'development' | 'writing' | 'research' | 'business' | 'personal';
}

export type ProjectTemplateCategory = ProjectTemplate['category'];
