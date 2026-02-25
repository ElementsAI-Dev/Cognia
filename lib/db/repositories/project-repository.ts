/**
 * Project Repository - data access layer for projects and knowledge files
 */

import { db, type DBProject, type DBKnowledgeFile } from '../schema';
import type { Project, KnowledgeFile, CreateProjectInput, UpdateProjectInput } from '@/types/project';
import { nanoid } from 'nanoid';

// Convert DBProject to Project
function toProject(dbProject: DBProject, knowledgeFiles: KnowledgeFile[]): Project {
  return {
    id: dbProject.id,
    name: dbProject.name,
    description: dbProject.description,
    icon: dbProject.icon,
    color: dbProject.color,
    customInstructions: dbProject.customInstructions,
    defaultProvider: dbProject.defaultProvider,
    defaultModel: dbProject.defaultModel,
    defaultMode: dbProject.defaultMode as Project['defaultMode'],
    tags: dbProject.tags ? JSON.parse(dbProject.tags) : [],
    isArchived: dbProject.isArchived,
    archivedAt: dbProject.archivedAt,
    sessionIds: dbProject.sessionIds ? JSON.parse(dbProject.sessionIds) : [],
    knowledgeBase: knowledgeFiles,
    sessionCount: dbProject.sessionCount,
    messageCount: dbProject.messageCount,
    createdAt: dbProject.createdAt,
    updatedAt: dbProject.updatedAt,
    lastAccessedAt: dbProject.lastAccessedAt,
  };
}

// Convert Project to DBProject
export function toDbProject(project: Project): DBProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    icon: project.icon,
    color: project.color,
    customInstructions: project.customInstructions,
    defaultProvider: project.defaultProvider,
    defaultModel: project.defaultModel,
    defaultMode: project.defaultMode,
    tags: project.tags ? JSON.stringify(project.tags) : undefined,
    isArchived: project.isArchived,
    archivedAt: project.archivedAt,
    sessionIds: JSON.stringify(project.sessionIds),
    sessionCount: project.sessionCount,
    messageCount: project.messageCount,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    lastAccessedAt: project.lastAccessedAt,
  };
}

// Convert DBKnowledgeFile to KnowledgeFile
function toKnowledgeFile(dbFile: DBKnowledgeFile): KnowledgeFile {
  return {
    id: dbFile.id,
    name: dbFile.name,
    type: dbFile.type as KnowledgeFile['type'],
    content: dbFile.content,
    size: dbFile.size,
    mimeType: dbFile.mimeType,
    originalSize: dbFile.originalSize,
    pageCount: dbFile.pageCount,
    createdAt: dbFile.createdAt,
    updatedAt: dbFile.updatedAt,
  };
}

