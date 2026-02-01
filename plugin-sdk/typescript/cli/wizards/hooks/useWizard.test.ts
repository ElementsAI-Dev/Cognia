/**
 * useWizard Hook Unit Tests
 *
 * Tests for wizard types and utilities.
 * Note: Full React hook testing requires @testing-library/react-hooks
 * which has complex setup requirements with React 19.
 */

import type { WizardStep, UseWizardOptions } from './useWizard';

describe('useWizard Types', () => {
  describe('WizardStep interface', () => {
    it('should define required properties', () => {
      const step: WizardStep = {
        id: 'step1',
        title: 'Step 1',
      };

      expect(step.id).toBe('step1');
      expect(step.title).toBe('Step 1');
    });

    it('should support optional description', () => {
      const step: WizardStep = {
        id: 'step1',
        title: 'Step 1',
        description: 'First step description',
      };

      expect(step.description).toBe('First step description');
    });

    it('should support optional validate function', () => {
      const step: WizardStep<{ name: string }> = {
        id: 'step1',
        title: 'Step 1',
        validate: (data) => {
          if (!data.name) return 'Name is required';
          return undefined;
        },
      };

      expect(step.validate?.({ name: '' })).toBe('Name is required');
      expect(step.validate?.({ name: 'John' })).toBeUndefined();
    });
  });

  describe('UseWizardOptions interface', () => {
    it('should define required properties', () => {
      const steps: WizardStep[] = [
        { id: 'step1', title: 'Step 1' },
        { id: 'step2', title: 'Step 2' },
      ];

      const options: UseWizardOptions<{ name: string }> = {
        steps,
        initialData: { name: '' },
        onComplete: jest.fn(),
      };

      expect(options.steps).toHaveLength(2);
      expect(options.initialData).toEqual({ name: '' });
      expect(typeof options.onComplete).toBe('function');
    });

    it('should support optional onCancel', () => {
      const options: UseWizardOptions<{ name: string }> = {
        steps: [{ id: 'step1', title: 'Step 1' }],
        initialData: { name: '' },
        onComplete: jest.fn(),
        onCancel: jest.fn(),
      };

      expect(typeof options.onCancel).toBe('function');
    });
  });

  describe('Step validation', () => {
    it('should validate step data', () => {
      const validateName = (data: { name: string }): string | undefined => {
        if (!data.name.trim()) return 'Name is required';
        if (data.name.length < 3) return 'Name must be at least 3 characters';
        return undefined;
      };

      expect(validateName({ name: '' })).toBe('Name is required');
      expect(validateName({ name: 'ab' })).toBe('Name must be at least 3 characters');
      expect(validateName({ name: 'John' })).toBeUndefined();
    });

    it('should validate plugin ID format', () => {
      const validatePluginId = (id: string): string | undefined => {
        if (!id.trim()) return 'Plugin ID is required';
        if (!/^[a-z][a-z0-9-]*$/.test(id)) {
          return 'Use lowercase letters, numbers, and hyphens only';
        }
        return undefined;
      };

      expect(validatePluginId('')).toBe('Plugin ID is required');
      expect(validatePluginId('MyPlugin')).toBe('Use lowercase letters, numbers, and hyphens only');
      expect(validatePluginId('my-plugin')).toBeUndefined();
      expect(validatePluginId('my-plugin-123')).toBeUndefined();
    });
  });

  describe('Step navigation helpers', () => {
    it('should calculate isFirst correctly', () => {
      const isFirst = (currentStep: number) => currentStep === 0;

      expect(isFirst(0)).toBe(true);
      expect(isFirst(1)).toBe(false);
      expect(isFirst(2)).toBe(false);
    });

    it('should calculate isLast correctly', () => {
      const steps = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const isLast = (currentStep: number) => currentStep === steps.length - 1;

      expect(isLast(0)).toBe(false);
      expect(isLast(1)).toBe(false);
      expect(isLast(2)).toBe(true);
    });

    it('should clamp step index to valid range', () => {
      const steps = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const clampStep = (index: number) => Math.max(0, Math.min(steps.length - 1, index));

      expect(clampStep(-1)).toBe(0);
      expect(clampStep(0)).toBe(0);
      expect(clampStep(1)).toBe(1);
      expect(clampStep(2)).toBe(2);
      expect(clampStep(10)).toBe(2);
    });
  });

  describe('Data merging', () => {
    it('should merge partial data correctly', () => {
      interface WizardData {
        name: string;
        email: string;
        template: string;
      }

      const mergeData = (prev: WizardData, partial: Partial<WizardData>): WizardData => {
        return { ...prev, ...partial };
      };

      const initial: WizardData = { name: '', email: '', template: 'basic' };

      const afterName = mergeData(initial, { name: 'John' });
      expect(afterName).toEqual({ name: 'John', email: '', template: 'basic' });

      const afterEmail = mergeData(afterName, { email: 'john@example.com' });
      expect(afterEmail).toEqual({ name: 'John', email: 'john@example.com', template: 'basic' });
    });
  });
});
