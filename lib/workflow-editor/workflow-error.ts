import type {
  WorkflowErrorEnvelope,
  WorkflowErrorStage,
} from '@/types/workflow/workflow-editor';

export function createWorkflowErrorEnvelope(params: {
  stage: WorkflowErrorStage;
  code: string;
  message: string;
  retryable: boolean;
  affectedTargets?: string[];
}): WorkflowErrorEnvelope {
  return {
    stage: params.stage,
    code: params.code,
    message: params.message,
    retryable: params.retryable,
    affectedTargets: params.affectedTargets,
    occurredAt: new Date(),
  };
}

export function formatWorkflowErrorEnvelope(error: WorkflowErrorEnvelope): string {
  const targets =
    error.affectedTargets && error.affectedTargets.length > 0
      ? ` (${error.affectedTargets.join(', ')})`
      : '';
  return `[${error.stage}] ${error.code}: ${error.message}${targets}`;
}
