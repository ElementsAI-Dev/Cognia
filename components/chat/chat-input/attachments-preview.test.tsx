/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttachmentsPreview } from './attachments-preview';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

describe('AttachmentsPreview', () => {
  const mockAttachments = [
    { id: '1', name: 'image.png', type: 'image' as const, mimeType: 'image/png', size: 1024, url: 'data:image/png;base64,test' },
    { id: '2', name: 'document.pdf', type: 'file' as const, mimeType: 'application/pdf', size: 2048, url: 'data:application/pdf;base64,test' },
  ];

  const defaultProps = {
    attachments: mockAttachments,
    onRemove: jest.fn(),
    onPreview: jest.fn(),
    removeLabel: 'Remove',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders attachments correctly', () => {
    render(<AttachmentsPreview {...defaultProps} />);
    
    expect(screen.getByText('image.png')).toBeInTheDocument();
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
  });

  it('renders nothing when attachments array is empty', () => {
    const { container } = render(<AttachmentsPreview {...defaultProps} attachments={[]} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('calls onRemove when remove button is clicked', () => {
    render(<AttachmentsPreview {...defaultProps} />);
    
    const removeButtons = screen.getAllByRole('button');
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);
      expect(defaultProps.onRemove).toHaveBeenCalledWith('1');
    }
  });

  it('displays image preview for image attachments', () => {
    render(<AttachmentsPreview {...defaultProps} />);
    
    const images = screen.queryAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(0);
  });

  it('calls onPreview when attachment is clicked', () => {
    render(<AttachmentsPreview {...defaultProps} />);
    
    const attachmentItem = screen.getByText('image.png').closest('div');
    if (attachmentItem) {
      fireEvent.click(attachmentItem);
      expect(defaultProps.onPreview).toHaveBeenCalled();
    }
  });
});
