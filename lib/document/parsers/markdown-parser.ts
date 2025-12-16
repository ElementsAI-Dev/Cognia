/**
 * Markdown Parser - Extract content and structure from Markdown files
 */

export interface MarkdownSection {
  level: number;
  title: string;
  content: string;
  startLine: number;
  endLine: number;
}

export interface MarkdownParseResult {
  title?: string;
  content: string;
  sections: MarkdownSection[];
  frontmatter?: Record<string, unknown>;
  links: { text: string; url: string }[];
  codeBlocks: { language: string; code: string }[];
  images: { alt: string; url: string }[];
}

/**
 * Parse frontmatter from markdown
 */
function parseFrontmatter(content: string): {
  frontmatter?: Record<string, unknown>;
  body: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { body: content };
  }

  try {
    const frontmatterStr = match[1];
    const frontmatter: Record<string, unknown> = {};

    // Simple YAML-like parsing
    const lines = frontmatterStr.split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value: unknown = line.slice(colonIndex + 1).trim();

        // Try to parse as JSON for arrays/objects
        if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
          try {
            value = JSON.parse(value);
          } catch {
            // Keep as string
          }
        } else if (value === 'true') {
          value = true;
        } else if (value === 'false') {
          value = false;
        } else if (!isNaN(Number(value)) && value !== '') {
          value = Number(value);
        }

        frontmatter[key] = value;
      }
    }

    return {
      frontmatter,
      body: content.slice(match[0].length),
    };
  } catch {
    return { body: content };
  }
}

/**
 * Extract sections from markdown
 */
function extractSections(content: string): MarkdownSection[] {
  const lines = content.split('\n');
  const sections: MarkdownSection[] = [];
  let currentSection: MarkdownSection | null = null;
  let contentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        currentSection.endLine = i - 1;
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        level: headingMatch[1].length,
        title: headingMatch[2].trim(),
        content: '',
        startLine: i,
        endLine: i,
      };
      contentLines = [];
    } else if (currentSection) {
      contentLines.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    currentSection.endLine = lines.length - 1;
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Extract links from markdown
 */
function extractLinks(content: string): { text: string; url: string }[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links: { text: string; url: string }[] = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    links.push({
      text: match[1],
      url: match[2],
    });
  }

  return links;
}

/**
 * Extract code blocks from markdown
 */
function extractCodeBlocks(content: string): { language: string; code: string }[] {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const codeBlocks: { language: string; code: string }[] = [];
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
    });
  }

  return codeBlocks;
}

/**
 * Extract images from markdown
 */
function extractImages(content: string): { alt: string; url: string }[] {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images: { alt: string; url: string }[] = [];
  let match;

  while ((match = imageRegex.exec(content)) !== null) {
    images.push({
      alt: match[1],
      url: match[2],
    });
  }

  return images;
}

/**
 * Get title from markdown (first h1 or frontmatter title)
 */
function extractTitle(
  content: string,
  frontmatter?: Record<string, unknown>
): string | undefined {
  if (frontmatter?.title && typeof frontmatter.title === 'string') {
    return frontmatter.title;
  }

  const h1Match = content.match(/^#\s+(.+)$/m);
  return h1Match ? h1Match[1].trim() : undefined;
}

/**
 * Parse markdown content
 */
export function parseMarkdown(content: string): MarkdownParseResult {
  const { frontmatter, body } = parseFrontmatter(content);
  const sections = extractSections(body);
  const links = extractLinks(body);
  const codeBlocks = extractCodeBlocks(body);
  const images = extractImages(body);
  const title = extractTitle(body, frontmatter);

  return {
    title,
    content: body,
    sections,
    frontmatter,
    links,
    codeBlocks,
    images,
  };
}

/**
 * Convert markdown to plain text (remove formatting)
 */
export function markdownToPlainText(content: string): string {
  return content
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove images
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    // Convert links to just text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove headers markers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract text content suitable for embedding
 */
export function extractEmbeddableContent(content: string): string {
  const { body } = parseFrontmatter(content);
  return markdownToPlainText(body);
}
