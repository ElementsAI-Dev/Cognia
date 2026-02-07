/**
 * Tests for skill packager
 */

import {
  exportSkillToPackage,
  importSkillFromMarkdown,
  exportSkillToMarkdown,
  importSkillFromPackage,
  PACKAGE_FORMAT_VERSION,
} from './packager';
import type { Skill } from '@/types/system/skill';

const createMockSkill = (overrides?: Partial<Skill>): Skill => ({
  id: 'test-id',
  metadata: { name: 'test-skill', description: 'A test skill' },
  content: 'You are a helpful assistant for testing.',
  rawContent: '---\nname: test-skill\ndescription: A test skill\n---\nYou are a helpful assistant for testing.',
  resources: [],
  status: 'enabled',
  source: 'custom',
  category: 'development',
  tags: ['test', 'dev'],
  version: '1.0.0',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  usageCount: 5,
  ...overrides,
});

describe('skill packager', () => {
  describe('exportSkillToPackage', () => {
    it('should package skill for export', () => {
      const skill = createMockSkill();
      const pkg = exportSkillToPackage(skill);

      expect(pkg.formatVersion).toBe(PACKAGE_FORMAT_VERSION);
      expect(pkg.skill.metadata).toEqual(skill.metadata);
      expect(pkg.skill.content).toBe(skill.content);
      expect(pkg.skill.category).toBe('development');
      expect(pkg.skill.tags).toEqual(['test', 'dev']);
      expect(pkg.exportedAt).toBeDefined();
    });
  });

  describe('importSkillFromPackage', () => {
    it('should unpackage imported skill', () => {
      const skill = createMockSkill();
      const pkg = exportSkillToPackage(skill);
      const result = importSkillFromPackage(pkg);

      expect(result.success).toBe(true);
      expect(result.skill).toBeDefined();
      expect(result.skill?.metadata.name).toBe('test-skill');
      expect(result.skill?.content).toBe(skill.content);
    });

    it('should reject package with missing skill data', () => {
      const pkg = {
        formatVersion: '1.0.0',
        skill: undefined as unknown,
        exportedAt: new Date().toISOString(),
      } as unknown as Parameters<typeof importSkillFromPackage>[0];
      const result = importSkillFromPackage(pkg);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some((e) => e.includes('Missing'))).toBe(true);
    });
  });

  describe('importSkillFromMarkdown', () => {
    it('should import valid SKILL.md with auto-detected category and tags', () => {
      const markdown = `---
name: code-review
description: Expert code reviewer
---

You are an expert code reviewer. Review JavaScript and TypeScript code for bugs, performance issues, and best practices.

## Keywords
javascript, typescript, code-review, linting
`;

      const result = importSkillFromMarkdown(markdown);

      expect(result.success).toBe(true);
      expect(result.skill).toBeDefined();
      expect(result.skill?.metadata.name).toBe('code-review');
      expect(result.skill?.metadata.description).toBe('Expert code reviewer');
      expect(result.skill?.source).toBe('imported');
      // Category should be auto-detected (not 'custom')
      expect(result.skill?.category).toBeDefined();
      // Tags should be auto-detected from Keywords section
      expect(result.skill?.tags).toBeDefined();
      expect(Array.isArray(result.skill?.tags)).toBe(true);
    });

    it('should detect development category from code-related content', () => {
      const markdown = `---
name: typescript-helper
description: TypeScript development assistant
---

You help write TypeScript code, debug errors, refactor functions, and write unit tests.
`;

      const result = importSkillFromMarkdown(markdown);

      expect(result.success).toBe(true);
      expect(result.skill?.category).toBe('development');
    });

    it('should detect creative-design category from design-related content', () => {
      const markdown = `---
name: ui-designer
description: UI design assistant
---

You are a professional UI designer. You create wireframes, mockups, design systems, and visual layouts for web applications.
`;

      const result = importSkillFromMarkdown(markdown);

      expect(result.success).toBe(true);
      expect(result.skill?.category).toBe('creative-design');
    });

    it('should extract tags from Keywords section', () => {
      const markdown = `---
name: tag-test
description: Test tag extraction
---

Some content here.

## Keywords
react, nextjs, frontend, testing
`;

      const result = importSkillFromMarkdown(markdown);

      expect(result.success).toBe(true);
      expect(result.skill?.tags).toEqual(
        expect.arrayContaining(['react', 'nextjs', 'frontend', 'testing'])
      );
    });

    it('should fail for markdown without frontmatter', () => {
      const markdown = 'Just some content without metadata';

      const result = importSkillFromMarkdown(markdown);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('exportSkillToMarkdown', () => {
    it('should export skill as markdown string', () => {
      const skill = createMockSkill();
      const md = exportSkillToMarkdown(skill);

      expect(md).toContain('name: test-skill');
      expect(md).toContain('description: A test skill');
      expect(md).toContain('You are a helpful assistant for testing.');
    });
  });
});
