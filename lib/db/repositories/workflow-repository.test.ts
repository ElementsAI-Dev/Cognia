/**
 * Tests for Workflow Repository
 */

import workflowRepository from './workflow-repository';
import { db } from '../schema';
import type { WorkflowNode, WorkflowEdge } from '@/types/workflow/workflow-editor';

// Alias repository methods for convenience
const repo = workflowRepository;
const mockMigrateWorkflowSchema = jest.fn();

// Mock db
jest.mock('../schema', () => ({
  db: {
    transaction: jest.fn((_mode: string, _tables: unknown[], fn: () => Promise<void>) => fn()),
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

jest.mock('@/lib/workflow-editor/migration', () => ({
  migrateWorkflowSchema: (...args: unknown[]) => mockMigrateWorkflowSchema(...args),
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('workflow-repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMigrateWorkflowSchema.mockImplementation((workflow: unknown) => ({
      workflow,
      migrated: false,
      fromVersion: '2.0',
      toVersion: '2.0',
      warnings: [],
    }));
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

    it('persists migrated workflow on getById when migration requires write-back', async () => {
      const dbWorkflow = {
        id: 'workflow-1',
        name: 'Legacy Workflow',
        description: 'legacy',
        category: 'automation',
        icon: '🔄',
        tags: JSON.stringify([]),
        nodes: JSON.stringify([{ id: 'n1', type: 'start', data: { nodeType: 'start' } }]),
        edges: JSON.stringify([]),
        settings: JSON.stringify({ autoSave: true }),
        viewport: JSON.stringify({ x: 0, y: 0, zoom: 1 }),
        version: 1,
        isTemplate: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      (mockDb.workflows.get as jest.Mock).mockResolvedValue(dbWorkflow);
      mockMigrateWorkflowSchema.mockReturnValue({
        workflow: {
          id: 'workflow-1',
          schemaVersion: '2.0',
          name: 'Legacy Workflow',
          description: 'legacy',
          type: 'custom',
          category: 'automation',
          icon: '🔄',
          tags: [],
          nodes: [{ id: 'n1', type: 'start', data: { nodeType: 'start', isConfigured: true } }],
          edges: [],
          settings: { autoSave: true, triggers: [] },
          viewport: { x: 0, y: 0, zoom: 1 },
          version: '1',
          inputs: {},
          outputs: {},
          variables: {},
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          isTemplate: false,
        },
        migrated: true,
        fromVersion: '1.0',
        toVersion: '2.0',
        warnings: ['normalized workflow schema'],
      });

      const result = await repo.getById('workflow-1');

      expect(result).toBeDefined();
      expect(mockDb.workflows.put).toHaveBeenCalledTimes(1);
      expect(mockDb.workflows.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'workflow-1',
          settings: expect.any(String),
          nodes: expect.any(String),
          edges: expect.any(String),
        })
      );
    });

    it('does not persist workflow on getById when migration has no changes', async () => {
      const dbWorkflow = {
        id: 'workflow-2',
        name: 'Current Workflow',
        description: 'current',
        category: 'automation',
        icon: '🔄',
        tags: JSON.stringify([]),
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

      await repo.getById('workflow-2');

      expect(mockDb.workflows.put).not.toHaveBeenCalled();
    });
  });

  // getAll and complex query tests require integration testing with actual Dexie db
  describe('getAll migration write-back', () => {
    it('persists only migrated workflows in getAll', async () => {
      const legacyWorkflow = {
        id: 'workflow-1',
        name: 'Legacy',
        description: 'legacy',
        category: 'automation',
        icon: '🔄',
        tags: JSON.stringify([]),
        nodes: JSON.stringify([]),
        edges: JSON.stringify([]),
        settings: JSON.stringify({ autoSave: true }),
        viewport: JSON.stringify({ x: 0, y: 0, zoom: 1 }),
        version: 1,
        isTemplate: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const currentWorkflow = {
        ...legacyWorkflow,
        id: 'workflow-2',
        name: 'Current',
        tags: JSON.stringify(['test', 'automation']),
        nodes: JSON.stringify(createMockWorkflow({ id: 'workflow-2', name: 'Current' }).nodes),
        edges: JSON.stringify(createMockWorkflow({ id: 'workflow-2', name: 'Current' }).edges),
        settings: JSON.stringify(createMockWorkflow({ id: 'workflow-2', name: 'Current' }).settings),
        viewport: JSON.stringify(createMockWorkflow({ id: 'workflow-2', name: 'Current' }).viewport),
      };
      (mockDb.workflows.filter as jest.Mock).mockReturnValue({
        reverse: jest.fn(() => ({
          sortBy: jest.fn().mockResolvedValue([legacyWorkflow, currentWorkflow]),
        })),
      });
      mockMigrateWorkflowSchema
        .mockReturnValueOnce({
          workflow: {
            ...createMockWorkflow({ id: 'workflow-1', name: 'Legacy Migrated' }),
            schemaVersion: '2.0',
          },
          migrated: true,
          fromVersion: '1.0',
          toVersion: '2.0',
          warnings: ['migration required'],
        })
        .mockReturnValueOnce({
          workflow: {
            ...createMockWorkflow({ id: 'workflow-2', name: 'Current' }),
            schemaVersion: '2.0',
          },
          migrated: false,
          fromVersion: '2.0',
          toVersion: '2.0',
          warnings: [],
        });

      const result = await repo.getAll();

      expect(result).toHaveLength(2);
      expect(mockDb.workflows.put).toHaveBeenCalledTimes(1);
      expect(mockDb.workflows.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'workflow-1',
        })
      );
    });
  });

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

  describe('schema version defaults', () => {
    it('create sets schemaVersion to 2.0', async () => {
      (mockDb.workflows.add as jest.Mock).mockResolvedValue('workflow-1');

      const result = await repo.create({
        name: 'Create Workflow',
      });

      expect(result.schemaVersion).toBe('2.0');
    });

    it('import sets schemaVersion to 2.0 when source does not provide it', async () => {
      (mockDb.workflows.add as jest.Mock).mockResolvedValue('workflow-1');
      const importPayload = JSON.stringify({
        ...createMockWorkflow({
          id: 'legacy-id',
          name: 'Imported Workflow',
          version: '99',
        }),
      });

      const result = await repo.import(importPayload);

      expect(result.schemaVersion).toBe('2.0');
      expect(result.version).toBe('1');
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
