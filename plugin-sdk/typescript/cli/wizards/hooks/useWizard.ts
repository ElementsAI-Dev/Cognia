/**
 * useWizard Hook
 *
 * State management for multi-step wizards.
 */

import { useState, useCallback } from 'react';

export interface WizardStep<T = unknown> {
  id: string;
  title: string;
  description?: string;
  validate?: (data: T) => string | undefined;
}

export interface UseWizardOptions<T> {
  steps: WizardStep<T>[];
  initialData: T;
  onComplete: (data: T) => void | Promise<void>;
  onCancel?: () => void;
}

export interface UseWizardReturn<T> {
  /** Current step index */
  currentStep: number;
  /** Current step definition */
  step: WizardStep<T>;
  /** Wizard data */
  data: T;
  /** Whether on first step */
  isFirst: boolean;
  /** Whether on last step */
  isLast: boolean;
  /** Whether wizard is complete */
  isComplete: boolean;
  /** Whether wizard is submitting */
  isSubmitting: boolean;
  /** Error message if any */
  error: string | undefined;
  /** Go to next step */
  next: () => void;
  /** Go to previous step */
  prev: () => void;
  /** Go to specific step */
  goTo: (index: number) => void;
  /** Update wizard data */
  setData: (data: Partial<T>) => void;
  /** Submit wizard */
  submit: () => Promise<void>;
  /** Cancel wizard */
  cancel: () => void;
}

export function useWizard<T>({
  steps,
  initialData,
  onComplete,
  onCancel,
}: UseWizardOptions<T>): UseWizardReturn<T> {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setDataState] = useState<T>(initialData);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const setData = useCallback((partial: Partial<T>) => {
    setDataState((prev) => ({ ...prev, ...partial } as T));
    setError(undefined);
  }, []);

  const next = useCallback(() => {
    if (step.validate) {
      const validationError = step.validate(data);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    setError(undefined);
    if (!isLast) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [step, data, isLast]);

  const prev = useCallback(() => {
    setError(undefined);
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirst]);

  const goTo = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setError(undefined);
      setCurrentStep(index);
    }
  }, [steps.length]);

  const submit = useCallback(async () => {
    if (step.validate) {
      const validationError = step.validate(data);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsSubmitting(true);
    setError(undefined);

    try {
      await onComplete(data);
      setIsComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [step, data, onComplete]);

  const cancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  return {
    currentStep,
    step,
    data,
    isFirst,
    isLast,
    isComplete,
    isSubmitting,
    error,
    next,
    prev,
    goTo,
    setData,
    submit,
    cancel,
  };
}

export default useWizard;
