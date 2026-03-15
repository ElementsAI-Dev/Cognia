import {
  CSVTranscriptImporter,
  JSONTranscriptImporter,
  MarkdownTranscriptImporter,
} from './transcript-importers';

const defaultOptions = {
  mergeStrategy: 'merge' as const,
  generateNewIds: true,
  preserveTimestamps: true,
  defaultProvider: 'openai',
  defaultModel: 'gpt-4o-mini',
  defaultMode: 'chat' as const,
};

describe('transcript importers', () => {
  it('parses markdown role blocks into a single adapted conversation', async () => {
    const importer = new MarkdownTranscriptImporter();
    const markdown = `# Exported Conversation

## User
What changed?

## Assistant
The import flow was upgraded.`;

    expect(importer.detect(markdown)).toBe(true);

    const result = await importer.parse(markdown, defaultOptions);

    expect(result.errors).toHaveLength(0);
    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].messages[0].role).toBe('user');
    expect(result.conversations[0].metadata?.sourceType).toBe('generic');
  });

  it('accepts csv transcripts only when role, content, and timestamp columns exist', async () => {
    const importer = new CSVTranscriptImporter();
    const validCsv = `role,content,timestamp
user,"hello","2024-01-01T10:00:00Z"
assistant,"hi","2024-01-01T10:00:02Z"`;
    const invalidCsv = `role,content
user,"missing timestamp"`;

    expect(importer.detect(validCsv)).toBe(true);
    expect(importer.detect(invalidCsv)).toBe(false);

    const result = await importer.parse(validCsv, defaultOptions);
    expect(result.conversations[0].messages).toHaveLength(2);
  });

  it('parses lightweight json transcript batches without requiring official export structure', async () => {
    const importer = new JSONTranscriptImporter();
    const data = {
      conversations: [
        {
          title: 'Thread A',
          provider: 'perplexity',
          messages: [
            { role: 'user', content: 'A1', timestamp: '2024-01-01T10:00:00Z' },
            { role: 'assistant', content: 'A2', timestamp: '2024-01-01T10:00:01Z' },
          ],
        },
        {
          title: 'Thread B',
          messages: [
            { role: 'user', content: 'B1', timestamp: '2024-01-01T11:00:00Z' },
          ],
        },
      ],
    };

    expect(importer.detect(data)).toBe(true);

    const result = await importer.parse(data, defaultOptions);

    expect(result.errors).toHaveLength(0);
    expect(result.conversations).toHaveLength(2);
    expect(result.conversations[0].session.title).toBe('Thread A');
    expect(result.conversations[1].messages[0].content).toBe('B1');
  });
});
