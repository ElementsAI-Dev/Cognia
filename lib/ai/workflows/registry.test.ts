/**
 * Workflow Registry Tests
 */

import {
  createWorkflowRegistry,
  getGlobalWorkflowRegistry,
  resetGlobalWorkflowRegistry,
} from './registry';
import type { WorkflowDefinition, WorkflowTemplate } from '@/types/workflow';

describe('Workflow Registry', () => {
  beforeEach(() => {
    resetGlobalWorkflowRegistry();
  });

  describe('createWorkflowRegistry', () => {
    it('should create a new registry', () => {
      const registry = createWorkflowRegistry();
      expect(registry).toBeDefined();
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe('register', () => {
    it('should register a workflow', () => {
      const registry = createWorkflowRegistry();
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        type: 'custom',
        version: '1.0.0',
        icon: 'Workflow',
        category: 'test',
        tags: ['test'],
        steps: [
          {
            id: 'step-1',
            name: 'Step 1',
            description: 'First step',
            type: 'ai',
            inputs: {},
            outputs: {},
          },
        ],
        inputs: {},
        outputs: {},
      };

      registry.register(workflow);
      expect(registry.get('test-workflow')).toBeDefined();
      expect(registry.get('test-workflow')?.name).toBe('Test Workflow');
    });

    it('should update timestamps on registration', () => {
      const registry = createWorkflowRegistry();
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        type: 'custom',
        version: '1.0.0',
        icon: 'Workflow',
        category: 'test',
        tags: [],
        steps: [
          {
            id: 'step-1',
            name: 'Step 1',
            description: 'First step',
            type: 'ai',
            inputs: {},
            outputs: {},
          },
        ],
        inputs: {},
        outputs: {},
      };

      registry.register(workflow);
      const registered = registry.get('test-workflow');
      expect(registered?.createdAt).toBeDefined();
      expect(registered?.updatedAt).toBeDefined();
    });
  });

  describe('unregister', () => {
    it('should unregister a workflow', () => {
      const registry = createWorkflowRegistry();
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        type: 'custom',
        version: '1.0.0',
        icon: 'Workflow',
        category: 'test',
        tags: [],
        steps: [
          {
            id: 'step-1',
            name: 'Step 1',
            description: 'First step',
            type: 'ai',
            inputs: {},
            outputs: {},
          },
        ],
        inputs: {},
        outputs: {},
      };

      registry.register(workflow);
      expect(registry.get('test-workflow')).toBeDefined();

      registry.unregister('test-workflow');
      expect(registry.get('test-workflow')).toBeUndefined();
    });

    it('should also remove associated templates', () => {
      const registry = createWorkflowRegistry();
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        type: 'custom',
        version: '1.0.0',
        icon: 'Workflow',
        category: 'test',
        tags: [],
        steps: [
          {
            id: 'step-1',
            name: 'Step 1',
            description: 'First step',
            type: 'ai',
            inputs: {},
            outputs: {},
          },
        ],
        inputs: {},
        outputs: {},
      };

      const template: WorkflowTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'A test template',
        workflowId: 'test-workflow',
        presetInputs: {},
        presetConfig: {},
        icon: 'Template',
        category: 'test',
      };

      registry.register(workflow);
      registry.registerTemplate(template);
      expect(registry.getTemplate('test-template')).toBeDefined();

      registry.unregister('test-workflow');
      expect(registry.getTemplate('test-template')).toBeUndefined();
    });
  });

  describe('getByType', () => {
    it('should filter workflows by type', () => {
      const registry = createWorkflowRegistry();
      
      registry.register({
        id: 'ppt-1',
        name: 'PPT Workflow 1',
        description: 'PPT workflow',
        type: 'ppt-generation',
        version: '1.0.0',
        icon: 'Presentation',
        category: 'content',
        tags: [],
        steps: [{ id: 's1', name: 'S1', description: '', type: 'ai', inputs: {}, outputs: {} }],
        inputs: {},
        outputs: {},
      });

      registry.register({
        id: 'report-1',
        name: 'Report Workflow',
        description: 'Report workflow',
        type: 'report-generation',
        version: '1.0.0',
        icon: 'FileText',
        category: 'content',
        tags: [],
        steps: [{ id: 's1', name: 'S1', description: '', type: 'ai', inputs: {}, outputs: {} }],
        inputs: {},
        outputs: {},
      });

      const pptWorkflows = registry.getByType('ppt-generation');
      expect(pptWorkflows).toHaveLength(1);
      expect(pptWorkflows[0].id).toBe('ppt-1');
    });
  });

  describe('validateWorkflow', () => {
    it('should validate a valid workflow', () => {
      const registry = createWorkflowRegistry();
      const workflow: WorkflowDefinition = {
        id: 'valid-workflow',
        name: 'Valid Workflow',
        description: 'A valid workflow',
        type: 'custom',
        version: '1.0.0',
        icon: 'Workflow',
        category: 'test',
        tags: [],
        steps: [
          {
            id: 'step-1',
            name: 'Step 1',
            description: 'First step',
            type: 'ai',
            aiPrompt: 'Do something',
            inputs: {},
            outputs: {},
          },
        ],
        inputs: {},
        outputs: {},
      };

      const result = registry.validateWorkflow(workflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const registry = createWorkflowRegistry();
      const workflow = {
        id: '',
        name: '',
        type: '',
        steps: [],
      } as unknown as WorkflowDefinition;

      const result = registry.validateWorkflow(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect duplicate step IDs', () => {
      const registry = createWorkflowRegistry();
      const workflow: WorkflowDefinition = {
        id: 'dup-steps',
        name: 'Duplicate Steps',
        description: 'Workflow with duplicate step IDs',
        type: 'custom',
        version: '1.0.0',
        icon: 'Workflow',
        category: 'test',
        tags: [],
        steps: [
          { id: 'step-1', name: 'Step 1', description: '', type: 'ai', inputs: {}, outputs: {} },
          { id: 'step-1', name: 'Step 1 Dup', description: '', type: 'ai', inputs: {}, outputs: {} },
        ],
        inputs: {},
        outputs: {},
      };

      const result = registry.validateWorkflow(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate step ID: step-1');
    });

    it('should detect circular dependencies', () => {
      const registry = createWorkflowRegistry();
      const workflow: WorkflowDefinition = {
        id: 'circular',
        name: 'Circular Dependencies',
        description: 'Workflow with circular deps',
        type: 'custom',
        version: '1.0.0',
        icon: 'Workflow',
        category: 'test',
        tags: [],
        steps: [
          { id: 'step-1', name: 'Step 1', description: '', type: 'ai', inputs: {}, outputs: {}, dependencies: ['step-2'] },
          { id: 'step-2', name: 'Step 2', description: '', type: 'ai', inputs: {}, outputs: {}, dependencies: ['step-1'] },
        ],
        inputs: {},
        outputs: {},
      };

      const result = registry.validateWorkflow(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow contains circular dependencies');
    });
  });

  describe('getGlobalWorkflowRegistry', () => {
    it('should return a singleton instance', () => {
      const registry1 = getGlobalWorkflowRegistry();
      const registry2 = getGlobalWorkflowRegistry();
      expect(registry1).toBe(registry2);
    });

    it('should be resettable', () => {
      const registry1 = getGlobalWorkflowRegistry();
      registry1.register({
        id: 'test',
        name: 'Test',
        description: 'Test',
        type: 'custom',
        version: '1.0',
        icon: '',
        category: '',
        tags: [],
        steps: [{ id: 's1', name: 'S1', description: '', type: 'ai', inputs: {}, outputs: {} }],
        inputs: {},
        outputs: {},
      });
      
      expect(registry1.getAll()).toHaveLength(1);
      
      resetGlobalWorkflowRegistry();
      const registry2 = getGlobalWorkflowRegistry();
      
      expect(registry2.getAll()).toHaveLength(0);
    });
  });
});
