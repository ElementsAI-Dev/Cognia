/**
 * YAML DSL converter for workflow definitions
 * Converts between VisualWorkflow and a human-readable YAML DSL format
 */

import type { VisualWorkflow, WorkflowNodeData } from '@/types/workflow/workflow-editor';

export interface YamlWorkflowStep {
  id: string;
  type: string;
  label: string;
  description?: string;
  config?: Record<string, unknown>;
  next?: string | string[];
}

export interface YamlWorkflowDSL {
  name: string;
  description?: string;
  version: string;
  variables?: Record<string, unknown>;
  steps: YamlWorkflowStep[];
}

/**
 * Convert a VisualWorkflow to YAML DSL object
 */
export function visualToYamlDSL(workflow: VisualWorkflow): YamlWorkflowDSL {
  const steps: YamlWorkflowStep[] = workflow.nodes.map((node) => {
    const data = node.data as WorkflowNodeData;
    const outEdges = workflow.edges.filter((e) => e.source === node.id);
    const nextNodes = outEdges.map((e) => e.target);

    // Extract type-specific config, excluding base fields
    const baseKeys = new Set([
      'id', 'label', 'description', 'nodeType', 'executionStatus',
      'isConfigured', 'isDisabled', 'hasError', 'errorMessage',
      'executionTime', 'executionOutput', 'errorConfig', 'pinnedData', 'notes',
    ]);
    const config: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!baseKeys.has(key) && value !== undefined && value !== null) {
        config[key] = value;
      }
    }

    const step: YamlWorkflowStep = {
      id: node.id,
      type: data.nodeType,
      label: data.label,
    };

    if (data.description) step.description = data.description;
    if (Object.keys(config).length > 0) step.config = config;
    if (nextNodes.length === 1) step.next = nextNodes[0];
    else if (nextNodes.length > 1) step.next = nextNodes;

    return step;
  });

  return {
    name: workflow.name,
    description: workflow.description,
    version: '1.0',
    variables: Object.keys(workflow.variables).length > 0 ? workflow.variables : undefined,
    steps,
  };
}

/**
 * Serialize YamlWorkflowDSL to a YAML-like string
 * Uses a simple serializer to avoid heavy yaml dependency
 */
export function serializeToYaml(dsl: YamlWorkflowDSL): string {
  const lines: string[] = [];

  lines.push(`name: "${escapeYamlString(dsl.name)}"`);
  if (dsl.description) lines.push(`description: "${escapeYamlString(dsl.description)}"`);
  lines.push(`version: "${dsl.version}"`);

  if (dsl.variables && Object.keys(dsl.variables).length > 0) {
    lines.push('variables:');
    for (const [key, value] of Object.entries(dsl.variables)) {
      lines.push(`  ${key}: ${formatYamlValue(value)}`);
    }
  }

  lines.push('');
  lines.push('steps:');
  for (const step of dsl.steps) {
    lines.push(`  - id: "${step.id}"`);
    lines.push(`    type: ${step.type}`);
    lines.push(`    label: "${escapeYamlString(step.label)}"`);
    if (step.description) {
      lines.push(`    description: "${escapeYamlString(step.description)}"`);
    }
    if (step.next) {
      if (typeof step.next === 'string') {
        lines.push(`    next: "${step.next}"`);
      } else {
        lines.push('    next:');
        for (const n of step.next) {
          lines.push(`      - "${n}"`);
        }
      }
    }
    if (step.config && Object.keys(step.config).length > 0) {
      lines.push('    config:');
      for (const [key, value] of Object.entries(step.config)) {
        lines.push(`      ${key}: ${formatYamlValue(value)}`);
      }
    }
  }

  return lines.join('\n') + '\n';
}

function escapeYamlString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function formatYamlValue(value: unknown, _indent = 0): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return `"${escapeYamlString(value)}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return JSON.stringify(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
