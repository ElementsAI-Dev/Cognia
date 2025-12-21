import { test, expect } from '@playwright/test';

/**
 * Document Parser Complete Tests
 * Tests markdown and code parsing functionality
 */
test.describe('Markdown Parser', () => {
  test('should extract headings from markdown', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const extractHeadings = (markdown: string) => {
        const headings: { level: number; text: string; line: number }[] = [];
        const lines = markdown.split('\n');

        lines.forEach((line, index) => {
          const match = line.match(/^(#{1,6})\s+(.+)$/);
          if (match) {
            headings.push({
              level: match[1].length,
              text: match[2].trim(),
              line: index + 1,
            });
          }
        });

        return headings;
      };

      const markdown = `# Main Title
## Section 1
Some content here.
### Subsection 1.1
More content.
## Section 2
### Subsection 2.1
#### Deep heading`;

      const headings = extractHeadings(markdown);

      return {
        count: headings.length,
        h1Count: headings.filter(h => h.level === 1).length,
        h2Count: headings.filter(h => h.level === 2).length,
        h3Count: headings.filter(h => h.level === 3).length,
        firstHeading: headings[0]?.text,
      };
    });

    expect(result.count).toBe(6);
    expect(result.h1Count).toBe(1);
    expect(result.h2Count).toBe(2);
    expect(result.h3Count).toBe(2);
    expect(result.firstHeading).toBe('Main Title');
  });

  test('should extract links from markdown', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const extractLinks = (markdown: string) => {
        const links: { text: string; url: string }[] = [];
        const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;

        while ((match = regex.exec(markdown)) !== null) {
          links.push({ text: match[1], url: match[2] });
        }

        return links;
      };

      const markdown = `Check out [Google](https://google.com) and [GitHub](https://github.com).
Also see [local link](/docs/readme.md) and [anchor](#section-1).`;

      const links = extractLinks(markdown);

      return {
        count: links.length,
        hasExternal: links.some(l => l.url.startsWith('http')),
        hasLocal: links.some(l => l.url.startsWith('/')),
        hasAnchor: links.some(l => l.url.startsWith('#')),
      };
    });

    expect(result.count).toBe(4);
    expect(result.hasExternal).toBe(true);
    expect(result.hasLocal).toBe(true);
    expect(result.hasAnchor).toBe(true);
  });

  test('should extract code blocks from markdown', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const extractCodeBlocks = (markdown: string) => {
        const blocks: { language: string; code: string }[] = [];
        const regex = /```(\w*)\n([\s\S]*?)```/g;
        let match;

        while ((match = regex.exec(markdown)) !== null) {
          blocks.push({
            language: match[1] || 'text',
            code: match[2].trim(),
          });
        }

        return blocks;
      };

      const markdown = `Here is some code:

\`\`\`javascript
const x = 1;
console.log(x);
\`\`\`

And Python:

\`\`\`python
def hello():
    print("Hello")
\`\`\`

Plain code:

\`\`\`
no language
\`\`\``;

      const blocks = extractCodeBlocks(markdown);

      return {
        count: blocks.length,
        languages: blocks.map(b => b.language),
        hasJavaScript: blocks.some(b => b.language === 'javascript'),
        hasPython: blocks.some(b => b.language === 'python'),
      };
    });

    expect(result.count).toBe(3);
    expect(result.hasJavaScript).toBe(true);
    expect(result.hasPython).toBe(true);
    expect(result.languages).toContain('text');
  });

  test('should extract images from markdown', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const extractImages = (markdown: string) => {
        const images: { alt: string; url: string }[] = [];
        const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        let match;

        while ((match = regex.exec(markdown)) !== null) {
          images.push({ alt: match[1], url: match[2] });
        }

        return images;
      };

      const markdown = `![Logo](./images/logo.png)
Some text here.
![Screenshot](https://example.com/screenshot.jpg)
![](./no-alt.gif)`;

      const images = extractImages(markdown);

      return {
        count: images.length,
        hasAlt: images.filter(i => i.alt).length,
        hasRemote: images.some(i => i.url.startsWith('http')),
        hasLocal: images.some(i => i.url.startsWith('./')),
      };
    });

    expect(result.count).toBe(3);
    expect(result.hasAlt).toBe(2);
    expect(result.hasRemote).toBe(true);
    expect(result.hasLocal).toBe(true);
  });

  test('should parse frontmatter', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const parseFrontmatter = (markdown: string) => {
        const match = markdown.match(/^---\n([\s\S]*?)\n---/);
        if (!match) return null;

        const frontmatter: Record<string, string> = {};
        const lines = match[1].split('\n');

        for (const line of lines) {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length) {
            frontmatter[key.trim()] = valueParts.join(':').trim();
          }
        }

        return frontmatter;
      };

      const markdown = `---
title: My Document
author: John Doe
date: 2024-01-15
tags: ai, ml, nlp
---

# Content starts here`;

      const frontmatter = parseFrontmatter(markdown);

      return {
        hasFrontmatter: frontmatter !== null,
        title: frontmatter?.title,
        author: frontmatter?.author,
        hasDate: !!frontmatter?.date,
        hasTags: !!frontmatter?.tags,
      };
    });

    expect(result.hasFrontmatter).toBe(true);
    expect(result.title).toBe('My Document');
    expect(result.author).toBe('John Doe');
    expect(result.hasDate).toBe(true);
    expect(result.hasTags).toBe(true);
  });
});

