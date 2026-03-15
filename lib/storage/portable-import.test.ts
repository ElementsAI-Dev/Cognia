import { PortableChatArchiveImporter, isPortableChatArchive } from './portable-import';

const archive = {
  version: '1.0' as const,
  exportedAt: '2024-01-15T12:00:00.000Z',
  source: {
    app: 'cognia' as const,
    format: 'portable' as const,
  },
  conversations: [
    {
      id: 'portable-1',
      title: 'Portable Export',
      sourceFormat: 'portable' as const,
      sourceType: 'portable' as const,
      compatibility: 'official' as const,
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:10.000Z',
      messages: [
        {
          id: 'message-1',
          role: 'assistant' as const,
          content: 'Here is an imported attachment',
          createdAt: '2024-01-15T10:00:05.000Z',
          attachments: [
            {
              kind: 'image' as const,
              name: 'diagram.png',
            },
          ],
          citations: [
            {
              title: 'Portable Source',
              url: 'https://example.com/source',
            },
          ],
        },
      ],
    },
  ],
};

describe('portable import', () => {
  const importer = new PortableChatArchiveImporter();
  const defaultOptions = {
    mergeStrategy: 'merge' as const,
    generateNewIds: true,
    preserveTimestamps: true,
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o-mini',
    defaultMode: 'chat' as const,
  };

  it('detects canonical portable archives', () => {
    expect(isPortableChatArchive(archive)).toBe(true);
    expect(importer.detect(archive)).toBe(true);
  });

  it('parses portable archives into re-importable conversations', async () => {
    const result = await importer.parse(archive, defaultOptions);

    expect(result.errors).toHaveLength(0);
    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].messages[0].attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'image', name: 'diagram.png' }),
      ])
    );
    expect(result.conversations[0].messages[0].sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Portable Source', url: 'https://example.com/source' }),
      ])
    );
  });
});
