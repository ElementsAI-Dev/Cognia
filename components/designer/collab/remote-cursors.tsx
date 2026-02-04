'use client';

/**
 * RemoteCursors - Renders remote user cursors and selections in the editor
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { RemoteCursor } from '@/types/canvas/collaboration';

export interface RemoteCursorsProps {
  cursors: RemoteCursor[];
  lineHeight?: number;
  characterWidth?: number;
  className?: string;
  editorOffset?: { top: number; left: number };
}

export function RemoteCursors({
  cursors,
  lineHeight = 20,
  characterWidth = 8,
  className,
  editorOffset = { top: 0, left: 0 },
}: RemoteCursorsProps) {
  const visibleCursors = useMemo(() => {
    return cursors.filter((cursor) => cursor.position);
  }, [cursors]);

  if (visibleCursors.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden="true"
    >
      {visibleCursors.map((cursor) => (
        <RemoteCursorItem
          key={cursor.participantId}
          cursor={cursor}
          lineHeight={lineHeight}
          characterWidth={characterWidth}
          editorOffset={editorOffset}
        />
      ))}
    </div>
  );
}

interface RemoteCursorItemProps {
  cursor: RemoteCursor;
  lineHeight: number;
  characterWidth: number;
  editorOffset: { top: number; left: number };
}

function RemoteCursorItem({
  cursor,
  lineHeight,
  characterWidth,
  editorOffset,
}: RemoteCursorItemProps) {
  const top = (cursor.position.line - 1) * lineHeight + editorOffset.top;
  const left = cursor.position.column * characterWidth + editorOffset.left;

  return (
    <div className="absolute" style={{ top, left }}>
      <div
        className="relative h-5 w-0.5 animate-pulse"
        style={{ backgroundColor: cursor.color, height: lineHeight }}
      />
      <div
        className="absolute -top-5 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-white shadow-sm"
        style={{ backgroundColor: cursor.color }}
      >
        {cursor.name}
      </div>
      {cursor.selection && (
        <RemoteSelection
          selection={cursor.selection}
          color={cursor.color}
          lineHeight={lineHeight}
          characterWidth={characterWidth}
          cursorPosition={cursor.position}
        />
      )}
    </div>
  );
}

interface RemoteSelectionProps {
  selection: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  color: string;
  lineHeight: number;
  characterWidth: number;
  cursorPosition: { line: number; column: number };
}

function RemoteSelection({
  selection,
  color,
  lineHeight,
  characterWidth,
  cursorPosition,
}: RemoteSelectionProps) {
  const isSingleLine = selection.startLine === selection.endLine;

  if (isSingleLine) {
    const width = (selection.endColumn - selection.startColumn) * characterWidth;
    const offsetLeft = (selection.startColumn - cursorPosition.column) * characterWidth;
    const offsetTop = (selection.startLine - cursorPosition.line) * lineHeight;

    return (
      <div
        className="absolute opacity-30"
        style={{
          backgroundColor: color,
          left: offsetLeft,
          top: offsetTop,
          width: Math.max(width, 2),
          height: lineHeight,
        }}
      />
    );
  }

  const lines = [];
  for (let line = selection.startLine; line <= selection.endLine; line++) {
    const isFirstLine = line === selection.startLine;
    const isLastLine = line === selection.endLine;

    const startCol = isFirstLine ? selection.startColumn : 0;
    const endCol = isLastLine ? selection.endColumn : 80;

    const width = (endCol - startCol) * characterWidth;
    const offsetLeft = (startCol - cursorPosition.column) * characterWidth;
    const offsetTop = (line - cursorPosition.line) * lineHeight;

    lines.push(
      <div
        key={line}
        className="absolute opacity-30"
        style={{
          backgroundColor: color,
          left: offsetLeft,
          top: offsetTop,
          width: Math.max(width, 2),
          height: lineHeight,
        }}
      />
    );
  }

  return <>{lines}</>;
}

export default RemoteCursors;
