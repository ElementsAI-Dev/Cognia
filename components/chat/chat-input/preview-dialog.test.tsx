/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PreviewDialog } from './preview-dialog';
import type { Attachment } from '../chat-input';

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => 
    <h2 data-testid="dialog-title">{children}</h2>,
}));

// Mock utils
jest.mock('./utils', () => ({
  formatFileSize: (size: number) => `${size} bytes`,
  getFileIcon: () => <span data-testid="file-icon">File</span>,
}));

describe('PreviewDialog', () => {
  const mockAttachment: Attachment = {
    id: '1',
    name: 'test-image.png',
    type: 'image',
    mimeType: 'image/png',
    size: 1024,
    url: 'data:image/png;base64,test',
  };

  const defaultProps = {
    attachment: mockAttachment,
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when attachment is provided', () => {
    render(<PreviewDialog {...defaultProps} />);
    
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when attachment is null', () => {
    render(<PreviewDialog attachment={null} onOpenChange={jest.fn()} />);
    
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays attachment name', () => {
    render(<PreviewDialog {...defaultProps} />);
    
    expect(screen.getByText('test-image.png')).toBeInTheDocument();
  });

  it('renders image preview for image attachments', () => {
    render(<PreviewDialog {...defaultProps} />);
    
    const img = screen.queryByRole('img');
    expect(img).toBeInTheDocument();
  });

  it('renders audio player for audio attachments', () => {
    const audioAttachment: Attachment = {
      ...mockAttachment,
      type: 'audio',
      mimeType: 'audio/mp3',
      name: 'audio.mp3',
    };
    
    render(<PreviewDialog attachment={audioAttachment} onOpenChange={jest.fn()} />);
    
    expect(screen.getByText('audio.mp3')).toBeInTheDocument();
  });
});
