/**
 * Unit tests for document-formatting types and constants
 */

import {
  PAGE_SIZES,
  MARGIN_PRESETS,
  FONT_FAMILIES,
  FONT_SIZES,
  DEFAULT_STYLES,
  DEFAULT_DOCUMENT_OPTIONS,
  LINE_SPACING_PRESETS,
  type PageSize,
  type PageOrientation,
  type PageMargins,
  type FontSettings,
  type ParagraphSettings,
  type TextAlignment,
  type HeadingLevel,
  type ListType,
  type WordDocumentOptions,
} from './document-formatting';

describe('document-formatting types', () => {
  describe('PAGE_SIZES', () => {
    it('should have correct A4 dimensions', () => {
      expect(PAGE_SIZES.a4).toEqual({ width: 210, height: 297 });
    });

    it('should have correct A3 dimensions', () => {
      expect(PAGE_SIZES.a3).toEqual({ width: 297, height: 420 });
    });

    it('should have correct A5 dimensions', () => {
      expect(PAGE_SIZES.a5).toEqual({ width: 148, height: 210 });
    });

    it('should have correct letter dimensions', () => {
      expect(PAGE_SIZES.letter).toEqual({ width: 216, height: 279 });
    });

    it('should have correct legal dimensions', () => {
      expect(PAGE_SIZES.legal).toEqual({ width: 216, height: 356 });
    });

    it('should have custom size placeholder', () => {
      expect(PAGE_SIZES.custom).toBeDefined();
    });

    it('should have all expected page sizes', () => {
      const expectedSizes: PageSize[] = ['a4', 'a3', 'a5', 'letter', 'legal', 'custom'];
      expectedSizes.forEach(size => {
        expect(PAGE_SIZES[size]).toBeDefined();
      });
    });
  });

  describe('MARGIN_PRESETS', () => {
    it('should have normal margins', () => {
      expect(MARGIN_PRESETS.normal).toEqual({
        top: 25.4,
        bottom: 25.4,
        left: 25.4,
        right: 25.4,
      });
    });

    it('should have narrow margins', () => {
      expect(MARGIN_PRESETS.narrow).toEqual({
        top: 12.7,
        bottom: 12.7,
        left: 12.7,
        right: 12.7,
      });
    });

    it('should have moderate margins', () => {
      expect(MARGIN_PRESETS.moderate).toEqual({
        top: 25.4,
        bottom: 25.4,
        left: 19.1,
        right: 19.1,
      });
    });

    it('should have wide margins', () => {
      expect(MARGIN_PRESETS.wide).toEqual({
        top: 25.4,
        bottom: 25.4,
        left: 50.8,
        right: 50.8,
      });
    });

    it('should have mirrored margins with gutter', () => {
      expect(MARGIN_PRESETS.mirrored.gutter).toBe(12.7);
    });

    it('should have all required margin properties', () => {
      Object.values(MARGIN_PRESETS).forEach(preset => {
        expect(preset.top).toBeDefined();
        expect(preset.bottom).toBeDefined();
        expect(preset.left).toBeDefined();
        expect(preset.right).toBeDefined();
      });
    });
  });

  describe('FONT_FAMILIES', () => {
    it('should include common fonts', () => {
      expect(FONT_FAMILIES).toContain('Arial');
      expect(FONT_FAMILIES).toContain('Times New Roman');
      expect(FONT_FAMILIES).toContain('Calibri');
    });

    it('should include Chinese fonts', () => {
      expect(FONT_FAMILIES).toContain('Microsoft YaHei');
      expect(FONT_FAMILIES).toContain('SimSun');
      expect(FONT_FAMILIES).toContain('SimHei');
    });

    it('should have at least 10 font options', () => {
      expect(FONT_FAMILIES.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('FONT_SIZES', () => {
    it('should include common font sizes', () => {
      expect(FONT_SIZES).toContain(10);
      expect(FONT_SIZES).toContain(11);
      expect(FONT_SIZES).toContain(12);
      expect(FONT_SIZES).toContain(14);
    });

    it('should include large font sizes for headings', () => {
      expect(FONT_SIZES).toContain(24);
      expect(FONT_SIZES).toContain(36);
      expect(FONT_SIZES).toContain(48);
    });

    it('should be sorted in ascending order', () => {
      const sorted = [...FONT_SIZES].sort((a, b) => a - b);
      expect(FONT_SIZES).toEqual(sorted);
    });
  });

  describe('LINE_SPACING_PRESETS', () => {
    it('should have single line spacing', () => {
      expect(LINE_SPACING_PRESETS.single).toBe(1);
    });

    it('should have 1.5 line spacing', () => {
      expect(LINE_SPACING_PRESETS.onePointFive).toBe(1.5);
    });

    it('should have double line spacing', () => {
      expect(LINE_SPACING_PRESETS.double).toBe(2);
    });

    it('should have atLeast12pt preset with rule', () => {
      expect(LINE_SPACING_PRESETS.atLeast12pt).toEqual({
        rule: 'atLeast',
        value: 12,
      });
    });
  });

  describe('DEFAULT_STYLES', () => {
    it('should have title style', () => {
      expect(DEFAULT_STYLES.title).toBeDefined();
      expect(DEFAULT_STYLES.title?.id).toBe('Title');
      expect(DEFAULT_STYLES.title?.font?.bold).toBe(true);
    });

    it('should have heading styles', () => {
      expect(DEFAULT_STYLES.heading1).toBeDefined();
      expect(DEFAULT_STYLES.heading2).toBeDefined();
      expect(DEFAULT_STYLES.heading3).toBeDefined();
    });

    it('should have normal style', () => {
      expect(DEFAULT_STYLES.normal).toBeDefined();
      expect(DEFAULT_STYLES.normal?.font?.name).toBe('Calibri');
      expect(DEFAULT_STYLES.normal?.font?.size).toBe(11);
    });

    it('should have quote style with italic', () => {
      expect(DEFAULT_STYLES.quote?.font?.italic).toBe(true);
    });

    it('should have codeBlock style with monospace font', () => {
      expect(DEFAULT_STYLES.codeBlock?.font?.name).toBe('Consolas');
    });

    it('should have decreasing font sizes for headings', () => {
      const h1Size = DEFAULT_STYLES.heading1?.font?.size || 0;
      const h2Size = DEFAULT_STYLES.heading2?.font?.size || 0;
      const h3Size = DEFAULT_STYLES.heading3?.font?.size || 0;
      
      expect(h1Size).toBeGreaterThan(h2Size);
      expect(h2Size).toBeGreaterThan(h3Size);
    });
  });

  describe('DEFAULT_DOCUMENT_OPTIONS', () => {
    it('should have default page size as A4', () => {
      expect(DEFAULT_DOCUMENT_OPTIONS.pageSize).toBe('a4');
    });

    it('should have portrait orientation by default', () => {
      expect(DEFAULT_DOCUMENT_OPTIONS.orientation).toBe('portrait');
    });

    it('should have normal margins by default', () => {
      expect(DEFAULT_DOCUMENT_OPTIONS.margins).toEqual(MARGIN_PRESETS.normal);
    });

    it('should have Calibri as default font', () => {
      expect(DEFAULT_DOCUMENT_OPTIONS.defaultFont?.name).toBe('Calibri');
      expect(DEFAULT_DOCUMENT_OPTIONS.defaultFont?.size).toBe(11);
    });

    it('should include metadata by default', () => {
      expect(DEFAULT_DOCUMENT_OPTIONS.includeMetadata).toBe(true);
    });

    it('should include timestamps by default', () => {
      expect(DEFAULT_DOCUMENT_OPTIONS.includeTimestamps).toBe(true);
    });

    it('should not include tokens by default', () => {
      expect(DEFAULT_DOCUMENT_OPTIONS.includeTokens).toBe(false);
    });

    it('should include cover page by default', () => {
      expect(DEFAULT_DOCUMENT_OPTIONS.includeCoverPage).toBe(true);
    });

    it('should show thinking process by default', () => {
      expect(DEFAULT_DOCUMENT_OPTIONS.showThinkingProcess).toBe(true);
    });

    it('should show tool calls by default', () => {
      expect(DEFAULT_DOCUMENT_OPTIONS.showToolCalls).toBe(true);
    });

    it('should have light theme by default', () => {
      expect(DEFAULT_DOCUMENT_OPTIONS.theme).toBe('light');
    });
  });

  describe('Type validation', () => {
    it('should accept valid PageOrientation values', () => {
      const portrait: PageOrientation = 'portrait';
      const landscape: PageOrientation = 'landscape';
      expect(portrait).toBe('portrait');
      expect(landscape).toBe('landscape');
    });

    it('should accept valid TextAlignment values', () => {
      const alignments: TextAlignment[] = ['left', 'center', 'right', 'justify'];
      expect(alignments).toHaveLength(4);
    });

    it('should accept valid HeadingLevel values', () => {
      const levels: HeadingLevel[] = [1, 2, 3, 4, 5, 6];
      expect(levels).toHaveLength(6);
    });

    it('should accept valid ListType values', () => {
      const types: ListType[] = ['bullet', 'number', 'letter', 'roman'];
      expect(types).toHaveLength(4);
    });

    it('should create valid FontSettings', () => {
      const font: FontSettings = {
        name: 'Arial',
        size: 12,
        bold: true,
        italic: false,
        color: '#000000',
      };
      expect(font.name).toBe('Arial');
      expect(font.size).toBe(12);
    });

    it('should create valid ParagraphSettings', () => {
      const paragraph: ParagraphSettings = {
        alignment: 'center',
        lineSpacing: 1.5,
        spaceBefore: 10,
        spaceAfter: 10,
        firstLineIndent: 12.7,
      };
      expect(paragraph.alignment).toBe('center');
      expect(paragraph.lineSpacing).toBe(1.5);
    });

    it('should create valid PageMargins', () => {
      const margins: PageMargins = {
        top: 25.4,
        bottom: 25.4,
        left: 25.4,
        right: 25.4,
        header: 12.7,
        footer: 12.7,
        gutter: 0,
      };
      expect(margins.top).toBe(25.4);
      expect(margins.header).toBe(12.7);
    });

    it('should create valid WordDocumentOptions', () => {
      const options: WordDocumentOptions = {
        title: 'Test Document',
        author: 'Test Author',
        pageSize: 'a4',
        orientation: 'portrait',
        margins: MARGIN_PRESETS.normal,
        includeCoverPage: true,
        tableOfContents: {
          enabled: true,
          title: 'Contents',
          levels: 3,
          showPageNumbers: true,
        },
      };
      expect(options.title).toBe('Test Document');
      expect(options.tableOfContents?.enabled).toBe(true);
    });
  });
});
