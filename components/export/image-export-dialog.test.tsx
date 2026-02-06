/**
 * Tests for ImageExportDialog component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ImageExportDialog } from './image-export-dialog';
import type { Session } from '@/types';

// Mock the message repository
jest.mock('@/lib/db', () => ({
  messageRepository: {
    getBySessionId: jest.fn().mockResolvedValue([
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        createdAt: new Date(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there!',
        createdAt: new Date(),
      },
    ]),
  },
}));

// Mock the export functions
jest.mock('@/lib/export/image/image-export', () => ({
  downloadAsImage: jest.fn().mockResolvedValue(undefined),
  generateThumbnail: jest.fn().mockResolvedValue('data:image/png;base64,test'),
  copyImageToClipboard: jest.fn().mockResolvedValue(true),
  getImageExportFormats: jest.fn().mockReturnValue([
    { value: 'png', label: 'PNG', description: 'Lossless compression' },
    { value: 'jpg', label: 'JPG', description: 'Lossy compression' },
    { value: 'webp', label: 'WebP', description: 'Modern format' },
  ]),
  estimateImageSize: jest.fn().mockReturnValue('150 KB'),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockSession = {
  id: 'test-session',
  title: 'Test Conversation',
  provider: 'openai',
  model: 'gpt-4',
  mode: 'chat',
  createdAt: new Date(),
  updatedAt: new Date(),
} as Session;

const messages = {
  export: {
    share: 'Share',
    exportImage: 'Export as Image',
    exportAsImage: 'Export as Image',
    exportImageDescription: 'Export conversation as image for social media',
    imagePreview: 'Preview',
    imageFormatType: 'Format',
    imageTheme: 'Theme',
    lightTheme: 'Light',
    darkTheme: 'Dark',
    systemTheme: 'System',
    imageScale: 'Resolution',
    scale1x: '1x (Standard)',
    scale2x: '2x (HD)',
    scale3x: '3x (Ultra HD)',
    imageQuality: 'Quality',
    includeHeader: 'Include Header',
    includeFooter: 'Include Footer',
    showTimestampsOption: 'Show Timestamps',
    showModelOption: 'Show Model Info',
    messageCountLimit: '{count} messages (max {max})',
    estimatedSize: 'Est. Size',
    copyImageBtn: 'Copy Image',
    downloadFormat: 'Download {format}',
    copied: 'Copied!',
    imageExported: 'Image exported',
    exportFailed: 'Export failed',
    imageCopied: 'Image copied',
    copyFailed: 'Copy failed',
    copyFailedTryDownload: 'Copy failed, try download',
    exportingImage: 'Exporting...',
    previewPlaceholder: 'Preview will appear here',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('ImageExportDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render trigger button', () => {
    renderWithProviders(<ImageExportDialog session={mockSession} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Export as Image')).toBeInTheDocument();
  });

  it('should render custom trigger when provided', () => {
    renderWithProviders(
      <ImageExportDialog
        session={mockSession}
        trigger={<button data-testid="custom-trigger">Custom Export</button>}
      />
    );

    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });

  it('should open dialog when trigger is clicked', async () => {
    renderWithProviders(<ImageExportDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      // Dialog should open with description text
      expect(screen.getByText('Export conversation as image for social media')).toBeInTheDocument();
    });
  });

  it('should display format options', async () => {
    renderWithProviders(<ImageExportDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('PNG')).toBeInTheDocument();
      expect(screen.getByText('JPG')).toBeInTheDocument();
      expect(screen.getByText('WebP')).toBeInTheDocument();
    });
  });

  it('should display theme options', async () => {
    renderWithProviders(<ImageExportDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });
  });

  it('should display resolution options', async () => {
    renderWithProviders(<ImageExportDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('1x (Standard)')).toBeInTheDocument();
      expect(screen.getByText('2x (HD)')).toBeInTheDocument();
      expect(screen.getByText('3x (Ultra HD)')).toBeInTheDocument();
    });
  });

  it('should display export options', async () => {
    renderWithProviders(<ImageExportDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Include Header')).toBeInTheDocument();
      expect(screen.getByText('Include Footer')).toBeInTheDocument();
      expect(screen.getByText('Show Timestamps')).toBeInTheDocument();
      expect(screen.getByText('Show Model Info')).toBeInTheDocument();
    });
  });

  it('should display estimated size', async () => {
    renderWithProviders(<ImageExportDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      // Badge shows estimated size
      expect(screen.getByText(/150 KB/)).toBeInTheDocument();
    });
  });

  it('should display action buttons', async () => {
    renderWithProviders(<ImageExportDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Copy Image')).toBeInTheDocument();
      expect(screen.getByText(/Download/)).toBeInTheDocument();
    });
  });

  it('should call downloadAsImage when download button is clicked', async () => {
    const imageExport = await import('@/lib/export/image/image-export');

    renderWithProviders(<ImageExportDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/Download PNG/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Download PNG/));

    await waitFor(() => {
      expect(imageExport.downloadAsImage).toHaveBeenCalled();
    });
  });

  it('should call copyImageToClipboard when copy button is clicked', async () => {
    const imageExport = await import('@/lib/export/image/image-export');

    renderWithProviders(<ImageExportDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Copy Image')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Copy Image'));

    await waitFor(() => {
      expect(imageExport.copyImageToClipboard).toHaveBeenCalled();
    });
  });

  it('should display preview section', async () => {
    renderWithProviders(<ImageExportDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });
  });
});
