/**
 * Tests for Artifact Tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  artifactTools,
  artifactCreateTool,
  artifactDeleteTool,
  executeArtifactCreate,
  executeArtifactRead,
  executeArtifactSearch,
  executeArtifactDelete,
} from './artifact-tool';

// Mock the artifact store
vi.mock('@/stores', () => ({
  useArtifactStore: {
    getState: vi.fn(() => ({
      artifacts: {
        'test-artifact-1': {
          id: 'test-artifact-1',
          title: 'Test Code',
          type: 'code',
          language: 'typescript',
          content: 'console.log("hello");',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        'test-artifact-2': {
          id: 'test-artifact-2',
          title: 'Test Diagram',
          type: 'mermaid',
          content: 'graph TD; A-->B;',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
      },
      createArtifact: vi.fn((params: Record<string, unknown>) => ({
        id: 'new-artifact-id',
        ...params,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      })),
      updateArtifact: vi.fn(),
      deleteArtifact: vi.fn(),
      setActiveArtifact: vi.fn(),
      openPanel: vi.fn(),
    })),
  },
}));

describe('Artifact Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('artifactTools', () => {
    it('should return all artifact tools', () => {
      expect(artifactTools).toHaveLength(7);
      
      const toolNames = artifactTools.map(t => t.name);
      expect(toolNames).toContain('artifact_create');
      expect(toolNames).toContain('artifact_update');
      expect(toolNames).toContain('artifact_read');
      expect(toolNames).toContain('artifact_search');
      expect(toolNames).toContain('artifact_render');
      expect(toolNames).toContain('artifact_export');
      expect(toolNames).toContain('artifact_delete');
    });

    it('should have artifact category for all tools', () => {
      for (const tool of artifactTools) {
        expect(tool.category).toBe('artifact');
      }
    });
  });

  describe('executeArtifactCreate', () => {
    it('should create an artifact successfully', async () => {
      const result = await executeArtifactCreate({
        title: 'New Code',
        content: 'const x = 1;',
        type: 'code',
        language: 'typescript',
        autoRender: true,
      });

      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining('Created code artifact'),
        artifactId: 'new-artifact-id',
      });
    });
  });

  describe('artifactCreateTool', () => {
    it('should have correct metadata', () => {
      expect(artifactCreateTool.name).toBe('artifact_create');
      expect(artifactCreateTool.description).toContain('Create a rich artifact');
      expect(artifactCreateTool.requiresApproval).toBe(false);
      expect(artifactCreateTool.category).toBe('artifact');
    });
  });

  describe('executeArtifactRead', () => {
    it('should read a specific artifact by ID', async () => {
      const result = await executeArtifactRead({
        artifactId: 'test-artifact-1',
        limit: 10,
      });

      expect(result).toMatchObject({
        success: true,
        artifactId: 'test-artifact-1',
        artifact: expect.objectContaining({
          title: 'Test Code',
          type: 'code',
        }),
      });
    });

    it('should return recent artifacts when no ID provided', async () => {
      const result = await executeArtifactRead({ limit: 10 });

      expect(result).toMatchObject({
        success: true,
        artifacts: expect.any(Array),
      });
    });

    it('should return error for non-existent artifact', async () => {
      const result = await executeArtifactRead({
        artifactId: 'non-existent',
        limit: 10,
      });

      expect(result).toMatchObject({
        success: false,
        message: expect.stringContaining('not found'),
      });
    });
  });

  describe('executeArtifactSearch', () => {
    it('should search artifacts by query', async () => {
      const result = await executeArtifactSearch({
        query: 'code',
        limit: 5,
      });

      expect(result).toMatchObject({
        success: true,
        artifacts: expect.any(Array),
      });
    });

    it('should filter by type', async () => {
      const result = await executeArtifactSearch({
        query: 'test',
        type: 'mermaid',
        limit: 5,
      });

      expect(result).toMatchObject({
        success: true,
      });
    });
  });

  describe('executeArtifactDelete', () => {
    it('should delete an artifact with confirmation', async () => {
      const result = await executeArtifactDelete({
        artifactId: 'test-artifact-1',
        confirm: true,
      });

      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining('Deleted'),
      });
    });

    it('should not delete without confirmation', async () => {
      const result = await executeArtifactDelete({
        artifactId: 'test-artifact-1',
        confirm: false,
      });

      expect(result).toMatchObject({
        success: false,
        message: expect.stringContaining('confirmation required'),
      });
    });

    it('should require approval', () => {
      expect(artifactDeleteTool.requiresApproval).toBe(true);
    });
  });
});
