/**
 * Word Document Generator - Advanced Word document generation with full formatting support
 * Extends basic word-export with comprehensive formatting options
 */

import type { UIMessage, Session } from '@/types';
import type {
  WordDocumentOptions,
  FontSettings,
  ParagraphSettings,
  ListSettings,
  TableStyle,
  HeaderFooterSettings,
  HeadingLevel,
  TextAlignment,
  RichDocument,
  DocumentTemplate,
  TableOfContentsSettings,
} from '@/types/document-formatting';
import {
  DEFAULT_DOCUMENT_OPTIONS,
  PAGE_SIZES,
  DEFAULT_STYLES,
  MARGIN_PRESETS,
} from '@/types/document-formatting';

interface DocxModule {
  Document: typeof import('docx').Document;
  Packer: typeof import('docx').Packer;
  Paragraph: typeof import('docx').Paragraph;
  TextRun: typeof import('docx').TextRun;
  HeadingLevel: typeof import('docx').HeadingLevel;
  Table: typeof import('docx').Table;
  TableRow: typeof import('docx').TableRow;
  TableCell: typeof import('docx').TableCell;
  WidthType: typeof import('docx').WidthType;
  BorderStyle: typeof import('docx').BorderStyle;
  AlignmentType: typeof import('docx').AlignmentType;
  ShadingType: typeof import('docx').ShadingType;
  PageBreak: typeof import('docx').PageBreak;
  Header: typeof import('docx').Header;
  Footer: typeof import('docx').Footer;
  PageNumber: typeof import('docx').PageNumber;
  NumberFormat: typeof import('docx').NumberFormat;
  ImageRun: typeof import('docx').ImageRun;
  ExternalHyperlink: typeof import('docx').ExternalHyperlink;
  TableOfContents: typeof import('docx').TableOfContents;
  PageOrientation: typeof import('docx').PageOrientation;
  convertMillimetersToTwip: typeof import('docx').convertMillimetersToTwip;
  LevelFormat: typeof import('docx').LevelFormat;
}

let docxModule: DocxModule | null = null;

async function loadDocx(): Promise<DocxModule> {
  if (docxModule) return docxModule;
  
  const docx = await import('docx');
  docxModule = {
    Document: docx.Document,
    Packer: docx.Packer,
    Paragraph: docx.Paragraph,
    TextRun: docx.TextRun,
    HeadingLevel: docx.HeadingLevel,
    Table: docx.Table,
    TableRow: docx.TableRow,
    TableCell: docx.TableCell,
    WidthType: docx.WidthType,
    BorderStyle: docx.BorderStyle,
    AlignmentType: docx.AlignmentType,
    ShadingType: docx.ShadingType,
    PageBreak: docx.PageBreak,
    Header: docx.Header,
    Footer: docx.Footer,
    PageNumber: docx.PageNumber,
    NumberFormat: docx.NumberFormat,
    ImageRun: docx.ImageRun,
    ExternalHyperlink: docx.ExternalHyperlink,
    TableOfContents: docx.TableOfContents,
    PageOrientation: docx.PageOrientation,
    convertMillimetersToTwip: docx.convertMillimetersToTwip,
    LevelFormat: docx.LevelFormat,
  };
  return docxModule;
}

export interface WordGeneratorResult {
  success: boolean;
  filename?: string;
  blob?: Blob;
  error?: string;
}

// Convert mm to twip (1mm = 56.7 twips approximately)
function mmToTwip(mm: number): number {
  return Math.round(mm * 56.7);
}

// Convert points to half-points (docx uses half-points for font sizes)
function ptToHalfPt(pt: number): number {
  return pt * 2;
}

// Get alignment type from string
function getAlignmentType(alignment: TextAlignment | undefined, docx: DocxModule): typeof docx.AlignmentType[keyof typeof docx.AlignmentType] {
  switch (alignment) {
    case 'center': return docx.AlignmentType.CENTER;
    case 'right': return docx.AlignmentType.RIGHT;
    case 'justify': return docx.AlignmentType.JUSTIFIED;
    default: return docx.AlignmentType.LEFT;
  }
}

