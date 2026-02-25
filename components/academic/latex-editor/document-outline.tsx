'use client';

/**
 * Document Outline Component
 * Parses LaTeX content for section commands and displays a navigable outline tree.
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { List, ChevronRight } from 'lucide-react';

interface OutlineEntry {
  level: number;
  title: string;
  line: number;
}

interface DocumentOutlineProps {
  content: string;
  currentLine?: number;
  onNavigate?: (line: number) => void;
  className?: string;
}

const HEADING_LEVELS: Record<string, number> = {
  chapter: 0,
  section: 1,
  subsection: 2,
  subsubsection: 3,
  paragraph: 4,
};

function parseOutline(content: string): OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  const lines = content.split('\n');
  const pattern = /\\(chapter|section|subsection|subsubsection|paragraph)\*?\{/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(pattern);
    if (!match) continue;

    const command = match[1];
    const level = HEADING_LEVELS[command] ?? 1;

    // Extract title — handle nested braces
    const startIdx = lines[i].indexOf('{', match.index! + match[0].length - 1);
    let depth = 0;
    let title = '';
    let found = false;

    for (let j = startIdx; j < lines[i].length; j++) {
      if (lines[i][j] === '{') depth++;
      else if (lines[i][j] === '}') depth--;
      if (depth === 0) {
        title = lines[i].slice(startIdx + 1, j);
        found = true;
        break;
      }
    }

    if (!found) {
      title = lines[i].slice(startIdx + 1).replace(/}.*$/, '');
    }

    // Strip inner LaTeX commands for display
    title = title
      .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
      .replace(/\\\\/g, '')
      .replace(/[{}]/g, '')
      .trim();

    if (title) {
      entries.push({ level, title, line: i + 1 });
    }
  }

  return entries;
}

function findCurrentSection(entries: OutlineEntry[], currentLine: number): number {
  let idx = -1;
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].line <= currentLine) idx = i;
    else break;
  }
  return idx;
}

export function DocumentOutline({ content, currentLine = 1, onNavigate, className }: DocumentOutlineProps) {
  const t = useTranslations('latex');
  const entries = useMemo(() => parseOutline(content), [content]);
  const activeIdx = useMemo(() => findCurrentSection(entries, currentLine), [entries, currentLine]);

  if (entries.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full text-muted-foreground p-4', className)}>
        <List className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">{t('outline.empty', { defaultValue: 'No sections found' })}</p>
        <p className="text-xs mt-1">{t('outline.hint', { defaultValue: 'Use \\section{} to add sections' })}</p>
      </div>
    );
  }

  // Determine minimum level for proper indentation
  const minLevel = Math.min(...entries.map((e) => e.level));

  return (
    <div className={cn('overflow-auto py-2', className)}>
      <div className="px-3 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {t('outline.title', { defaultValue: 'Outline' })}
      </div>
      <nav className="space-y-0.5">
        {entries.map((entry, idx) => {
          const indent = (entry.level - minLevel) * 16;
          const isActive = idx === activeIdx;

          return (
            <button
              key={`${entry.line}-${entry.title}`}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm rounded-sm transition-colors',
                'hover:bg-muted/60',
                isActive && 'bg-primary/10 text-primary font-medium',
                !isActive && 'text-foreground/80'
              )}
              style={{ paddingLeft: `${12 + indent}px` }}
              onClick={() => onNavigate?.(entry.line)}
              title={`Line ${entry.line}`}
            >
              <span className="flex items-center gap-1.5">
                <ChevronRight className={cn('h-3 w-3 shrink-0', entry.level > minLevel && 'opacity-40')} />
                <span className="truncate">{entry.title}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default DocumentOutline;
