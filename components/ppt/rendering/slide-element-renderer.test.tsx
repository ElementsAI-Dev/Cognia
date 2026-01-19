/**
 * Slide Element Renderer Component Tests
 */

import { render, screen } from '@testing-library/react';
import { SlideElementRenderer } from './slide-element-renderer';
import type { PPTSlideElement, PPTTheme } from '@/types/workflow';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockTheme: PPTTheme = {
  id: 'modern-light',
  name: 'Modern Light',
  primaryColor: '#2563EB',
  secondaryColor: '#1D4ED8',
  accentColor: '#3B82F6',
  backgroundColor: '#FFFFFF',
  textColor: '#1E293B',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  codeFont: 'JetBrains Mono',
};

describe('SlideElementRenderer', () => {
  const createMockElement = (overrides: Partial<PPTSlideElement> = {}): PPTSlideElement => ({
    id: 'el-1',
    type: 'text',
    content: 'Test content',
    position: { x: 10, y: 10, width: 50, height: 20 },
    ...overrides,
  });

  it('should render text element', () => {
    const element = createMockElement({ type: 'text', content: 'Hello World' });
    render(<SlideElementRenderer element={element} theme={mockTheme} />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should render image element', () => {
    const element = createMockElement({
      type: 'image',
      content: 'https://example.com/image.jpg',
      metadata: { alt: 'Test image' },
    });
    render(<SlideElementRenderer element={element} theme={mockTheme} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('should render code element', () => {
    const element = createMockElement({ type: 'code', content: 'const x = 1;' });
    render(<SlideElementRenderer element={element} theme={mockTheme} />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });

  it('should render shape element', () => {
    const element = createMockElement({ type: 'shape', metadata: { shape: 'circle' } });
    const { container } = render(<SlideElementRenderer element={element} theme={mockTheme} />);

    const shape = container.firstChild;
    expect(shape).toHaveStyle({ borderRadius: '50%' });
  });

  it('should render chart placeholder', () => {
    const element = createMockElement({ type: 'chart', metadata: { chartType: 'bar' } });
    render(<SlideElementRenderer element={element} theme={mockTheme} />);
    expect(screen.getByText(/Chart/)).toBeInTheDocument();
  });

  it('should render table element', () => {
    const element = createMockElement({
      type: 'table',
      metadata: { data: [['A', 'B'], ['1', '2']] },
    });
    render(<SlideElementRenderer element={element} theme={mockTheme} />);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('should render icon element', () => {
    const element = createMockElement({ type: 'icon', content: '🚀' });
    render(<SlideElementRenderer element={element} theme={mockTheme} />);
    expect(screen.getByText('🚀')).toBeInTheDocument();
  });

  it('should render video placeholder', () => {
    const element = createMockElement({ type: 'video', content: 'video.mp4' });
    render(<SlideElementRenderer element={element} theme={mockTheme} />);
    expect(screen.getByText(/Video/)).toBeInTheDocument();
  });

  it('should render unknown element gracefully', () => {
    const element = createMockElement({ type: 'unknown' as PPTSlideElement['type'] });
    render(<SlideElementRenderer element={element} theme={mockTheme} />);
    expect(screen.getByText(/Unknown element type/)).toBeInTheDocument();
  });

  it('should apply position styles', () => {
    const element = createMockElement({ position: { x: 25, y: 30, width: 40, height: 20 } });
    const { container } = render(<SlideElementRenderer element={element} theme={mockTheme} />);

    const el = container.firstChild as HTMLElement;
    expect(el.style.left).toBe('25%');
    expect(el.style.top).toBe('30%');
    expect(el.style.width).toBe('40%');
    expect(el.style.height).toBe('20%');
  });
});