// Get heading level from number
function getHeadingLevel(level: HeadingLevel, docx: DocxModule): typeof docx.HeadingLevel[keyof typeof docx.HeadingLevel] {
  const levels = {
    1: docx.HeadingLevel.HEADING_1,
    2: docx.HeadingLevel.HEADING_2,
    3: docx.HeadingLevel.HEADING_3,
    4: docx.HeadingLevel.HEADING_4,
    5: docx.HeadingLevel.HEADING_5,
    6: docx.HeadingLevel.HEADING_6,
  };
  return levels[level] || docx.HeadingLevel.HEADING_1;
}

// Create text run with formatting
function createTextRun(
  text: string,
  font: Partial<FontSettings> | undefined,
  docx: DocxModule
): InstanceType<DocxModule['TextRun']> {
  return new docx.TextRun({
    text,
    font: font?.name,
    size: font?.size ? ptToHalfPt(font.size) : undefined,
    bold: font?.bold,
    italics: font?.italic,
    underline: font?.underline ? {} : undefined,
    strike: font?.strike,
    color: font?.color?.replace('#', ''),
    highlight: font?.highlight as never,
  });
}

// Create paragraph with formatting
function createParagraph(
  content: string | InstanceType<DocxModule['TextRun']>[],
  options: {
    font?: Partial<FontSettings>;
    paragraph?: Partial<ParagraphSettings>;
    heading?: HeadingLevel;
  },
  docx: DocxModule
): InstanceType<DocxModule['Paragraph']> {
  const children = typeof content === 'string'
    ? [createTextRun(content, options.font, docx)]
    : content;

  const paragraphOptions: Record<string, unknown> = {
    children,
    alignment: options.paragraph?.alignment 
      ? getAlignmentType(options.paragraph.alignment, docx) 
      : undefined,
    spacing: {
      before: options.paragraph?.spaceBefore ? options.paragraph.spaceBefore * 20 : undefined,
      after: options.paragraph?.spaceAfter ? options.paragraph.spaceAfter * 20 : undefined,
      line: options.paragraph?.lineSpacing 
        ? Math.round(options.paragraph.lineSpacing * 240) 
        : undefined,
    },
    indent: {
      firstLine: options.paragraph?.firstLineIndent 
        ? mmToTwip(options.paragraph.firstLineIndent) 
        : undefined,
      left: options.paragraph?.leftIndent 
        ? mmToTwip(options.paragraph.leftIndent) 
        : undefined,
      right: options.paragraph?.rightIndent 
        ? mmToTwip(options.paragraph.rightIndent) 
        : undefined,
    },
  };

  if (options.heading) {
    paragraphOptions.heading = getHeadingLevel(options.heading, docx);
  }

  return new docx.Paragraph(paragraphOptions);
}

// Create bullet/numbered list (exported for future use)
export function _createList(
  items: string[],
  settings: ListSettings,
  font: Partial<FontSettings> | undefined,
  docx: DocxModule
): InstanceType<DocxModule['Paragraph']>[] {
  return items.map((item, index) => {
    const prefix = settings.type === 'bullet' 
      ? '• '
      : settings.type === 'number'
        ? `${(settings.startNumber || 1) + index}. `
        : settings.type === 'letter'
          ? `${String.fromCharCode(97 + index)}. `
          : `${toRoman(index + 1)}. `;

    return new docx.Paragraph({
      children: [createTextRun(prefix + item, font, docx)],
      indent: {
        left: mmToTwip(10 * (settings.indentLevel || 1)),
      },
      spacing: { after: 100 },
    });
  });
}

// Convert number to Roman numerals
function toRoman(num: number): string {
  const romanNumerals: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];
  
  let result = '';
  for (const [value, numeral] of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result.toLowerCase();
}

