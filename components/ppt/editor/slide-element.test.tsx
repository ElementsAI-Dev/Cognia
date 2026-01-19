/**
 * Slide Element Component Tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SlideElement } from './slide-element';
import type { PPTTheme } from '@/types/workflow';

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

describe('SlideElement', () => {
  const defaultProps = {
    element: {
      id: 'el-1',
      type: 'text' as const,
      content: 'Element Text',
      position: { x: 10, y: 10, width: 30, height: 15 },
    },
    theme: mockTheme,
    isSelected: false,
    isEditing: true,
    onClick: jest.fn(),
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render text element content', () => {
    render(<SlideElement {...defaultProps} />);
    expect(screen.getByText('Element Text')).toBeInTheDocument();
  });

  it('should call onClick when element is clicked', async () => {
    render(<SlideElement {...defaultProps} />);

    const element = screen.getByText('Element Text');
    await userEvent.click(element);

    expect(defaultProps.onClick).toHaveBeenCalled();
  });

  it('should show selection ring when selected', () => {
    const { container } = render(<SlideElement {...defaultProps} isSelected={true} />);

    const element = container.querySelector('.ring-2.ring-primary');
    expect(element).toBeInTheDocument();
  });

  it('should show resize handles when selected and editing', () => {
    const { container } = render(<SlideElement {...defaultProps} isSelected={true} isEditing={true} />);

    const handles = container.querySelectorAll('.bg-primary.rounded-full');
    expect(handles.length).toBe(4); // 4 corner handles
  });

  it('should show delete button when selected', () => {
    render(<SlideElement {...defaultProps} isSelected={true} isEditing={true} />);

    const deleteButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg.lucide-trash-2')
    );
    expect(deleteButton).toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', async () => {
    render(<SlideElement {...defaultProps} isSelected={true} isEditing={true} />);

    const deleteButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg.lucide-trash-2')
    );

    if (deleteButton) {
      await userEvent.click(deleteButton);
      expect(defaultProps.onDelete).toHaveBeenCalled();
    }
  });

  it('should render image element', () => {
    const imageElement = {
      ...defaultProps.element,
      type: 'image' as const,
      content: 'https://example.com/image.jpg',
    };

    render(<SlideElement {...defaultProps} element={imageElement} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('should render shape element', () => {
    const shapeElement = {
      ...defaultProps.element,
      type: 'shape' as const,
      metadata: { shape: 'rounded' },
    };

    const { container } = render(<SlideElement {...defaultProps} element={shapeElement} />);

    const shape = container.querySelector('[style*="border-radius: 8px"]');
    expect(shape).toBeInTheDocument();
  });

  it('should render code element', () => {
    const codeElement = {
      ...defaultProps.element,
      type: 'code' as const,
      content: 'const x = 1;',
    };

    render(<SlideElement {...defaultProps} element={codeElement} />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });

  it('should not show resize handles when not selected', () => {
    const { container } = render(<SlideElement {...defaultProps} isSelected={false} />);

    const handles = container.querySelectorAll('.bg-primary.rounded-full');
    expect(handles.length).toBe(0);
  });

  it('should not show resize handles when not editing', () => {
    const { container } = render(<SlideElement {...defaultProps} isSelected={true} isEditing={false} />);

    const handles = container.querySelectorAll('.bg-primary.rounded-full');
    expect(handles.length).toBe(0);
  });
});
