'use client';

import { Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownRenderer } from '@/components/chat/utils/markdown-renderer';

interface RulesEditorPreviewProps {
  content: string;
}

export function RulesEditorPreview({ content }: RulesEditorPreviewProps) {
  const t = useTranslations('rules');

  return (
    <div className="h-full border-l bg-muted/5">
      <ScrollArea className="h-full">
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            <Eye className="h-3 w-3" />
            {t('preview')}
          </div>
          <MarkdownRenderer content={content || `# ${t('noContent')}`} className="max-w-none" />
        </div>
      </ScrollArea>
    </div>
  );
}
