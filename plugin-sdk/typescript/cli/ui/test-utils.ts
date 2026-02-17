import React from 'react';

function extractText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => extractText(child)).join('');
  }

  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode } & Record<string, unknown>;

    if (typeof node.type === 'function') {
      return extractText((node.type as (componentProps: Record<string, unknown>) => React.ReactNode)(props));
    }

    return extractText(props.children);
  }

  return '';
}

/**
 * Minimal renderer for CLI component tests. It executes the root component and
 * extracts plain text from the returned React tree.
 */
export function render(element: React.ReactElement): { lastFrame: () => string } {
  const frame = extractText(element);

  return {
    lastFrame: () => frame,
  };
}
