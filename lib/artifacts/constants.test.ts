/**
 * Tests for artifact constants and utility functions
 */

import {
  ARTIFACT_EXTENSIONS,
  ARTIFACT_COLORS,
  ARTIFACT_TYPE_KEYS,
  PREVIEWABLE_TYPES,
  DESIGNABLE_TYPES,
  ALWAYS_CREATE_TYPES,
  DETECTION_PATTERNS,
  MERMAID_TYPE_NAMES,
  LANGUAGE_DISPLAY_NAMES,
  getArtifactExtension,
  mapToArtifactLanguage,
  getShikiLanguage,
  getMonacoLanguage,
  canPreview,
  canDesign,
  matchesTypePatterns,
  getLanguageDisplayName,
} from './constants';

describe('Artifact Constants', () => {
  describe('ARTIFACT_EXTENSIONS', () => {
    it('should have extensions for all artifact types', () => {
      // code is a function that returns extension based on language
      expect(typeof ARTIFACT_EXTENSIONS.code).toBe('function');
      expect(ARTIFACT_EXTENSIONS.document).toBe('md');
      expect(ARTIFACT_EXTENSIONS.svg).toBe('svg');
      expect(ARTIFACT_EXTENSIONS.html).toBe('html');
      expect(ARTIFACT_EXTENSIONS.react).toBe('tsx');
      expect(ARTIFACT_EXTENSIONS.mermaid).toBe('mmd');
      expect(ARTIFACT_EXTENSIONS.chart).toBe('json');
      expect(ARTIFACT_EXTENSIONS.math).toBe('tex');
      expect(ARTIFACT_EXTENSIONS.jupyter).toBe('ipynb');
    });

    it('should return correct extension for code type with language', () => {
      const codeExt = ARTIFACT_EXTENSIONS.code as (lang?: string) => string;
      expect(codeExt('javascript')).toBe('js');
      expect(codeExt('typescript')).toBe('ts');
      expect(codeExt('python')).toBe('py');
      expect(codeExt()).toBe('txt');
    });
  });

  describe('ARTIFACT_COLORS', () => {
    it('should have colors for all artifact types', () => {
      expect(ARTIFACT_COLORS.code).toContain('blue');
      expect(ARTIFACT_COLORS.document).toContain('green');
      expect(ARTIFACT_COLORS.react).toContain('cyan');
      expect(ARTIFACT_COLORS.mermaid).toContain('pink');
    });
  });

  describe('ARTIFACT_TYPE_KEYS', () => {
    it('should have translation keys for all types', () => {
      expect(ARTIFACT_TYPE_KEYS.code).toBe('code');
      expect(ARTIFACT_TYPE_KEYS.html).toBe('html');
      expect(ARTIFACT_TYPE_KEYS.react).toBe('react');
    });
  });

  describe('PREVIEWABLE_TYPES', () => {
    it('should include types that support preview', () => {
      expect(PREVIEWABLE_TYPES).toContain('html');
      expect(PREVIEWABLE_TYPES).toContain('react');
      expect(PREVIEWABLE_TYPES).toContain('svg');
      expect(PREVIEWABLE_TYPES).toContain('mermaid');
      expect(PREVIEWABLE_TYPES).toContain('chart');
      expect(PREVIEWABLE_TYPES).toContain('math');
      expect(PREVIEWABLE_TYPES).toContain('document');
      expect(PREVIEWABLE_TYPES).toContain('jupyter');
    });

    it('should not include code type', () => {
      expect(PREVIEWABLE_TYPES).not.toContain('code');
    });
  });

  describe('DESIGNABLE_TYPES', () => {
    it('should include types that support designer', () => {
      expect(DESIGNABLE_TYPES).toContain('html');
      expect(DESIGNABLE_TYPES).toContain('react');
      expect(DESIGNABLE_TYPES).toContain('svg');
    });

    it('should not include non-designable types', () => {
      expect(DESIGNABLE_TYPES).not.toContain('code');
      expect(DESIGNABLE_TYPES).not.toContain('mermaid');
      expect(DESIGNABLE_TYPES).not.toContain('chart');
    });
  });

  describe('ALWAYS_CREATE_TYPES', () => {
    it('should include types that auto-create artifacts', () => {
      expect(ALWAYS_CREATE_TYPES).toContain('html');
      expect(ALWAYS_CREATE_TYPES).toContain('react');
      expect(ALWAYS_CREATE_TYPES).toContain('svg');
      expect(ALWAYS_CREATE_TYPES).toContain('mermaid');
      expect(ALWAYS_CREATE_TYPES).toContain('chart');
      expect(ALWAYS_CREATE_TYPES).toContain('jupyter');
    });
  });

  describe('DETECTION_PATTERNS', () => {
    it('should have patterns for html detection', () => {
      expect(DETECTION_PATTERNS.html.length).toBeGreaterThan(0);
    });

    it('should have patterns for react detection', () => {
      expect(DETECTION_PATTERNS.react.length).toBeGreaterThan(0);
    });

    it('should have patterns for mermaid detection', () => {
      expect(DETECTION_PATTERNS.mermaid.length).toBeGreaterThan(0);
    });
  });

  describe('MERMAID_TYPE_NAMES', () => {
    it('should have display names for mermaid types', () => {
      expect(MERMAID_TYPE_NAMES.graph).toBe('Flowchart');
      expect(MERMAID_TYPE_NAMES.flowchart).toBe('Flowchart');
      expect(MERMAID_TYPE_NAMES.sequenceDiagram).toBe('Sequence Diagram');
      expect(MERMAID_TYPE_NAMES.classDiagram).toBe('Class Diagram');
    });
  });

  describe('LANGUAGE_DISPLAY_NAMES', () => {
    it('should have display names for languages', () => {
      expect(LANGUAGE_DISPLAY_NAMES.javascript).toBe('JavaScript');
      expect(LANGUAGE_DISPLAY_NAMES.typescript).toBe('TypeScript');
      expect(LANGUAGE_DISPLAY_NAMES.python).toBe('Python');
      expect(LANGUAGE_DISPLAY_NAMES.jsx).toBe('React (JSX)');
      expect(LANGUAGE_DISPLAY_NAMES.tsx).toBe('React (TSX)');
    });
  });
});

