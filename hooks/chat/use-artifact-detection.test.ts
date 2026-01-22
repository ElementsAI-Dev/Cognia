/**
 * Tests for useArtifactDetection hook
 */

import { renderHook } from '@testing-library/react';
import {
  useArtifactDetection,
  detectArtifactType,
  mapToArtifactLanguage,
} from './use-artifact-detection';

describe('useArtifactDetection', () => {
  describe('basic detection', () => {
    it('should return empty array for empty content', () => {
      const { result } = renderHook(() => useArtifactDetection(''));
      expect(result.current).toEqual([]);
    });

    it('should return empty array when disabled', () => {
      const content = '```javascript\nconst x = 1;\nconsole.log(x);\n```';
      const { result } = renderHook(() => useArtifactDetection(content, { enabled: false }));
      expect(result.current).toEqual([]);
    });

    it('should detect JavaScript code block', () => {
      const content =
        '```javascript\nfunction hello() {\n  console.log("Hello World");\n  return true;\n}\n```';
      const { result } = renderHook(() => useArtifactDetection(content, { minCodeLength: 10 }));
      expect(result.current.length).toBe(1);
      expect(result.current[0].type).toBe('code');
      expect(result.current[0].language).toBe('javascript');
    });

    it('should detect TypeScript code block', () => {
      const content =
        '```typescript\ninterface User {\n  name: string;\n  age: number;\n}\nconst user: User = { name: "John", age: 30 };\n```';
      const { result } = renderHook(() => useArtifactDetection(content, { minCodeLength: 10 }));
      expect(result.current.length).toBe(1);
      expect(result.current[0].type).toBe('code');
      expect(result.current[0].language).toBe('typescript');
    });

    it('should detect Python code block', () => {
      const content = '```python\ndef hello():\n    print("Hello World")\n    return True\n```';
      const { result } = renderHook(() => useArtifactDetection(content, { minCodeLength: 10 }));
      expect(result.current.length).toBe(1);
      expect(result.current[0].type).toBe('code');
      expect(result.current[0].language).toBe('python');
    });
  });

  describe('React component detection', () => {
    it('should detect JSX code block', () => {
      const content =
        '```jsx\nexport default function Button() {\n  return (\n    <button className="btn">Click me</button>\n  );\n}\n```';
      const { result } = renderHook(() => useArtifactDetection(content, { minCodeLength: 10 }));
      expect(result.current.length).toBe(1);
      expect(result.current[0].type).toBe('react');
      expect(result.current[0].language).toBe('jsx');
    });

    it('should detect TSX code block', () => {
      const content =
        '```tsx\nexport default function Button(): JSX.Element {\n  return (\n    <button className="btn">Click me</button>\n  );\n}\n```';
      const { result } = renderHook(() => useArtifactDetection(content, { minCodeLength: 10 }));
      expect(result.current.length).toBe(1);
      expect(result.current[0].type).toBe('react');
      expect(result.current[0].language).toBe('tsx');
    });

    it('should detect React component in JavaScript block', () => {
      const content =
        '```javascript\nexport default function MyComponent() {\n  return (\n    <div className="container">\n      <h1>Hello</h1>\n    </div>\n  );\n}\n```';
      const { result } = renderHook(() => useArtifactDetection(content, { minCodeLength: 10 }));
      expect(result.current.length).toBe(1);
      // May be detected as 'code' or 'react' depending on detection logic
      expect(['code', 'react']).toContain(result.current[0].type);
    });
  });

  describe('special type detection', () => {
    it('should detect Mermaid diagram', () => {
      const content = '```mermaid\ngraph TD\n    A[Start] --> B[Process]\n    B --> C[End]\n```';
      const { result } = renderHook(() => useArtifactDetection(content, { minCodeLength: 10 }));
      expect(result.current.length).toBe(1);
      expect(result.current[0].type).toBe('mermaid');
      expect(result.current[0].language).toBe('mermaid');
    });

    it('should detect HTML code block', () => {
      const content =
        '```html\n<!DOCTYPE html>\n<html>\n<head><title>Test</title></head>\n<body><h1>Hello</h1></body>\n</html>\n```';
      const { result } = renderHook(() => useArtifactDetection(content, { minCodeLength: 10 }));
      expect(result.current.length).toBe(1);
      expect(result.current[0].type).toBe('html');
      expect(result.current[0].language).toBe('html');
    });

    it('should detect SVG code block', () => {
      const content =
        '```svg\n<svg width="100" height="100">\n  <circle cx="50" cy="50" r="40" fill="red"/>\n</svg>\n```';
      const { result } = renderHook(() => useArtifactDetection(content, { minCodeLength: 10 }));
      expect(result.current.length).toBe(1);
      expect(result.current[0].type).toBe('svg');
      expect(result.current[0].language).toBe('svg');
    });

    it('should detect LaTeX math', () => {
      const content = '```latex\n\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n```';
      const { result } = renderHook(() => useArtifactDetection(content, { minCodeLength: 10 }));
      expect(result.current.length).toBe(1);
      expect(result.current[0].type).toBe('math');
      expect(result.current[0].language).toBe('latex');
    });
  });

  describe('multiple artifacts', () => {
    it('should detect multiple code blocks', () => {
      const content = `
Here is some JavaScript:
\`\`\`javascript
function hello() {
  console.log("Hello");
  return true;
}
\`\`\`

And here is some Python:
\`\`\`python
def hello():
    print("Hello")
    return True
\`\`\`
`;
      const { result } = renderHook(() => useArtifactDetection(content, { minCodeLength: 10 }));
      expect(result.current.length).toBe(2);
      expect(result.current[0].language).toBe('javascript');
      expect(result.current[1].language).toBe('python');
    });
  });

  describe('minCodeLength option', () => {
    it('should skip short code blocks', () => {
      const content = '```javascript\nconst x = 1;\n```';
      const { result } = renderHook(() => useArtifactDetection(content, { minCodeLength: 50 }));
      expect(result.current.length).toBe(0);
    });

    it('should include code blocks meeting minimum length', () => {
      const content = '```javascript\nconst x = 1;\n```';
      const { result } = renderHook(() => useArtifactDetection(content, { minCodeLength: 5 }));
      expect(result.current.length).toBe(1);
    });
  });

  describe('title generation', () => {
    it('should generate title from function name', () => {
      const content = '```javascript\nfunction calculateSum(a, b) {\n  return a + b;\n}\n```';
      const { result } = renderHook(() => useArtifactDetection(content, { minCodeLength: 10 }));
      expect(result.current[0].title).toBe('calculateSum');
    });

    it('should generate title for Mermaid flowchart', () => {
      const content = '```mermaid\nflowchart TD\n    A --> B\n```';
      const { result } = renderHook(() => useArtifactDetection(content, { minCodeLength: 10 }));
      expect(result.current[0].title).toBe('Flowchart');
    });

    it('should generate title for Mermaid sequence diagram', () => {
      const content = '```mermaid\nsequenceDiagram\n    A->>B: Hello\n```';
      const { result } = renderHook(() => useArtifactDetection(content, { minCodeLength: 10 }));
      expect(result.current[0].title).toBe('Sequence Diagram');
    });
  });
});

