/**
 * Tests for ImageUpscaler component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ImageUpscaler } from './image-upscaler';

describe('ImageUpscaler', () => {
  const defaultProps = {
    imageUrl: 'https://example.com/image.png',
  };

  describe('Rendering', () => {
    it('should render the component without crashing', () => {
      const { container } = render(<ImageUpscaler {...defaultProps} />);
      expect(container).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(<ImageUpscaler {...defaultProps} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should render controls', () => {
      render(<ImageUpscaler {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Props', () => {
    it('should accept callbacks', () => {
      const onUpscale = jest.fn();
      const onCancel = jest.fn();
      const { container } = render(
        <ImageUpscaler
          {...defaultProps}
          onUpscale={onUpscale}
          onCancel={onCancel}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });
});
