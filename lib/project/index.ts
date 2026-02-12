/**
 * Project library - utilities, constants, and helpers
 */

export { ProjectIcon, PROJECT_ICON_MAP, formatRelativeDate, formatFileSize } from './utils';
export { FILE_TYPE_ICONS, FILE_TYPE_COLORS, detectFileType } from './knowledge-base-utils';
export { PROJECT_TEMPLATES, CATEGORY_LABELS } from './templates';
export {
  exportProjectToJSON,
  exportProjectsToZip,
  importProjectFromJSON,
  importProjectsFromZip,
  downloadFile,
  type ProjectExportData,
  type ExportedProject,
  type ExportedKnowledgeFile,
  type ProjectImportResult,
  type BatchExportResult,
} from './import-export';