describe('Utility Functions', () => {
  describe('getArtifactExtension', () => {
    it('should return correct extension for type', () => {
      expect(getArtifactExtension('html')).toBe('html');
      expect(getArtifactExtension('react')).toBe('tsx');
      expect(getArtifactExtension('svg')).toBe('svg');
      expect(getArtifactExtension('document')).toBe('md');
    });

    it('should use language for code type', () => {
      expect(getArtifactExtension('code', 'javascript')).toBe('js');
      expect(getArtifactExtension('code', 'python')).toBe('py');
      expect(getArtifactExtension('code', 'typescript')).toBe('ts');
      expect(getArtifactExtension('code')).toBe('txt');
    });

    it('should return txt for code with unknown language', () => {
      expect(getArtifactExtension('code', 'unknown-lang')).toBe('txt');
    });
  });

  describe('mapToArtifactLanguage', () => {
    it('should map language aliases', () => {
      expect(mapToArtifactLanguage('js')).toBe('javascript');
      expect(mapToArtifactLanguage('ts')).toBe('typescript');
      expect(mapToArtifactLanguage('py')).toBe('python');
      expect(mapToArtifactLanguage('sh')).toBe('bash');
      expect(mapToArtifactLanguage('yml')).toBe('yaml');
    });

    it('should preserve valid languages', () => {
      expect(mapToArtifactLanguage('javascript')).toBe('javascript');
      expect(mapToArtifactLanguage('typescript')).toBe('typescript');
      expect(mapToArtifactLanguage('python')).toBe('python');
    });

    it('should return undefined for empty input', () => {
      expect(mapToArtifactLanguage()).toBeUndefined();
      expect(mapToArtifactLanguage('')).toBeUndefined();
    });

    it('should be case insensitive', () => {
      expect(mapToArtifactLanguage('JavaScript')).toBe('javascript');
      expect(mapToArtifactLanguage('PYTHON')).toBe('python');
    });
  });

  describe('getShikiLanguage', () => {
    it('should return correct shiki language', () => {
      expect(getShikiLanguage('javascript')).toBe('javascript');
      expect(getShikiLanguage('typescript')).toBe('typescript');
      expect(getShikiLanguage('python')).toBe('python');
      expect(getShikiLanguage('jsx')).toBe('jsx');
      expect(getShikiLanguage('tsx')).toBe('tsx');
    });

    it('should handle svg as xml', () => {
      expect(getShikiLanguage('svg')).toBe('xml');
    });

    it('should handle mermaid as markdown', () => {
      expect(getShikiLanguage('mermaid')).toBe('markdown');
    });

    it('should default to text for unknown languages', () => {
      expect(getShikiLanguage()).toBe('text');
      expect(getShikiLanguage('unknown')).toBe('text');
    });
  });

  describe('getMonacoLanguage', () => {
    it('should return correct monaco language', () => {
      expect(getMonacoLanguage('javascript')).toBe('javascript');
      expect(getMonacoLanguage('typescript')).toBe('typescript');
      expect(getMonacoLanguage('python')).toBe('python');
    });

    it('should map jsx to javascript', () => {
      expect(getMonacoLanguage('jsx')).toBe('javascript');
    });

    it('should map tsx to typescript', () => {
      expect(getMonacoLanguage('tsx')).toBe('typescript');
    });

    it('should map bash to shell', () => {
      expect(getMonacoLanguage('bash')).toBe('shell');
    });

    it('should default to plaintext for unknown languages', () => {
      expect(getMonacoLanguage()).toBe('plaintext');
      expect(getMonacoLanguage('unknown')).toBe('plaintext');
    });
  });

  describe('canPreview', () => {
    it('should return true for previewable types', () => {
      expect(canPreview('html')).toBe(true);
      expect(canPreview('react')).toBe(true);
      expect(canPreview('svg')).toBe(true);
      expect(canPreview('mermaid')).toBe(true);
      expect(canPreview('chart')).toBe(true);
      expect(canPreview('math')).toBe(true);
      expect(canPreview('document')).toBe(true);
      expect(canPreview('jupyter')).toBe(true);
    });

    it('should return false for non-previewable types', () => {
      expect(canPreview('code')).toBe(false);
    });
  });

  describe('canDesign', () => {
    it('should return true for designable types', () => {
      expect(canDesign('html')).toBe(true);
      expect(canDesign('react')).toBe(true);
      expect(canDesign('svg')).toBe(true);
    });

    it('should return false for non-designable types', () => {
      expect(canDesign('code')).toBe(false);
      expect(canDesign('mermaid')).toBe(false);
      expect(canDesign('chart')).toBe(false);
      expect(canDesign('math')).toBe(false);
      expect(canDesign('document')).toBe(false);
    });
  });

  describe('matchesTypePatterns', () => {
    describe('html patterns', () => {
      it('should match DOCTYPE html', () => {
        expect(matchesTypePatterns('<!DOCTYPE html>', 'html')).toBe(true);
      });

      it('should match html tag', () => {
        expect(matchesTypePatterns('<html>', 'html')).toBe(true);
        expect(matchesTypePatterns('<html lang="en">', 'html')).toBe(true);
      });

      it('should match head tag', () => {
        expect(matchesTypePatterns('<head>', 'html')).toBe(true);
      });

      it('should match body tag', () => {
        expect(matchesTypePatterns('<body>', 'html')).toBe(true);
      });

      it('should not match simple div', () => {
        expect(matchesTypePatterns('<div>Hello</div>', 'html')).toBe(false);
      });
    });

    describe('react patterns', () => {
      it('should match React import', () => {
        expect(matchesTypePatterns("import React from 'react'", 'react')).toBe(true);
        expect(matchesTypePatterns("import { useState } from 'react'", 'react')).toBe(true);
      });

      it('should match export function with return', () => {
        expect(matchesTypePatterns('export function Component() { return (', 'react')).toBe(true);
        expect(matchesTypePatterns('export default function App() { return <', 'react')).toBe(true);
      });

      it('should match arrow function component', () => {
        expect(matchesTypePatterns('export const Component = () => (', 'react')).toBe(true);
        expect(matchesTypePatterns('export const Component = () => {', 'react')).toBe(true);
      });

      it('should match PascalCase JSX tags', () => {
        expect(matchesTypePatterns('<MyComponent />', 'react')).toBe(true);
        expect(matchesTypePatterns('<App>', 'react')).toBe(true);
      });

      it('should not match lowercase tags alone', () => {
        expect(matchesTypePatterns('<div>Hello</div>', 'react')).toBe(false);
      });
    });

    describe('svg patterns', () => {
      it('should match svg tag', () => {
        expect(matchesTypePatterns('<svg>', 'svg')).toBe(true);
        expect(matchesTypePatterns('<svg width="100">', 'svg')).toBe(true);
      });

      it('should match xmlns attribute', () => {
        expect(matchesTypePatterns('xmlns="http://www.w3.org/2000/svg"', 'svg')).toBe(true);
      });
    });

    describe('mermaid patterns', () => {
      it('should match graph/flowchart', () => {
        expect(matchesTypePatterns('graph TD\n  A --> B', 'mermaid')).toBe(true);
        expect(matchesTypePatterns('flowchart LR\n  A --> B', 'mermaid')).toBe(true);
      });

      it('should match sequenceDiagram', () => {
        expect(matchesTypePatterns('sequenceDiagram\n  A->>B: Hello', 'mermaid')).toBe(true);
      });

      it('should match classDiagram', () => {
        expect(matchesTypePatterns('classDiagram\n  class Animal', 'mermaid')).toBe(true);
      });
    });

    describe('chart patterns', () => {
      it('should match chart data array', () => {
        expect(matchesTypePatterns('[{"name": "A", "value": 10}]', 'chart')).toBe(true);
      });

      it('should match chart type object', () => {
        expect(matchesTypePatterns('{"type": "bar"}', 'chart')).toBe(true);
        expect(matchesTypePatterns('{"type": "line"}', 'chart')).toBe(true);
      });
    });

    describe('math patterns', () => {
      it('should match LaTeX blocks', () => {
        expect(matchesTypePatterns('$$x^2 + y^2 = z^2$$', 'math')).toBe(true);
      });

      it('should match LaTeX commands', () => {
        expect(matchesTypePatterns('\\frac{a}{b}', 'math')).toBe(true);
        expect(matchesTypePatterns('\\sum_{i=1}^n', 'math')).toBe(true);
        expect(matchesTypePatterns('\\int_0^1', 'math')).toBe(true);
      });

      it('should match LaTeX environments', () => {
        expect(matchesTypePatterns('\\begin{equation}', 'math')).toBe(true);
        expect(matchesTypePatterns('\\begin{align}', 'math')).toBe(true);
      });
    });

    describe('jupyter patterns', () => {
      it('should match cells array', () => {
        expect(matchesTypePatterns('"cells": [', 'jupyter')).toBe(true);
      });

      it('should match cell_type', () => {
        expect(matchesTypePatterns('"cell_type": "code"', 'jupyter')).toBe(true);
        expect(matchesTypePatterns('"cell_type": "markdown"', 'jupyter')).toBe(true);
      });

      it('should match nbformat', () => {
        expect(matchesTypePatterns('"nbformat": 4', 'jupyter')).toBe(true);
      });
    });
  });

  describe('getLanguageDisplayName', () => {
    it('should return display name for known languages', () => {
      expect(getLanguageDisplayName('javascript')).toBe('JavaScript');
      expect(getLanguageDisplayName('typescript')).toBe('TypeScript');
      expect(getLanguageDisplayName('python')).toBe('Python');
      expect(getLanguageDisplayName('jsx')).toBe('React (JSX)');
      expect(getLanguageDisplayName('tsx')).toBe('React (TSX)');
    });

    it('should capitalize unknown languages', () => {
      expect(getLanguageDisplayName('rust')).toBe('Rust');
      expect(getLanguageDisplayName('go')).toBe('Go');
    });

    it('should return Code for empty input', () => {
      expect(getLanguageDisplayName()).toBe('Code');
      expect(getLanguageDisplayName('')).toBe('Code');
    });

    it('should be case insensitive', () => {
      expect(getLanguageDisplayName('JAVASCRIPT')).toBe('JavaScript');
      expect(getLanguageDisplayName('Python')).toBe('Python');
    });
  });
});