// Create table with styling (exported for future use)
export function _createTable(
  headers: string[],
  rows: string[][],
  style: TableStyle | undefined,
  docx: DocxModule
): InstanceType<DocxModule['Table']> {
  const tableRows: InstanceType<DocxModule['TableRow']>[] = [];

  // Header row
  if (headers.length > 0) {
    tableRows.push(
      new docx.TableRow({
        children: headers.map(
          (header) =>
            new docx.TableCell({
              children: [
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: header,
                      bold: true,
                    }),
                  ],
                }),
              ],
              shading: style?.headerRow?.backgroundColor
                ? { type: docx.ShadingType.SOLID, color: style.headerRow.backgroundColor.replace('#', '') }
                : { type: docx.ShadingType.SOLID, color: 'E0E0E0' },
            })
        ),
        tableHeader: true,
      })
    );
  }

  // Data rows
  rows.forEach((row, rowIndex) => {
    const isEven = rowIndex % 2 === 0;
    const rowStyle = isEven ? style?.evenRows : style?.oddRows;

    tableRows.push(
      new docx.TableRow({
        children: row.map(
          (cell) =>
            new docx.TableCell({
              children: [
                new docx.Paragraph({
                  children: [new docx.TextRun({ text: String(cell ?? '') })],
                }),
              ],
              shading: rowStyle?.backgroundColor
                ? { type: docx.ShadingType.SOLID, color: rowStyle.backgroundColor.replace('#', '') }
                : undefined,
            })
        ),
      })
    );
  });

  return new docx.Table({
    rows: tableRows,
    width: {
      size: 100,
      type: docx.WidthType.PERCENTAGE,
    },
  });
}

// Create header/footer
function createHeaderFooter(
  settings: HeaderFooterSettings,
  type: 'header' | 'footer',
  docx: DocxModule
): InstanceType<DocxModule['Header']> | InstanceType<DocxModule['Footer']> {
  const children: InstanceType<DocxModule['Paragraph']>[] = [];

  const content = settings.content;
  const parts: InstanceType<DocxModule['TextRun']>[] = [];

  if (content.left) {
    parts.push(createTextRun(content.left, settings.font, docx));
  }
  if (content.center) {
    parts.push(new docx.TextRun({ text: '\t' }));
    parts.push(createTextRun(content.center, settings.font, docx));
  }
  if (content.right || settings.showPageNumber) {
    parts.push(new docx.TextRun({ text: '\t' }));
    if (content.right) {
      parts.push(createTextRun(content.right, settings.font, docx));
    }
    if (settings.showPageNumber) {
      parts.push(new docx.TextRun({ children: [docx.PageNumber.CURRENT] }));
    }
  }

  if (parts.length > 0) {
    children.push(new docx.Paragraph({ children: parts }));
  }

  const Constructor = type === 'header' ? docx.Header : docx.Footer;
  return new Constructor({ children });
}

// Create cover page
function createCoverPage(
  session: Session,
  options: WordDocumentOptions,
  docx: DocxModule
): InstanceType<DocxModule['Paragraph']>[] {
  const elements: InstanceType<DocxModule['Paragraph']>[] = [];
  const titleStyle = options.styles?.title || DEFAULT_STYLES.title;

  // Spacer
  for (let i = 0; i < 8; i++) {
    elements.push(new docx.Paragraph({ text: '' }));
  }

  // Title
  elements.push(
    new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: session.title,
          font: titleStyle?.font?.name || 'Calibri',
          size: ptToHalfPt(titleStyle?.font?.size || 26),
          bold: titleStyle?.font?.bold ?? true,
          color: titleStyle?.font?.color?.replace('#', '') || '2F5496',
        }),
      ],
      alignment: docx.AlignmentType.CENTER,
      spacing: { after: 800 },
    })
  );

  // Subtitle / Model info
  elements.push(
    new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: `${session.provider} / ${session.model}`,
          font: 'Calibri',
          size: ptToHalfPt(14),
          color: '666666',
        }),
      ],
      alignment: docx.AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Mode badge
  elements.push(
    new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: `Mode: ${session.mode}`,
          font: 'Calibri',
          size: ptToHalfPt(12),
          color: '888888',
        }),
      ],
      alignment: docx.AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Date
  elements.push(
    new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: session.createdAt.toLocaleDateString(),
          font: 'Calibri',
          size: ptToHalfPt(12),
          color: '888888',
        }),
      ],
      alignment: docx.AlignmentType.CENTER,
    })
  );

  // Page break after cover
  elements.push(
    new docx.Paragraph({
      children: [new docx.PageBreak()],
    })
  );

  return elements;
}

