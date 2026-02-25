import {
  getBuiltInTemplates,
  getTemplateById,
  getAvailableTemplates,
  resolveBasePrompt,
  resolvePhasePrompt,
  resolveDifficultyPrompt,
  resolveStylePrompt,
  resolveScenarioPrompt,
  resolveUnderstandingPrompt,
  buildConfigModifiers,
} from './prompt-templates';
import { SOCRATIC_MENTOR_PROMPT, PHASE_PROMPTS, DIFFICULTY_PROMPTS, LEARNING_STYLE_PROMPTS, SCENARIO_PROMPTS, UNDERSTANDING_PROMPTS } from './prompt-constants';
import { DEFAULT_LEARNING_CONFIG } from '@/types/learning';
import type { PromptTemplate, LearningModeConfig } from '@/types/learning';

describe('prompt-templates', () => {
  describe('getBuiltInTemplates', () => {
    it('returns 4 English templates by default', () => {
      const templates = getBuiltInTemplates();
      expect(templates).toHaveLength(4);
      expect(templates.every((t) => t.language === 'en')).toBe(true);
    });

    it('returns 4 Chinese templates for zh-CN', () => {
      const templates = getBuiltInTemplates('zh-CN');
      expect(templates).toHaveLength(4);
      expect(templates.every((t) => t.language === 'zh-CN')).toBe(true);
    });

    it('returns English templates for auto', () => {
      const templates = getBuiltInTemplates('auto');
      expect(templates).toHaveLength(4);
      expect(templates.every((t) => t.language === 'en')).toBe(true);
    });

    it('all templates are marked as built-in', () => {
      const templates = getBuiltInTemplates();
      expect(templates.every((t) => t.isBuiltIn)).toBe(true);
    });
  });

  describe('getTemplateById', () => {
    it('finds builtin-socratic template', () => {
      const template = getTemplateById('builtin-socratic');
      expect(template).toBeDefined();
      expect(template!.approach).toBe('socratic');
    });

    it('finds builtin-cognitive template', () => {
      const template = getTemplateById('builtin-cognitive');
      expect(template).toBeDefined();
      expect(template!.approach).toBe('cognitive');
    });

    it('finds Chinese template by ID', () => {
      const template = getTemplateById('builtin-socratic-zh');
      expect(template).toBeDefined();
      expect(template!.language).toBe('zh-CN');
    });

    it('returns custom template when available', () => {
      const custom: PromptTemplate = {
        id: 'my-custom',
        name: 'Custom',
        description: 'My custom template',
        approach: 'custom',
        basePrompt: 'Custom prompt',
        language: 'en',
        isBuiltIn: false,
      };
      const result = getTemplateById('my-custom', { 'my-custom': custom });
      expect(result).toBe(custom);
    });

    it('prefers custom template over built-in with same ID', () => {
      const override: PromptTemplate = {
        id: 'builtin-socratic',
        name: 'Override',
        description: 'Override',
        approach: 'socratic',
        basePrompt: 'Override prompt',
        language: 'en',
        isBuiltIn: false,
      };
      const result = getTemplateById('builtin-socratic', { 'builtin-socratic': override });
      expect(result!.basePrompt).toBe('Override prompt');
    });

    it('returns undefined for unknown ID', () => {
      expect(getTemplateById('nonexistent')).toBeUndefined();
    });
  });

  describe('getAvailableTemplates', () => {
    it('returns built-in + custom templates', () => {
      const custom: PromptTemplate = {
        id: 'custom-1',
        name: 'Custom',
        description: 'Custom',
        approach: 'custom',
        basePrompt: 'Custom',
        language: 'en',
        isBuiltIn: false,
      };
      const all = getAvailableTemplates('en', { 'custom-1': custom });
      expect(all).toHaveLength(5); // 4 built-in + 1 custom
    });

    it('returns only built-in when no custom templates', () => {
      const all = getAvailableTemplates('en');
      expect(all).toHaveLength(4);
    });
  });

  describe('resolveBasePrompt', () => {
    it('returns SOCRATIC_MENTOR_PROMPT for default config', () => {
      const prompt = resolveBasePrompt(DEFAULT_LEARNING_CONFIG);
      expect(prompt).toBe(SOCRATIC_MENTOR_PROMPT);
    });

    it('returns custom template basePrompt when active', () => {
      const custom: PromptTemplate = {
        id: 'my-template',
        name: 'Mine',
        description: 'Mine',
        approach: 'custom',
        basePrompt: 'My custom base prompt',
        language: 'en',
        isBuiltIn: false,
      };
      const config: LearningModeConfig = {
        ...DEFAULT_LEARNING_CONFIG,
        activeTemplateId: 'my-template',
      };
      expect(resolveBasePrompt(config, { 'my-template': custom })).toBe('My custom base prompt');
    });

    it('falls back to SOCRATIC_MENTOR_PROMPT for unknown template', () => {
      const config: LearningModeConfig = {
        ...DEFAULT_LEARNING_CONFIG,
        activeTemplateId: 'nonexistent',
      };
      expect(resolveBasePrompt(config)).toBe(SOCRATIC_MENTOR_PROMPT);
    });

    it('returns cognitive template prompt when active', () => {
      const config: LearningModeConfig = {
        ...DEFAULT_LEARNING_CONFIG,
        activeTemplateId: 'builtin-cognitive',
      };
      const prompt = resolveBasePrompt(config);
      expect(prompt).toContain('Cognitive Tutor');
    });
  });

  describe('resolvePhasePrompt', () => {
    it('returns default phase prompt when no override', () => {
      expect(resolvePhasePrompt('clarification', DEFAULT_LEARNING_CONFIG)).toBe(
        PHASE_PROMPTS.clarification
      );
    });

    it('returns template phase override when available', () => {
      const custom: PromptTemplate = {
        id: 'overrider',
        name: 'Overrider',
        description: 'Has overrides',
        approach: 'custom',
        basePrompt: 'base',
        phaseOverrides: { clarification: 'Custom clarification prompt' },
        language: 'en',
        isBuiltIn: false,
      };
      const config: LearningModeConfig = {
        ...DEFAULT_LEARNING_CONFIG,
        activeTemplateId: 'overrider',
      };
      expect(resolvePhasePrompt('clarification', config, { overrider: custom })).toBe(
        'Custom clarification prompt'
      );
    });

    it('falls back to default for phases without override', () => {
      const custom: PromptTemplate = {
        id: 'overrider',
        name: 'Overrider',
        description: 'Has overrides',
        approach: 'custom',
        basePrompt: 'base',
        phaseOverrides: { clarification: 'Custom' },
        language: 'en',
        isBuiltIn: false,
      };
      const config: LearningModeConfig = {
        ...DEFAULT_LEARNING_CONFIG,
        activeTemplateId: 'overrider',
      };
      expect(resolvePhasePrompt('summary', config, { overrider: custom })).toBe(
        PHASE_PROMPTS.summary
      );
    });
  });

  describe('resolveDifficultyPrompt', () => {
    it('returns default difficulty prompt', () => {
      expect(resolveDifficultyPrompt('beginner', DEFAULT_LEARNING_CONFIG)).toBe(
        DIFFICULTY_PROMPTS.beginner
      );
    });

    it('returns template override when available', () => {
      const custom: PromptTemplate = {
        id: 'diff-overrider',
        name: 'DO',
        description: 'DO',
        approach: 'custom',
        basePrompt: 'base',
        difficultyOverrides: { beginner: 'Easy mode prompt' },
        language: 'en',
        isBuiltIn: false,
      };
      const config: LearningModeConfig = {
        ...DEFAULT_LEARNING_CONFIG,
        activeTemplateId: 'diff-overrider',
      };
      expect(resolveDifficultyPrompt('beginner', config, { 'diff-overrider': custom })).toBe(
        'Easy mode prompt'
      );
    });
  });

  describe('resolveStylePrompt', () => {
    it('returns default style prompt', () => {
      expect(resolveStylePrompt('visual', DEFAULT_LEARNING_CONFIG)).toBe(
        LEARNING_STYLE_PROMPTS.visual
      );
    });
  });

  describe('resolveScenarioPrompt', () => {
    it('returns default scenario prompt when no override', () => {
      expect(resolveScenarioPrompt('problemSolving', DEFAULT_LEARNING_CONFIG)).toBe(
        SCENARIO_PROMPTS.problemSolving
      );
    });

    it('returns template scenario override when available', () => {
      const custom: PromptTemplate = {
        id: 'scenario-overrider',
        name: 'SO',
        description: 'SO',
        approach: 'custom',
        basePrompt: 'base',
        scenarioOverrides: { problemSolving: 'Custom problem solving prompt' },
        language: 'en',
        isBuiltIn: false,
      };
      const config: LearningModeConfig = {
        ...DEFAULT_LEARNING_CONFIG,
        activeTemplateId: 'scenario-overrider',
      };
      expect(
        resolveScenarioPrompt('problemSolving', config, { 'scenario-overrider': custom })
      ).toBe('Custom problem solving prompt');
    });

    it('falls back to default for scenarios without override', () => {
      const custom: PromptTemplate = {
        id: 'scenario-overrider',
        name: 'SO',
        description: 'SO',
        approach: 'custom',
        basePrompt: 'base',
        scenarioOverrides: { problemSolving: 'Custom' },
        language: 'en',
        isBuiltIn: false,
      };
      const config: LearningModeConfig = {
        ...DEFAULT_LEARNING_CONFIG,
        activeTemplateId: 'scenario-overrider',
      };
      expect(
        resolveScenarioPrompt('conceptLearning', config, { 'scenario-overrider': custom })
      ).toBe(SCENARIO_PROMPTS.conceptLearning);
    });
  });

  describe('resolveUnderstandingPrompt', () => {
    it('returns default understanding prompt when no override', () => {
      expect(resolveUnderstandingPrompt('partial', DEFAULT_LEARNING_CONFIG)).toBe(
        UNDERSTANDING_PROMPTS.partial
      );
    });

    it('returns template understanding override when available', () => {
      const custom: PromptTemplate = {
        id: 'understanding-overrider',
        name: 'UO',
        description: 'UO',
        approach: 'custom',
        basePrompt: 'base',
        understandingOverrides: { none: 'Custom none understanding prompt' },
        language: 'en',
        isBuiltIn: false,
      };
      const config: LearningModeConfig = {
        ...DEFAULT_LEARNING_CONFIG,
        activeTemplateId: 'understanding-overrider',
      };
      expect(
        resolveUnderstandingPrompt('none', config, { 'understanding-overrider': custom })
      ).toBe('Custom none understanding prompt');
    });

    it('falls back to default for levels without override', () => {
      const custom: PromptTemplate = {
        id: 'understanding-overrider',
        name: 'UO',
        description: 'UO',
        approach: 'custom',
        basePrompt: 'base',
        understandingOverrides: { none: 'Custom' },
        language: 'en',
        isBuiltIn: false,
      };
      const config: LearningModeConfig = {
        ...DEFAULT_LEARNING_CONFIG,
        activeTemplateId: 'understanding-overrider',
      };
      expect(
        resolveUnderstandingPrompt('excellent', config, { 'understanding-overrider': custom })
      ).toBe(UNDERSTANDING_PROMPTS.excellent);
    });
  });

  describe('buildConfigModifiers', () => {
    it('returns empty string for default config', () => {
      expect(buildConfigModifiers(DEFAULT_LEARNING_CONFIG)).toBe('');
    });

    it('includes mentor personality when set', () => {
      const config: LearningModeConfig = {
        ...DEFAULT_LEARNING_CONFIG,
        mentorPersonality: 'Patient and uses humor',
      };
      const result = buildConfigModifiers(config);
      expect(result).toContain('Mentor Personality');
      expect(result).toContain('Patient and uses humor');
    });

    it('includes subject context when set', () => {
      const config: LearningModeConfig = {
        ...DEFAULT_LEARNING_CONFIG,
        subjectContext: 'Computer Science',
      };
      const result = buildConfigModifiers(config);
      expect(result).toContain('Subject Domain');
      expect(result).toContain('Computer Science');
    });

    it('includes Chinese language instruction for zh-CN response language', () => {
      const config: LearningModeConfig = {
        ...DEFAULT_LEARNING_CONFIG,
        responseLanguage: 'zh-CN',
      };
      const result = buildConfigModifiers(config);
      expect(result).toContain('Language Instruction');
      expect(result).toContain('Chinese');
    });

    it('includes Chinese language for match-ui with zh-CN prompt', () => {
      const config: LearningModeConfig = {
        ...DEFAULT_LEARNING_CONFIG,
        responseLanguage: 'match-ui',
        promptLanguage: 'zh-CN',
      };
      const result = buildConfigModifiers(config);
      expect(result).toContain('Chinese');
    });

    it('does not include language instruction for match-ui with en prompt', () => {
      const config: LearningModeConfig = {
        ...DEFAULT_LEARNING_CONFIG,
        responseLanguage: 'match-ui',
        promptLanguage: 'en',
      };
      const result = buildConfigModifiers(config);
      expect(result).not.toContain('Language Instruction');
    });

    it('includes encouragement suppression when disabled', () => {
      const config: LearningModeConfig = {
        ...DEFAULT_LEARNING_CONFIG,
        enableEncouragement: false,
      };
      const result = buildConfigModifiers(config);
      expect(result).toContain('Do NOT include encouragement');
    });

    it('does not include max hints for default config', () => {
      const result = buildConfigModifiers(DEFAULT_LEARNING_CONFIG);
      expect(result).not.toContain('hints');
    });
  });
});
