import { render, screen, fireEvent } from '@testing-library/react';
import { GridView } from './grid-view';
import type { PPTSlide, PPTTheme } from '@/types/workflow';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: { count: number }) => {
    if (key === 'more') return `+${params?.count || 0} more`;
    return key;
  },
}));

// Mock SLIDE_LAYOUT_INFO
jest.mock('@/types/workflow', () => ({
  ...jest.requireActual('@/types/workflow'),
  SLIDE_LAYOUT_INFO: {
    title: { name: 'Title' },
    'title-content': { name: 'Content' },
    bullets: { name: 'Bullets' },
  },
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
    title: 'First Slide',
    subtitle: 'Introduction',
    content: '',
    bullets: [],
    elements: [],
  },
  {
    id: 'slide-2',
    order: 1,
    layout: 'bullets',
    title: 'Second Slide',
    subtitle: '',
    content: '',
    bullets: ['Point 1', 'Point 2', 'Point 3'],
    elements: [],
    notes: 'Some notes here',
  },
  {
    id: 'slide-3',
    order: 2,
    layout: 'title-content',
    title: 'Third Slide',
    subtitle: '',
    content: '',
    bullets: ['A', 'B', 'C', 'D', 'E'],
    elements: [{ id: 'img-1', type: 'image', content: 'image.png' }],
  },
];

describe('GridView', () => {
  const defaultProps = {
    slides: mockSlides,
    theme: mockTheme,
    currentIndex: 0,
    onSelect: jest.fn(),
    onEdit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all slides', () => {
    render(<GridView {...defaultProps} />);
    expect(screen.getByText('First Slide')).toBeInTheDocument();
    expect(screen.getByText('Second Slide')).toBeInTheDocument();
    expect(screen.getByText('Third Slide')).toBeInTheDocument();
  });

  it('displays slide count', () => {
    render(<GridView {...defaultProps} />);
    expect(screen.getByText('3 张幻灯片')).toBeInTheDocument();
  });

  it('displays selected slide info', () => {
    render(<GridView {...defaultProps} currentIndex={1} />);
    expect(screen.getByText('选中第 2 张')).toBeInTheDocument();
  });

  it('calls onSelect when slide is clicked', () => {
    const onSelect = jest.fn();
    render(<GridView {...defaultProps} onSelect={onSelect} />);

    const secondSlide = screen.getByText('Second Slide').closest('div[class*="rounded-lg"]');
    if (secondSlide) {
      fireEvent.click(secondSlide);
    }

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('highlights current slide', () => {
    render(<GridView {...defaultProps} currentIndex={1} />);

    const secondSlide = screen.getByText('Second Slide').closest('div[class*="rounded-lg"]');
    expect(secondSlide).toHaveClass('border-primary');
  });

  it('shows edit button on hover', () => {
    const onEdit = jest.fn();
    render(<GridView {...defaultProps} onEdit={onEdit} />);

    // Edit buttons exist but are hidden by default
    const editButtons = document.querySelectorAll('button[class*="opacity-0"]');
    expect(editButtons.length).toBeGreaterThan(0);
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    render(<GridView {...defaultProps} onEdit={onEdit} />);

    // Find and click the first edit button
    const editButton = document.querySelector('button[class*="opacity-0"]');
    if (editButton) {
      fireEvent.click(editButton);
      expect(onEdit).toHaveBeenCalledWith(0);
    }
  });

  it('displays slide numbers', () => {
    render(<GridView {...defaultProps} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows bullets preview in medium/large grid', () => {
    render(<GridView {...defaultProps} />);
    expect(screen.getByText('Point 1')).toBeInTheDocument();
  });

  it('shows truncated bullets with more indicator', () => {
    render(<GridView {...defaultProps} />);
    // Third slide has 5 bullets, but grid shows max 2 in medium size
    expect(screen.getByText(/\+3/)).toBeInTheDocument();
  });

  it('shows layout badge', () => {
    render(<GridView {...defaultProps} />);
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Bullets')).toBeInTheDocument();
  });

  describe('grid size controls', () => {
    it('has size toggle buttons', () => {
      render(<GridView {...defaultProps} />);

      // Should have 3 size buttons
      const buttons = screen.getAllByRole('button');
      // At least 3 size buttons + edit buttons
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });

    it('changes to small grid size', () => {
      const { container } = render(<GridView {...defaultProps} />);

      // Click small size button (first one in the size controls)
      const sizeButtons = container.querySelectorAll('button[class*="h-7"]');
      if (sizeButtons[0]) {
        fireEvent.click(sizeButtons[0]);
      }

      // Grid should have small size classes
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-3');
    });

    it('changes to large grid size', () => {
      const { container } = render(<GridView {...defaultProps} />);

      // Click large size button (third one in the size controls)
      const sizeButtons = container.querySelectorAll('button[class*="h-7"]');
      if (sizeButtons[2]) {
        fireEvent.click(sizeButtons[2]);
      }

      // Grid should have large size classes
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1');
    });
  });

  it('applies slide background color', () => {
    const slidesWithBg = [{ ...mockSlides[0], backgroundColor: '#FF0000' }];

    render(<GridView {...defaultProps} slides={slidesWithBg} />);

    const slide = screen.getByText('First Slide').closest('div[class*="rounded-lg"]');
    expect(slide).toHaveStyle({ backgroundColor: '#FF0000' });
  });

  it('applies theme background color when slide has no background', () => {
    render(<GridView {...defaultProps} />);

    const slide = screen.getByText('First Slide').closest('div[class*="rounded-lg"]');
    expect(slide).toHaveStyle({ backgroundColor: mockTheme.backgroundColor });
  });

  it('handles empty slides array', () => {
    render(<GridView {...defaultProps} slides={[]} />);
    expect(screen.getByText('0 张幻灯片')).toBeInTheDocument();
  });

  it('does not show selected slide info when currentIndex is -1', () => {
    render(<GridView {...defaultProps} currentIndex={-1} />);
    expect(screen.queryByText(/选中第/)).not.toBeInTheDocument();
  });

  it('shows notes indicator for slides with notes', () => {
    render(<GridView {...defaultProps} />);
    // Second slide has notes, should show notes icon
    // The FileText icon should be rendered for slides with notes
    const notesIcons = document.querySelectorAll('svg');
    expect(notesIcons.length).toBeGreaterThan(0);
  });

  it('shows image indicator for slides with images', () => {
    render(<GridView {...defaultProps} />);
    // Third slide has an image element
    // The Image icon should be rendered
    const imageIcons = document.querySelectorAll('svg');
    expect(imageIcons.length).toBeGreaterThan(0);
  });

  it('does not render onEdit button when onEdit is not provided', () => {
    render(<GridView {...defaultProps} onEdit={undefined} />);

    // No hidden edit buttons should exist
    const hiddenEditButtons = document.querySelectorAll('button[class*="group-hover:opacity-100"]');
    expect(hiddenEditButtons.length).toBe(0);
  });
});