// Create table of contents
function createTableOfContents(
  settings: TableOfContentsSettings,
  docx: DocxModule
): InstanceType<DocxModule['Paragraph']>[] {
  const elements: InstanceType<DocxModule['Paragraph']>[] = [];

  if (settings.title) {
    elements.push(
      new docx.Paragraph({
        text: settings.title,
        heading: docx.HeadingLevel.HEADING_1,
        spacing: { after: 400 },
      })
    );
  }

  elements.push(
    new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: '[Table of Contents - Update in Word to populate]',
          italics: true,
          color: '888888',
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Page break after TOC
  elements.push(
    new docx.Paragraph({
      children: [new docx.PageBreak()],
    })
  );

  return elements;
}

// Process message content to document blocks
function processMessageContent(
  content: string,
  docx: DocxModule,
  _options: WordDocumentOptions
): InstanceType<DocxModule['Paragraph']>[] {
  const elements: InstanceType<DocxModule['Paragraph']>[] = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let _codeLanguage = '';

  for (const line of lines) {
    // Code block handling
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          new docx.Paragraph({
            children: [
              new docx.TextRun({
                text: codeBlockContent.join('\n'),
                font: 'Consolas',
                size: ptToHalfPt(10),
              }),
            ],
            shading: {
              type: docx.ShadingType.SOLID,
              color: 'F5F5F5',
            },
            spacing: { before: 200, after: 200 },
          })
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        _codeLanguage = line.slice(3).trim();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Heading detection
    if (line.startsWith('### ')) {
      elements.push(
        new docx.Paragraph({
          text: line.slice(4),
          heading: docx.HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        new docx.Paragraph({
          text: line.slice(3),
          heading: docx.HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        new docx.Paragraph({
          text: line.slice(2),
          heading: docx.HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Bullet point
      elements.push(
        new docx.Paragraph({
          children: [new docx.TextRun({ text: `• ${line.slice(2)}` })],
          indent: { left: mmToTwip(10) },
          spacing: { after: 50 },
        })
      );
    } else if (/^\d+\.\s/.test(line)) {
      // Numbered list
      elements.push(
        new docx.Paragraph({
          children: [new docx.TextRun({ text: line })],
          indent: { left: mmToTwip(10) },
          spacing: { after: 50 },
        })
      );
    } else if (line.startsWith('> ')) {
      // Quote
      elements.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: line.slice(2),
              italics: true,
              color: '666666',
            }),
          ],
          indent: { left: mmToTwip(15), right: mmToTwip(15) },
          shading: {
            type: docx.ShadingType.SOLID,
            color: 'F9F9F9',
          },
          spacing: { before: 100, after: 100 },
        })
      );
    } else if (line.trim() === '') {
      // Empty line
      elements.push(new docx.Paragraph({ text: '' }));
    } else if (line.trim() === '---' || line.trim() === '***') {
      // Horizontal rule - represented as a thin paragraph
      elements.push(
        new docx.Paragraph({
          border: {
            bottom: { color: 'CCCCCC', space: 1, style: docx.BorderStyle.SINGLE, size: 6 },
          },
          spacing: { before: 200, after: 200 },
        })
      );
    } else {
      // Regular paragraph - process inline formatting
      const runs = processInlineFormatting(line, docx);
      elements.push(
        new docx.Paragraph({
          children: runs,
          spacing: { after: 100 },
        })
      );
    }
  }

  return elements;
}

// Process inline formatting (bold, italic, code, links)
function processInlineFormatting(
  text: string,
  docx: DocxModule
): InstanceType<DocxModule['TextRun']>[] {
  const runs: InstanceType<DocxModule['TextRun']>[] = [];
  
  // Simple regex-based parsing for common markdown
  let remaining = text;
  
  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      runs.push(new docx.TextRun({ text: boldMatch[1], bold: true }));
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }
    
    // Italic
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      runs.push(new docx.TextRun({ text: italicMatch[1], italics: true }));
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }
    
    // Inline code
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      runs.push(new docx.TextRun({ 
        text: codeMatch[1], 
        font: 'Consolas',
        shading: { type: docx.ShadingType.SOLID, color: 'F0F0F0' },
      }));
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }
    
    // Link
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      runs.push(new docx.TextRun({ 
        text: linkMatch[1], 
        color: '0066CC',
        underline: {},
      }));
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }
    
    // Plain text until next special character
    const plainMatch = remaining.match(/^[^*`\[]+/);
    if (plainMatch) {
      runs.push(new docx.TextRun({ text: plainMatch[0] }));
      remaining = remaining.slice(plainMatch[0].length);
      continue;
    }
    
    // Single special character that wasn't matched
    runs.push(new docx.TextRun({ text: remaining[0] }));
    remaining = remaining.slice(1);
  }
  
  return runs;
}

/**
 * Generate Word document from chat session with advanced formatting
 */
export async function generateWordDocument(
  session: Session,
  messages: UIMessage[],
  options: WordDocumentOptions = {}
): Promise<WordGeneratorResult> {
  try {
    const docx = await loadDocx();
    const opts = { ...DEFAULT_DOCUMENT_OPTIONS, ...options };
    
    const children: (InstanceType<DocxModule['Paragraph']> | InstanceType<DocxModule['Table']>)[] = [];

    // Cover page
    if (opts.includeCoverPage) {
      children.push(...createCoverPage(session, opts, docx));
    }

    // Table of Contents
    if (opts.tableOfContents?.enabled) {
      children.push(...createTableOfContents(opts.tableOfContents, docx));
    }

    // Metadata section
    if (opts.includeMetadata && !opts.includeCoverPage) {
      children.push(
        new docx.Paragraph({
          text: session.title,
          heading: docx.HeadingLevel.TITLE,
          spacing: { after: 400 },
        })
      );

      const metadataItems = [
        `Provider: ${session.provider}`,
        `Model: ${session.model}`,
        `Mode: ${session.mode}`,
        `Created: ${session.createdAt.toLocaleString()}`,
        `Messages: ${messages.length}`,
      ];

      for (const item of metadataItems) {
        children.push(
          new docx.Paragraph({
            children: [new docx.TextRun({ text: item, size: ptToHalfPt(10), color: '666666' })],
            spacing: { after: 50 },
          })
        );
      }

      children.push(new docx.Paragraph({ text: '' }));
    }

    // System Prompt
    if (session.systemPrompt) {
      children.push(
        new docx.Paragraph({
          text: 'System Prompt',
          heading: docx.HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      children.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: session.systemPrompt,
              italics: true,
              color: '555555',
            }),
          ],
          shading: { type: docx.ShadingType.SOLID, color: 'F5F5F5' },
          spacing: { after: 300 },
        })
      );
    }

    // Conversation heading
    children.push(
      new docx.Paragraph({
        text: 'Conversation',
        heading: docx.HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    // Messages
    for (const message of messages) {
      const roleLabel = message.role === 'user' ? 'You' : 'Assistant';
      const timestamp = opts.includeTimestamps
        ? ` (${message.createdAt.toLocaleTimeString()})`
        : '';

      // Role header
      children.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: `${roleLabel}${timestamp}`,
              bold: true,
              color: message.role === 'user' ? '1976D2' : '6B21A8',
              size: ptToHalfPt(12),
            }),
          ],
          spacing: { before: 300, after: 100 },
          border: message.role === 'user' ? {
            bottom: { color: '1976D2', space: 1, style: docx.BorderStyle.SINGLE, size: 6 },
          } : {
            bottom: { color: '6B21A8', space: 1, style: docx.BorderStyle.SINGLE, size: 6 },
          },
        })
      );

      // Message content
      const contentElements = processMessageContent(message.content, docx, opts);
      children.push(...contentElements);

      // Handle message parts (thinking, tool calls)
      if (message.parts) {
        for (const part of message.parts) {
          if (part.type === 'reasoning' && opts.showThinkingProcess) {
            children.push(
              new docx.Paragraph({
                children: [
                  new docx.TextRun({ text: '💭 Thinking', bold: true, color: '7C3AED' }),
                  part.duration ? new docx.TextRun({ text: ` (${part.duration}s)`, color: '888888', size: ptToHalfPt(10) }) : new docx.TextRun({ text: '' }),
                ],
                spacing: { before: 100 },
              })
            );
            children.push(
              new docx.Paragraph({
                children: [new docx.TextRun({ text: part.content, italics: true, color: '666666' })],
                shading: { type: docx.ShadingType.SOLID, color: 'F5F3FF' },
                spacing: { after: 100 },
              })
            );
          }

          if (part.type === 'tool-invocation' && opts.showToolCalls) {
            const statusLabel = part.state === 'output-available' ? '✓' : 
                               part.state === 'output-error' ? '✗' : '⋯';
            children.push(
              new docx.Paragraph({
                children: [
                  new docx.TextRun({ text: `🔧 ${formatToolName(part.toolName)} `, bold: true }),
                  new docx.TextRun({ text: statusLabel, color: part.state === 'output-error' ? 'DC2626' : '059669' }),
                ],
                spacing: { before: 100 },
              })
            );
            
            if (part.args && Object.keys(part.args).length > 0) {
              children.push(
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({ 
                      text: JSON.stringify(part.args, null, 2), 
                      font: 'Consolas', 
                      size: ptToHalfPt(9) 
                    }),
                  ],
                  shading: { type: docx.ShadingType.SOLID, color: 'F5F5F5' },
                  spacing: { after: 100 },
                })
              );
            }
          }
        }
      }

      // Token info
      if (opts.includeTokens && message.tokens?.total) {
        children.push(
          new docx.Paragraph({
            children: [
              new docx.TextRun({
                text: `Tokens: ${message.tokens.total}`,
                size: ptToHalfPt(9),
                color: '9CA3AF',
              }),
            ],
            spacing: { after: 50 },
          })
        );
      }
    }

    // Footer
    children.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: `Exported from Cognia on ${new Date().toLocaleString()}`,
            italics: true,
            size: ptToHalfPt(9),
            color: '9CA3AF',
          }),
        ],
        spacing: { before: 600 },
        alignment: docx.AlignmentType.CENTER,
      })
    );

    // Page setup
    const pageSize = opts.pageSize || 'a4';
    const pageDimensions = opts.customPageSize || PAGE_SIZES[pageSize];
    const margins = opts.margins || MARGIN_PRESETS.normal;
    const isLandscape = opts.orientation === 'landscape';

    // Create document
    const doc = new docx.Document({
      creator: opts.author || 'Cognia',
      title: session.title,
      subject: opts.subject,
      keywords: opts.keywords?.join(', '),
      description: opts.description || `Chat export from Cognia - ${session.mode} mode`,
      sections: [
        {
          properties: {
            page: {
              size: {
                width: mmToTwip(isLandscape ? pageDimensions.height : pageDimensions.width),
                height: mmToTwip(isLandscape ? pageDimensions.width : pageDimensions.height),
                orientation: isLandscape ? docx.PageOrientation.LANDSCAPE : docx.PageOrientation.PORTRAIT,
              },
              margin: {
                top: mmToTwip(margins.top),
                bottom: mmToTwip(margins.bottom),
                left: mmToTwip(margins.left),
                right: mmToTwip(margins.right),
              },
            },
          },
          headers: opts.header ? {
            default: createHeaderFooter(opts.header, 'header', docx) as InstanceType<DocxModule['Header']>,
          } : undefined,
          footers: opts.footer ? {
            default: createHeaderFooter(opts.footer, 'footer', docx) as InstanceType<DocxModule['Footer']>,
          } : undefined,
          children,
        },
      ],
    });

    // Generate buffer
    const buffer = await docx.Packer.toBuffer(doc);
    const blob = new Blob([buffer as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const filename = generateWordFilename(session.title);

    return {
      success: true,
      filename,
      blob,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate Word document',
    };
  }
}

/**
 * Generate Word document from rich document structure
 */
export async function generateFromRichDocument(
  document: RichDocument
): Promise<WordGeneratorResult> {
  try {
    const docx = await loadDocx();
    const opts = document.options;
    
    const sections = document.sections.map(section => {
      const children: (InstanceType<DocxModule['Paragraph']> | InstanceType<DocxModule['Table']>)[] = [];
      
      for (const block of section.blocks) {
        switch (block.type) {
          case 'paragraph':
            if (block.content) {
              children.push(createParagraph(block.content, {}, docx));
            }
            break;
          case 'heading':
            if (block.content) {
              const headingBlock = block as { level?: HeadingLevel };
              children.push(createParagraph(block.content, { heading: headingBlock.level || 1 }, docx));
            }
            break;
          case 'pageBreak':
            children.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
            break;
          case 'horizontalRule':
            children.push(new docx.Paragraph({
              border: { bottom: { color: 'CCCCCC', space: 1, style: docx.BorderStyle.SINGLE, size: 6 } },
            }));
            break;
        }
      }

      const margins = section.settings?.margins || opts.margins || MARGIN_PRESETS.normal;
      const pageSize = section.settings?.pageSize || opts.pageSize || 'a4';
      const pageDimensions = PAGE_SIZES[pageSize];
      const isLandscape = (section.settings?.orientation || opts.orientation) === 'landscape';

      return {
        properties: {
          page: {
            size: {
              width: mmToTwip(isLandscape ? pageDimensions.height : pageDimensions.width),
              height: mmToTwip(isLandscape ? pageDimensions.width : pageDimensions.height),
            },
            margin: {
              top: mmToTwip(margins.top),
              bottom: mmToTwip(margins.bottom),
              left: mmToTwip(margins.left),
              right: mmToTwip(margins.right),
            },
          },
        },
        children,
      };
    });

    const doc = new docx.Document({
      creator: opts.author || 'Cognia',
      title: document.title,
      sections,
    });

    const buffer = await docx.Packer.toBuffer(doc);
    const blob = new Blob([buffer as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    return {
      success: true,
      filename: generateWordFilename(document.title),
      blob,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate document',
    };
  }
}

/**
 * Download Word document
 */
export function downloadWordDocument(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ensureWordExtension(filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatToolName(name: string): string {
  return name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function ensureWordExtension(filename: string): string {
  if (!filename.toLowerCase().endsWith('.docx')) {
    return `${filename}.docx`;
  }
  return filename;
}

function generateWordFilename(title: string): string {
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  const timestamp = new Date().toISOString().slice(0, 10);
  return `${safeTitle}-${timestamp}.docx`;
}

// Export document templates
export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Document',
    description: 'Start with a blank document',
    category: 'general',
    options: DEFAULT_DOCUMENT_OPTIONS,
    sections: [{ id: '1', blocks: [] }],
  },
  {
    id: 'chat-export',
    name: 'Chat Export',
    description: 'Export chat conversation with cover page',
    category: 'general',
    options: {
      ...DEFAULT_DOCUMENT_OPTIONS,
      includeCoverPage: true,
      includeMetadata: true,
    },
    sections: [{ id: '1', blocks: [] }],
  },
  {
    id: 'report',
    name: 'Professional Report',
    description: 'Formal report with table of contents',
    category: 'report',
    options: {
      ...DEFAULT_DOCUMENT_OPTIONS,
      includeCoverPage: true,
      tableOfContents: { enabled: true, title: 'Table of Contents', levels: 3, showPageNumbers: true },
      margins: MARGIN_PRESETS.moderate,
    },
    sections: [{ id: '1', blocks: [] }],
  },
  {
    id: 'article',
    name: 'Article',
    description: 'Clean article format',
    category: 'article',
    options: {
      ...DEFAULT_DOCUMENT_OPTIONS,
      includeCoverPage: false,
      margins: MARGIN_PRESETS.wide,
      defaultParagraph: { lineSpacing: 1.5, firstLineIndent: 10 },
    },
    sections: [{ id: '1', blocks: [] }],
  },
  {
    id: 'letter',
    name: 'Business Letter',
    description: 'Formal business letter format',
    category: 'letter',
    options: {
      ...DEFAULT_DOCUMENT_OPTIONS,
      includeCoverPage: false,
      margins: MARGIN_PRESETS.normal,
    },
    sections: [{ id: '1', blocks: [] }],
  },
];
