'use client';

import React from 'react';
import { render } from '@testing-library/react';
import {
  RULE_TARGETS,
  RULE_TEMPLATES,
  EDITOR_VARIABLES,
  MAX_HISTORY_SIZE,
  GeminiIcon,
} from './constants';

describe('constants', () => {
  describe('RULE_TARGETS', () => {
    it('has 4 targets', () => {
      expect(RULE_TARGETS).toHaveLength(4);
    });

    it('has cursor target', () => {
      const cursor = RULE_TARGETS.find((t) => t.id === 'cursor');
      expect(cursor).toBeDefined();
      expect(cursor?.label).toBe('Cursor');
      expect(cursor?.path).toBe('.cursorrules');
    });

    it('has windsurf target', () => {
      const windsurf = RULE_TARGETS.find((t) => t.id === 'windsurf');
      expect(windsurf).toBeDefined();
      expect(windsurf?.label).toBe('Windsurf');
      expect(windsurf?.path).toBe('.windsurfrules');
    });

    it('has copilot target', () => {
      const copilot = RULE_TARGETS.find((t) => t.id === 'copilot');
      expect(copilot).toBeDefined();
      expect(copilot?.label).toBe('Copilot');
      expect(copilot?.path).toBe('.github/copilot-instructions.md');
    });

    it('has gemini target', () => {
      const gemini = RULE_TARGETS.find((t) => t.id === 'gemini');
      expect(gemini).toBeDefined();
      expect(gemini?.label).toBe('Gemini');
      expect(gemini?.path).toBe('.gemini-instructions.md');
    });

    it('each target has an icon', () => {
      RULE_TARGETS.forEach((target) => {
        expect(target.icon).toBeDefined();
      });
    });
  });

  describe('RULE_TEMPLATES', () => {
    it('has general category', () => {
      expect(RULE_TEMPLATES.general).toBeDefined();
      expect(RULE_TEMPLATES.general.base).toBeDefined();
      expect(RULE_TEMPLATES.general.senior).toBeDefined();
    });

    it('has frontend category', () => {
      expect(RULE_TEMPLATES.frontend).toBeDefined();
      expect(RULE_TEMPLATES.frontend.react).toBeDefined();
      expect(RULE_TEMPLATES.frontend.styling).toBeDefined();
    });

    it('has backend category', () => {
      expect(RULE_TEMPLATES.backend).toBeDefined();
      expect(RULE_TEMPLATES.backend.typescript).toBeDefined();
    });

    it('has testing category', () => {
      expect(RULE_TEMPLATES.testing).toBeDefined();
      expect(RULE_TEMPLATES.testing.full).toBeDefined();
    });

    it('templates have label and content', () => {
      const template = RULE_TEMPLATES.general.base;
      expect(template.label).toBe('Balanced Base');
      expect(template.content).toContain('# Working Agreements');
    });
  });

  describe('EDITOR_VARIABLES', () => {
    it('has 5 variables', () => {
      expect(EDITOR_VARIABLES).toHaveLength(5);
    });

    it('has project name variable', () => {
      const projectName = EDITOR_VARIABLES.find((v) => v.value === '{{project_name}}');
      expect(projectName).toBeDefined();
      expect(projectName?.label).toBe('Project Name');
    });

    it('has tech stack variable', () => {
      const techStack = EDITOR_VARIABLES.find((v) => v.value === '{{tech_stack}}');
      expect(techStack).toBeDefined();
      expect(techStack?.label).toBe('Stack Info');
    });

    it('each variable has label, value, and description', () => {
      EDITOR_VARIABLES.forEach((variable) => {
        expect(variable.label).toBeDefined();
        expect(variable.value).toBeDefined();
        expect(variable.description).toBeDefined();
      });
    });
  });

  describe('MAX_HISTORY_SIZE', () => {
    it('is 50', () => {
      expect(MAX_HISTORY_SIZE).toBe(50);
    });
  });

  describe('GeminiIcon', () => {
    it('renders svg', () => {
      const { container } = render(<GeminiIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('applies className', () => {
      const { container } = render(<GeminiIcon className="test-class" />);
      const svg = container.querySelector('svg');
      expect(svg?.classList.contains('test-class')).toBe(true);
    });
  });
});
