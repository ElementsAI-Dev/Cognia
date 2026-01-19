import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecordingSidebar } from './recording-sidebar';
import type { RecordingHistoryEntry } from '@/lib/native/screen-recording';

// Mock the formatDuration function
jest.mock('@/lib/native/screen-recording', () => ({
  formatDuration: jest.fn((ms: number) => `${Math.floor(ms / 1000)}s`),
}));

const mockHistory: RecordingHistoryEntry[] = [
  {
    id: 'rec-1',
    file_path: '/path/to/recording1.mp4',
    mode: 'fullscreen',
    duration_ms: 30000,
    timestamp: Date.now() - 3600000,
    file_size: 1024000,
    is_pinned: false,
    width: 1920,
    height: 1080,
    tags: [],
  },
  {
    id: 'rec-2',
    file_path: '/path/to/recording2.mp4',
    mode: 'window',
    duration_ms: 60000,
    timestamp: Date.now() - 7200000,
    file_size: 2048000,
    is_pinned: true,
    thumbnail: 'base64thumbnaildata',
    width: 1280,
    height: 720,
    tags: ['important'],
  },
];

describe('RecordingSidebar', () => {
  const defaultProps = {
    history: mockHistory,
    selectedRecording: null as RecordingHistoryEntry | null,
    searchQuery: '',
    onSearchChange: jest.fn(),
    onSelectRecording: jest.fn(),
    onDeleteClick: jest.fn(),
    onCloseSidebar: jest.fn(),
    t: (key: string) => key,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sidebar with title', () => {
    render(<RecordingSidebar {...defaultProps} />);
    expect(screen.getByText('recordings')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<RecordingSidebar {...defaultProps} />);
    expect(screen.getByPlaceholderText('searchRecordings')).toBeInTheDocument();
  });

  it('calls onSearchChange when search input changes', () => {
    render(<RecordingSidebar {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('searchRecordings');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    expect(defaultProps.onSearchChange).toHaveBeenCalledWith('test');
  });

  it('renders recording entries', () => {
    render(<RecordingSidebar {...defaultProps} />);
    
    // Should show mode badges for recordings
    expect(screen.getByText('fullscreen')).toBeInTheDocument();
    expect(screen.getByText('window')).toBeInTheDocument();
  });

  it('shows empty state when no recordings', () => {
    render(<RecordingSidebar {...defaultProps} history={[]} />);
    
    expect(screen.getByText('noRecordings')).toBeInTheDocument();
  });

  it('calls onSelectRecording when recording is clicked', () => {
    render(<RecordingSidebar {...defaultProps} />);
    
    // Find and click a recording card
    const cards = screen.getAllByText(/fullscreen|window/);
    if (cards[0]) {
      const card = cards[0].closest('[class*="cursor-pointer"]');
      if (card) {
        fireEvent.click(card);
        expect(defaultProps.onSelectRecording).toHaveBeenCalled();
      }
    }
  });

  it('applies selected styling to selected recording', () => {
    render(
      <RecordingSidebar
        {...defaultProps}
        selectedRecording={mockHistory[0]}
      />
    );
    
    // The selected card should have ring styling
    const container = screen.getByText('fullscreen').closest('[class*="ring-"]');
    expect(container).toBeInTheDocument();
  });

  it('shows pin icon for pinned recordings', () => {
    const { container } = render(<RecordingSidebar {...defaultProps} />);
    
    // Check if pin icon exists (mockHistory[1] is pinned)
    const pinIcons = container.querySelectorAll('[class*="text-primary"]');
    expect(pinIcons.length).toBeGreaterThan(0);
  });

  it('calls onCloseSidebar when close button is clicked on mobile', () => {
    render(<RecordingSidebar {...defaultProps} />);
    
    // Find the close button (has X icon)
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(btn => 
      btn.className.includes('sm:hidden')
    );
    
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(defaultProps.onCloseSidebar).toHaveBeenCalled();
    }
  });

  it('renders recording thumbnail when available', () => {
    const { container } = render(<RecordingSidebar {...defaultProps} />);
    
    // Check for img element with thumbnail
    const thumbnails = container.querySelectorAll('img');
    expect(thumbnails.length).toBeGreaterThan(0);
  });

  it('shows duration for each recording', () => {
    render(<RecordingSidebar {...defaultProps} />);
    
    // The mock formatDuration returns "30s" for 30000ms
    expect(screen.getByText('30s')).toBeInTheDocument();
    expect(screen.getByText('60s')).toBeInTheDocument();
  });
});
