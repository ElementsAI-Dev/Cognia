/**
 * Tests for shared project utilities
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ProjectIcon, formatRelativeDate, formatFileSize } from './utils';

describe('ProjectIcon', () => {
  it('renders default Folder icon when no iconName provided', () => {
    const { container } = render(<ProjectIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders specified icon by name', () => {
    const { container } = render(<ProjectIcon iconName="Code" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('falls back to Folder for unknown icon name', () => {
    const { container } = render(<ProjectIcon iconName="NonExistentIcon" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('passes className prop', () => {
    const { container } = render(<ProjectIcon iconName="Star" className="h-5 w-5 text-red-500" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('h-5');
  });

  it('passes style prop', () => {
    const { container } = render(
      <ProjectIcon iconName="Rocket" style={{ color: '#FF0000' }} />
    );
    const svg = container.querySelector('svg');
    expect(svg?.style.color).toBe('rgb(255, 0, 0)');
  });

  it('renders all supported icons without error', () => {
    const icons = [
      'Folder', 'Code', 'BookOpen', 'Briefcase', 'GraduationCap',
      'Heart', 'Home', 'Lightbulb', 'Music', 'Palette',
      'PenTool', 'Rocket', 'Star', 'Target', 'Zap',
    ];

    for (const icon of icons) {
      const { container } = render(<ProjectIcon iconName={icon} />);
      expect(container.querySelector('svg')).toBeTruthy();
    }
  });
});

describe('formatRelativeDate', () => {
  const mockT = (key: string, values?: Record<string, unknown>) => {
    if (key === 'today') return 'Today';
    if (key === 'yesterday') return 'Yesterday';
    if (key === 'daysAgo' && values?.days) return `${values.days} days ago`;
    return key;
  };

  it('returns "Today" for today\'s date', () => {
    const now = new Date();
    expect(formatRelativeDate(now, mockT)).toBe('Today');
  });

  it('returns "Yesterday" for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatRelativeDate(yesterday, mockT)).toBe('Yesterday');
  });

  it('returns "X days ago" for 2-6 days', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    expect(formatRelativeDate(threeDaysAgo, mockT)).toBe('3 days ago');
  });

  it('returns locale date string for 7+ days', () => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const result = formatRelativeDate(twoWeeksAgo, mockT);
    // Should not be "Today", "Yesterday", or "X days ago"
    expect(result).not.toContain('days ago');
    expect(result).not.toBe('Today');
    expect(result).not.toBe('Yesterday');
  });

  it('handles Date object passed as date parameter', () => {
    const now = new Date();
    expect(formatRelativeDate(now, mockT)).toBe('Today');
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(10240)).toBe('10.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB');
    expect(formatFileSize(5242880)).toBe('5.0 MB');
    expect(formatFileSize(1572864)).toBe('1.5 MB');
  });
});
