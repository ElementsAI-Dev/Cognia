/**
 * Textbook Parser
 * 
 * Utilities for parsing PDF/image textbooks into structured content.
 * Extracts chapters, sections, and prepares content for knowledge extraction.
 */

import type {
  Textbook,
  TextbookChapter,
  TextbookParseStatus,
  CreateTextbookInput,
} from '@/types/learning/speedpass';

// ============================================================================
// Types
// ============================================================================

export interface ParsedPage {
  pageNumber: number;
  content: string;
  images: string[];
  tables: string[];
  formulas: string[];
}

export interface ParseProgress {
  status: TextbookParseStatus;
  progress: number;
  currentPage?: number;
  totalPages?: number;
  message?: string;
}

export interface ParseResult {
  success: boolean;
  textbook: Partial<Textbook>;
  chapters: TextbookChapter[];
  pages: ParsedPage[];
  error?: string;
}

export type ParseProgressCallback = (progress: ParseProgress) => void;

// ============================================================================
// Chapter Detection Patterns
// ============================================================================

const CHAPTER_PATTERNS = {
  chinese: [
    /^第\s*([一二三四五六七八九十百\d]+)\s*章\s*(.+)$/,
    /^第\s*(\d+)\s*章\s*(.+)$/,
    /^(\d+)\s*[\.、]\s*(.+)$/,
  ],
  english: [
    /^Chapter\s*(\d+)[:\s]+(.+)$/i,
    /^(\d+)\s*[\.]\s+(.+)$/,
    /^CHAPTER\s*(\d+)[:\s]+(.+)$/,
  ],
};

const SECTION_PATTERNS = {
  chinese: [
    /^(\d+)[\.、](\d+)\s*(.+)$/,
    /^§\s*(\d+)[\.、](\d+)\s*(.+)$/,
  ],
  english: [
    /^(\d+)\.(\d+)\s+(.+)$/,
    /^Section\s*(\d+)\.(\d+)[:\s]+(.+)$/i,
  ],
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detect chapter from line of text
 */
export function detectChapter(line: string): { number: string; title: string } | null {
  const trimmed = line.trim();
  
  // Try Chinese patterns first
  for (const pattern of CHAPTER_PATTERNS.chinese) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        number: convertChineseNumber(match[1]),
        title: match[2].trim(),
      };
    }
  }
  
  // Try English patterns
  for (const pattern of CHAPTER_PATTERNS.english) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        number: match[1],
        title: match[2].trim(),
      };
    }
  }
  
  return null;
}

/**
 * Detect section from line of text
 */
export function detectSection(line: string): { chapter: string; section: string; title: string } | null {
  const trimmed = line.trim();
  
  // Try Chinese patterns first
  for (const pattern of SECTION_PATTERNS.chinese) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        chapter: match[1],
        section: match[2],
        title: match[3].trim(),
      };
    }
  }
  
  // Try English patterns
  for (const pattern of SECTION_PATTERNS.english) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        chapter: match[1],
        section: match[2],
        title: match[3].trim(),
      };
    }
  }
  
  return null;
}

/**
 * Convert Chinese number to Arabic number
 */
export function convertChineseNumber(str: string): string {
  const chineseNums: Record<string, number> = {
    '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
    '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
    '十': 10, '百': 100,
  };
  
  // If already a number, return as is
  if (/^\d+$/.test(str)) {
    return str;
  }
  
  let result = 0;
  let temp = 0;
  
  for (const char of str) {
    const num = chineseNums[char];
    if (num === undefined) continue;
    
    if (num === 10) {
      result += temp === 0 ? 10 : temp * 10;
      temp = 0;
    } else if (num === 100) {
      result += temp * 100;
      temp = 0;
    } else {
      temp = num;
    }
  }
  
  result += temp;
  return result.toString();
}

/**
 * Extract formulas from text (LaTeX format)
 */
export function extractFormulas(text: string): string[] {
  const formulas: string[] = [];
  
  // Inline math: $...$
  const inlineMatches = text.matchAll(/\$([^$]+)\$/g);
  for (const match of inlineMatches) {
    formulas.push(match[1]);
  }
  
  // Display math: $$...$$
  const displayMatches = text.matchAll(/\$\$([^$]+)\$\$/g);
  for (const match of displayMatches) {
    formulas.push(match[1]);
  }
  
  // \[...\] format
  const bracketMatches = text.matchAll(/\\\[([^\]]+)\\\]/g);
  for (const match of bracketMatches) {
    formulas.push(match[1]);
  }
  
  return formulas;
}

/**
 * Clean and normalize text content
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ============================================================================
// Main Parser Functions
// ============================================================================

/**
 * Parse textbook content from raw text
 */
