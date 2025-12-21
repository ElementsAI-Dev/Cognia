/**
 * Project Import/Export utilities
 */

import type { Project, KnowledgeFile } from '@/types';
import JSZip from 'jszip';

export interface ProjectExportData {
  version: string;
  exportedAt: string;
  project: ExportedProject;
}

export interface ExportedProject {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  customInstructions?: string;
  defaultProvider?: string;
  defaultModel?: string;
  defaultMode?: 'chat' | 'agent' | 'research';
  knowledgeBase: ExportedKnowledgeFile[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExportedKnowledgeFile {
  id: string;
  name: string;
  type: KnowledgeFile['type'];
  content: string;
  size: number;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectImportResult {
  success: boolean;
  project?: Project;
  error?: string;
  warnings?: string[];
}

export interface BatchExportResult {
  success: boolean;
  filename: string;
  blob?: Blob;
  error?: string;
}

/**
 * Export a single project to JSON format
 */
export function exportProjectToJSON(project: Project): string {
  const exportData: ProjectExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      icon: project.icon,
      color: project.color,
      customInstructions: project.customInstructions,
      defaultProvider: project.defaultProvider,
      defaultModel: project.defaultModel,
      defaultMode: project.defaultMode,
      knowledgeBase: project.knowledgeBase.map((file) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        content: file.content,
        size: file.size,
        mimeType: file.mimeType,
        createdAt: file.createdAt instanceof Date ? file.createdAt.toISOString() : file.createdAt,
        updatedAt: file.updatedAt instanceof Date ? file.updatedAt.toISOString() : file.updatedAt,
      })),
      createdAt: project.createdAt instanceof Date ? project.createdAt.toISOString() : String(project.createdAt),
      updatedAt: project.updatedAt instanceof Date ? project.updatedAt.toISOString() : String(project.updatedAt),
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export multiple projects to a ZIP file
 */
export async function exportProjectsToZip(projects: Project[]): Promise<BatchExportResult> {
  const zip = new JSZip();
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `cognia-projects-${timestamp}.zip`;

  try {
    // Create index file
    const indexContent = generateProjectIndex(projects);
    zip.file('README.md', indexContent);

    // Export each project
    for (const project of projects) {
      const safeTitle = sanitizeFilename(project.name);
      const folderName = `${safeTitle}-${project.id.slice(0, 8)}`;
      
      // Project JSON
      const projectJson = exportProjectToJSON(project);
      zip.file(`${folderName}/project.json`, projectJson);

      // Knowledge base files
      if (project.knowledgeBase.length > 0) {
        const knowledgeFolder = zip.folder(`${folderName}/knowledge`);
        if (knowledgeFolder) {
          for (const file of project.knowledgeBase) {
            const ext = getFileExtension(file.type);
            const fileName = sanitizeFilename(file.name) + ext;
            knowledgeFolder.file(fileName, file.content);
          }
        }
      }
    }

    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return { success: true, filename, blob };
  } catch (error) {
    return {
      success: false,
      filename,
      error: error instanceof Error ? error.message : 'Unknown error during export',
    };
  }
}

/**
 * Import a project from JSON data
 */
export function importProjectFromJSON(
  jsonData: string,
  options?: { generateNewId?: boolean }
): ProjectImportResult {
  const warnings: string[] = [];

  try {
    const data = JSON.parse(jsonData) as ProjectExportData;

    // Validate version
    if (!data.version) {
      return { success: false, error: 'Invalid project file: missing version' };
    }

    if (!data.project) {
      return { success: false, error: 'Invalid project file: missing project data' };
    }

    const exported = data.project;

    // Convert to Project type
    const project: Project = {
      id: options?.generateNewId ? crypto.randomUUID() : exported.id,
      name: exported.name,
      description: exported.description,
      icon: exported.icon || 'Folder',
      color: exported.color || '#3B82F6',
      customInstructions: exported.customInstructions,
      defaultProvider: exported.defaultProvider,
      defaultModel: exported.defaultModel,
      defaultMode: exported.defaultMode,
      knowledgeBase: exported.knowledgeBase.map((file) => ({
        id: options?.generateNewId ? crypto.randomUUID() : file.id,
        name: file.name,
        type: file.type,
        content: file.content,
        size: file.size,
        mimeType: file.mimeType,
        createdAt: new Date(file.createdAt),
        updatedAt: new Date(file.updatedAt),
      })),
      sessionIds: [], // Don't import session associations
      createdAt: new Date(exported.createdAt),
      updatedAt: new Date(),
      lastAccessedAt: new Date(),
      sessionCount: 0,
      messageCount: 0,
    };

    if (exported.knowledgeBase.length > 0) {
      warnings.push(`Imported ${exported.knowledgeBase.length} knowledge base files`);
    }

    return { success: true, project, warnings };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse project file',
    };
  }
}

/**
 * Import projects from a ZIP file
 */
export async function importProjectsFromZip(
  file: File,
  options?: { generateNewIds?: boolean }
): Promise<{ success: boolean; projects: Project[]; errors: string[] }> {
  const projects: Project[] = [];
  const errors: string[] = [];

  try {
    const zip = await JSZip.loadAsync(file);
    const folders = Object.keys(zip.files)
      .filter((path) => path.endsWith('/project.json'))
      .map((path) => path.replace('/project.json', ''));

    for (const folder of folders) {
      const projectFile = zip.file(`${folder}/project.json`);
      if (!projectFile) continue;

      try {
        const jsonContent = await projectFile.async('string');
        const result = importProjectFromJSON(jsonContent, {
          generateNewId: options?.generateNewIds,
        });

        if (result.success && result.project) {
          projects.push(result.project);
        } else if (result.error) {
          errors.push(`${folder}: ${result.error}`);
        }
      } catch (_err) {
        errors.push(`${folder}: Failed to read project file`);
      }
    }

    return { success: projects.length > 0, projects, errors };
  } catch (error) {
    return {
      success: false,
      projects: [],
      errors: [error instanceof Error ? error.message : 'Failed to read ZIP file'],
    };
  }
}

/**
 * Generate index/readme file for project export
 */
function generateProjectIndex(projects: Project[]): string {
  const lines: string[] = [];

  lines.push('# Cognia Projects Export');
  lines.push('');
  lines.push(`**Exported:** ${new Date().toLocaleString()}`);
  lines.push(`**Total Projects:** ${projects.length}`);
  lines.push('');
  lines.push('## Projects');
  lines.push('');
  lines.push('| # | Name | Description | Files | Mode |');
  lines.push('|---|------|-------------|-------|------|');

  projects.forEach((project, index) => {
    const safeName = project.name.replace(/\|/g, '\\|');
    const safeDesc = (project.description || '-').replace(/\|/g, '\\|');
    lines.push(
      `| ${index + 1} | ${safeName} | ${safeDesc} | ${project.knowledgeBase.length} | ${project.defaultMode || '-'} |`
    );
  });

  lines.push('');
  lines.push('## How to Import');
  lines.push('');
  lines.push('1. Open Cognia');
  lines.push('2. Go to Projects');
  lines.push('3. Click "Import" and select this ZIP file');
  lines.push('');
  lines.push('---');
  lines.push('*Generated by Cognia*');

  return lines.join('\n');
}

/**
 * Sanitize filename for filesystem compatibility
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Get file extension for knowledge file type
 */
function getFileExtension(type: KnowledgeFile['type']): string {
  const extensions: Record<KnowledgeFile['type'], string> = {
    text: '.txt',
    pdf: '.txt', // Extracted text
    code: '.txt',
    markdown: '.md',
    json: '.json',
    word: '.txt',
    excel: '.txt',
    csv: '.csv',
    html: '.html',
  };
  return extensions[type] || '.txt';
}

/**
 * Download file
 */
export function downloadFile(content: string | Blob, filename: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const projectImportExport = {
  exportProjectToJSON,
  exportProjectsToZip,
  importProjectFromJSON,
  importProjectsFromZip,
  downloadFile,
};

export default projectImportExport;
