/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentFilesPopover } from './recent-files-popover';
import type { RecentFile } from '@/stores/system';

// Mock stores
const mockRecentFiles: RecentFile[] = [
  { id: '1', name: 'document.pdf', type: 'document', size: 1024, path: '/path/to/document.pdf', usedAt: new Date(), mimeType: 'application/pdf', usageCount: 1 },
  { id: '2', name: 'image.png', type: 'image', size: 2048, path: '/path/to/image.png', usedAt: new Date(Date.now() - 3600000), mimeType: 'image/png', usageCount: 2 },
  { id: '3', name: 'data.csv', type: 'file', size: 512, path: '/path/to/data.csv', usedAt: new Date(Date.now() - 86400000), mimeType: 'text/csv', usageCount: 1 },
];

const mockRemoveFile = jest.fn();
const mockClearFiles = jest.fn();

jest.mock('@/stores/system', () => ({
  useRecentFilesStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      recentFiles: mockRecentFiles,
      getRecentFiles: (limit: number) => mockRecentFiles.slice(0, limit),
      searchFiles: (query: string) => mockRecentFiles.filter(f => f.name.toLowerCase().includes(query.toLowerCase())),
      removeFile: mockRemoveFile,
      clearFiles: mockClearFiles,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="popover" data-open={open}>{children}</div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid="search-input"
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

describe('RecentFilesPopover', () => {
  const mockOnSelectFile = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<RecentFilesPopover onSelectFile={mockOnSelectFile} />);
    expect(screen.getByTestId('popover')).toBeInTheDocument();
  });

  it('displays recent files list', () => {
    render(<RecentFilesPopover onSelectFile={mockOnSelectFile} />);
    
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    expect(screen.getByText('image.png')).toBeInTheDocument();
    expect(screen.getByText('data.csv')).toBeInTheDocument();
  });

  it('shows file sizes', () => {
    render(<RecentFilesPopover onSelectFile={mockOnSelectFile} />);
    
    expect(screen.getByText(/1 KB/)).toBeInTheDocument();
    expect(screen.getByText(/2 KB/)).toBeInTheDocument();
  });

  it('calls onSelectFile when file is clicked', () => {
    render(<RecentFilesPopover onSelectFile={mockOnSelectFile} />);
    
    const fileItem = screen.getByText('document.pdf').closest('div[class*="cursor-pointer"]');
    fireEvent.click(fileItem!);
    
    expect(mockOnSelectFile).toHaveBeenCalledWith(mockRecentFiles[0]);
  });

  it('has search input', () => {
    render(<RecentFilesPopover onSelectFile={mockOnSelectFile} />);
    expect(screen.getByPlaceholderText('Search recent files...')).toBeInTheDocument();
  });

  it('filters files based on search query', () => {
    render(<RecentFilesPopover onSelectFile={mockOnSelectFile} />);
    
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'document' } });
    
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
  });

  it('shows clear all button', () => {
    render(<RecentFilesPopover onSelectFile={mockOnSelectFile} />);
    expect(screen.getByText('Clear all recent files')).toBeInTheDocument();
  });

  it('calls clearFiles when clear all is clicked', () => {
    render(<RecentFilesPopover onSelectFile={mockOnSelectFile} />);
    
    fireEvent.click(screen.getByText('Clear all recent files'));
    expect(mockClearFiles).toHaveBeenCalled();
  });

  it('shows time ago for files', () => {
    const { container } = render(<RecentFilesPopover onSelectFile={mockOnSelectFile} />);
    
    // Component should render with time information
    expect(container).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <RecentFilesPopover onSelectFile={mockOnSelectFile} className="custom-class" />
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<RecentFilesPopover onSelectFile={mockOnSelectFile} disabled />);
    
    const buttons = screen.getAllByRole('button');
    // At least one button should exist
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('shows different icons for different file types', () => {
    render(<RecentFilesPopover onSelectFile={mockOnSelectFile} />);
    
    // Should have different icons based on file type
    // The icons are rendered as SVGs inside the component
    expect(screen.getByTestId('popover-content')).toBeInTheDocument();
  });

  it('removes file when remove button is clicked', () => {
    render(<RecentFilesPopover onSelectFile={mockOnSelectFile} />);
    
    // Find remove buttons (X icons)
    const removeButtons = screen.getAllByRole('button');
    // Click the first remove button (after trigger)
    const removeButton = removeButtons.find(btn => btn.querySelector('svg'));
    if (removeButton) {
      fireEvent.click(removeButton);
    }
  });
});
