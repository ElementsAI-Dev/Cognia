'use client';

/**
 * usePlanExecutor - Hook for executing agent plans step by step
 */

import { useCallback, useRef, useState } from 'react';
import { generateText } from 'ai';
import { useAgentStore, useSettingsStore, useSessionStore } from '@/stores';
import { getProviderModel, type ProviderName } from '@/lib/ai/core/client';
import type { AgentPlan, PlanStep } from '@/types/agent';

export interface PlanExecutionOptions {
  onStepStart?: (step: PlanStep) => void;
  onStepComplete?: (step: PlanStep, result: string) => void;
  onStepError?: (step: PlanStep, error: string) => void;
  onPlanComplete?: (plan: AgentPlan) => void;
  onPlanError?: (plan: AgentPlan, error: string) => void;
}

export interface UsePlanExecutorReturn {
  isExecuting: boolean;
  currentStepId: string | null;
  error: string | null;
  executePlan: (planId: string, options?: PlanExecutionOptions) => Promise<void>;
  executeStep: (planId: string, stepId: string) => Promise<string>;
  stopExecution: () => void;
}

export function usePlanExecutor(): UsePlanExecutorReturn {
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);

  const {
    getPlan,
    startPlanStep,
    completePlanStep,
    failPlanStep,
    completePlanExecution,
    cancelPlanExecution,
  } = useAgentStore();

  const executeStep = useCallback(async (planId: string, stepId: string): Promise<string> => {
    const plan = getPlan(planId);
    if (!plan) throw new Error('Plan not found');

    const step = plan.steps.find((s) => s.id === stepId);
    if (!step) throw new Error('Step not found');

    const session = getActiveSession();
    const provider = (session?.provider || 'openai') as ProviderName;
    const model = session?.model || 'gpt-4o-mini';
    const settings = providerSettings[provider];

    if (!settings?.apiKey && provider !== 'ollama') {
      throw new Error(`API key not configured for ${provider}`);
    }

    const modelInstance = getProviderModel(
      provider,
      model,
      settings?.apiKey || '',
      settings?.baseURL
    );

    // Build context from previous steps
    const previousSteps = plan.steps
      .filter((s) => s.status === 'completed' && s.output)
      .map((s, i) => `Step ${i + 1}: ${s.title}\nResult: ${s.output}`)
      .join('\n\n');

    const systemPrompt = `You are an AI assistant executing a plan step by step.

Plan: ${plan.title}
${plan.description ? `Description: ${plan.description}` : ''}

${previousSteps ? `Previous completed steps:\n${previousSteps}\n\n` : ''}

Current step to execute: ${step.title}
${step.description ? `Step description: ${step.description}` : ''}

Execute this step and provide a clear, actionable result. Be specific about what was accomplished.`;

    const result = await generateText({
      model: modelInstance,
      system: systemPrompt,
      prompt: `Execute step: "${step.title}"${step.description ? `\n\nDetails: ${step.description}` : ''}`,
      temperature: 0.7,
    });

    return result.text;
  }, [getPlan, getActiveSession, providerSettings]);

  const executePlan = useCallback(async (planId: string, options?: PlanExecutionOptions) => {
    const plan = getPlan(planId);
    if (!plan) {
      setError('Plan not found');
      return;
    }

    setIsExecuting(true);
    setError(null);
    abortRef.current = false;

    const pendingSteps = plan.steps.filter((s) => s.status === 'pending');

    try {
      for (const step of pendingSteps) {
        if (abortRef.current) {
          cancelPlanExecution(planId);
          break;
        }

        setCurrentStepId(step.id);
        startPlanStep(planId, step.id);
        options?.onStepStart?.(step);

        try {
          const result = await executeStep(planId, step.id);
          completePlanStep(planId, step.id, result);
          options?.onStepComplete?.(step, result);
        } catch (stepError) {
          const errorMessage = stepError instanceof Error ? stepError.message : 'Step execution failed';
          failPlanStep(planId, step.id, errorMessage);
          options?.onStepError?.(step, errorMessage);
          
          // Stop execution on error
          setError(errorMessage);
          cancelPlanExecution(planId);
          options?.onPlanError?.(plan, errorMessage);
          return;
        }
      }

      if (!abortRef.current) {
        completePlanExecution(planId);
        const updatedPlan = getPlan(planId);
        if (updatedPlan) {
          options?.onPlanComplete?.(updatedPlan);
        }
      }
    } finally {
      setIsExecuting(false);
      setCurrentStepId(null);
    }
  }, [
    getPlan,
    executeStep,
    startPlanStep,
    completePlanStep,
    failPlanStep,
    completePlanExecution,
    cancelPlanExecution,
  ]);

  const stopExecution = useCallback(() => {
    abortRef.current = true;
    setIsExecuting(false);
    setCurrentStepId(null);
  }, []);

  return {
    isExecuting,
    currentStepId,
    error,
    executePlan,
    executeStep,
    stopExecution,
  };
}

export default usePlanExecutor;
