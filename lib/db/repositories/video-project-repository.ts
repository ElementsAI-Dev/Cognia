/**
 * Video Project Repository - data access layer for video projects
 */

import { db, type DBVideoProject } from '../schema';
import { withRetry } from '../utils';
import type { VideoTrack } from '@/hooks/video-studio/use-video-editor';

export interface VideoProjectData {
  id: string;
  name: string;
  resolution: { width: number; height: number };
  frameRate: number;
  aspectRatio: string;
  tracks: VideoTrack[];
  duration: number;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

function toVideoProject(row: DBVideoProject): VideoProjectData {
  return {
    id: row.id,
    name: row.name,
    resolution: JSON.parse(row.resolution),
    frameRate: row.frameRate,
    aspectRatio: row.aspectRatio,
    tracks: JSON.parse(row.tracks),
    duration: row.duration,
    thumbnailUrl: row.thumbnailUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toDBVideoProject(project: VideoProjectData): DBVideoProject {
  return {
    id: project.id,
    name: project.name,
    resolution: JSON.stringify(project.resolution),
    frameRate: project.frameRate,
    aspectRatio: project.aspectRatio,
    tracks: JSON.stringify(project.tracks),
    duration: project.duration,
    thumbnailUrl: project.thumbnailUrl,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export const videoProjectRepository = {
  async getAll(): Promise<VideoProjectData[]> {
    const rows = await db.videoProjects.orderBy('updatedAt').reverse().toArray();
    return rows.map(toVideoProject);
  },

  async getById(id: string): Promise<VideoProjectData | undefined> {
    const row = await db.videoProjects.get(id);
    return row ? toVideoProject(row) : undefined;
  },

  async create(project: VideoProjectData): Promise<VideoProjectData> {
    await withRetry(async () => {
      await db.videoProjects.add(toDBVideoProject(project));
    }, 'videoProjectRepository.create');
    return project;
  },

  async update(id: string, updates: Partial<VideoProjectData>): Promise<VideoProjectData | undefined> {
    const existing = await db.videoProjects.get(id);
    if (!existing) return undefined;

    const dbUpdates: Partial<DBVideoProject> = { updatedAt: new Date() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.resolution !== undefined) dbUpdates.resolution = JSON.stringify(updates.resolution);
    if (updates.frameRate !== undefined) dbUpdates.frameRate = updates.frameRate;
    if (updates.aspectRatio !== undefined) dbUpdates.aspectRatio = updates.aspectRatio;
    if (updates.tracks !== undefined) dbUpdates.tracks = JSON.stringify(updates.tracks);
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
    if (updates.thumbnailUrl !== undefined) dbUpdates.thumbnailUrl = updates.thumbnailUrl;

    await withRetry(async () => {
      await db.videoProjects.update(id, dbUpdates);
    }, 'videoProjectRepository.update');

    const updated = await db.videoProjects.get(id);
    return updated ? toVideoProject(updated) : undefined;
  },

  async delete(id: string): Promise<void> {
    await withRetry(async () => {
      await db.videoProjects.delete(id);
    }, 'videoProjectRepository.delete');
  },
};
