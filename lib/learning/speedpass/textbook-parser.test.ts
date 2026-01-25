/**
 * Textbook Parser Tests
 */

import {
  detectChapter,
  detectSection,
  convertChineseNumber,
  extractFormulas,
  cleanText,
  parseTextbookContent,
  createTextbookFromInput,
  estimateParseTime,
  validateTextbookFile,
  mergeImagePages,
} from './textbook-parser';

describe('textbook-parser', () => {
  describe('detectChapter', () => {
    it('should detect Chinese chapter format "第X章"', () => {
      const result = detectChapter('第一章 绑定与解除');
      expect(result).toEqual({ number: '1', title: '绑定与解除' });
    });

    it('should detect Chinese chapter with number', () => {
      const result = detectChapter('第3章 微积分基础');
      expect(result).toEqual({ number: '3', title: '微积分基础' });
    });

    it('should detect numbered format "1. Title"', () => {
      const result = detectChapter('1. Introduction');
      expect(result).toEqual({ number: '1', title: 'Introduction' });
    });

    it('should detect English chapter format', () => {
      const result = detectChapter('Chapter 5: Advanced Topics');
      expect(result).toEqual({ number: '5', title: 'Advanced Topics' });
    });

    it('should detect CHAPTER uppercase format', () => {
      const result = detectChapter('CHAPTER 2: Getting Started');
      expect(result).toEqual({ number: '2', title: 'Getting Started' });
    });

    it('should return null for non-chapter lines', () => {
      expect(detectChapter('This is regular text')).toBeNull();
      expect(detectChapter('')).toBeNull();
      expect(detectChapter('Some random paragraph')).toBeNull();
    });

    it('should handle Chinese numbers up to 十', () => {
      expect(detectChapter('第十章 总结')).toEqual({ number: '10', title: '总结' });
      expect(detectChapter('第十二章 附录')).toEqual({ number: '12', title: '附录' });
    });
  });

  describe('detectSection', () => {
    it('should detect Chinese section format "X.Y Title"', () => {
      const result = detectSection('1.2 线性方程组');
      expect(result).toEqual({ chapter: '1', section: '2', title: '线性方程组' });
    });

    it('should detect section with Chinese punctuation', () => {
      const result = detectSection('3、4 求解步骤');
      expect(result).toEqual({ chapter: '3', section: '4', title: '求解步骤' });
    });

    it('should detect section with § symbol', () => {
      const result = detectSection('§ 2.3 极限理论');
      expect(result).toEqual({ chapter: '2', section: '3', title: '极限理论' });
    });

    it('should detect English section format', () => {
      const result = detectSection('Section 4.5: Implementation');
      expect(result).toEqual({ chapter: '4', section: '5', title: 'Implementation' });
    });

    it('should return null for non-section lines', () => {
      expect(detectSection('Regular paragraph text')).toBeNull();
      expect(detectSection('第一章 标题')).toBeNull();
    });
  });

  describe('convertChineseNumber', () => {
    it('should return Arabic numbers unchanged', () => {
      expect(convertChineseNumber('123')).toBe('123');
      expect(convertChineseNumber('5')).toBe('5');
    });

    it('should convert single Chinese digits', () => {
      expect(convertChineseNumber('一')).toBe('1');
      expect(convertChineseNumber('五')).toBe('5');
      expect(convertChineseNumber('九')).toBe('9');
    });

    it('should convert 十 correctly', () => {
      expect(convertChineseNumber('十')).toBe('10');
      expect(convertChineseNumber('十一')).toBe('11');
      expect(convertChineseNumber('十五')).toBe('15');
    });

    it('should convert compound numbers', () => {
      expect(convertChineseNumber('二十')).toBe('20');
      expect(convertChineseNumber('二十三')).toBe('23');
      expect(convertChineseNumber('三十五')).toBe('35');
    });

    it('should handle 百', () => {
      expect(convertChineseNumber('一百')).toBe('100');
    });
  });

  describe('extractFormulas', () => {
    it('should extract inline math formulas', () => {
      const text = 'The equation $x^2 + y^2 = r^2$ represents a circle.';
      const result = extractFormulas(text);
      expect(result).toContain('x^2 + y^2 = r^2');
    });

    it('should extract display math formulas', () => {
      const text = 'The formula is: $$\\int_0^1 f(x) dx$$';
      const result = extractFormulas(text);
      expect(result).toContain('\\int_0^1 f(x) dx');
    });

    it('should extract bracket format formulas', () => {
      const text = 'Consider \\[E = mc^2\\] as shown.';
      const result = extractFormulas(text);
      expect(result).toContain('E = mc^2');
    });

    it('should extract multiple formulas', () => {
      const text = 'We have $a = b$ and $c = d$ in this equation.';
      const result = extractFormulas(text);
      expect(result).toHaveLength(2);
      expect(result).toContain('a = b');
      expect(result).toContain('c = d');
    });

    it('should return empty array for text without formulas', () => {
      const result = extractFormulas('No formulas here');
      expect(result).toEqual([]);
    });
  });

  describe('cleanText', () => {
    it('should collapse multiple spaces', () => {
      expect(cleanText('hello    world')).toBe('hello world');
    });

    it('should collapse all whitespace to single space', () => {
      // The implementation uses \s+ which includes newlines
      expect(cleanText('para1\n\n\n\npara2')).toBe('para1 para2');
    });

    it('should trim whitespace', () => {
      expect(cleanText('  hello world  ')).toBe('hello world');
    });

    it('should handle complex whitespace', () => {
      const input = '  multiple   spaces  \n\n\n\n  and   newlines  ';
      const result = cleanText(input);
      expect(result).toBe('multiple spaces and newlines');
    });
  });

  describe('parseTextbookContent', () => {
    it('should parse simple content with chapters', () => {
      const content = `第一章 引言
This is the introduction.

第二章 正文
This is the main content.`;

      const result = parseTextbookContent(content);

      expect(result.chapters).toHaveLength(2);
      expect(result.chapters[0].title).toBe('引言');
      expect(result.chapters[1].title).toBe('正文');
    });

    it('should handle page breaks', () => {
      const content = `Page 1 content
<!-- PAGE BREAK -->
Page 2 content`;

      const result = parseTextbookContent(content);

      expect(result.pages).toHaveLength(2);
      expect(result.pages[0].pageNumber).toBe(1);
      expect(result.pages[1].pageNumber).toBe(2);
    });

    it('should extract formulas from pages', () => {
      const content = 'The equation $E = mc^2$ is famous.';
      const result = parseTextbookContent(content);

      expect(result.pages[0].formulas).toContain('E = mc^2');
    });

    it('should call progress callback', () => {
      const progressCalls: number[] = [];
      const onProgress = jest.fn((progress) => {
        progressCalls.push(progress.progress);
      });

      const longContent = Array(200).fill('Line of content').join('\n');
      parseTextbookContent(longContent, onProgress);

      expect(onProgress).toHaveBeenCalled();
    });

    it('should handle sections within chapters', () => {
      const content = `第一章 主题
1.1 第一节内容
1.2 第二节内容`;

      const result = parseTextbookContent(content);

      expect(result.chapters.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty content', () => {
      const result = parseTextbookContent('');
      expect(result.chapters).toEqual([]);
      expect(result.pages).toEqual([]);
    });
  });

  describe('createTextbookFromInput', () => {
    it('should create textbook with all fields', () => {
      const input = {
        name: 'Advanced Mathematics',
        author: 'Dr. Smith',
        publisher: 'Academic Press',
        edition: '3rd',
        isbn: '978-1234567890',
        fileType: 'pdf' as const,
        fileData: 'base64data',
      };

      const result = createTextbookFromInput(input);

      expect(result.name).toBe('Advanced Mathematics');
      expect(result.author).toBe('Dr. Smith');
      expect(result.publisher).toBe('Academic Press');
      expect(result.edition).toBe('3rd');
      expect(result.isbn).toBe('978-1234567890');
      expect(result.parseStatus).toBe('pending');
      expect(result.source).toBe('user_upload');
      expect(result.isPublic).toBe(false);
      expect(result.usageCount).toBe(0);
      expect(result.id).toMatch(/^textbook_\d+$/);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle required fields only', () => {
      const input = {
        name: 'Test Book',
        author: 'Author Name',
        publisher: 'Publisher Name',
        fileType: 'pdf' as const,
        fileData: 'base64data',
      };
      const result = createTextbookFromInput(input);

      expect(result.name).toBe('Test Book');
      expect(result.author).toBe('Author Name');
      expect(result.publisher).toBe('Publisher Name');
    });
  });

  describe('estimateParseTime', () => {
    it('should estimate 1-2 minutes for small files (<10MB)', () => {
      const size = 5 * 1024 * 1024; // 5MB
      expect(estimateParseTime(size)).toBe('约1-2分钟');
    });

    it('should estimate 3-5 minutes for medium files (10-50MB)', () => {
      const size = 30 * 1024 * 1024; // 30MB
      expect(estimateParseTime(size)).toBe('约3-5分钟');
    });

    it('should estimate 5-8 minutes for large files (50-100MB)', () => {
      const size = 75 * 1024 * 1024; // 75MB
      expect(estimateParseTime(size)).toBe('约5-8分钟');
    });

    it('should estimate 10+ minutes for very large files (>100MB)', () => {
      const size = 150 * 1024 * 1024; // 150MB
      expect(estimateParseTime(size)).toBe('约10分钟以上');
    });
  });

  describe('validateTextbookFile', () => {
    it('should accept valid PDF file', () => {
      const result = validateTextbookFile('application/pdf', 10 * 1024 * 1024);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid image files', () => {
      expect(validateTextbookFile('image/jpeg', 5 * 1024 * 1024).valid).toBe(true);
      expect(validateTextbookFile('image/png', 5 * 1024 * 1024).valid).toBe(true);
      expect(validateTextbookFile('image/jpg', 5 * 1024 * 1024).valid).toBe(true);
    });

    it('should reject unsupported file types', () => {
      const result = validateTextbookFile('text/plain', 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('不支持的文件格式');
    });

    it('should reject files over 200MB', () => {
      const size = 250 * 1024 * 1024; // 250MB
      const result = validateTextbookFile('application/pdf', size);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('200MB');
    });

    it('should accept files exactly at 200MB limit', () => {
      const size = 200 * 1024 * 1024; // 200MB exactly
      const result = validateTextbookFile('application/pdf', size);
      expect(result.valid).toBe(true);
    });
  });

  describe('mergeImagePages', () => {
    it('should merge pages in order', () => {
      const pages = [
        { pageNumber: 2, content: 'Page 2 content' },
        { pageNumber: 1, content: 'Page 1 content' },
        { pageNumber: 3, content: 'Page 3 content' },
      ];

      const result = mergeImagePages(pages);

      expect(result).toContain('--- PAGE 1 ---');
      expect(result).toContain('--- PAGE 2 ---');
      expect(result).toContain('--- PAGE 3 ---');
      expect(result.indexOf('PAGE 1')).toBeLessThan(result.indexOf('PAGE 2'));
      expect(result.indexOf('PAGE 2')).toBeLessThan(result.indexOf('PAGE 3'));
    });

    it('should include page content', () => {
      const pages = [
        { pageNumber: 1, content: 'Hello World' },
      ];

      const result = mergeImagePages(pages);

      expect(result).toContain('Hello World');
    });

    it('should handle empty array', () => {
      const result = mergeImagePages([]);
      expect(result).toBe('');
    });
  });
});