export function parseTextbookContent(
  rawContent: string,
  onProgress?: ParseProgressCallback
): { chapters: TextbookChapter[]; pages: ParsedPage[] } {
  const lines = rawContent.split('\n');
  const chapters: TextbookChapter[] = [];
  const pages: ParsedPage[] = [];
  
  let currentChapter: TextbookChapter | null = null;
  let currentPageContent = '';
  let pageNumber = 1;
  let chapterIndex = 0;
  
  onProgress?.({
    status: 'extracting_chapters',
    progress: 0,
    message: '正在识别章节结构...',
  });
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Update progress
    if (i % 100 === 0) {
      onProgress?.({
        status: 'extracting_chapters',
        progress: Math.round((i / lines.length) * 100),
        message: `正在处理第 ${pageNumber} 页...`,
      });
    }
    
    // Detect page break
    if (line.includes('<!-- PAGE BREAK -->') || line.match(/^---\s*PAGE\s*\d+\s*---$/)) {
      if (currentPageContent.trim()) {
        pages.push({
          pageNumber,
          content: cleanText(currentPageContent),
          images: [],
          tables: [],
          formulas: extractFormulas(currentPageContent),
        });
      }
      pageNumber++;
      currentPageContent = '';
      continue;
    }
    
    // Detect chapter
    const chapterMatch = detectChapter(line);
    if (chapterMatch) {
      // Save previous chapter's page range
      if (currentChapter) {
        currentChapter.pageEnd = pageNumber - 1;
        chapters.push(currentChapter);
      }
      
      chapterIndex++;
      currentChapter = {
        id: `chapter_${chapterIndex}`,
        textbookId: '',
        chapterNumber: chapterMatch.number,
        title: chapterMatch.title,
        level: 1,
        orderIndex: chapterIndex,
        pageStart: pageNumber,
        pageEnd: pageNumber,
        knowledgePointCount: 0,
        exampleCount: 0,
        exerciseCount: 0,
      };
    }
    
    // Detect section
    const sectionMatch = detectSection(line);
    if (sectionMatch && currentChapter) {
      chapters.push({
        id: `section_${chapterIndex}_${sectionMatch.section}`,
        textbookId: '',
        parentId: currentChapter.id,
        chapterNumber: `${sectionMatch.chapter}.${sectionMatch.section}`,
        title: sectionMatch.title,
        level: 2,
        orderIndex: parseInt(sectionMatch.section),
        pageStart: pageNumber,
        pageEnd: pageNumber,
        knowledgePointCount: 0,
        exampleCount: 0,
        exerciseCount: 0,
      });
    }
    
    currentPageContent += line + '\n';
  }
  
  // Push last chapter
  if (currentChapter) {
    currentChapter.pageEnd = pageNumber;
    chapters.push(currentChapter);
  }
  
  // Push last page
  if (currentPageContent.trim()) {
    pages.push({
      pageNumber,
      content: cleanText(currentPageContent),
      images: [],
      tables: [],
      formulas: extractFormulas(currentPageContent),
    });
  }
  
  onProgress?.({
    status: 'completed',
    progress: 100,
    message: `解析完成：${chapters.length} 个章节，${pages.length} 页`,
  });
  
  return { chapters, pages };
}

/**
 * Create textbook from input
 */
export function createTextbookFromInput(input: CreateTextbookInput): Textbook {
  const now = new Date();
  
  return {
    id: `textbook_${Date.now()}`,
    name: input.name,
    author: input.author,
    publisher: input.publisher,
    edition: input.edition,
    isbn: input.isbn,
    parseStatus: 'pending',
    source: 'user_upload',
    isPublic: false,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Estimate parse time based on file size
 */
export function estimateParseTime(fileSizeBytes: number): string {
  const sizeMB = fileSizeBytes / (1024 * 1024);
  
  if (sizeMB < 10) {
    return '约1-2分钟';
  } else if (sizeMB < 50) {
    return '约3-5分钟';
  } else if (sizeMB < 100) {
    return '约5-8分钟';
  } else {
    return '约10分钟以上';
  }
}

/**
 * Validate textbook file
 */
export function validateTextbookFile(
  fileType: string,
  fileSizeBytes: number
): { valid: boolean; error?: string } {
  const MAX_SIZE = 200 * 1024 * 1024; // 200MB
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  
  if (!ALLOWED_TYPES.includes(fileType.toLowerCase())) {
    return {
      valid: false,
      error: '不支持的文件格式，请上传PDF或图片文件',
    };
  }
  
  if (fileSizeBytes > MAX_SIZE) {
    return {
      valid: false,
      error: '文件大小超过200MB限制',
    };
  }
  
  return { valid: true };
}

/**
 * Merge multiple image pages into textbook content
 */
export function mergeImagePages(pages: { pageNumber: number; content: string }[]): string {
  return pages
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((p) => `<!-- PAGE BREAK -->\n--- PAGE ${p.pageNumber} ---\n${p.content}`)
    .join('\n\n');
}
