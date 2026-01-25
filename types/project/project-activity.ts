/**
 * Project Activity Types
 * Types for project activity history and timeline
 */

export type ActivityType =
  | 'session_created'
  | 'session_added'
  | 'session_removed'
  | 'settings_updated'
  | 'knowledge_added'
  | 'knowledge_removed'
  | 'knowledge_updated'
  | 'project_created'
  | 'project_updated'
  | 'project_archived'
  | 'project_unarchived'
  | 'tags_updated';

export interface ProjectActivityItem {
  id: string;
  projectId?: string;
  type: ActivityType;
  timestamp: Date;
  description: string;
  metadata?: Record<string, unknown>;
}
