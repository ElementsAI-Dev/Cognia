/**
 * Workflow Registry - Manages available workflows for AI agents
 * 
 * Provides centralized workflow management similar to tool registry
 */

import type {
  WorkflowDefinition,
  WorkflowType,
  WorkflowStepDefinition,
  WorkflowTemplate,
} from '@/types/workflow';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

export interface WorkflowRegistry {
  workflows: Map<string, WorkflowDefinition>;
  templates: Map<string, WorkflowTemplate>;
  
  register: (workflow: WorkflowDefinition) => void;
  unregister: (workflowId: string) => void;
  get: (workflowId: string) => WorkflowDefinition | undefined;
  getAll: () => WorkflowDefinition[];
  getByType: (type: WorkflowType) => WorkflowDefinition[];
  getByCategory: (category: string) => WorkflowDefinition[];
  
  registerTemplate: (template: WorkflowTemplate) => void;
  unregisterTemplate: (templateId: string) => void;
  getTemplate: (templateId: string) => WorkflowTemplate | undefined;
  getTemplatesForWorkflow: (workflowId: string) => WorkflowTemplate[];
  getAllTemplates: () => WorkflowTemplate[];
  
  validateWorkflow: (workflow: WorkflowDefinition) => ValidationResult;
  validateStep: (step: WorkflowStepDefinition) => ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Create a new workflow registry
 */
export function createWorkflowRegistry(): WorkflowRegistry {
  const workflows = new Map<string, WorkflowDefinition>();
  const templates = new Map<string, WorkflowTemplate>();

  const validateStep = (step: WorkflowStepDefinition): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!step.id) {
      errors.push('Step must have an ID');
    }
    if (!step.name) {
      errors.push('Step must have a name');
    }
    if (!step.type) {
      errors.push('Step must have a type');
    }
    if (step.type === 'tool' && !step.toolName) {
      errors.push(`Step "${step.id}" is a tool step but has no toolName`);
    }
    if (step.type === 'ai' && !step.aiPrompt) {
      warnings.push(`Step "${step.id}" is an AI step but has no aiPrompt`);
    }
    if (step.dependencies) {
      for (const dep of step.dependencies) {
        if (!dep) {
          errors.push(`Step "${step.id}" has an empty dependency`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  };

  const validateWorkflow = (workflow: WorkflowDefinition): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!workflow.id) {
      errors.push('Workflow must have an ID');
    }
    if (!workflow.name) {
      errors.push('Workflow must have a name');
    }
    if (!workflow.type) {
      errors.push('Workflow must have a type');
    }
    if (!workflow.steps || workflow.steps.length === 0) {
      errors.push('Workflow must have at least one step');
    }

    // Validate each step
    const stepIds = new Set<string>();
    for (const step of workflow.steps || []) {
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);

      const stepValidation = validateStep(step);
      errors.push(...stepValidation.errors);
      warnings.push(...stepValidation.warnings);
    }

    // Validate dependencies exist
    for (const step of workflow.steps || []) {
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          if (!stepIds.has(depId)) {
            errors.push(`Step "${step.id}" depends on non-existent step "${depId}"`);
          }
        }
      }
    }

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);

      const step = workflow.steps?.find(s => s.id === stepId);
      if (step?.dependencies) {
        for (const depId of step.dependencies) {
          if (!visited.has(depId)) {
            if (hasCycle(depId)) return true;
          } else if (recursionStack.has(depId)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of workflow.steps || []) {
      if (!visited.has(step.id)) {
        if (hasCycle(step.id)) {
          errors.push('Workflow contains circular dependencies');
          break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  };

  return {
    workflows,
    templates,

    register(workflow: WorkflowDefinition) {
      const validation = validateWorkflow(workflow);
      if (!validation.valid) {
        log.warn(`Workflow "${workflow.id}" validation failed`, { errors: validation.errors });
      }
      workflows.set(workflow.id, {
        ...workflow,
        createdAt: workflow.createdAt || new Date(),
        updatedAt: new Date(),
      });
    },

    unregister(workflowId: string) {
      workflows.delete(workflowId);
      // Also remove associated templates
      for (const [templateId, template] of templates.entries()) {
        if (template.workflowId === workflowId) {
          templates.delete(templateId);
        }
      }
    },

    get(workflowId: string) {
      return workflows.get(workflowId);
    },

    getAll() {
      return Array.from(workflows.values());
    },

    getByType(type: WorkflowType) {
      return Array.from(workflows.values()).filter(w => w.type === type);
    },

    getByCategory(category: string) {
      return Array.from(workflows.values()).filter(w => w.category === category);
    },

    registerTemplate(template: WorkflowTemplate) {
      templates.set(template.id, template);
    },

    unregisterTemplate(templateId: string) {
      templates.delete(templateId);
    },

    getTemplate(templateId: string) {
      return templates.get(templateId);
    },

    getTemplatesForWorkflow(workflowId: string) {
      return Array.from(templates.values()).filter(t => t.workflowId === workflowId);
    },

    getAllTemplates() {
      return Array.from(templates.values());
    },

    validateWorkflow,
    validateStep,
  };
}

/**
 * Global workflow registry instance
 */
let globalWorkflowRegistry: WorkflowRegistry | null = null;

export function getGlobalWorkflowRegistry(): WorkflowRegistry {
  if (!globalWorkflowRegistry) {
    globalWorkflowRegistry = createWorkflowRegistry();
  }
  return globalWorkflowRegistry;
}

/**
 * Reset global registry (for testing)
 */
export function resetGlobalWorkflowRegistry(): void {
  globalWorkflowRegistry = null;
}
