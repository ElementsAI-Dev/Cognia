/**
 * Tests for ImageCropper component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ImageCropper } from './image-cropper';

describe('ImageCropper', () => {
  const defaultProps = {
    imageUrl: 'https://example.com/image.png',
  };

  describe('Rendering', () => {
    it('should render the component without crashing', () => {
      const { container } = render(<ImageCropper {...defaultProps} />);
      expect(container).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(<ImageCropper {...defaultProps} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should render toolbar buttons', () => {
      render(<ImageCropper {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Props', () => {
    it('should accept initial crop region', () => {
      const initialCrop = { x: 100, y: 100, width: 500, height: 500 };
      const { container } = render(<ImageCropper {...defaultProps} initialCrop={initialCrop} />);
      expect(container).toBeInTheDocument();
    });

    it('should accept initial transform', () => {
      const initialTransform = { rotation: 90, flipHorizontal: true, flipVertical: false };
      const { container } = render(<ImageCropper {...defaultProps} initialTransform={initialTransform} />);
      expect(container).toBeInTheDocument();
    });

    it('should accept callbacks', () => {
      const onApply = jest.fn();
      const onCancel = jest.fn();
      const onCropChange = jest.fn();
      const onTransformChange = jest.fn();
      const { container } = render(
        <ImageCropper
          {...defaultProps}
          onApply={onApply}
          onCancel={onCancel}
          onCropChange={onCropChange}
          onTransformChange={onTransformChange}
        />
      );
      expect(container).toBeInTheDocument();
    });

    it('should accept minWidth and minHeight', () => {
      const { container } = render(<ImageCropper {...defaultProps} minWidth={100} minHeight={100} />);
      expect(container).toBeInTheDocument();
    });

    it('should accept custom aspect ratio', () => {
      const { container } = render(<ImageCropper {...defaultProps} aspectRatio={16 / 9} />);
      expect(container).toBeInTheDocument();
    });
  });
});
