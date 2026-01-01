/**
 * Word Export - Generate Word documents from chat messages and content
 * Uses docx library for Word generation
 */

import type { UIMessage, Session } from '@/types';
import type { TableData } from './excel-export';

export interface WordExportOptions {
  title?: string;
  author?: string;
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
  includeTokens?: boolean;
  theme?: 'light' | 'dark';
}

export interface WordExportResult {
  success: boolean;
  filename?: string;
  blob?: Blob;
  error?: string;
}

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
}

const DEFAULT_OPTIONS: WordExportOptions = {
  includeMetadata: true,
  includeTimestamps: true,
  includeTokens: false,
  theme: 'light',
};

/**
 * Dynamically import docx module
 */
async function loadDocx(): Promise<DocxModule> {
  const docx = await import('docx');
  return {
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
  };
}

/**
 * Export chat messages to Word document
 */
export async function exportChatToWord(
  session: Session,
  messages: UIMessage[],
  filename?: string,
  options: WordExportOptions = {}
): Promise<WordExportResult> {
  try {
    const docx = await loadDocx();
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const children: InstanceType<DocxModule['Paragraph']>[] = [];

    // Title
    children.push(
      new docx.Paragraph({
        text: session.title,
        heading: docx.HeadingLevel.TITLE,
        spacing: { after: 400 },
      })
    );

    // Metadata section
    if (opts.includeMetadata) {
      children.push(
        new docx.Paragraph({
          text: 'Conversation Info',
          heading: docx.HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
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
            children: [new docx.TextRun({ text: item })],
            spacing: { after: 100 },
          })
        );
      }
    }

    // System Prompt if present
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
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    // Conversation section
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
              color: message.role === 'user' ? '1976D2' : '424242',
            }),
          ],
          spacing: { before: 300, after: 100 },
        })
      );

      // Message content - split by paragraphs
      const paragraphs = message.content.split('\n\n');
      for (const para of paragraphs) {
        if (para.trim()) {
          // Check if it's a code block
          if (para.startsWith('```')) {
            const codeContent = para.replace(/```\w*\n?/g, '').replace(/```$/g, '');
            children.push(
              new docx.Paragraph({
                children: [
                  new docx.TextRun({
                    text: codeContent,
                    font: 'Consolas',
                    size: 20, // 10pt
                  }),
                ],
                shading: {
                  type: docx.ShadingType.SOLID,
                  color: 'F5F5F5',
                },
                spacing: { after: 200 },
              })
            );
          } else {
            children.push(
              new docx.Paragraph({
                children: [new docx.TextRun({ text: para.replace(/\n/g, ' ') })],
                spacing: { after: 100 },
              })
            );
          }
        }
      }

      // Handle message parts (images, videos, etc.)
      if (message.parts && message.parts.length > 0) {
        for (const part of message.parts) {
          // Handle image parts
          if (part.type === 'image') {
            const imageLabel = part.isGenerated ? '✨ AI Generated Image' : '🖼️ Image';
            children.push(
              new docx.Paragraph({
                children: [
                  new docx.TextRun({
                    text: imageLabel,
                    bold: true,
                    color: '7B1FA2',
                  }),
                ],
                spacing: { before: 200, after: 100 },
              })
            );
            
            if (part.alt) {
              children.push(
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: `Description: ${part.alt}`,
                      italics: true,
                    }),
                  ],
                  spacing: { after: 50 },
                })
              );
            }
            
            if (part.width && part.height) {
              children.push(
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: `Dimensions: ${part.width}×${part.height}`,
                      size: 18,
                      color: '757575',
                    }),
                  ],
                  spacing: { after: 50 },
                })
              );
            }
            
            if (part.prompt) {
              children.push(
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: `Prompt: "${part.prompt}"`,
                      italics: true,
                      size: 20,
                    }),
                  ],
                  shading: {
                    type: docx.ShadingType.SOLID,
                    color: 'F3E5F5',
                  },
                  spacing: { after: 100 },
                })
              );
            }
            
            if (part.url) {
              children.push(
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: `[View Image: ${part.url}]`,
                      color: '1976D2',
                      size: 18,
                    }),
                  ],
                  spacing: { after: 100 },
                })
              );
            }
          }
          
          // Handle video parts
          if (part.type === 'video') {
            const videoLabel = part.isGenerated 
              ? `🎬 AI Generated Video${part.provider ? ` (${part.provider})` : ''}`
              : '🎥 Video';
            children.push(
              new docx.Paragraph({
                children: [
                  new docx.TextRun({
                    text: videoLabel,
                    bold: true,
                    color: 'E65100',
                  }),
                ],
                spacing: { before: 200, after: 100 },
              })
            );
            
            if (part.title) {
              children.push(
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: `Title: ${part.title}`,
                      bold: true,
                    }),
                  ],
                  spacing: { after: 50 },
                })
              );
            }
            
            // Video metadata
            const videoMeta: string[] = [];
            if (part.durationSeconds) {
              const mins = Math.floor(part.durationSeconds / 60);
              const secs = Math.floor(part.durationSeconds % 60);
              videoMeta.push(`Duration: ${mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`}`);
            }
            if (part.width && part.height) {
              videoMeta.push(`Resolution: ${part.width}×${part.height}`);
            }
            if (part.fps) {
              videoMeta.push(`FPS: ${part.fps}`);
            }
            if (part.model) {
              videoMeta.push(`Model: ${part.model}`);
            }
            
            if (videoMeta.length > 0) {
              children.push(
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: videoMeta.join(' • '),
                      size: 18,
                      color: '757575',
                    }),
                  ],
                  spacing: { after: 50 },
                })
              );
            }
            
            if (part.prompt) {
              children.push(
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: `Prompt: "${part.prompt}"`,
                      italics: true,
                      size: 20,
                    }),
                  ],
                  shading: {
                    type: docx.ShadingType.SOLID,
                    color: 'FFF3E0',
                  },
                  spacing: { after: 100 },
                })
              );
            }
            
            if (part.url) {
              children.push(
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: `[View Video: ${part.url}]`,
                      color: '1976D2',
                      size: 18,
                    }),
                  ],
                  spacing: { after: 100 },
                })
              );
            }
          }
        }
      }

      // Token info if enabled
      if (opts.includeTokens && message.tokens) {
        children.push(
          new docx.Paragraph({
            children: [
              new docx.TextRun({
                text: `Tokens: ${message.tokens.total || 0}`,
                size: 18, // 9pt
                color: '9E9E9E',
              }),
            ],
            spacing: { after: 100 },
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
            size: 18,
            color: '9E9E9E',
          }),
        ],
        spacing: { before: 600 },
        alignment: docx.AlignmentType.CENTER,
      })
    );

    // Create document
    const doc = new docx.Document({
      creator: opts.author || 'Cognia',
      title: session.title,
      description: `Chat export from Cognia - ${session.mode} mode`,
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    // Generate Word file
    const buffer = await docx.Packer.toBuffer(doc);
    const blob = new Blob([buffer as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const exportFilename = filename || generateWordFilename(session.title);

    return {
      success: true,
      filename: ensureWordExtension(exportFilename),
      blob,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export Word document',
    };
  }
}

/**
 * Export content to Word document
 */
export async function exportContentToWord(
  content: string,
  title: string,
  filename?: string,
  options: WordExportOptions = {}
): Promise<WordExportResult> {
  try {
    const docx = await loadDocx();
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const children: InstanceType<DocxModule['Paragraph']>[] = [];

    // Title
    children.push(
      new docx.Paragraph({
        text: title,
        heading: docx.HeadingLevel.TITLE,
        spacing: { after: 400 },
      })
    );

    // Parse content (simple markdown-like parsing)
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];

    for (const line of lines) {
      // Code block handling
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          children.push(
            new docx.Paragraph({
              children: [
                new docx.TextRun({
                  text: codeBlockContent.join('\n'),
                  font: 'Consolas',
                  size: 20,
                }),
              ],
              shading: {
                type: docx.ShadingType.SOLID,
                color: 'F5F5F5',
              },
              spacing: { after: 200 },
            })
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Heading detection
      if (line.startsWith('# ')) {
        children.push(
          new docx.Paragraph({
            text: line.slice(2),
            heading: docx.HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          })
        );
      } else if (line.startsWith('## ')) {
        children.push(
          new docx.Paragraph({
            text: line.slice(3),
            heading: docx.HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
          })
        );
      } else if (line.startsWith('### ')) {
        children.push(
          new docx.Paragraph({
            text: line.slice(4),
            heading: docx.HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        // Bullet point
        children.push(
          new docx.Paragraph({
            children: [new docx.TextRun({ text: `• ${line.slice(2)}` })],
            spacing: { after: 50 },
          })
        );
      } else if (/^\d+\.\s/.test(line)) {
        // Numbered list
        children.push(
          new docx.Paragraph({
            children: [new docx.TextRun({ text: line })],
            spacing: { after: 50 },
          })
        );
      } else if (line.trim() === '') {
        // Empty line
        children.push(new docx.Paragraph({ text: '' }));
      } else {
        // Regular paragraph
        children.push(
          new docx.Paragraph({
            children: [new docx.TextRun({ text: line })],
            spacing: { after: 100 },
          })
        );
      }
    }

    // Footer
    children.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: `Generated by Cognia on ${new Date().toLocaleString()}`,
            italics: true,
            size: 18,
            color: '9E9E9E',
          }),
        ],
        spacing: { before: 600 },
        alignment: docx.AlignmentType.CENTER,
      })
    );

    // Create document
    const doc = new docx.Document({
      creator: opts.author || 'Cognia',
      title: title,
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    // Generate Word file
    const buffer = await docx.Packer.toBuffer(doc);
    const blob = new Blob([buffer as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const exportFilename = filename || generateWordFilename(title);

    return {
      success: true,
      filename: ensureWordExtension(exportFilename),
      blob,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export Word document',
    };
  }
}

/**
 * Export table data to Word document
 */
export async function exportTableToWord(
  tableData: TableData,
  title: string,
  filename?: string
): Promise<WordExportResult> {
  try {
    const docx = await loadDocx();

    const children: (InstanceType<DocxModule['Paragraph']> | InstanceType<DocxModule['Table']>)[] = [];

    // Title
    children.push(
      new docx.Paragraph({
        text: title,
        heading: docx.HeadingLevel.TITLE,
        spacing: { after: 400 },
      })
    );

    // Create table rows
    const tableRows: InstanceType<DocxModule['TableRow']>[] = [];

    // Header row
    if (tableData.headers.length > 0) {
      tableRows.push(
        new docx.TableRow({
          children: tableData.headers.map(
            (header) =>
              new docx.TableCell({
                children: [
                  new docx.Paragraph({
                    children: [
                      new docx.TextRun({
                        text: String(header),
                        bold: true,
                      }),
                    ],
                  }),
                ],
                shading: {
                  type: docx.ShadingType.SOLID,
                  color: 'E0E0E0',
                },
              })
          ),
        })
      );
    }

    // Data rows
    for (const row of tableData.rows) {
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
              })
          ),
        })
      );
    }

    // Create table
    const table = new docx.Table({
      rows: tableRows,
      width: {
        size: 100,
        type: docx.WidthType.PERCENTAGE,
      },
    });

    children.push(table);

    // Footer
    children.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: `Exported from Cognia on ${new Date().toLocaleString()}`,
            italics: true,
            size: 18,
            color: '9E9E9E',
          }),
        ],
        spacing: { before: 600 },
        alignment: docx.AlignmentType.CENTER,
      })
    );

    // Create document
    const doc = new docx.Document({
      creator: 'Cognia',
      title: title,
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    // Generate Word file
    const buffer = await docx.Packer.toBuffer(doc);
    const blob = new Blob([buffer as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const exportFilename = filename || generateWordFilename(title);

    return {
      success: true,
      filename: ensureWordExtension(exportFilename),
      blob,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export table to Word',
    };
  }
}

/**
 * Download Word blob as file
 */
export function downloadWord(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ensureWordExtension(filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export and download in one step
 */
export async function exportAndDownloadWord(
  session: Session,
  messages: UIMessage[],
  filename?: string,
  options?: WordExportOptions
): Promise<WordExportResult> {
  const result = await exportChatToWord(session, messages, filename, options);

  if (result.success && result.blob && result.filename) {
    downloadWord(result.blob, result.filename);
  }

  return result;
}

/**
 * Ensure filename has .docx extension
 */
function ensureWordExtension(filename: string): string {
  if (!filename.toLowerCase().endsWith('.docx')) {
    return `${filename}.docx`;
  }
  return filename;
}

/**
 * Generate filename from title
 */
function generateWordFilename(title: string): string {
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  const timestamp = new Date().toISOString().slice(0, 10);
  return `${safeTitle}-${timestamp}.docx`;
}
