/**
 * Tests for Artifact Detector
 */

import {
  detectArtifactType,
  extractCodeBlocks,
  generateTitle,
  shouldAutoCreate,
  detectArtifacts,
  getBestArtifact,
  isCompleteArtifact,
  DEFAULT_DETECTION_CONFIG,
  type ArtifactDetectionConfig,
  type DetectedArtifact,
} from './artifact-detector';

describe('detectArtifactType', () => {
  it('should detect Jupyter notebook', () => {
    const content = `{
      "cells": [],
      "nbformat": 4
    }`;
    const result = detectArtifactType(content);
    expect(result.type).toBe('jupyter');
    expect(result.confidence).toBe(0.95);
  });

  it('should detect mermaid diagrams', () => {
    const content = 'graph TD\n  A --> B';
    const result = detectArtifactType(content);
    expect(result.type).toBe('mermaid');
    expect(result.confidence).toBe(0.9);
  });

  it('should detect mermaid by language hint', () => {
    const content = 'A --> B';
    const result = detectArtifactType(content, 'mermaid');
    expect(result.type).toBe('mermaid');
  });

  it('should detect math/LaTeX', () => {
    const content = '$$\\frac{1}{2}$$';
    const result = detectArtifactType(content);
    expect(result.type).toBe('math');
  });

  it('should detect LaTeX by language hint', () => {
    const content = 'E = mc^2';
    const result = detectArtifactType(content, 'latex');
    expect(result.type).toBe('math');
  });

  it('should detect SVG', () => {
    const content = '<svg xmlns="http://www.w3.org/2000/svg"><circle /></svg>';
    const result = detectArtifactType(content);
    expect(result.type).toBe('svg');
  });

  it('should detect React/JSX', () => {
    const content = `
      import React from 'react';
      export default function App() {
        return <div>Hello</div>;
      }
    `;
    const result = detectArtifactType(content);
    expect(result.type).toBe('react');
  });

  it('should detect JSX by language hint', () => {
    const content = 'const App = () => <div />';
    const result = detectArtifactType(content, 'jsx');
    expect(result.type).toBe('react');
  });

  it('should detect HTML', () => {
    const content = '<!DOCTYPE html><html><body></body></html>';
    const result = detectArtifactType(content);
    expect(result.type).toBe('html');
  });

  it('should detect chart data', () => {
    const content = '[{"name": "A", "value": 10}]';
    const result = detectArtifactType(content);
    expect(result.type).toBe('chart');
  });

  it('should detect document by language hint', () => {
    const content = '# Title\n\nSome content';
    const result = detectArtifactType(content, 'markdown');
    expect(result.type).toBe('document');
  });

  it('should default to code for unknown languages', () => {
    const content = 'console.log("hello")';
    const result = detectArtifactType(content, 'javascript');
    expect(result.type).toBe('code');
    expect(result.confidence).toBe(0.7);
  });
});

describe('extractCodeBlocks', () => {
  it('should extract code blocks with language', () => {
    const content = '```javascript\nconsole.log("hello");\n```';
    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].language).toBe('javascript');
    expect(blocks[0].code).toBe('console.log("hello");');
  });

  it('should extract multiple code blocks', () => {
    const content = `
\`\`\`python
print("hello")
\`\`\`

Some text

\`\`\`typescript
const x = 1;
\`\`\`
`;
    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].language).toBe('python');
    expect(blocks[1].language).toBe('typescript');
  });

  it('should extract code blocks without language', () => {
    const content = '```\ncode here\n```';
    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].language).toBe('');
    expect(blocks[0].code).toBe('code here');
  });

  it('should track start and end indices', () => {
    const content = 'prefix\n```js\ncode\n```\nsuffix';
    const blocks = extractCodeBlocks(content);

    expect(blocks[0].startIndex).toBe(7);
    expect(blocks[0].endIndex).toBe(21);
  });

  it('should return empty array for content without code blocks', () => {
    const content = 'Just plain text without code blocks';
    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(0);
  });
});

