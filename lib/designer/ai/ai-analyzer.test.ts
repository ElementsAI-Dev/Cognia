/**
 * AI Analyzer Tests
 */

import {
  detectPatternsSimple,
  detectAccessibilityIssues,
  detectResponsiveIssues,
  analyzeCodeLocal,
} from './ai-analyzer';

describe('AI Analyzer', () => {
  describe('detectPatternsSimple', () => {
    it('should detect form patterns', () => {
      const code = `
        <form onSubmit={handleSubmit}>
          <input type="text" name="username" />
          <button type="submit">Submit</button>
        </form>
      `;
      
      const patterns = detectPatternsSimple(code);
      
      const formPattern = patterns.find(p => p.type === 'form');
      expect(formPattern).toBeDefined();
      expect(formPattern!.confidence).toBeGreaterThan(0.8);
      expect(formPattern!.details.hasForm).toBe(true);
      expect(formPattern!.details.hasInput).toBe(true);
      expect(formPattern!.details.hasSubmit).toBe(true);
    });

    it('should detect list patterns with map', () => {
      const code = `
        <ul>
          {items.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      `;
      
      const patterns = detectPatternsSimple(code);
      
      const listPattern = patterns.find(p => p.type === 'list');
      expect(listPattern).toBeDefined();
      expect(listPattern!.details.hasMap).toBe(true);
      expect(listPattern!.details.usesKey).toBe(true);
    });

    it('should detect list patterns without key', () => {
      const code = `
        <div>
          {items.map((item) => (
            <div>{item.name}</div>
          ))}
        </div>
      `;
      
      const patterns = detectPatternsSimple(code);
      
      const listPattern = patterns.find(p => p.type === 'list');
      expect(listPattern).toBeDefined();
      expect(listPattern!.details.usesKey).toBe(false);
    });

    it('should detect layout patterns with flex', () => {
      const code = `
        <div className="flex items-center justify-between">
          <span>Left</span>
          <span>Right</span>
        </div>
      `;
      
      const patterns = detectPatternsSimple(code);
      
      const layoutPattern = patterns.find(p => p.type === 'layout');
      expect(layoutPattern).toBeDefined();
      expect(layoutPattern!.details.usesFlex).toBe(true);
    });

    it('should detect layout patterns with grid', () => {
      const code = `
        <div className="grid grid-cols-3 gap-4">
          <div>Cell 1</div>
          <div>Cell 2</div>
          <div>Cell 3</div>
        </div>
      `;
      
      const patterns = detectPatternsSimple(code);
      
      const layoutPattern = patterns.find(p => p.type === 'layout');
      expect(layoutPattern).toBeDefined();
      expect(layoutPattern!.details.usesGrid).toBe(true);
    });

    it('should detect hook usage patterns', () => {
      const code = `
        const [count, setCount] = useState(0);
        
        useEffect(() => {
          document.title = \`Count: \${count}\`;
        }, [count]);
      `;
      
      const patterns = detectPatternsSimple(code);
      
      const hookPattern = patterns.find(p => p.type === 'hook');
      expect(hookPattern).toBeDefined();
      expect(hookPattern!.confidence).toBeGreaterThan(0.9);
      expect(hookPattern!.details.useState).toBe(true);
      expect(hookPattern!.details.useEffect).toBe(true);
    });

    it('should detect multiple patterns', () => {
      const code = `
        const [items, setItems] = useState([]);
        
        useEffect(() => {
          fetchItems();
        }, []);
        
        return (
          <div className="flex flex-col">
            <form onSubmit={handleAdd}>
              <input type="text" />
              <button type="submit">Add</button>
            </form>
            <ul>
              {items.map((item) => (
                <li key={item.id}>{item.name}</li>
              ))}
            </ul>
          </div>
        );
      `;
      
      const patterns = detectPatternsSimple(code);
      
      expect(patterns.some(p => p.type === 'form')).toBe(true);
      expect(patterns.some(p => p.type === 'list')).toBe(true);
      expect(patterns.some(p => p.type === 'layout')).toBe(true);
      expect(patterns.some(p => p.type === 'hook')).toBe(true);
    });

    it('should return empty array for code without patterns', () => {
      const code = `const x = 5;`;
      
      const patterns = detectPatternsSimple(code);
      
      expect(patterns).toEqual([]);
    });
  });

  describe('detectAccessibilityIssues', () => {
    it('should detect missing alt attribute on images', () => {
      const code = `<img src="photo.jpg" />`;
      
      const issues = detectAccessibilityIssues(code);
      
      const altIssue = issues.find(i => i.type === 'missing-alt');
      expect(altIssue).toBeDefined();
      expect(altIssue!.severity).toBe('error');
      expect(altIssue!.element).toBe('img');
    });

    it('should not flag images with alt attribute', () => {
      const code = `<img src="photo.jpg" alt="A beautiful sunset" />`;
      
      const issues = detectAccessibilityIssues(code);
      
      const altIssue = issues.find(i => i.type === 'missing-alt');
      expect(altIssue).toBeUndefined();
    });

    it('should detect buttons without accessible text', () => {
      const code = `
        <button>
          <Icon name="close" />
        </button>
      `;
      
      const issues = detectAccessibilityIssues(code);
      
      const labelIssue = issues.find(i => i.type === 'missing-label' && i.element === 'button');
      expect(labelIssue).toBeDefined();
      expect(labelIssue!.severity).toBe('warning');
    });

    it('should not flag buttons with aria-label', () => {
      const code = `
        <button aria-label="Close dialog">
          <Icon name="close" />
        </button>
      `;
      
      const issues = detectAccessibilityIssues(code);
      
      const labelIssue = issues.find(i => i.type === 'missing-label' && i.element === 'button');
      expect(labelIssue).toBeUndefined();
    });

    it('should detect form inputs without labels', () => {
      const code = `<input type="text" placeholder="Enter name" />`;
      
      const issues = detectAccessibilityIssues(code);
      
      const labelIssue = issues.find(i => i.type === 'missing-label' && i.element === 'input');
      expect(labelIssue).toBeDefined();
      expect(labelIssue!.severity).toBe('error');
    });

    it('should not flag inputs with associated label', () => {
      const code = `
        <label htmlFor="name">Name</label>
        <input id="name" type="text" />
      `;
      
      const issues = detectAccessibilityIssues(code);
      
      const labelIssue = issues.find(i => i.type === 'missing-label' && i.element === 'input');
      expect(labelIssue).toBeUndefined();
    });

    it('should detect clickable divs without role', () => {
      const code = `<div onClick={handleClick}>Click me</div>`;
      
      const issues = detectAccessibilityIssues(code);
      
      const roleIssue = issues.find(i => i.type === 'missing-role');
      expect(roleIssue).toBeDefined();
      expect(roleIssue!.severity).toBe('warning');
      expect(roleIssue!.suggestion).toContain('role="button"');
    });

    it('should not flag clickable divs with role', () => {
      const code = `<div role="button" tabIndex="0" onClick={handleClick}>Click me</div>`;
      
      const issues = detectAccessibilityIssues(code);
      
      const roleIssue = issues.find(i => i.type === 'missing-role');
      expect(roleIssue).toBeUndefined();
    });
  });

  describe('detectResponsiveIssues', () => {
    it('should detect fixed pixel widths', () => {
      const code = `<div className="w-[500px]">Content</div>`;
      
      const issues = detectResponsiveIssues(code);
      
      const fixedWidthIssue = issues.find(i => i.type === 'fixed-width');
      expect(fixedWidthIssue).toBeDefined();
      expect(fixedWidthIssue!.message).toContain('w-[500px]');
    });

    it('should not flag relative widths', () => {
      const code = `<div className="w-full max-w-md">Content</div>`;
      
      const issues = detectResponsiveIssues(code);
      
      const fixedWidthIssue = issues.find(i => i.type === 'fixed-width');
      expect(fixedWidthIssue).toBeUndefined();
    });

    it('should detect missing responsive breakpoints', () => {
      const code = `<div className="flex gap-4 p-4">Content</div>`;
      
      const issues = detectResponsiveIssues(code);
      
      const breakpointIssue = issues.find(i => i.type === 'missing-breakpoint');
      expect(breakpointIssue).toBeDefined();
      expect(breakpointIssue!.suggestion).toContain('sm:');
    });

    it('should not flag code with responsive breakpoints', () => {
      const code = `<div className="flex flex-col md:flex-row gap-4">Content</div>`;
      
      const issues = detectResponsiveIssues(code);
      
      const breakpointIssue = issues.find(i => i.type === 'missing-breakpoint');
      expect(breakpointIssue).toBeUndefined();
    });

    it('should detect small touch targets', () => {
      const code = `<button className="w-4 h-4 p-1">X</button>`;
      
      const issues = detectResponsiveIssues(code);
      
      const touchIssue = issues.find(i => i.type === 'touch-target');
      expect(touchIssue).toBeDefined();
      expect(touchIssue!.suggestion).toContain('44x44px');
    });

    it('should recognize sm: breakpoint', () => {
      const code = `<div className="sm:flex">Content</div>`;
      
      const issues = detectResponsiveIssues(code);
      
      const breakpointIssue = issues.find(i => i.type === 'missing-breakpoint');
      expect(breakpointIssue).toBeUndefined();
    });

    it('should recognize lg: breakpoint', () => {
      const code = `<div className="lg:grid-cols-4">Content</div>`;
      
      const issues = detectResponsiveIssues(code);
      
      const breakpointIssue = issues.find(i => i.type === 'missing-breakpoint');
      expect(breakpointIssue).toBeUndefined();
    });
  });

  describe('analyzeCodeLocal', () => {
    it('should return complete analysis result', () => {
      const code = `
        <form>
          <img src="photo.jpg" />
          <input type="text" />
          <div onClick={handleClick}>Submit</div>
        </form>
      `;
      
      const result = analyzeCodeLocal(code);
      
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('accessibility');
      expect(result).toHaveProperty('responsive');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('summary');
    });

    it('should convert accessibility issues to suggestions', () => {
      const code = `<img src="photo.jpg" />`;
      
      const result = analyzeCodeLocal(code);
      
      const a11ySuggestion = result.suggestions.find(s => s.type === 'accessibility');
      expect(a11ySuggestion).toBeDefined();
      expect(a11ySuggestion!.priority).toBe('high');
    });

    it('should convert responsive issues to suggestions', () => {
      const code = `<div className="w-[500px]">Content</div>`;
      
      const result = analyzeCodeLocal(code);
      
      const responsiveSuggestion = result.suggestions.find(s => s.type === 'responsive');
      expect(responsiveSuggestion).toBeDefined();
      expect(responsiveSuggestion!.priority).toBe('medium');
    });

    it('should generate summary with counts', () => {
      const code = `
        <div className="flex">
          <img src="photo.jpg" />
        </div>
      `;
      
      const result = analyzeCodeLocal(code);
      
      expect(result.summary).toContain('pattern');
      expect(result.summary).toContain('accessibility');
      expect(result.summary).toContain('responsive');
    });

    it('should assign unique IDs to suggestions', () => {
      const code = `
        <img src="a.jpg" />
        <img src="b.jpg" />
        <div className="w-[100px]">A</div>
        <div className="w-[200px]">B</div>
      `;
      
      const result = analyzeCodeLocal(code);
      
      const ids = result.suggestions.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
