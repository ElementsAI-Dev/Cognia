/**
 * Projects components index
 *
 * Non-component exports have been moved to their proper locations:
 * - Types: import from '@/types' (ActivityType, ProjectActivityItem, ProjectTemplate)
 * - Constants: import from '@/lib/project' (PROJECT_TEMPLATES, CATEGORY_LABELS, PROJECT_ICON_MAP)
 * - Hooks: import from '@/hooks/projects' (useProjectActivity, useKnowledgeBase, useProjectStats)
 */

export { ProjectCard } from './project-card';
export { ProjectList } from './project-list';
export { ProjectDetail } from './project-detail';
export { CreateProjectDialog } from './create-project-dialog';
export { KnowledgeBase } from './knowledge-base';
export { ImportExportDialog } from './import-export-dialog';
export { ProjectActivity } from './project-activity';
export { ProjectTemplatesDialog } from './project-templates';
export { ProjectGitPanel } from './project-git-panel';