describe('generateTitle', () => {
  it('should extract function name', () => {
    const content = 'function calculateSum(a, b) { return a + b; }';
    const title = generateTitle(content, 'code');
    expect(title).toBe('calculateSum');
  });

  it('should extract const name', () => {
    const content = 'const MyComponent = () => <div />';
    const title = generateTitle(content, 'react');
    expect(title).toBe('MyComponent');
  });

  it('should extract class name', () => {
    const content = 'class UserService { }';
    const title = generateTitle(content, 'code');
    expect(title).toBe('UserService');
  });

  it('should extract export name', () => {
    const content = 'export default function App() { }';
    const title = generateTitle(content, 'react');
    expect(title).toBe('App');
  });

  it('should extract HTML title', () => {
    const content = '<html><head><title>My Page</title></head></html>';
    const title = generateTitle(content, 'html');
    expect(title).toBe('My Page');
  });

  it('should return type-based default title', () => {
    const content = 'some content without identifiable name';
    expect(generateTitle(content, 'svg')).toBe('SVG Graphic');
    expect(generateTitle(content, 'mermaid')).toBe('Diagram');
    expect(generateTitle(content, 'chart')).toBe('Chart');
    expect(generateTitle(content, 'math')).toBe('Math Expression');
    expect(generateTitle(content, 'document')).toBe('Document');
  });

  it('should include language in code title', () => {
    const content = 'x = 1';
    const title = generateTitle(content, 'code', 'python');
    expect(title).toBe('Python Code');
  });
});

describe('shouldAutoCreate', () => {
  it('should return false if autoCreate is disabled', () => {
    const config: ArtifactDetectionConfig = {
      ...DEFAULT_DETECTION_CONFIG,
      autoCreate: false,
    };
    const content = 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10\nline11';
    expect(shouldAutoCreate(content, 'code', config)).toBe(false);
  });

  it('should return false if type is not enabled', () => {
    const config: ArtifactDetectionConfig = {
      ...DEFAULT_DETECTION_CONFIG,
      enabledTypes: ['code'],
    };
    const content = '<svg><circle /></svg>';
    expect(shouldAutoCreate(content, 'svg', config)).toBe(false);
  });

  it('should auto-create for always-create types with 3+ lines', () => {
    const content = '<svg>\n<circle />\n</svg>';
    expect(shouldAutoCreate(content, 'svg')).toBe(true);
  });

  it('should not auto-create for always-create types with less than 3 lines', () => {
    const content = '<svg></svg>';
    expect(shouldAutoCreate(content, 'svg')).toBe(false);
  });

  it('should use minLines threshold for code', () => {
    const shortContent = 'line1\nline2\nline3';
    const longContent = Array.from({ length: 11 }, (_, i) => `line${i + 1}`).join('\n');

    expect(shouldAutoCreate(shortContent, 'code')).toBe(false);
    expect(shouldAutoCreate(longContent, 'code')).toBe(true);
  });
});

describe('detectArtifacts', () => {
  it('should detect artifacts from code blocks', () => {
    const content = `
Here is some code:

\`\`\`html
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>Hello</body>
</html>
\`\`\`
`;
    const result = detectArtifacts(content);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('html');
  });

  it('should detect standalone math expressions', () => {
    const content = `
Here is an equation:

$$
\\frac{1}{2}
+
\\frac{1}{3}
$$
`;
    const result = detectArtifacts(content);

    expect(result.some(a => a.type === 'math')).toBe(true);
  });

  it('should respect detection config', () => {
    const content = '```mermaid\ngraph TD\nA --> B\n```';
    const config: ArtifactDetectionConfig = {
      ...DEFAULT_DETECTION_CONFIG,
      enabledTypes: ['code'], // mermaid not included
    };

    const result = detectArtifacts(content, config);
    expect(result).toHaveLength(0);
  });

  it('should return empty array for content without artifacts', () => {
    const content = 'Just plain text without any code blocks';
    const result = detectArtifacts(content);
    expect(result).toHaveLength(0);
  });
});

