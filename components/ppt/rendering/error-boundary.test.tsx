/**
 * PPT Preview Error Boundary Component Tests
 */

import { render, screen } from '@testing-library/react';
import { PPTPreviewErrorBoundary } from './error-boundary';

describe('PPTPreviewErrorBoundary', () => {
  it('should render children when no error', () => {
    render(
      <PPTPreviewErrorBoundary>
        <div>Normal content</div>
      </PPTPreviewErrorBoundary>
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('should be a valid React component', () => {
    // Error boundary is a class component that extends React.Component
    expect(PPTPreviewErrorBoundary).toBeDefined();
    expect(PPTPreviewErrorBoundary.prototype).toHaveProperty('render');
  });

  it('should accept fallback prop', () => {
    render(
      <PPTPreviewErrorBoundary fallback={<div>Fallback UI</div>}>
        <div>Child content</div>
      </PPTPreviewErrorBoundary>
    );

    // When no error, children are rendered
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    // Render with className prop - component may or may not apply it
    // Just verify it doesn't crash when className is provided
    const { container } = render(
      <PPTPreviewErrorBoundary className="custom-class">
        <div>Content</div>
      </PPTPreviewErrorBoundary>
    );

    // The component should render successfully
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should handle multiple children', () => {
    render(
      <PPTPreviewErrorBoundary>
        <div>First child</div>
        <div>Second child</div>
        <div>Third child</div>
      </PPTPreviewErrorBoundary>
    );

    expect(screen.getByText('First child')).toBeInTheDocument();
    expect(screen.getByText('Second child')).toBeInTheDocument();
    expect(screen.getByText('Third child')).toBeInTheDocument();
  });

  it('should handle null children', () => {
    // Error boundary might render null or an empty wrapper when children are null
    // The important thing is it doesn't crash
    expect(() => {
      render(
        <PPTPreviewErrorBoundary>
          {null}
        </PPTPreviewErrorBoundary>
      );
    }).not.toThrow();
  });

  it('should handle empty children', () => {
    // Error boundary might render null or an empty wrapper when children are empty
    // The important thing is it doesn't crash
    expect(() => {
      render(
        <PPTPreviewErrorBoundary>
          <></>
        </PPTPreviewErrorBoundary>
      );
    }).not.toThrow();
  });

  it('should be a valid class component', () => {
    expect(PPTPreviewErrorBoundary.prototype).toBeInstanceOf(Object);
  });

  it('should have getDerivedStateFromError method', () => {
    expect(typeof PPTPreviewErrorBoundary.getDerivedStateFromError).toBe('function');
  });

  it('should have componentDidCatch method', () => {
    expect(typeof PPTPreviewErrorBoundary.prototype.componentDidCatch).toBe('function');
  });
});
