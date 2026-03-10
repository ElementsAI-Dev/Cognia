import {
  ingestPPTMaterials,
  validatePPTMaterialQuality,
} from './material-ingestion';

describe('material-ingestion', () => {
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

  it('fails binary pdf/docx extraction explicitly', async () => {
    const file = {
      name: 'report.pdf',
      type: 'application/pdf',
      text: async () => '%PDF-1.4 raw',
    } as unknown as File;

    const result = await ingestPPTMaterials({
      mode: 'import',
      file,
    });

    expect(result.materials).toHaveLength(0);
    expect(result.errors[0]?.code).toBe('extraction_failed');
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
