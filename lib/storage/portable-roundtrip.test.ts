import { exportToPortableChatArchive } from '@/lib/export';
import type { Session, UIMessage } from '@/types';
import { parseImport } from './import-registry';

describe('portable archive roundtrip', () => {
  it('round-trips exported conversations through the portability pipeline', async () => {
    const session: Session = {
      id: 'session-1',
      title: 'Roundtrip Session',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:30Z'),
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      mode: 'research',
    };
    const messages: UIMessage[] = [
      {
        id: 'message-1',
        role: 'user',
        content: 'Hello portable archive',
        createdAt: new Date('2024-01-15T10:00:05Z'),
      },
      {
        id: 'message-2',
        role: 'assistant',
        content: 'Hello back',
        createdAt: new Date('2024-01-15T10:00:10Z'),
        attachments: [
          {
            id: 'attachment-1',
            name: 'preview.png',
            type: 'image',
            url: 'https://example.com/preview.png',
            size: 123,
            mimeType: 'image/png',
          },
        ],
      },
    ];

    const exported = exportToPortableChatArchive({
      session,
      messages,
      exportedAt: new Date('2024-01-15T12:00:00Z'),
    });
    const archive = JSON.parse(exported);

    expect(archive.conversations[0].metadata.session).toMatchObject({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      mode: 'research',
    });

    const parsed = await parseImport(exported);

    expect(parsed.format).toBe('portable');
    expect(parsed.conversations).toHaveLength(1);
    expect(parsed.conversations[0].session.title).toBe('Roundtrip Session');
    expect(parsed.conversations[0].session.provider).toBe('anthropic');
    expect(parsed.conversations[0].session.model).toBe('claude-sonnet-4-20250514');
    expect(parsed.conversations[0].session.mode).toBe('research');
    expect(parsed.conversations[0].messages[1].attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'preview.png', type: 'image' }),
      ])
    );
  });
});
