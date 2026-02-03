/**
 * Alert Component Tests
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { Alert } from './Alert';

describe('Alert', () => {
  it('should render info alert', () => {
    const { lastFrame } = render(<Alert variant="info">Info message</Alert>);
    expect(lastFrame()).toContain('Info message');
  });

  it('should render success alert', () => {
    const { lastFrame } = render(<Alert variant="success">Success message</Alert>);
    expect(lastFrame()).toContain('Success message');
  });

  it('should render warning alert', () => {
    const { lastFrame } = render(<Alert variant="warning">Warning message</Alert>);
    expect(lastFrame()).toContain('Warning message');
  });

  it('should render error alert', () => {
    const { lastFrame } = render(<Alert variant="error">Error message</Alert>);
    expect(lastFrame()).toContain('Error message');
  });

  it('should render with title', () => {
    const { lastFrame } = render(
      <Alert variant="info" title="Alert Title">
        Alert body
      </Alert>
    );
    expect(lastFrame()).toContain('Alert Title');
    expect(lastFrame()).toContain('Alert body');
  });
});
