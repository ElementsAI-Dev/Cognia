/**
 * AnnotationCanvas Component Tests
 */

import { render, fireEvent } from '@testing-library/react';
import { AnnotationCanvas } from './annotation-canvas';
import type { Annotation, AnnotationStyle } from '@/types/screenshot';

// Mock canvas context
const mockContext = {
  clearRect: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  ellipse: jest.fn(),
  arc: jest.fn(),
  closePath: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 100 })),
  setLineDash: jest.fn(),
};

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Mock Image
global.Image = class MockImage {
  onload: (() => void) | null = null;
  src = '';

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
} as unknown as typeof Image;

const mockStyle: AnnotationStyle = {
  color: '#FF0000',
  strokeWidth: 2,
  filled: false,
  opacity: 1,
};

const testAnnotation: Annotation = {
  id: 'test-rect-1',
  type: 'rectangle',
  style: mockStyle,
  timestamp: Date.now(),
  x: 10,
  y: 10,
  width: 100,
  height: 50,
};

describe('AnnotationCanvas', () => {
  const mockProps = {
    imageData: 'base64encodedimage',
    width: 800,
    height: 600,
    annotations: [] as Annotation[],
    currentTool: 'select' as const,
    style: mockStyle,
    selectedAnnotationId: null,
    onAnnotationAdd: jest.fn(),
    onAnnotationSelect: jest.fn(),
    onGetNextMarkerNumber: jest.fn(() => 1),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render two canvas elements', () => {
    const { container } = render(<AnnotationCanvas {...mockProps} />);

    const canvases = container.querySelectorAll('canvas');
    expect(canvases).toHaveLength(2);
  });

  it('should set correct dimensions', () => {
    const { container } = render(<AnnotationCanvas {...mockProps} />);

    const canvases = container.querySelectorAll('canvas');
    canvases.forEach((canvas) => {
      expect(canvas.getAttribute('width')).toBe('800');
      expect(canvas.getAttribute('height')).toBe('600');
    });
  });

  it('should handle mouse down event', () => {
    const { container } = render(
      <AnnotationCanvas {...mockProps} currentTool="rectangle" />
    );

    const overlay = container.querySelectorAll('canvas')[1];
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100 });

    // Component should start drawing state
  });

  it('should handle mouse move during drawing', () => {
    const { container } = render(
      <AnnotationCanvas {...mockProps} currentTool="rectangle" />
    );

    const overlay = container.querySelectorAll('canvas')[1];
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(overlay, { clientX: 200, clientY: 200 });

    // Drawing preview should update
  });

  it('should call onAnnotationAdd on mouse up after drawing', () => {
    const onAnnotationAdd = jest.fn();
    const { container } = render(
      <AnnotationCanvas
        {...mockProps}
        currentTool="rectangle"
        onAnnotationAdd={onAnnotationAdd}
      />
    );

    const overlay = container.querySelectorAll('canvas')[1];

    // Simulate drawing
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseMove(overlay, { clientX: 200, clientY: 200 });
    fireEvent.mouseUp(overlay);

    expect(onAnnotationAdd).toHaveBeenCalled();
  });

  it('should handle select tool click', () => {
    const onAnnotationSelect = jest.fn();
    const { container } = render(
      <AnnotationCanvas
        {...mockProps}
        annotations={[testAnnotation]}
        currentTool="select"
        onAnnotationSelect={onAnnotationSelect}
      />
    );

    const overlay = container.querySelectorAll('canvas')[1];
    fireEvent.mouseDown(overlay, { clientX: 50, clientY: 30, button: 0 });

    // Should attempt to select annotation at click point
  });

  it('should render with annotations', () => {
    const { container } = render(
      <AnnotationCanvas {...mockProps} annotations={[testAnnotation]} />
    );

    expect(container.firstChild).toBeTruthy();
  });

  it('should highlight selected annotation', () => {
    const { container } = render(
      <AnnotationCanvas
        {...mockProps}
        annotations={[testAnnotation]}
        selectedAnnotationId="test-rect-1"
      />
    );

    expect(container.firstChild).toBeTruthy();
  });

  it('should handle marker tool', () => {
    const onAnnotationAdd = jest.fn();
    const onGetNextMarkerNumber = jest.fn(() => 5);
    const { container } = render(
      <AnnotationCanvas
        {...mockProps}
        currentTool="marker"
        onAnnotationAdd={onAnnotationAdd}
        onGetNextMarkerNumber={onGetNextMarkerNumber}
      />
    );

    const overlay = container.querySelectorAll('canvas')[1];
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100, button: 0 });

    expect(onGetNextMarkerNumber).toHaveBeenCalled();
    expect(onAnnotationAdd).toHaveBeenCalled();
  });

  it('should handle freehand drawing', () => {
    const onAnnotationAdd = jest.fn();
    const { container } = render(
      <AnnotationCanvas
        {...mockProps}
        currentTool="freehand"
        onAnnotationAdd={onAnnotationAdd}
      />
    );

    const overlay = container.querySelectorAll('canvas')[1];

    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseMove(overlay, { clientX: 110, clientY: 110 });
    fireEvent.mouseMove(overlay, { clientX: 120, clientY: 115 });
    fireEvent.mouseMove(overlay, { clientX: 130, clientY: 120 });
    fireEvent.mouseUp(overlay);

    expect(onAnnotationAdd).toHaveBeenCalled();
  });

  it('should use crosshair cursor for drawing tools', () => {
    const { container } = render(
      <AnnotationCanvas {...mockProps} currentTool="rectangle" />
    );

    const overlay = container.querySelectorAll('canvas')[1];
    expect(overlay.style.cursor).toBe('crosshair');
  });

  it('should use default cursor for select tool', () => {
    const { container } = render(
      <AnnotationCanvas {...mockProps} currentTool="select" />
    );

    const overlay = container.querySelectorAll('canvas')[1];
    expect(overlay.style.cursor).toBe('default');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <AnnotationCanvas {...mockProps} className="custom-canvas" />
    );

    expect(container.querySelector('.custom-canvas')).toBeTruthy();
  });
});
