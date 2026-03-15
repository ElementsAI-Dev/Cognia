import {
  ingestPPTMaterials,
  validatePPTMaterialQuality,
} from './material-ingestion';
import { processDocumentAsync } from '@/lib/document/document-processor';

jest.mock('@/lib/document/document-processor', () => ({
  processDocumentAsync: jest.fn(),
}));

describe('material-ingestion', () => {
  const mockProcessDocumentAsync = processDocumentAsync as jest.MockedFunction<typeof processDocumentAsync>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessDocumentAsync.mockResolvedValue({
      id: 'doc-1',
      filename: 'notes.odt',
      type: 'word',
      content: 'Parsed document content',
      embeddableContent: 'Parsed document content',
      metadata: {
        size: 24,
        lineCount: 1,
        wordCount: 3,
      },
    });
  });

  it('ingests supported text file into normalized material', async () => {
    const file = {
      name: 'notes.md',
      type: 'text/markdown',
      text: async () => '# Title\n\nThis is a valid text source with enough readable content.',
    } as unknown as File;

    const result = await ingestPPTMaterials({
      mode: 'import',
      file,
      now: () => 123,
    });

    expect(result.errors).toHaveLength(0);
    expect(result.materials).toHaveLength(1);
    expect(result.materials[0]).toMatchObject({
      id: 'material-file-123',
      type: 'document',
      name: 'notes.md',
    });
  });

  it('ingests parser-backed office documents through the unified document processor', async () => {
    const file = {
      name: 'report.odt',
      type: 'application/vnd.oasis.opendocument.text',
      arrayBuffer: async () => new ArrayBuffer(8),
    } as unknown as File;

    const result = await ingestPPTMaterials({
      mode: 'import',
      file,
      now: () => 456,
    });

    expect(mockProcessDocumentAsync).toHaveBeenCalledWith(
      'material-file-456',
      'report.odt',
      expect.any(ArrayBuffer),
      expect.objectContaining({ extractEmbeddable: true })
    );
    expect(result.errors).toHaveLength(0);
    expect(result.materials[0]).toMatchObject({
      id: 'material-file-456',
      type: 'document',
      name: 'report.odt',
      content: 'Parsed document content',
    });
  });

  it('surfaces actionable extraction errors from parser-backed document ingestion', async () => {
    mockProcessDocumentAsync.mockRejectedValueOnce(
      new Error('File is password protected or corrupted')
    );

    const file = {
      name: 'report.docm',
      type: 'application/vnd.ms-word.document.macroEnabled.12',
      arrayBuffer: async () => new ArrayBuffer(8),
    } as unknown as File;

    const result = await ingestPPTMaterials({
      mode: 'import',
      file,
    });

    expect(result.materials).toHaveLength(0);
    expect(result.errors[0]?.code).toBe('extraction_failed');
    expect(result.errors[0]?.suggestion).toContain('remove password protection');
  });

  it('blocks unsupported spreadsheet-style sources in ppt import mode', async () => {
    const file = {
      name: 'sheet.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      arrayBuffer: async () => new ArrayBuffer(8),
    } as unknown as File;

    const result = await ingestPPTMaterials({
      mode: 'import',
      file,
    });

    expect(mockProcessDocumentAsync).not.toHaveBeenCalled();
    expect(result.materials).toHaveLength(0);
    expect(result.errors[0]?.code).toBe('unsupported_format');
  });

  it('returns empty_content for empty paste input', async () => {
    const result = await ingestPPTMaterials({
      mode: 'paste',
      pastedText: '   ',
    });

    expect(result.materials).toHaveLength(0);
    expect(result.errors[0]?.code).toBe('empty_content');
  });

  it('detects quality issues for low-signal content', () => {
    const quality = validatePPTMaterialQuality([
      {
        id: 'm1',
        type: 'text',
        name: 'Noisy',
        content: '$$$$$$$$$$$$$$$$$$$$$$$$$$$$',
      },
    ]);

    expect(quality.isValid).toBe(false);
    expect(quality.issues.length).toBeGreaterThan(0);
  });
});
