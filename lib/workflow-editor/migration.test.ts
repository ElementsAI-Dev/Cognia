import { createEmptyVisualWorkflow } from '@/types/workflow/workflow-editor';

import {
  CURRENT_WORKFLOW_SCHEMA_VERSION,
  migrateWorkflowSchema,
} from './migration';

describe('workflow schema migration', () => {
  it('migrates legacy node type aliases to canonical types', () => {
    const workflow = createEmptyVisualWorkflow('legacy');
    workflow.schemaVersion = '1.0';
    workflow.nodes.push({
      id: 'legacy-1',
      type: 'knowledge_retrieval' as never,
      position: { x: 100, y: 120 },
      data: {
        label: 'legacy retrieval',
        nodeType: 'knowledge_retrieval' as never,
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
      } as never,
    });

    const result = migrateWorkflowSchema(workflow);
    const migrated = result.workflow.nodes.find((node) => node.id === 'legacy-1');

    expect(result.toVersion).toBe(CURRENT_WORKFLOW_SCHEMA_VERSION);
    expect(migrated?.type).toBe('knowledgeRetrieval');
    expect(migrated?.data.nodeType).toBe('knowledgeRetrieval');
  });

  it('is idempotent when migration is re-applied', () => {
    const workflow = createEmptyVisualWorkflow('idempotent');
    const first = migrateWorkflowSchema(workflow).workflow;
    const second = migrateWorkflowSchema(first).workflow;

    expect(second.schemaVersion).toBe(CURRENT_WORKFLOW_SCHEMA_VERSION);
    expect(second.settings).toEqual(first.settings);
    expect(second.nodes).toEqual(first.nodes);
  });
});
