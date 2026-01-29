/**
 * StorageBreakdown Component Tests
 * Basic rendering tests
 */

import { render } from '@testing-library/react';
import { StorageBreakdown } from './storage-breakdown';
import type { StorageCategoryInfo } from '@/lib/storage';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockCategories: StorageCategoryInfo[] = [
  { category: 'settings', displayName: 'Settings', description: '', icon: 'settings', keys: [], totalSize: 1024, itemCount: 5 },
  { category: 'session', displayName: 'Sessions', description: '', icon: 'chat', keys: [], totalSize: 2048, itemCount: 10 },
];

const mockFormatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

describe('StorageBreakdown', () => {
  const defaultProps = {
    categories: mockCategories,
    totalSize: 4096,
    formatBytes: mockFormatBytes,
    onClearCategory: jest.fn(),
    isClearing: false,
  };

  it('should render without crashing', () => {
    const { container } = render(<StorageBreakdown {...defaultProps} />);
    expect(container).toBeInTheDocument();
  });

  it('should handle empty categories', () => {
    const { container } = render(<StorageBreakdown {...defaultProps} categories={[]} />);
    expect(container).toBeInTheDocument();
  });

  it('should handle zero total size', () => {
    const { container } = render(
      <StorageBreakdown {...defaultProps} categories={[]} totalSize={0} />
    );
    expect(container).toBeInTheDocument();
  });

  it('should accept isClearing prop', () => {
    const { container } = render(<StorageBreakdown {...defaultProps} isClearing={true} />);
    expect(container).toBeInTheDocument();
  });

  it('should accept className prop', () => {
    const { container } = render(<StorageBreakdown {...defaultProps} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
