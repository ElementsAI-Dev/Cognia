/**
 * Gitignore Templates Tests
 */

import {
  gitignoreTemplates,
  getGitignoreTemplate,
  getGitignoreContent,
  mergeGitignoreTemplates,
  detectProjectType,
} from './gitignore-templates';

describe('gitignoreTemplates', () => {
  describe('gitignoreTemplates array', () => {
    it('should contain all expected templates', () => {
      const expectedIds = ['node', 'python', 'rust', 'react', 'tauri', 'go', 'java', 'minimal'];
      const actualIds = gitignoreTemplates.map((t) => t.id);
      expect(actualIds).toEqual(expectedIds);
    });

    it('should have valid structure for each template', () => {
      for (const template of gitignoreTemplates) {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('content');
        expect(typeof template.id).toBe('string');
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(typeof template.content).toBe('string');
        expect(template.content.length).toBeGreaterThan(0);
      }
    });

    it('should have unique ids', () => {
      const ids = gitignoreTemplates.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('getGitignoreTemplate', () => {
    it('should return template by id', () => {
      const template = getGitignoreTemplate('node');
      expect(template).toBeDefined();
      expect(template?.id).toBe('node');
      expect(template?.name).toBe('Node.js');
    });

    it('should return undefined for unknown id', () => {
      const template = getGitignoreTemplate('unknown-template');
      expect(template).toBeUndefined();
    });

    it('should return correct template for each known id', () => {
      const ids = ['node', 'python', 'rust', 'react', 'tauri', 'go', 'java', 'minimal'];
      for (const id of ids) {
        const template = getGitignoreTemplate(id);
        expect(template).toBeDefined();
        expect(template?.id).toBe(id);
      }
    });
  });

  describe('getGitignoreContent', () => {
    it('should return content for valid template id', () => {
      const content = getGitignoreContent('node');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
    });

    it('should return empty string for unknown id', () => {
      const content = getGitignoreContent('unknown');
      expect(content).toBe('');
    });

    it('should return python-specific patterns for python template', () => {
      const content = getGitignoreContent('python');
      expect(content).toContain('__pycache__/');
      expect(content).toContain('venv/');
      expect(content).toContain('*.py[cod]');
    });

    it('should return rust-specific patterns for rust template', () => {
      const content = getGitignoreContent('rust');
      expect(content).toContain('/target/');
      expect(content).toContain('Cargo.lock');
    });
  });

  describe('mergeGitignoreTemplates', () => {
    it('should merge multiple templates with headers', () => {
      const merged = mergeGitignoreTemplates(['node', 'python']);
      expect(merged).toContain('# ===== Node.js =====');
      expect(merged).toContain('# ===== Python =====');
      expect(merged).toContain('node_modules/');
      expect(merged).toContain('__pycache__/');
    });

    it('should return empty string for empty array', () => {
      const merged = mergeGitignoreTemplates([]);
      expect(merged).toBe('');
    });

    it('should skip unknown template ids', () => {
      const merged = mergeGitignoreTemplates(['node', 'unknown', 'python']);
      expect(merged).toContain('# ===== Node.js =====');
      expect(merged).toContain('# ===== Python =====');
      expect(merged).not.toContain('unknown');
    });

    it('should handle single template', () => {
      const merged = mergeGitignoreTemplates(['minimal']);
      expect(merged).toContain('# ===== Minimal =====');
      expect(merged).toContain('.DS_Store');
    });
  });

  describe('detectProjectType', () => {
    it('should detect Node.js project', () => {
      const types = detectProjectType(['package.json', 'src/index.js']);
      expect(types).toContain('node');
    });

    it('should detect Node.js from yarn.lock', () => {
      const types = detectProjectType(['yarn.lock', 'src/app.ts']);
      expect(types).toContain('node');
    });

    it('should detect Node.js from pnpm-lock.yaml', () => {
      const types = detectProjectType(['pnpm-lock.yaml']);
      expect(types).toContain('node');
    });

    it('should detect Python project', () => {
      const types = detectProjectType(['requirements.txt', 'main.py']);
      expect(types).toContain('python');
    });

    it('should detect Python from pyproject.toml', () => {
      const types = detectProjectType(['pyproject.toml']);
      expect(types).toContain('python');
    });

    it('should detect Python from Pipfile', () => {
      const types = detectProjectType(['Pipfile']);
      expect(types).toContain('python');
    });

    it('should detect Rust project', () => {
      const types = detectProjectType(['Cargo.toml', 'src/main.rs']);
      expect(types).toContain('rust');
    });

    it('should detect React/Next.js project', () => {
      const types = detectProjectType(['next.config.js', 'package.json']);
      expect(types).toContain('react');
    });

    it('should detect Next.js with .ts config', () => {
      const types = detectProjectType(['next.config.ts']);
      expect(types).toContain('react');
    });

    it('should detect Next.js with .mjs config', () => {
      const types = detectProjectType(['next.config.mjs']);
      expect(types).toContain('react');
    });

    it('should detect Tauri project', () => {
      const types = detectProjectType(['tauri.conf.json', 'package.json']);
      expect(types).toContain('tauri');
    });

    it('should detect Tauri from src-tauri directory', () => {
      const types = detectProjectType(['src-tauri/Cargo.toml']);
      expect(types).toContain('tauri');
    });

    it('should detect Go project', () => {
      const types = detectProjectType(['go.mod', 'main.go']);
      expect(types).toContain('go');
    });

    it('should detect Go from go.sum', () => {
      const types = detectProjectType(['go.sum']);
      expect(types).toContain('go');
    });

    it('should detect Java Maven project', () => {
      const types = detectProjectType(['pom.xml', 'src/Main.java']);
      expect(types).toContain('java');
    });

    it('should detect Java Gradle project', () => {
      const types = detectProjectType(['build.gradle']);
      expect(types).toContain('java');
    });

    it('should detect Java Gradle Kotlin DSL', () => {
      const types = detectProjectType(['build.gradle.kts']);
      expect(types).toContain('java');
    });

    it('should detect multiple project types', () => {
      const types = detectProjectType(['package.json', 'Cargo.toml', 'tauri.conf.json']);
      expect(types).toContain('node');
      expect(types).toContain('rust');
      expect(types).toContain('tauri');
    });

    it('should return minimal for unknown project', () => {
      const types = detectProjectType(['README.md', 'docs/']);
      expect(types).toEqual(['minimal']);
    });

    it('should return minimal for empty file list', () => {
      const types = detectProjectType([]);
      expect(types).toEqual(['minimal']);
    });
  });

  describe('template content validation', () => {
    it('should have node_modules in node template', () => {
      const template = getGitignoreTemplate('node');
      expect(template?.content).toContain('node_modules/');
    });

    it('should have .next in react template', () => {
      const template = getGitignoreTemplate('react');
      expect(template?.content).toContain('.next/');
    });

    it('should have /target/ in rust template', () => {
      const template = getGitignoreTemplate('rust');
      expect(template?.content).toContain('/target/');
    });

    it('should have src-tauri/target in tauri template', () => {
      const template = getGitignoreTemplate('tauri');
      expect(template?.content).toContain('/src-tauri/target/');
    });

    it('should have common IDE patterns in all templates', () => {
      for (const template of gitignoreTemplates) {
        expect(template.content).toContain('.idea/');
        expect(template.content).toContain('.vscode/');
      }
    });

    it('should have OS-specific patterns in most templates', () => {
      // Most templates have OS-specific patterns
      const templatesWithOsPatterns = gitignoreTemplates.filter(
        (t) => t.content.includes('.DS_Store')
      );
      expect(templatesWithOsPatterns.length).toBeGreaterThan(5);
    });
  });
});