test.describe('Code Parser', () => {
  test('should extract imports from JavaScript', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const extractImports = (code: string) => {
        const imports: { module: string; items: string[] }[] = [];
        
        // ES6 imports
        const es6Regex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
        let match;

        while ((match = es6Regex.exec(code)) !== null) {
          const items = match[1] 
            ? match[1].split(',').map(s => s.trim())
            : [match[2]];
          imports.push({ module: match[3], items });
        }

        return imports;
      };

      const code = `import React from 'react';
import { useState, useEffect } from 'react';
import { Button, Input } from '@/components/ui';
import axios from 'axios';`;

      const imports = extractImports(code);

      return {
        count: imports.length,
        hasReact: imports.some(i => i.module === 'react'),
        hasComponents: imports.some(i => i.module.includes('components')),
        reactItems: imports.find(i => i.items.includes('useState'))?.items,
      };
    });

    expect(result.count).toBe(4);
    expect(result.hasReact).toBe(true);
    expect(result.hasComponents).toBe(true);
    expect(result.reactItems).toContain('useState');
    expect(result.reactItems).toContain('useEffect');
  });

  test('should extract functions from JavaScript', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const extractFunctions = (code: string) => {
        const functions: { name: string; type: string; line: number }[] = [];
        const lines = code.split('\n');

        lines.forEach((line, index) => {
          // Function declarations
          const funcMatch = line.match(/function\s+(\w+)\s*\(/);
          if (funcMatch) {
            functions.push({ name: funcMatch[1], type: 'declaration', line: index + 1 });
          }

          // Arrow functions assigned to const/let
          const arrowMatch = line.match(/(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(/);
          if (arrowMatch) {
            functions.push({ name: arrowMatch[1], type: 'arrow', line: index + 1 });
          }

          // Async functions
          const asyncMatch = line.match(/async\s+function\s+(\w+)\s*\(/);
          if (asyncMatch) {
            functions.push({ name: asyncMatch[1], type: 'async', line: index + 1 });
          }
        });

        return functions;
      };

      const code = `function regularFunction() {
  return 1;
}

const arrowFunction = () => {
  return 2;
};

async function asyncFunction() {
  return 3;
}

const asyncArrow = async () => {
  return 4;
};`;

      const functions = extractFunctions(code);

      return {
        count: functions.length,
        hasDeclaration: functions.some(f => f.type === 'declaration'),
        hasArrow: functions.some(f => f.type === 'arrow'),
        hasAsync: functions.some(f => f.type === 'async'),
        names: functions.map(f => f.name),
      };
    });

    expect(result.count).toBeGreaterThanOrEqual(3);
    expect(result.hasDeclaration).toBe(true);
    expect(result.hasArrow).toBe(true);
    expect(result.hasAsync).toBe(true);
    expect(result.names).toContain('regularFunction');
  });

  test('should extract comments from code', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const extractComments = (code: string) => {
        const comments: { type: string; content: string }[] = [];

        // Single line comments
        const singleLineRegex = /\/\/(.+)$/gm;
        let match;
        while ((match = singleLineRegex.exec(code)) !== null) {
          comments.push({ type: 'single', content: match[1].trim() });
        }

        // Multi-line comments
        const multiLineRegex = /\/\*([\s\S]*?)\*\//g;
        while ((match = multiLineRegex.exec(code)) !== null) {
          comments.push({ type: 'multi', content: match[1].trim() });
        }

        return comments;
      };

      const code = `// Single line comment
const x = 1; // Inline comment

/* Multi-line
   comment here */

/**
 * JSDoc comment
 * @param {string} name
 */
function greet(name) {
  return 'Hello ' + name;
}`;

      const comments = extractComments(code);

      return {
        count: comments.length,
        singleCount: comments.filter(c => c.type === 'single').length,
        multiCount: comments.filter(c => c.type === 'multi').length,
        hasJSDoc: comments.some(c => c.content.includes('@param')),
      };
    });

    expect(result.count).toBeGreaterThanOrEqual(3);
    expect(result.singleCount).toBeGreaterThanOrEqual(2);
    expect(result.multiCount).toBeGreaterThanOrEqual(1);
    expect(result.hasJSDoc).toBe(true);
  });

  test('should detect programming language', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const detectLanguage = (filename: string): string => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const languageMap: Record<string, string> = {
          js: 'javascript',
          jsx: 'javascript',
          ts: 'typescript',
          tsx: 'typescript',
          py: 'python',
          rb: 'ruby',
          java: 'java',
          go: 'go',
          rs: 'rust',
          cpp: 'cpp',
          c: 'c',
          cs: 'csharp',
          php: 'php',
          swift: 'swift',
          kt: 'kotlin',
        };

        return languageMap[ext] || 'unknown';
      };

      return {
        js: detectLanguage('app.js'),
        ts: detectLanguage('index.ts'),
        tsx: detectLanguage('Component.tsx'),
        py: detectLanguage('script.py'),
        go: detectLanguage('main.go'),
        unknown: detectLanguage('file.xyz'),
      };
    });

    expect(result.js).toBe('javascript');
    expect(result.ts).toBe('typescript');
    expect(result.tsx).toBe('typescript');
    expect(result.py).toBe('python');
    expect(result.go).toBe('go');
    expect(result.unknown).toBe('unknown');
  });
});

test.describe('Document Processor', () => {
  test('should process document and generate embeddable content', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const processDocument = (content: string, type: string) => {
        let embeddable = content;

        if (type === 'markdown') {
          // Remove markdown syntax
          embeddable = content
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
            .replace(/```[\s\S]*?```/g, '')
            .trim();
        }

        return {
          original: content,
          embeddable,
          type,
          wordCount: embeddable.split(/\s+/).filter(w => w).length,
        };
      };

      const markdown = `# Title

This is **bold** and *italic* text.

[Link](https://example.com)

\`\`\`javascript
const x = 1;
\`\`\``;

      const processed = processDocument(markdown, 'markdown');

      return {
        hasEmbeddable: processed.embeddable.length > 0,
        noMarkdownSyntax: !processed.embeddable.includes('**'),
        noCodeBlocks: !processed.embeddable.includes('```'),
        wordCount: processed.wordCount,
      };
    });

    expect(result.hasEmbeddable).toBe(true);
    expect(result.noMarkdownSyntax).toBe(true);
    expect(result.noCodeBlocks).toBe(true);
    expect(result.wordCount).toBeGreaterThan(0);
  });
});
