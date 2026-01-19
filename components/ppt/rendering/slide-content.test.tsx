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

  describe('layout-specific styling', () => {
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
