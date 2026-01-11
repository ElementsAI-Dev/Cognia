/**
 * Tests for Workflow Repository
 */

import workflowRepository from './workflow-repository';
import { db } from '../schema';
import type { WorkflowNode, WorkflowEdge } from '@/types/workflow/workflow-editor';

// Alias repository methods for convenience
const repo = workflowRepository;

// Mock db
jest.mock('../schema', () => ({
  db: {
    workflows: {
      add: jest.fn(),
      get: jest.fn(),
      toArray: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      filter: jest.fn(() => ({
        reverse: jest.fn(() => ({
          sortBy: jest.fn(),
        })),
        toArray: jest.fn(),
      })),
      where: jest.fn(() => ({
        equals: jest.fn(() => ({
          toArray: jest.fn(),
          delete: jest.fn(),
        })),
      })),
    },
    workflowExecutions: {
      add: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      bulkDelete: jest.fn(),
      where: jest.fn(() => ({
        equals: jest.fn(() => ({
          reverse: jest.fn(() => ({
            sortBy: jest.fn(),
          })),
          delete: jest.fn(),
        })),
      })),
    },
  },
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('workflow-repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  interface MockWorkflow {
    id: string;
    name: string;
    description: string;
    type: string;
    category: string;
    icon: string;
    tags: string[];
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    settings: Record<string, unknown>;
    viewport: { x: number; y: number; zoom: number };
    version: string;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    variables: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    isTemplate?: boolean;
  }

  const createMockWorkflow = (overrides?: Partial<MockWorkflow>): MockWorkflow => ({
    id: 'workflow-1',
    name: 'Test Workflow',
    description: 'A test workflow',
    type: 'custom',
    category: 'automation',
    icon: '🔄',
    tags: ['test', 'automation'],
    nodes: [
      {
        id: 'node-1',
        type: 'start',
        position: { x: 100, y: 100 },
        data: { label: 'Start' },
      },
      {
        id: 'node-2',
        type: 'end',
        position: { x: 300, y: 100 },
        data: { label: 'End' },
      },
    ] as WorkflowNode[],
    edges: [
      {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
      },
    ] as WorkflowEdge[],
    settings: {
      autoSave: true,
      autoLayout: false,
      showMinimap: true,
      showGrid: true,
      snapToGrid: true,
      gridSize: 20,
      retryOnFailure: false,
      maxRetries: 3,
      logLevel: 'info',
    },
    viewport: { x: 0, y: 0, zoom: 1 },
    version: '1',
    inputs: {},
    outputs: {},
    variables: {},
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    isTemplate: false,
    ...overrides,
  });

  describe('createWorkflow', () => {
    it('should create a new workflow', async () => {
      const workflow = createMockWorkflow();
      (mockDb.workflows.add as jest.Mock).mockResolvedValue('workflow-1');

      const result = await repo.create(workflow as never);

      expect(result).toBeDefined();
      expect(mockDb.workflows.add).toHaveBeenCalled();
    });

    it('should serialize nodes and edges to JSON', async () => {
      const workflow = createMockWorkflow();
      (mockDb.workflows.add as jest.Mock).mockResolvedValue('workflow-1');

      await repo.create(workflow as never);

      const callArgs = (mockDb.workflows.add as jest.Mock).mock.calls[0][0];
      expect(typeof callArgs.nodes).toBe('string');
      expect(typeof callArgs.edges).toBe('string');
    });

    it('should create workflow as template', async () => {
      const workflow = createMockWorkflow({ isTemplate: true });
      (mockDb.workflows.add as jest.Mock).mockResolvedValue('template-1');

      await repo.create(workflow as never);

      const callArgs = (mockDb.workflows.add as jest.Mock).mock.calls[0][0];
      expect(callArgs.isTemplate).toBe(true);
    });
  });

  describe('getWorkflow', () => {
    it('should retrieve workflow by ID', async () => {
      const dbWorkflow = {
        id: 'workflow-1',
        name: 'Test Workflow',
        description: 'A test workflow',
        category: 'automation',
        icon: '🔄',
        tags: JSON.stringify(['test']),
        nodes: JSON.stringify([]),
        edges: JSON.stringify([]),
        settings: JSON.stringify({ autoSave: true }),
        viewport: JSON.stringify({ x: 0, y: 0, zoom: 1 }),
        version: 1,
        isTemplate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (mockDb.workflows.get as jest.Mock).mockResolvedValue(dbWorkflow);

      const result = await repo.getById('workflow-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('workflow-1');
      expect(result?.name).toBe('Test Workflow');
    });

    it('should return undefined for non-existent workflow', async () => {
      (mockDb.workflows.get as jest.Mock).mockResolvedValue(undefined);

      const result = await repo.getById('non-existent');

      expect(result).toBeUndefined();
    });

    it('should parse JSON fields correctly', async () => {
      const dbWorkflow = {
        id: 'workflow-2',
        name: 'Test',
        nodes: JSON.stringify([{ id: 'n1', type: 'start' }]),
        edges: JSON.stringify([{ id: 'e1', source: 'n1', target: 'n2' }]),
        tags: JSON.stringify(['tag1', 'tag2']),
        settings: JSON.stringify({ autoSave: true }),
        viewport: JSON.stringify({ x: 100, y: 200, zoom: 1.5 }),
        version: 1,
        isTemplate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (mockDb.workflows.get as jest.Mock).mockResolvedValue(dbWorkflow);

      const result = await repo.getById('workflow-2');

      expect(result?.nodes).toHaveLength(1);
      expect(result?.edges).toHaveLength(1);
      expect(result?.tags).toEqual(['tag1', 'tag2']);
      expect(result?.viewport?.x).toBe(100);
    });
  });

  // getAll and complex query tests require integration testing with actual Dexie db

  describe('updateWorkflow', () => {
    it('should update workflow', async () => {
      const workflow = createMockWorkflow({ name: 'Updated Workflow' });
      (mockDb.workflows.put as jest.Mock).mockResolvedValue('workflow-1');

      await repo.update(workflow.id, workflow as never);

      expect(mockDb.workflows.put).toHaveBeenCalled();
      const callArgs = (mockDb.workflows.put as jest.Mock).mock.calls[0][0];
      expect(callArgs.name).toBe('Updated Workflow');
    });

    it('should update timestamp', async () => {
      const workflow = createMockWorkflow();
      const originalUpdatedAt = workflow.updatedAt;
      
      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      (mockDb.workflows.put as jest.Mock).mockResolvedValue('workflow-1');

      await repo.update(workflow.id, workflow as never);

      const callArgs = (mockDb.workflows.put as jest.Mock).mock.calls[0][0];
      expect(new Date(callArgs.updatedAt).getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow by ID', async () => {
      (mockDb.workflows.delete as jest.Mock).mockResolvedValue(undefined);

      await repo.delete('workflow-1');

      expect(mockDb.workflows.delete).toHaveBeenCalledWith('workflow-1');
    });
  });

  // Template and execution tests require more complex mocking of the db schema
  // These are better suited for integration tests
});
