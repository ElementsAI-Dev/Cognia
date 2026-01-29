/**
 * StorageCleanupDialog Component Tests
 * Basic rendering tests
 */

import { render, screen } from '@testing-library/react';
import { StorageCleanupDialog } from './storage-cleanup-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the storage cleanup hook
jest.mock('@/hooks/storage', () => ({
  useStorageCleanup: () => ({
    cleanup: jest.fn().mockResolvedValue({ success: true, freedSpace: 1024, deletedItems: 5, errors: [], details: [] }),
    quickCleanup: jest.fn().mockResolvedValue({ success: true, freedSpace: 512, deletedItems: 2, errors: [], details: [] }),
    deepCleanup: jest.fn().mockResolvedValue({ success: true, freedSpace: 2048, deletedItems: 10, errors: [], details: [] }),
    previewCleanup: jest.fn().mockResolvedValue({ success: true, freedSpace: 1024, deletedItems: 5, errors: [], details: [] }),
    isRunning: false,
    lastResult: null,
    error: null,
  }),
}));

const mockFormatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

describe('StorageCleanupDialog', () => {
  const defaultProps = {
    formatBytes: mockFormatBytes,
    onCleanupComplete: jest.fn(),
    trigger: <button>Open Cleanup</button>,
  };

  it('should render the trigger button', () => {
    render(<StorageCleanupDialog {...defaultProps} />);
    expect(screen.getByText('Open Cleanup')).toBeInTheDocument();
  });

  it('should render without crashing', () => {
    const { container } = render(<StorageCleanupDialog {...defaultProps} />);
    expect(container).toBeInTheDocument();
  });

  it('should accept onCleanupComplete prop', () => {
    const onComplete = jest.fn();
    const { container } = render(<StorageCleanupDialog {...defaultProps} onCleanupComplete={onComplete} />);
    expect(container).toBeInTheDocument();
  });
});
