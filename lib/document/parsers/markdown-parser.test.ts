/**
 * Tests for Markdown Parser
 */

import {
  parseMarkdown,
  markdownToPlainText,
  extractEmbeddableContent,
} from './markdown-parser';

describe('parseMarkdown', () => {
  describe('frontmatter parsing', () => {
    it('parses frontmatter', () => {
      const content = `---
title: Test Title
date: 2024-01-01
---
# Content`;
      const result = parseMarkdown(content);
      
      expect(result.frontmatter).toBeDefined();
      expect(result.frontmatter?.title).toBe('Test Title');
    });

    it('handles boolean values in frontmatter', () => {
      const content = `---
published: true
draft: false
---
Content`;
      const result = parseMarkdown(content);
      
      expect(result.frontmatter?.published).toBe(true);
      expect(result.frontmatter?.draft).toBe(false);
    });

    it('handles numeric values in frontmatter', () => {
      const content = `---
count: 42
---
Content`;
      const result = parseMarkdown(content);
      
      expect(result.frontmatter?.count).toBe(42);
    });

    it('handles content without frontmatter', () => {
      const content = '# Title\n\nContent';
      const result = parseMarkdown(content);
      
      expect(result.frontmatter).toBeUndefined();
    });

    it('handles JSON arrays in frontmatter', () => {
      const content = `---
tags: ["tag1", "tag2"]
---
Content`;
      const result = parseMarkdown(content);
      
      expect(result.frontmatter?.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('title extraction', () => {
    it('extracts title from first h1', () => {
      const content = '# My Title\n\nContent';
      const result = parseMarkdown(content);
      
      expect(result.title).toBe('My Title');
    });

    it('prefers frontmatter title over h1', () => {
      const content = `---
title: Frontmatter Title
---
# H1 Title`;
      const result = parseMarkdown(content);
      
      expect(result.title).toBe('Frontmatter Title');
    });

    it('returns undefined when no title', () => {
      const content = 'Just some content';
      const result = parseMarkdown(content);
      
      expect(result.title).toBeUndefined();
    });
  });

  describe('section extraction', () => {
    it('extracts sections from headings', () => {
      const content = `# Title
      
## Section 1
Content 1

## Section 2
Content 2`;
      const result = parseMarkdown(content);
      
      expect(result.sections.length).toBeGreaterThanOrEqual(2);
    });

    it('captures section levels', () => {
      const content = `# H1
## H2
### H3`;
      const result = parseMarkdown(content);
      
      const levels = result.sections.map(s => s.level);
      expect(levels).toContain(1);
      expect(levels).toContain(2);
      expect(levels).toContain(3);
    });

    it('captures section content', () => {
      const content = `# Title

Some content here.`;
      const result = parseMarkdown(content);
      
      const titleSection = result.sections.find(s => s.title === 'Title');
      expect(titleSection?.content).toContain('Some content here');
    });

    it('handles content without sections', () => {
      const content = 'Just plain text without headings';
      const result = parseMarkdown(content);
      
      expect(result.sections).toHaveLength(0);
    });
  });

  describe('link extraction', () => {
    it('extracts links', () => {
      const content = 'Check out [Google](https://google.com) and [GitHub](https://github.com)';
      const result = parseMarkdown(content);
      
      expect(result.links).toHaveLength(2);
      expect(result.links[0]).toEqual({ text: 'Google', url: 'https://google.com' });
      expect(result.links[1]).toEqual({ text: 'GitHub', url: 'https://github.com' });
    });

    it('handles content without links', () => {
      const content = 'No links here';
      const result = parseMarkdown(content);
      
      expect(result.links).toHaveLength(0);
    });

    it('handles relative links', () => {
      const content = 'See [docs](./docs/readme.md)';
      const result = parseMarkdown(content);
      
      expect(result.links[0].url).toBe('./docs/readme.md');
    });
  });

  describe('code block extraction', () => {
    it('extracts code blocks with language', () => {
      const content = '```javascript\nconst x = 1;\n```';
      const result = parseMarkdown(content);
      
      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0].language).toBe('javascript');
      expect(result.codeBlocks[0].code).toBe('const x = 1;');
    });

    it('handles code blocks without language', () => {
      const content = '```\ncode here\n```';
      const result = parseMarkdown(content);
      
      expect(result.codeBlocks[0].language).toBe('text');
    });

    it('extracts multiple code blocks', () => {
      const content = '```js\ncode1\n```\n\n```py\ncode2\n```';
      const result = parseMarkdown(content);
      
      expect(result.codeBlocks).toHaveLength(2);
    });
  });

  describe('image extraction', () => {
    it('extracts images', () => {
      const content = '![Alt text](https://example.com/image.png)';
      const result = parseMarkdown(content);
      
      expect(result.images).toHaveLength(1);
      expect(result.images[0]).toEqual({ 
        alt: 'Alt text', 
        url: 'https://example.com/image.png' 
      });
    });

    it('handles images without alt text', () => {
      const content = '![](image.png)';
      const result = parseMarkdown(content);
      
      expect(result.images[0].alt).toBe('');
    });

    it('handles multiple images', () => {
      const content = '![img1](1.png) and ![img2](2.png)';
      const result = parseMarkdown(content);
      
      expect(result.images).toHaveLength(2);
    });
  });
});

describe('markdownToPlainText', () => {
  it('removes code blocks', () => {
    const content = 'Text\n```js\ncode\n```\nMore text';
    const result = markdownToPlainText(content);
    
    expect(result).not.toContain('```');
    expect(result).not.toContain('code');
  });

  it('removes inline code', () => {
    const content = 'Use `console.log` for debugging';
    const result = markdownToPlainText(content);
    
    expect(result).not.toContain('`');
  });

  it('removes images', () => {
    const content = 'See ![image](url.png) here';
    const result = markdownToPlainText(content);
    
    expect(result).not.toContain('![');
    expect(result).not.toContain('url.png');
  });

  it('converts links to text only', () => {
    const content = 'Visit [Google](https://google.com)';
    const result = markdownToPlainText(content);
    
    expect(result).toContain('Google');
    expect(result).not.toContain('https://');
    expect(result).not.toContain('[');
  });

  it('removes heading markers', () => {
    const content = '# Title\n## Subtitle';
    const result = markdownToPlainText(content);
    
    expect(result).not.toMatch(/^#/m);
    expect(result).toContain('Title');
    expect(result).toContain('Subtitle');
  });

  it('removes bold formatting', () => {
    const content = 'This is **bold** and __also bold__';
    const result = markdownToPlainText(content);
    
    expect(result).not.toContain('**');
    expect(result).not.toContain('__');
    expect(result).toContain('bold');
  });

  it('removes italic formatting', () => {
    const content = 'This is *italic* and _also italic_';
    const result = markdownToPlainText(content);
    
    expect(result).not.toContain('*');
    expect(result).not.toMatch(/_italic_/);
    expect(result).toContain('italic');
  });

  it('removes blockquotes', () => {
    const content = '> This is a quote';
    const result = markdownToPlainText(content);
    
    expect(result).not.toContain('>');
    expect(result).toContain('This is a quote');
  });

  it('removes horizontal rules', () => {
    const content = 'Above\n---\nBelow';
    const result = markdownToPlainText(content);
    
    expect(result).not.toContain('---');
  });

  it('removes list markers', () => {
    const content = '- Item 1\n* Item 2\n1. Item 3';
    const result = markdownToPlainText(content);
    
    expect(result).toContain('Item 1');
    expect(result).toContain('Item 2');
    expect(result).toContain('Item 3');
  });

  it('normalizes excessive newlines', () => {
    const content = 'Para 1\n\n\n\nPara 2';
    const result = markdownToPlainText(content);
    
    expect(result).not.toContain('\n\n\n');
  });
});

describe('extractEmbeddableContent', () => {
  it('removes frontmatter', () => {
    const content = `---
title: Test
---
Actual content`;
    const result = extractEmbeddableContent(content);
    
    expect(result).not.toContain('---');
    expect(result).not.toContain('title:');
    expect(result).toContain('Actual content');
  });

  it('removes markdown formatting', () => {
    const content = '# Title\n\n**Bold** and [link](url)';
    const result = extractEmbeddableContent(content);
    
    expect(result).not.toContain('#');
    expect(result).not.toContain('**');
    expect(result).not.toContain('[');
    expect(result).toContain('Title');
    expect(result).toContain('Bold');
    expect(result).toContain('link');
  });

  it('returns clean text suitable for embedding', () => {
    const content = `---
title: Test
---
# Heading

Some **bold** text with [a link](url).

\`\`\`js
code
\`\`\``;
    const result = extractEmbeddableContent(content);
    
    expect(result).toContain('Heading');
    expect(result).toContain('bold');
    expect(result).toContain('a link');
    expect(result).not.toContain('```');
  });
});
