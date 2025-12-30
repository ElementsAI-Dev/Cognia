'use client';

/**
 * FootnoteBlock - Footnote renderer
 * Features:
 * - Numbered footnotes
 * - Hover preview
 * - Back-reference links
 * - Collapsible footnote section
 */

import { memo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ArrowUp, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface Footnote {
  id: string;
  content: React.ReactNode;
}

interface FootnoteRefProps {
  id: string;
  index: number;
  content?: React.ReactNode;
  className?: string;
}

/**
 * Inline footnote reference (superscript number)
 */
export const FootnoteRef = memo(function FootnoteRef({
  id,
  index,
  content,
  className,
}: FootnoteRefProps) {
  const footnoteId = `fn-${id}`;
  const refId = `fnref-${id}`;

  const ref = (
    <sup
      id={refId}
      className={cn(
        'text-primary cursor-pointer hover:underline text-xs font-medium ml-0.5',
        className
      )}
    >
      <a href={`#${footnoteId}`} className="no-underline">
        [{index}]
      </a>
    </sup>
  );

  if (!content) {
    return ref;
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{ref}</HoverCardTrigger>
      <HoverCardContent className="w-80 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-xs text-muted-foreground font-medium">[{index}]</span>
          <div className="flex-1">{content}</div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
});

interface FootnoteSectionProps {
  footnotes: Footnote[];
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  title?: string;
}

/**
 * Footnotes section at the bottom of content
 */
export const FootnoteSection = memo(function FootnoteSection({
  footnotes,
  className,
  collapsible = false,
  defaultOpen = true,
  title = 'Footnotes',
}: FootnoteSectionProps) {
  const _t = useTranslations('renderer');
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (footnotes.length === 0) {
    return null;
  }

  const content = (
    <ol className="list-decimal pl-6 space-y-2 text-sm text-muted-foreground">
      {footnotes.map((footnote, _index) => (
        <li
          key={footnote.id}
          id={`fn-${footnote.id}`}
          className="group hover:text-foreground transition-colors"
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">{footnote.content}</div>
            <a
              href={`#fnref-${footnote.id}`}
              className="text-xs text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
              title="Back to reference"
            >
              <ArrowUp className="h-3 w-3" />
            </a>
          </div>
        </li>
      ))}
    </ol>
  );

  if (collapsible) {
    return (
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cn('mt-8 pt-4 border-t', className)}
      >
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
          <Hash className="h-4 w-4" />
          <span>{title}</span>
          <span className="text-xs">({footnotes.length})</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 ml-auto transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">{content}</CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className={cn('mt-8 pt-4 border-t', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
        <Hash className="h-4 w-4" />
        <span>{title}</span>
        <span className="text-xs">({footnotes.length})</span>
      </div>
      {content}
    </div>
  );
});

/**
 * Inline footnote definition for immediate use
 */
interface InlineFootnoteProps {
  children: React.ReactNode;
  note: React.ReactNode;
  className?: string;
}

export const InlineFootnote = memo(function InlineFootnote({
  children,
  note,
  className,
}: InlineFootnoteProps) {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span
          className={cn(
            'border-b border-dotted border-muted-foreground cursor-help',
            className
          )}
        >
          {children}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 text-sm">{note}</HoverCardContent>
    </HoverCard>
  );
});

export default FootnoteSection;
