/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      previousVersion: 'Previous version',
      currentVersion: 'Current version',
    };
    return translations[key] || key;
  },
}));

// Mock scroll-area
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

import { VersionDiffView } from './version-diff-view';

describe('VersionDiffView', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <VersionDiffView oldContent="hello" newContent="hello" />
    );
    expect(container).toBeInTheDocument();
  });

  it('shows no diff for identical content', () => {
    const { container } = render(
      <VersionDiffView oldContent="line1\nline2" newContent="line1\nline2" />
    );
    // No + or - indicators for unchanged content
    expect(container.textContent).not.toContain('+');
    expect(container.textContent).not.toContain('-');
  });

  it('shows added lines with + indicator', () => {
    render(
      <VersionDiffView oldContent="line1" newContent="line1\nline2" />
    );
    // Should show +1 in the stats
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('shows removed lines with - indicator', () => {
    render(
      <VersionDiffView oldContent="line1\nline2" newContent="line1" />
    );
    // Should show -1 in the stats
    expect(screen.getByText('-1')).toBeInTheDocument();
  });

  it('shows both added and removed for modifications', () => {
    render(
      <VersionDiffView oldContent="old line" newContent="new line" />
    );
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('-1')).toBeInTheDocument();
  });

  it('displays custom labels', () => {
    render(
      <VersionDiffView
        oldContent="a"
        newContent="b"
        oldLabel="v1"
        newLabel="v2"
      />
    );
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
  });

  it('displays default labels from translations', () => {
    render(
      <VersionDiffView oldContent="a" newContent="b" />
    );
    expect(screen.getByText('Previous version')).toBeInTheDocument();
    expect(screen.getByText('Current version')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <VersionDiffView oldContent="a" newContent="a" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles empty strings', () => {
    const { container } = render(
      <VersionDiffView oldContent="" newContent="" />
    );
    expect(container).toBeInTheDocument();
  });

  it('handles large diffs correctly', () => {
    const oldContent = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n');
    const newContent = Array.from({ length: 20 }, (_, i) => `line ${i === 10 ? 'CHANGED' : i}`).join('\n');
    render(
      <VersionDiffView oldContent={oldContent} newContent={newContent} />
    );
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('-1')).toBeInTheDocument();
  });
});
