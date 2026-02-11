/**
 * DrawingOverlay Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { DrawingOverlay } from './drawing-overlay';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock canvas context
const mockContext = {
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  scale: jest.fn(),
  lineCap: '',
  lineJoin: '',
  strokeStyle: '',
  lineWidth: 1,
};

HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockContext);
Object.defineProperty(HTMLCanvasElement.prototype, 'offsetWidth', { value: 800 });
Object.defineProperty(HTMLCanvasElement.prototype, 'offsetHeight', { value: 600 });

describe('DrawingOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render nothing when pointerMode is none and no strokes', () => {
      const { container } = render(<DrawingOverlay pointerMode="none" />);
      expect(container.firstChild).toBeNull();
    });

    it('should render interaction layer when in laser mode', () => {
      const { container } = render(<DrawingOverlay pointerMode="laser" />);
      const layer = container.querySelector('.cursor-none');
      expect(layer).toBeInTheDocument();
    });

    it('should render interaction layer when in draw mode', () => {
      const { container } = render(<DrawingOverlay pointerMode="draw" />);
      const layer = container.querySelector('.cursor-crosshair');
      expect(layer).toBeInTheDocument();
    });

    it('should show laser indicator text when in laser mode', () => {
      render(<DrawingOverlay pointerMode="laser" />);
      expect(screen.getByText(/laserPointer|Laser/)).toBeInTheDocument();
    });

    it('should show draw indicator text when in draw mode', () => {
      render(<DrawingOverlay pointerMode="draw" />);
      expect(screen.getByText(/drawMode|Draw/)).toBeInTheDocument();
    });

    it('should show color picker buttons in draw mode', () => {
      const { container } = render(<DrawingOverlay pointerMode="draw" />);
      // 5 color buttons
      const colorButtons = container.querySelectorAll('.rounded-full.border');
      expect(colorButtons.length).toBe(5);
    });

    it('should show width picker buttons in draw mode', () => {
      const { container } = render(<DrawingOverlay pointerMode="draw" />);
      // 3 width buttons
      const widthButtons = container.querySelectorAll('.rounded.transition-colors');
      expect(widthButtons.length).toBeGreaterThanOrEqual(3);
    });

    it('should render canvas in draw mode', () => {
      const { container } = render(<DrawingOverlay pointerMode="draw" />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('laser pointer', () => {
    it('should show laser dot on pointer move', () => {
      const { container } = render(<DrawingOverlay pointerMode="laser" />);
      const layer = container.querySelector('.cursor-none');

      if (layer) {
        fireEvent.pointerMove(layer, {
          clientX: 100,
          clientY: 200,
        });

        // Laser dot should be rendered
        const laserDot = container.querySelector('[style*="radial-gradient"]');
        expect(laserDot).toBeInTheDocument();
      }
    });

    it('should hide laser dot on pointer leave', () => {
      const { container } = render(<DrawingOverlay pointerMode="laser" />);
      const layer = container.querySelector('.cursor-none');

      if (layer) {
        // Move to show dot
        fireEvent.pointerMove(layer, { clientX: 100, clientY: 200 });
        // Leave to hide dot
        fireEvent.pointerLeave(layer);

        const laserDot = container.querySelector('[style*="radial-gradient"]');
        expect(laserDot).not.toBeInTheDocument();
      }
    });
  });

  describe('drawing mode', () => {
    it('should not show clear button when no strokes', () => {
      render(<DrawingOverlay pointerMode="draw" />);
      expect(screen.queryByText(/clear|Clear/)).not.toBeInTheDocument();
    });

    it('should handle pointer down to start drawing', () => {
      const { container } = render(<DrawingOverlay pointerMode="draw" />);
      const layer = container.querySelector('.cursor-crosshair');

      if (layer) {
        fireEvent.pointerDown(layer, { clientX: 50, clientY: 50 });
        // After pointer down, a stroke should be started (canvas rendered)
        const canvas = container.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      }
    });

    it('should handle pointer up to end drawing', () => {
      const { container } = render(<DrawingOverlay pointerMode="draw" />);
      const layer = container.querySelector('.cursor-crosshair');

      if (layer) {
        fireEvent.pointerDown(layer, { clientX: 50, clientY: 50 });
        fireEvent.pointerUp(layer);
        // Should not crash
        expect(container.firstChild).toBeInTheDocument();
      }
    });
  });

  describe('mode transitions', () => {
    it('should not render laser dot when switching from laser to none', () => {
      const { container, rerender } = render(<DrawingOverlay pointerMode="laser" />);
      const layer = container.querySelector('.cursor-none');
      if (layer) {
        fireEvent.pointerMove(layer, { clientX: 100, clientY: 200 });
      }

      rerender(<DrawingOverlay pointerMode="none" />);
      const laserDot = container.querySelector('[style*="radial-gradient"]');
      expect(laserDot).not.toBeInTheDocument();
    });
  });
});
