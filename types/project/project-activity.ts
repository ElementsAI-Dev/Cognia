/**
 * Project Activity Types
 * Types for project activity history and timeline
 */

export type ActivityType =
  | 'project_created'
  | 'project_updated'
  | 'project_archived'
  | 'project_unarchived'
  | 'session_created'
  | 'session_added'
  | 'session_removed'
  | 'knowledge_added'
  | 'knowledge_removed'
  | 'knowledge_updated'
  | 'tags_updated'
  | 'settings_updated';

export interface ProjectActivityItem {
  id: string;
  projectId?: string;
  type: ActivityType;
  timestamp: Date;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Store-specific activity type with required projectId
 */
export interface ProjectActivity {
  id: string;
  projectId: string;
  type: ActivityType;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
