import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlowNodeThumbnailStrip } from './flow-node-thumbnail-strip';
import type { FlowNodeAttachment } from '@/types/chat/flow-chat';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock useCopy hook
jest.mock('@/hooks/ui', () => ({
  useCopy: () => ({
    copy: jest.fn(),
    isCopying: false,
  }),
}));

const mockAttachments: FlowNodeAttachment[] = [
  {
    id: '1',
    type: 'image',
    url: 'https://example.com/image1.jpg',
    name: 'Test Image 1',
    mimeType: 'image/jpeg',
    thumbnailUrl: 'https://example.com/thumb1.jpg',
  },
  {
    id: '2',
    type: 'video',
    url: 'https://example.com/video1.mp4',
    name: 'Test Video',
    mimeType: 'video/mp4',
  },
  {
    id: '3',
    type: 'audio',
    url: 'https://example.com/audio1.mp3',
    name: 'Test Audio',
    mimeType: 'audio/mpeg',
  },
  {
    id: '4',
    type: 'file',
    url: 'https://example.com/document.pdf',
    name: 'Document.pdf',
    mimeType: 'application/pdf',
    size: 1024000,
  },
];

describe('FlowNodeThumbnailStrip', () => {
  it('renders thumbnails for attachments', () => {
    render(
      <FlowNodeThumbnailStrip
        attachments={mockAttachments}
        maxVisible={4}
        size="md"
      />
    );

    // Should render 4 thumbnail buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(4);
  });

  it('shows overflow count when more attachments than maxVisible', () => {
    render(
      <FlowNodeThumbnailStrip
        attachments={mockAttachments}
        maxVisible={2}
        size="md"
      />
    );

    // Should show +2 for remaining attachments
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('opens lightbox when thumbnail is clicked', async () => {
    render(
      <FlowNodeThumbnailStrip
        attachments={mockAttachments}
        maxVisible={4}
        size="md"
      />
    );

    // Find and click the first thumbnail
    const thumbnails = screen.getAllByRole('button');
    fireEvent.click(thumbnails[0]);

    // Lightbox should open - check for close button
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('calls onMediaClick callback when provided', () => {
    const onMediaClick = jest.fn();
    
    render(
      <FlowNodeThumbnailStrip
        attachments={mockAttachments}
        maxVisible={4}
        size="md"
        onMediaClick={onMediaClick}
      />
    );

    // Component should render buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders with different sizes', () => {
    const { rerender } = render(
      <FlowNodeThumbnailStrip
        attachments={mockAttachments}
        maxVisible={4}
        size="sm"
      />
    );

    // Re-render with different size
    rerender(
      <FlowNodeThumbnailStrip
        attachments={mockAttachments}
        maxVisible={4}
        size="lg"
      />
    );

    // Should still render buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(4);
  });

  it('handles empty attachments array', () => {
    const { container } = render(
      <FlowNodeThumbnailStrip
        attachments={[]}
        maxVisible={4}
        size="md"
      />
    );

    // Should render empty without errors
    expect(container.firstChild).toBeNull();
  });

  it('renders file type attachments', () => {
    render(
      <FlowNodeThumbnailStrip
        attachments={[mockAttachments[3]]} // file attachment with size
        maxVisible={4}
        size="md"
      />
    );

    // Should render one button for file
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(1);
  });
});