describe('getBestArtifact', () => {
  it('should return null for empty array', () => {
    expect(getBestArtifact([])).toBeNull();
  });

  it('should return the only artifact if array has one element', () => {
    const artifact: DetectedArtifact = {
      type: 'code',
      content: 'test',
      title: 'Test',
      startIndex: 0,
      endIndex: 10,
      lineCount: 5,
      confidence: 0.8,
    };

    expect(getBestArtifact([artifact])).toBe(artifact);
  });

  it('should prioritize higher confidence', () => {
    const lowConfidence: DetectedArtifact = {
      type: 'code',
      content: 'test',
      title: 'Test',
      startIndex: 0,
      endIndex: 10,
      lineCount: 20,
      confidence: 0.5,
    };

    const highConfidence: DetectedArtifact = {
      type: 'react',
      content: 'test',
      title: 'Test',
      startIndex: 0,
      endIndex: 10,
      lineCount: 5,
      confidence: 0.9,
    };

    expect(getBestArtifact([lowConfidence, highConfidence])).toBe(highConfidence);
  });

  it('should use line count as tiebreaker', () => {
    const shorter: DetectedArtifact = {
      type: 'code',
      content: 'short',
      title: 'Short',
      startIndex: 0,
      endIndex: 10,
      lineCount: 5,
      confidence: 0.8,
    };

    const longer: DetectedArtifact = {
      type: 'code',
      content: 'longer',
      title: 'Longer',
      startIndex: 0,
      endIndex: 20,
      lineCount: 15,
      confidence: 0.8,
    };

    expect(getBestArtifact([shorter, longer])).toBe(longer);
  });
});

describe('isCompleteArtifact', () => {
  it('should validate complete HTML', () => {
    const completeHtml = '<!DOCTYPE html><html></html>';
    const incompleteHtml = '<div>content</div>';

    expect(isCompleteArtifact(completeHtml, 'html')).toBe(true);
    expect(isCompleteArtifact(incompleteHtml, 'html')).toBe(false);
  });

  it('should validate complete React component', () => {
    const exportedComponent = 'export default function App() { }';
    const localComponent = 'function App() { }';

    expect(isCompleteArtifact(exportedComponent, 'react')).toBe(true);
    expect(isCompleteArtifact(localComponent, 'react')).toBe(false);
  });

  it('should validate complete SVG', () => {
    const completeSvg = '<svg><circle /></svg>';
    const incompleteSvg = '<svg><circle />';

    expect(isCompleteArtifact(completeSvg, 'svg')).toBe(true);
    expect(isCompleteArtifact(incompleteSvg, 'svg')).toBe(false);
  });

  it('should validate mermaid diagrams', () => {
    const validMermaid = 'graph TD\nA --> B';
    const invalidMermaid = 'A --> B';

    expect(isCompleteArtifact(validMermaid, 'mermaid')).toBe(true);
    expect(isCompleteArtifact(invalidMermaid, 'mermaid')).toBe(false);
  });

  it('should validate Jupyter notebooks', () => {
    const validNotebook = '{"cells": [], "nbformat": 4}';
    const invalidNotebook = '{"cells": []}';

    expect(isCompleteArtifact(validNotebook, 'jupyter')).toBe(true);
    expect(isCompleteArtifact(invalidNotebook, 'jupyter')).toBe(false);
  });

  it('should return true for unknown types', () => {
    expect(isCompleteArtifact('anything', 'code')).toBe(true);
    expect(isCompleteArtifact('anything', 'document')).toBe(true);
  });
});

describe('DEFAULT_DETECTION_CONFIG', () => {
  it('should have default values', () => {
    expect(DEFAULT_DETECTION_CONFIG.minLines).toBe(10);
    expect(DEFAULT_DETECTION_CONFIG.autoCreate).toBe(true);
    expect(DEFAULT_DETECTION_CONFIG.enabledTypes).toContain('code');
    expect(DEFAULT_DETECTION_CONFIG.enabledTypes).toContain('react');
    expect(DEFAULT_DETECTION_CONFIG.enabledTypes).toContain('html');
  });
});
