import { render, screen, fireEvent } from '@testing-library/react';
import { ThumbnailNavigator } from './thumbnail-navigator';
import type { PPTSlide, PPTTheme } from '@/types/workflow';

// Mock ScrollArea component
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

const mockTheme: PPTTheme = {
  id: 'modern-light',
  name: 'Modern Light',
  primaryColor: '#3B82F6',
  secondaryColor: '#64748B',
  accentColor: '#10B981',
  backgroundColor: '#FFFFFF',
  textColor: '#1E293B',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  codeFont: 'monospace',
};

const mockSlides: PPTSlide[] = [
  {
    id: 'slide-1',
    order: 0,
    layout: 'title',
    title: 'Introduction',
    subtitle: '',
    content: '',
    bullets: [],
    elements: [],
  },
  {
    id: 'slide-2',
    order: 1,
    layout: 'title-content',
    title: 'Main Content',
    subtitle: '',
    content: '',
    bullets: ['Point 1', 'Point 2'],
    elements: [],
  },
  {
    id: 'slide-3',
    order: 2,
    layout: 'bullets',
    title: 'Summary',
    subtitle: '',
    content: '',
    bullets: ['A', 'B', 'C'],
    elements: [],
  },
];

describe('ThumbnailNavigator', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all slides as thumbnails', () => {
    render(
      <ThumbnailNavigator
        slides={mockSlides}
        theme={mockTheme}
        currentIndex={0}
        onSelect={mockOnSelect}
      />
    );

    // Check all slide numbers are displayed
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('displays slide titles in thumbnails', () => {
    render(
      <ThumbnailNavigator
        slides={mockSlides}
        theme={mockTheme}
        currentIndex={0}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
  });

  it('highlights the current slide', () => {
    render(
      <ThumbnailNavigator
        slides={mockSlides}
        theme={mockTheme}
        currentIndex={1}
        onSelect={mockOnSelect}
      />
    );

    const buttons = screen.getAllByRole('button');
    
    // Second button should have different styling (current slide)
    expect(buttons[1]).toHaveClass('border-white');
    expect(buttons[0]).not.toHaveClass('border-white');
    expect(buttons[2]).not.toHaveClass('border-white');
  });

  it('calls onSelect when a thumbnail is clicked', () => {
    render(
      <ThumbnailNavigator
        slides={mockSlides}
        theme={mockTheme}
        currentIndex={0}
        onSelect={mockOnSelect}
      />
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]); // Click third slide

    expect(mockOnSelect).toHaveBeenCalledWith(2);
  });

  it('renders with vertical orientation by default', () => {
    render(
      <ThumbnailNavigator
        slides={mockSlides}
        theme={mockTheme}
        currentIndex={0}
        onSelect={mockOnSelect}
      />
    );

    const container = screen.getByTestId('scroll-area');
    expect(container).toHaveClass('h-full');
  });

  it('renders with horizontal orientation when specified', () => {
    render(
      <ThumbnailNavigator
        slides={mockSlides}
        theme={mockTheme}
        currentIndex={0}
        onSelect={mockOnSelect}
        orientation="horizontal"
      />
    );

    const container = screen.getByTestId('scroll-area');
    expect(container).toHaveClass('w-full');
  });

  it('applies correct size classes for small size', () => {
    render(
      <ThumbnailNavigator
        slides={mockSlides}
        theme={mockTheme}
        currentIndex={0}
        onSelect={mockOnSelect}
        size="small"
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveClass('w-16', 'h-10');
  });

  it('applies correct size classes for medium size', () => {
    render(
      <ThumbnailNavigator
        slides={mockSlides}
        theme={mockTheme}
        currentIndex={0}
        onSelect={mockOnSelect}
        size="medium"
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveClass('w-24', 'h-14');
  });

  it('applies correct size classes for large size', () => {
    render(
      <ThumbnailNavigator
        slides={mockSlides}
        theme={mockTheme}
        currentIndex={0}
        onSelect={mockOnSelect}
        size="large"
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveClass('w-32', 'h-20');
  });

  it('applies theme background color to thumbnails', () => {
    render(
      <ThumbnailNavigator
        slides={mockSlides}
        theme={mockTheme}
        currentIndex={0}
        onSelect={mockOnSelect}
      />
    );

    const buttons = screen.getAllByRole('button');
    // Check that background color is applied
    expect(buttons[0]).toHaveStyle({ backgroundColor: mockTheme.backgroundColor });
  });

  it('handles empty slides array', () => {
    render(
      <ThumbnailNavigator
        slides={[]}
        theme={mockTheme}
        currentIndex={0}
        onSelect={mockOnSelect}
      />
    );

    // Should render scroll area but no buttons
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
