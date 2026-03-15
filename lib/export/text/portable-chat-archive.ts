import type { RichExportData } from './rich-markdown';
import { buildPortableArchive, buildPortableConversation } from '@/lib/storage/import-portable';

export function exportToPortableChatArchive(data: RichExportData): string {
  const conversation = buildPortableConversation({
    session: data.session,
    messages: data.messages,
    sourceFormat: 'portable',
    sourceType: 'portable',
    compatibility: 'official',
    metadata: {
      exportedAt: data.exportedAt.toISOString(),
      includeMetadata: data.includeMetadata ?? true,
      includeAttachments: data.includeAttachments ?? true,
      includeTokens: data.includeTokens ?? false,
    },
  });

  return JSON.stringify(buildPortableArchive([conversation], data.exportedAt), null, 2);
}
