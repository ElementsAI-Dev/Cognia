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
jest.mock('@/lib/export/image-export', () => ({
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
    expect(screen.getByText('导出图片')).toBeInTheDocument();
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
      expect(screen.getByText('导出为图片')).toBeInTheDocument();
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
      expect(screen.getByText('浅色')).toBeInTheDocument();
      expect(screen.getByText('深色')).toBeInTheDocument();
      expect(screen.getByText('跟随系统')).toBeInTheDocument();
    });
  });

  it('should display resolution options', async () => {
    renderWithProviders(<ImageExportDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('1x (标准)')).toBeInTheDocument();
      expect(screen.getByText('2x (高清)')).toBeInTheDocument();
      expect(screen.getByText('3x (超清)')).toBeInTheDocument();
    });
  });

  it('should display export options', async () => {
    renderWithProviders(<ImageExportDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('包含标题头')).toBeInTheDocument();
      expect(screen.getByText('包含页脚')).toBeInTheDocument();
      expect(screen.getByText('显示时间戳')).toBeInTheDocument();
      expect(screen.getByText('显示模型信息')).toBeInTheDocument();
    });
  });

  it('should display estimated size', async () => {
    renderWithProviders(<ImageExportDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText(/预估大小/)).toBeInTheDocument();
    });
  });

  it('should display action buttons', async () => {
    renderWithProviders(<ImageExportDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('复制图片')).toBeInTheDocument();
      expect(screen.getByText(/下载/)).toBeInTheDocument();
    });
  });

  it('should call downloadAsImage when download button is clicked', async () => {
    const imageExport = await import('@/lib/export/image-export');
    
    renderWithProviders(<ImageExportDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText(/下载 PNG/)).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText(/下载 PNG/));
    
    await waitFor(() => {
      expect(imageExport.downloadAsImage).toHaveBeenCalled();
    });
  });

  it('should call copyImageToClipboard when copy button is clicked', async () => {
    const imageExport = await import('@/lib/export/image-export');
    
    renderWithProviders(<ImageExportDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('复制图片')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('复制图片'));
    
    await waitFor(() => {
      expect(imageExport.copyImageToClipboard).toHaveBeenCalled();
    });
  });

  it('should display preview section', async () => {
    renderWithProviders(<ImageExportDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('预览')).toBeInTheDocument();
    });
  });
});
