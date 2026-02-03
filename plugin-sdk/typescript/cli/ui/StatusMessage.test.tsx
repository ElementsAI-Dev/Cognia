/**
 * StatusMessage Component Tests
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { StatusMessage } from './StatusMessage';

describe('StatusMessage', () => {
  it('should render info status', () => {
    const { lastFrame } = render(<StatusMessage variant="info">Info status</StatusMessage>);
    expect(lastFrame()).toContain('Info status');
  });

  it('should render success status', () => {
    const { lastFrame } = render(<StatusMessage variant="success">Success status</StatusMessage>);
    expect(lastFrame()).toContain('Success status');
  });

  it('should render warning status', () => {
    const { lastFrame } = render(<StatusMessage variant="warning">Warning status</StatusMessage>);
    expect(lastFrame()).toContain('Warning status');
  });

  it('should render error status', () => {
    const { lastFrame } = render(<StatusMessage variant="error">Error status</StatusMessage>);
    expect(lastFrame()).toContain('Error status');
  });
});
