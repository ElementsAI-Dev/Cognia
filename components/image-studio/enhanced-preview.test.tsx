/**
 * Tests for EnhancedPreview component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnhancedPreview } from './enhanced-preview';

// Mock ImageData for Node.js environment
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(data: Uint8ClampedArray | number, widthOrHeight?: number, height?: number) {
    if (typeof data === 'number') {
      this.width = data;
      this.height = widthOrHeight as number;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = data;
      this.width = widthOrHeight as number;
      this.height = height as number;
    }
  }
}

global.ImageData = MockImageData as unknown as typeof ImageData;

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

function createTestImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 128;
    data[i + 1] = 128;
    data[i + 2] = 128;
    data[i + 3] = 255;
  }
  return new MockImageData(data, width, height) as ImageData;
}

describe('EnhancedPreview', () => {
  const originalImage = createTestImageData(100, 100);
  const editedImage = createTestImageData(100, 100);

  describe('rendering', () => {
    it('should render without images', () => {
      render(<EnhancedPreview originalImage={null} editedImage={null} />);
      expect(screen.getByText('No image loaded')).toBeInTheDocument();
    });

    it('should render with images', () => {
      const { container } = render(
        <EnhancedPreview originalImage={originalImage} editedImage={editedImage} />
      );
      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <EnhancedPreview
          originalImage={originalImage}
          editedImage={editedImage}
          className="custom-class"
        />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('comparison modes', () => {
    it('should render split-horizontal mode', () => {
      const { container } = render(
        <EnhancedPreview
          originalImage={originalImage}
          editedImage={editedImage}
          comparisonMode="split-horizontal"
        />
      );
      expect(container.querySelectorAll('canvas').length).toBeGreaterThanOrEqual(1);
    });

    it('should render split-vertical mode', () => {
      const { container } = render(
        <EnhancedPreview
          originalImage={originalImage}
          editedImage={editedImage}
          comparisonMode="split-vertical"
        />
      );
      expect(container.querySelectorAll('canvas').length).toBeGreaterThanOrEqual(1);
    });

    it('should render side-by-side mode', () => {
      render(
        <EnhancedPreview
          originalImage={originalImage}
          editedImage={editedImage}
          comparisonMode="side-by-side"
        />
      );
      expect(screen.getByText('Original')).toBeInTheDocument();
      expect(screen.getByText('Edited')).toBeInTheDocument();
    });

    it('should render toggle mode', () => {
      render(
        <EnhancedPreview
          originalImage={originalImage}
          editedImage={editedImage}
          comparisonMode="toggle"
        />
      );
      expect(screen.getByText('Edited')).toBeInTheDocument();
    });
  });

  describe('zoom', () => {
    it('should display zoom percentage', () => {
      render(
        <EnhancedPreview
          originalImage={originalImage}
          editedImage={editedImage}
          zoom={1.5}
        />
      );
      expect(screen.getByText('150%')).toBeInTheDocument();
    });

    it('should call onZoomChange on wheel event', () => {
      const onZoomChange = jest.fn();
      const { container } = render(
        <EnhancedPreview
          originalImage={originalImage}
          editedImage={editedImage}
          zoom={1}
          onZoomChange={onZoomChange}
        />
      );

      fireEvent.wheel(container.firstChild as Element, {
        deltaY: -100,
        ctrlKey: true,
      });

      expect(onZoomChange).toHaveBeenCalled();
    });
  });

  describe('histogram', () => {
    it('should render histogram when enabled', () => {
      const histogram = {
        red: new Array(256).fill(100),
        green: new Array(256).fill(100),
        blue: new Array(256).fill(100),
        luminance: new Array(256).fill(100),
      };

      const { container } = render(
        <EnhancedPreview
          originalImage={originalImage}
          editedImage={editedImage}
          showHistogram={true}
          histogram={histogram}
        />
      );

      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should not render histogram when disabled', () => {
      const { container } = render(
        <EnhancedPreview
          originalImage={originalImage}
          editedImage={editedImage}
          showHistogram={false}
        />
      );

      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });
  });

  describe('keyboard shortcuts', () => {
    it('should handle zoom in shortcut', () => {
      const onZoomChange = jest.fn();
      render(
        <EnhancedPreview
          originalImage={originalImage}
          editedImage={editedImage}
          zoom={1}
          onZoomChange={onZoomChange}
        />
      );

      fireEvent.keyDown(window, { key: '+' });
      expect(onZoomChange).toHaveBeenCalled();
    });

    it('should handle zoom out shortcut', () => {
      const onZoomChange = jest.fn();
      render(
        <EnhancedPreview
          originalImage={originalImage}
          editedImage={editedImage}
          zoom={1}
          onZoomChange={onZoomChange}
        />
      );

      fireEvent.keyDown(window, { key: '-' });
      expect(onZoomChange).toHaveBeenCalled();
    });

    it('should handle reset shortcut', () => {
      const onZoomChange = jest.fn();
      const onPanChange = jest.fn();
      render(
        <EnhancedPreview
          originalImage={originalImage}
          editedImage={editedImage}
          zoom={2}
          onZoomChange={onZoomChange}
          onPanChange={onPanChange}
        />
      );

      fireEvent.keyDown(window, { key: '0' });
      expect(onZoomChange).toHaveBeenCalledWith(1);
      expect(onPanChange).toHaveBeenCalledWith(0, 0);
    });
  });
});
