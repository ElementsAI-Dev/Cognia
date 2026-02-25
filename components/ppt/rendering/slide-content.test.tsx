import { render, screen } from '@testing-library/react';
import { SlideContent } from './slide-content';
import type { PPTSlide, PPTTheme } from '@/types/workflow';

// Mock SlideElementRenderer
jest.mock('./slide-element-renderer', () => ({
  SlideElementRenderer: ({ element }: { element: { id: string; type: string } }) => (
    <div data-testid={`element-${element.id}`}>Element: {element.type}</div>
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

const createMockSlide = (overrides: Partial<PPTSlide> = {}): PPTSlide => ({
  id: 'slide-1',
  order: 0,
  layout: 'title-content',
  title: 'Test Title',
  subtitle: 'Test Subtitle',
  content: 'Test content text',
  bullets: ['Bullet 1', 'Bullet 2', 'Bullet 3'],
  elements: [],
  notes: 'Test notes',
  ...overrides,
});

describe('SlideContent', () => {
  it('renders slide title', () => {
    render(<SlideContent slide={createMockSlide()} theme={mockTheme} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders slide subtitle', () => {
    render(<SlideContent slide={createMockSlide()} theme={mockTheme} />);
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('renders slide content', () => {
    render(<SlideContent slide={createMockSlide()} theme={mockTheme} />);
    expect(screen.getByText('Test content text')).toBeInTheDocument();
  });

  it('renders all bullets', () => {
    render(<SlideContent slide={createMockSlide()} theme={mockTheme} />);
    expect(screen.getByText('Bullet 1')).toBeInTheDocument();
    expect(screen.getByText('Bullet 2')).toBeInTheDocument();
    expect(screen.getByText('Bullet 3')).toBeInTheDocument();
  });

  it('does not render title if not provided', () => {
    render(<SlideContent slide={createMockSlide({ title: '' })} theme={mockTheme} />);
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });

  it('does not render subtitle if not provided', () => {
    render(<SlideContent slide={createMockSlide({ subtitle: '' })} theme={mockTheme} />);
    expect(screen.queryByText('Test Subtitle')).not.toBeInTheDocument();
  });

  it('does not render bullets if empty array', () => {
    render(<SlideContent slide={createMockSlide({ bullets: [] })} theme={mockTheme} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders custom elements', () => {
    const slideWithElements = createMockSlide({
      elements: [
        { id: 'el-1', type: 'text', content: 'Element 1' },
        { id: 'el-2', type: 'image', content: 'image.png' },
      ],
    });
    render(<SlideContent slide={slideWithElements} theme={mockTheme} />);
    expect(screen.getByTestId('element-el-1')).toBeInTheDocument();
    expect(screen.getByTestId('element-el-2')).toBeInTheDocument();
  });

  it('applies theme primaryColor to title', () => {
    render(<SlideContent slide={createMockSlide()} theme={mockTheme} />);
    const title = screen.getByText('Test Title');
    expect(title).toHaveStyle({ color: mockTheme.primaryColor });
  });

  it('applies theme secondaryColor to subtitle', () => {
    render(<SlideContent slide={createMockSlide()} theme={mockTheme} />);
    const subtitle = screen.getByText('Test Subtitle');
    expect(subtitle).toHaveStyle({ color: mockTheme.secondaryColor });
  });

  it('applies theme headingFont to title', () => {
    render(<SlideContent slide={createMockSlide()} theme={mockTheme} />);
    const title = screen.getByText('Test Title');
    expect(title).toHaveStyle({ fontFamily: mockTheme.headingFont });
  });

  it('applies theme bodyFont to content', () => {
    render(<SlideContent slide={createMockSlide()} theme={mockTheme} />);
    const content = screen.getByText('Test content text');
    expect(content).toHaveStyle({ fontFamily: mockTheme.bodyFont });
  });

  describe('size variants', () => {
    it('renders with small size', () => {
      const { container } = render(
        <SlideContent slide={createMockSlide()} theme={mockTheme} size="small" />
      );
      expect(container.firstChild).toHaveClass('p-2');
    });

    it('renders with medium size (default)', () => {
      const { container } = render(
        <SlideContent slide={createMockSlide()} theme={mockTheme} size="medium" />
      );
      expect(container.firstChild).toHaveClass('p-8');
    });

    it('renders with large size', () => {
      const { container } = render(
        <SlideContent slide={createMockSlide()} theme={mockTheme} size="large" />
      );
      expect(container.firstChild).toHaveClass('p-10');
    });

    it('renders with fullscreen size', () => {
      const { container } = render(
        <SlideContent slide={createMockSlide()} theme={mockTheme} size="fullscreen" />
      );
      expect(container.firstChild).toHaveClass('p-8');
    });
  });

  describe('layout-specific rendering', () => {
    // --- title / section (centered) ---
    it('centers title for title layout', () => {
      const titleSlide = createMockSlide({ layout: 'title' });
      render(<SlideContent slide={titleSlide} theme={mockTheme} />);
      const title = screen.getByText('Test Title');
      expect(title).toHaveClass('text-center');
    });

    it('centers title for section layout', () => {
      const sectionSlide = createMockSlide({ layout: 'section' });
      render(<SlideContent slide={sectionSlide} theme={mockTheme} />);
      const title = screen.getByText('Test Title');
      expect(title).toHaveClass('text-center');
    });

    it('does not center title for bullets layout', () => {
      const bulletsSlide = createMockSlide({ layout: 'bullets' });
      render(<SlideContent slide={bulletsSlide} theme={mockTheme} />);
      const title = screen.getByText('Test Title');
      expect(title).not.toHaveClass('text-center');
    });

    // --- closing ---
    it('renders closing layout with centered title', () => {
      const slide = createMockSlide({ layout: 'closing', bullets: ['Questions?', 'contact@example.com'] });
      render(<SlideContent slide={slide} theme={mockTheme} />);
      expect(screen.getByText('Test Title')).toHaveClass('text-center');
      expect(screen.getByText('Questions?')).toBeInTheDocument();
      expect(screen.getByText('contact@example.com')).toBeInTheDocument();
    });

    // --- two-column ---
    it('renders two-column layout with grid', () => {
      const slide = createMockSlide({ layout: 'two-column', bullets: ['Left 1', 'Left 2', 'Right 1', 'Right 2'] });
      const { container } = render(<SlideContent slide={slide} theme={mockTheme} />);
      expect(container.querySelector('.grid-cols-2')).toBeInTheDocument();
      expect(screen.getByText('Left 1')).toBeInTheDocument();
      expect(screen.getByText('Right 2')).toBeInTheDocument();
    });

    // --- comparison ---
    it('renders comparison layout with headers from first bullet of each half', () => {
      const slide = createMockSlide({
        layout: 'comparison',
        bullets: ['Pros Header', 'Pro 1', 'Cons Header', 'Con 1'],
      });
      const { container } = render(<SlideContent slide={slide} theme={mockTheme} />);
      expect(container.querySelector('.grid-cols-2')).toBeInTheDocument();
      // First bullet of each half is rendered as header with font-semibold
      expect(screen.getByText('Pros Header')).toHaveClass('font-semibold');
      expect(screen.getByText('Cons Header')).toHaveClass('font-semibold');
    });

    // --- image-left ---
    it('renders image-left layout with image placeholder on left', () => {
      const slide = createMockSlide({ layout: 'image-left', elements: [] });
      const { container } = render(<SlideContent slide={slide} theme={mockTheme} />);
      // Should have flex-row (not flex-row-reverse) for image-left
      expect(container.querySelector('.flex-row')).toBeInTheDocument();
      // Should show placeholder emoji when no image element
      expect(screen.getByText('🖼️')).toBeInTheDocument();
    });

    it('renders image-left layout with actual image element', () => {
      const slide = createMockSlide({
        layout: 'image-left',
        elements: [{ id: 'img-1', type: 'image', content: 'test.jpg' }],
      });
      render(<SlideContent slide={slide} theme={mockTheme} />);
      expect(screen.getByTestId('element-img-1')).toBeInTheDocument();
    });

    // --- image-right ---
    it('renders image-right layout with flex-row-reverse', () => {
      const slide = createMockSlide({ layout: 'image-right', elements: [] });
      const { container } = render(<SlideContent slide={slide} theme={mockTheme} />);
      expect(container.querySelector('.flex-row-reverse')).toBeInTheDocument();
    });

    // --- full-image ---
    it('renders full-image layout with gradient overlay', () => {
      const slide = createMockSlide({ layout: 'full-image', backgroundImage: 'https://example.com/img.jpg' });
      const { container } = render(<SlideContent slide={slide} theme={mockTheme} />);
      // Should have gradient overlay div
      expect(container.querySelector('.bg-gradient-to-t')).toBeInTheDocument();
      // Title should be white
      const title = screen.getByText('Test Title');
      expect(title).toHaveStyle({ color: '#FFFFFF' });
    });

    it('renders full-image layout without background when no backgroundImage', () => {
      const slide = createMockSlide({ layout: 'full-image' });
      const { container } = render(<SlideContent slide={slide} theme={mockTheme} />);
      expect(container.querySelector('.bg-gradient-to-t')).toBeInTheDocument();
    });

    // --- quote ---
    it('renders quote layout with blockquote from content', () => {
      const slide = createMockSlide({ layout: 'quote', content: 'Innovation is key', subtitle: 'Steve Jobs' });
      render(<SlideContent slide={slide} theme={mockTheme} />);
      expect(screen.getByText('Innovation is key')).toBeInTheDocument();
      expect(screen.getByText(/Steve Jobs/)).toBeInTheDocument();
    });

    it('renders quote layout with blockquote from first bullet when no content', () => {
      const slide = createMockSlide({ layout: 'quote', content: '', bullets: ['Stay hungry, stay foolish'] });
      render(<SlideContent slide={slide} theme={mockTheme} />);
      expect(screen.getByText('Stay hungry, stay foolish')).toBeInTheDocument();
    });

    it('hides title in quote layout when title is "quote"', () => {
      const slide = createMockSlide({ layout: 'quote', title: 'quote', content: 'Test quote' });
      render(<SlideContent slide={slide} theme={mockTheme} />);
      // Title "quote" should not be rendered as visible text label
      const allText = screen.queryAllByText('quote');
      // Only the blockquote content should be visible, not the title
      allText.forEach(el => {
        expect(el.tagName.toLowerCase()).not.toBe('div');
      });
    });

    // --- chart ---
    it('renders chart layout with elements area', () => {
      const slide = createMockSlide({
        layout: 'chart',
        elements: [{ id: 'chart-1', type: 'chart', content: 'bar' }],
      });
      render(<SlideContent slide={slide} theme={mockTheme} />);
      expect(screen.getByTestId('element-chart-1')).toBeInTheDocument();
    });

    it('renders chart layout with fallback content when no elements', () => {
      const slide = createMockSlide({ layout: 'chart', elements: [], content: 'Chart description' });
      render(<SlideContent slide={slide} theme={mockTheme} />);
      expect(screen.getByText('Chart description')).toBeInTheDocument();
    });

    // --- table ---
    it('renders table layout with elements area', () => {
      const slide = createMockSlide({
        layout: 'table',
        elements: [{ id: 'tbl-1', type: 'table', content: 'table' }],
      });
      render(<SlideContent slide={slide} theme={mockTheme} />);
      expect(screen.getByTestId('element-tbl-1')).toBeInTheDocument();
    });

    it('renders table layout with fallback bullets when no elements', () => {
      const slide = createMockSlide({ layout: 'table', elements: [], bullets: ['Row 1', 'Row 2'] });
      render(<SlideContent slide={slide} theme={mockTheme} />);
      expect(screen.getByText('Row 1')).toBeInTheDocument();
      expect(screen.getByText('Row 2')).toBeInTheDocument();
    });

    // --- timeline ---
    it('renders timeline layout with horizontal line and bullet dots', () => {
      const slide = createMockSlide({ layout: 'timeline', bullets: ['Phase 1', 'Phase 2', 'Phase 3'] });
      const { container } = render(<SlideContent slide={slide} theme={mockTheme} />);
      expect(screen.getByText('Phase 1')).toBeInTheDocument();
      expect(screen.getByText('Phase 3')).toBeInTheDocument();
      // Timeline dots
      const dots = container.querySelectorAll('.rounded-full.ring-4');
      expect(dots.length).toBe(3);
    });

    it('renders timeline layout with fallback content when no bullets', () => {
      const slide = createMockSlide({ layout: 'timeline', bullets: [], content: 'Timeline description' });
      render(<SlideContent slide={slide} theme={mockTheme} />);
      expect(screen.getByText('Timeline description')).toBeInTheDocument();
    });

    // --- default (numbered, blank, title-content) ---
    it('renders default layout for numbered type', () => {
      const slide = createMockSlide({ layout: 'numbered' });
      render(<SlideContent slide={slide} theme={mockTheme} />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Bullet 1')).toBeInTheDocument();
    });

    it('renders default layout for blank type', () => {
      const slide = createMockSlide({ layout: 'blank', title: '', content: '', bullets: [], elements: [] });
      const { container } = render(<SlideContent slide={slide} theme={mockTheme} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <SlideContent
        slide={createMockSlide()}
        theme={mockTheme}
        className="custom-class"
      />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders bullets with theme primaryColor dots', () => {
    render(<SlideContent slide={createMockSlide()} theme={mockTheme} />);
    const bullets = screen.getAllByRole('listitem');
    expect(bullets).toHaveLength(3);
    
    // Check that bullet dots have the theme color
    bullets.forEach(bullet => {
      const dot = bullet.querySelector('span');
      expect(dot).toHaveStyle({ backgroundColor: mockTheme.primaryColor });
    });
  });

  it('handles slide without optional fields', () => {
    const minimalSlide = createMockSlide({
      title: '',
      subtitle: '',
      content: '',
      bullets: [],
      elements: [],
    });
    
    const { container } = render(<SlideContent slide={minimalSlide} theme={mockTheme} />);
    expect(container.firstChild).toBeInTheDocument();
    // Should render empty content area
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