// Convert KnowledgeFile to DBKnowledgeFile
function toDBKnowledgeFile(file: KnowledgeFile, projectId: string): DBKnowledgeFile {
  return {
    id: file.id,
    projectId,
    name: file.name,
    type: file.type,
    content: file.content,
    size: file.size,
    mimeType: file.mimeType,
    originalSize: file.originalSize,
    pageCount: file.pageCount,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

export interface CreateKnowledgeFileInput {
  name: string;
  type: KnowledgeFile['type'];
  content: string;
  size: number;
  mimeType?: string;
  originalSize?: number;
  pageCount?: number;
}

export const projectRepository = {
  /**
   * Get all projects, sorted by lastAccessedAt descending
   */
  async getAll(): Promise<Project[]> {
    const projects = await db.projects
      .orderBy('lastAccessedAt')
      .reverse()
      .toArray();

    const result: Project[] = [];
    for (const dbProject of projects) {
      const files = await db.knowledgeFiles
        .where('projectId')
        .equals(dbProject.id)
        .toArray();
      result.push(toProject(dbProject, files.map(toKnowledgeFile)));
    }

    return result;
  },

  /**
   * Get a single project by ID
   */
  async getById(id: string): Promise<Project | undefined> {
    const dbProject = await db.projects.get(id);
    if (!dbProject) return undefined;

    const files = await db.knowledgeFiles
      .where('projectId')
      .equals(id)
      .toArray();

    return toProject(dbProject, files.map(toKnowledgeFile));
  },

  /**
   * Create a new project
   */
  async create(input: CreateProjectInput): Promise<Project> {
    const now = new Date();
    const project: Project = {
      id: nanoid(),
      name: input.name,
      description: input.description,
      icon: input.icon,
      color: input.color,
      customInstructions: input.customInstructions,
      defaultProvider: input.defaultProvider,
      defaultModel: input.defaultModel,
      defaultMode: input.defaultMode,
      tags: input.tags || [],
      isArchived: false,
      sessionIds: [],
      knowledgeBase: [],
      sessionCount: 0,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
    };

    await db.projects.add(toDbProject(project));
    return project;
  },

  /**
   * Update an existing project
   */
  async update(id: string, updates: UpdateProjectInput): Promise<Project | undefined> {
    const existing = await db.projects.get(id);
    if (!existing) return undefined;

    const updateData: Partial<DBProject> = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.customInstructions !== undefined) updateData.customInstructions = updates.customInstructions;
    if (updates.defaultProvider !== undefined) updateData.defaultProvider = updates.defaultProvider;
    if (updates.defaultModel !== undefined) updateData.defaultModel = updates.defaultModel;
    if (updates.defaultMode !== undefined) updateData.defaultMode = updates.defaultMode;
    if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);
    if (updates.isArchived !== undefined) {
      updateData.isArchived = updates.isArchived;
      updateData.archivedAt = updates.isArchived ? new Date() : undefined;
    }

    await db.projects.update(id, updateData);
    return this.getById(id);
  },

  /**
   * Delete a project and all its knowledge files
   */
  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.knowledgeFiles, db.projects], async () => {
      await db.knowledgeFiles.where('projectId').equals(id).delete();
      await db.projects.delete(id);
    });
  },

  /**
   * Update last accessed time
   */
  async touch(id: string): Promise<void> {
    await db.projects.update(id, {
      lastAccessedAt: new Date(),
    });
  },

  /**
   * Add a session to a project
   */
  async addSession(projectId: string, sessionId: string): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project) return;

    const sessionIds: string[] = project.sessionIds ? JSON.parse(project.sessionIds) : [];
    if (!sessionIds.includes(sessionId)) {
      sessionIds.push(sessionId);
      await db.projects.update(projectId, {
        sessionIds: JSON.stringify(sessionIds),
        sessionCount: sessionIds.length,
        updatedAt: new Date(),
      });
    }
  },

  /**
   * Remove a session from a project
   */
  async removeSession(projectId: string, sessionId: string): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project) return;

    const sessionIds: string[] = project.sessionIds ? JSON.parse(project.sessionIds) : [];
    const index = sessionIds.indexOf(sessionId);
    if (index !== -1) {
      sessionIds.splice(index, 1);
      await db.projects.update(projectId, {
        sessionIds: JSON.stringify(sessionIds),
        sessionCount: sessionIds.length,
        updatedAt: new Date(),
      });
    }
  },

  /**
   * Update message count for a project
   */
  async updateMessageCount(projectId: string, delta: number): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project) return;

    await db.projects.update(projectId, {
      messageCount: Math.max(0, project.messageCount + delta),
      updatedAt: new Date(),
    });
  },

  /**
   * Search projects by name
   */
  async searchByName(query: string): Promise<Project[]> {
    const lowerQuery = query.toLowerCase();
    const projects = await db.projects
      .filter((project) => project.name.toLowerCase().includes(lowerQuery))
      .toArray();

    const result: Project[] = [];
    for (const dbProject of projects) {
      const files = await db.knowledgeFiles
        .where('projectId')
        .equals(dbProject.id)
        .toArray();
      result.push(toProject(dbProject, files.map(toKnowledgeFile)));
    }

    return result;
  },

  /**
   * Get project count
   */
  async getCount(): Promise<number> {
    return db.projects.count();
  },

  /**
   * Clear all projects and knowledge files
   */
  async clear(): Promise<void> {
    await db.knowledgeFiles.clear();
    await db.projects.clear();
  },

  // Knowledge File Operations

  /**
   * Add a knowledge file to a project
   */
  async addKnowledgeFile(
    projectId: string,
    input: CreateKnowledgeFileInput
  ): Promise<KnowledgeFile> {
    const now = new Date();
    const file: KnowledgeFile = {
      id: nanoid(),
      name: input.name,
      type: input.type,
      content: input.content,
      size: input.size,
      mimeType: input.mimeType,
      originalSize: input.originalSize,
      pageCount: input.pageCount,
      createdAt: now,
      updatedAt: now,
    };

    await db.transaction('rw', [db.knowledgeFiles, db.projects], async () => {
      await db.knowledgeFiles.add(toDBKnowledgeFile(file, projectId));

      // Update project updatedAt
      await db.projects.update(projectId, {
        updatedAt: now,
      });
    });

    return file;
  },

  /**
   * Upsert a knowledge file with a pre-existing ID (for store→DB sync)
   */
  async putKnowledgeFile(projectId: string, file: KnowledgeFile): Promise<void> {
    await db.knowledgeFiles.put(toDBKnowledgeFile(file, projectId));
  },

  /**
   * Update a knowledge file
   */
  async updateKnowledgeFile(
    fileId: string,
    updates: Partial<CreateKnowledgeFileInput>
  ): Promise<KnowledgeFile | undefined> {
    const existing = await db.knowledgeFiles.get(fileId);
    if (!existing) return undefined;

    const updateData: Partial<DBKnowledgeFile> = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.size !== undefined) updateData.size = updates.size;
    if (updates.mimeType !== undefined) updateData.mimeType = updates.mimeType;

    await db.knowledgeFiles.update(fileId, updateData);
    const updated = await db.knowledgeFiles.get(fileId);
    return updated ? toKnowledgeFile(updated) : undefined;
  },

  /**
   * Delete a knowledge file
   */
  async deleteKnowledgeFile(fileId: string): Promise<void> {
    const file = await db.knowledgeFiles.get(fileId);
    if (!file) return;

    await db.transaction('rw', [db.knowledgeFiles, db.projects], async () => {
      await db.knowledgeFiles.delete(fileId);

      // Update project updatedAt
      await db.projects.update(file.projectId, {
        updatedAt: new Date(),
      });
    });
  },

  /**
   * Get knowledge files for a project
   */
  async getKnowledgeFiles(projectId: string): Promise<KnowledgeFile[]> {
    const files = await db.knowledgeFiles
      .where('projectId')
      .equals(projectId)
      .sortBy('createdAt');
    return files.map(toKnowledgeFile);
  },

  /**
   * Get a single knowledge file
   */
  async getKnowledgeFile(fileId: string): Promise<KnowledgeFile | undefined> {
    const file = await db.knowledgeFiles.get(fileId);
    return file ? toKnowledgeFile(file) : undefined;
  },

  /**
   * Bulk add knowledge files
   */
  async bulkAddKnowledgeFiles(
    projectId: string,
    inputs: CreateKnowledgeFileInput[]
  ): Promise<KnowledgeFile[]> {
    const now = new Date();
    const files: KnowledgeFile[] = inputs.map((input) => ({
      id: nanoid(),
      name: input.name,
      type: input.type,
      content: input.content,
      size: input.size,
      mimeType: input.mimeType,
      originalSize: input.originalSize,
      pageCount: input.pageCount,
      createdAt: now,
      updatedAt: now,
    }));

    const dbFiles = files.map((f) => toDBKnowledgeFile(f, projectId));
    await db.knowledgeFiles.bulkAdd(dbFiles);

    // Update project updatedAt
    await db.projects.update(projectId, {
      updatedAt: now,
    });

    return files;
  },

  /**
   * Delete all knowledge files for a project
   */
  async clearKnowledgeFiles(projectId: string): Promise<void> {
    await db.knowledgeFiles.where('projectId').equals(projectId).delete();
    
    await db.projects.update(projectId, {
      updatedAt: new Date(),
    });
  },

  /**
   * Get total size of knowledge files for a project
   */
  async getKnowledgeFilesSize(projectId: string): Promise<number> {
    const files = await db.knowledgeFiles
      .where('projectId')
      .equals(projectId)
      .toArray();
    return files.reduce((total, file) => total + file.size, 0);
  },

  /**
   * Get knowledge files count for a project
   */
  async getKnowledgeFilesCount(projectId: string): Promise<number> {
    return db.knowledgeFiles.where('projectId').equals(projectId).count();
  },
};

export default projectRepository;