describe('detectArtifactType', () => {
  it('should return code for unknown language', () => {
    expect(detectArtifactType('unknown')).toBe('code');
  });

  it('should return code for undefined language', () => {
    expect(detectArtifactType()).toBe('code');
  });

  it('should return react for jsx', () => {
    expect(detectArtifactType('jsx')).toBe('react');
  });

  it('should return react for tsx', () => {
    expect(detectArtifactType('tsx')).toBe('react');
  });

  it('should return mermaid for mermaid', () => {
    expect(detectArtifactType('mermaid')).toBe('mermaid');
  });

  it('should return html for html', () => {
    expect(detectArtifactType('html')).toBe('html');
  });

  it('should return chart for JSON with chart data', () => {
    const chartData = JSON.stringify([
      { name: 'A', value: 10 },
      { name: 'B', value: 20 },
    ]);
    expect(detectArtifactType('json', chartData)).toBe('chart');
  });
});

describe('mapToArtifactLanguage', () => {
  it('should return undefined for unknown language', () => {
    expect(mapToArtifactLanguage('unknown')).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    expect(mapToArtifactLanguage()).toBeUndefined();
  });

  it('should map javascript to javascript', () => {
    expect(mapToArtifactLanguage('javascript')).toBe('javascript');
  });

  it('should map js to javascript', () => {
    expect(mapToArtifactLanguage('js')).toBe('javascript');
  });

  it('should map typescript to typescript', () => {
    expect(mapToArtifactLanguage('typescript')).toBe('typescript');
  });

  it('should map ts to typescript', () => {
    expect(mapToArtifactLanguage('ts')).toBe('typescript');
  });

  it('should map py to python', () => {
    expect(mapToArtifactLanguage('py')).toBe('python');
  });
});
