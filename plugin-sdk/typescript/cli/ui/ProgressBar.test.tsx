/**
 * ProgressBar Component Tests
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('should render with value', () => {
    const { lastFrame } = render(<ProgressBar value={50} />);
    expect(lastFrame()).toContain('50%');
  });

  it('should render with label', () => {
    const { lastFrame } = render(<ProgressBar value={75} label="Downloading" />);
    expect(lastFrame()).toContain('Downloading');
    expect(lastFrame()).toContain('75%');
  });

  it('should clamp value to 0-100', () => {
    const { lastFrame: frame1 } = render(<ProgressBar value={-10} />);
    expect(frame1()).toContain('0%');

    const { lastFrame: frame2 } = render(<ProgressBar value={150} />);
    expect(frame2()).toContain('100%');
  });

  it('should hide percentage when showPercentage is false', () => {
    const { lastFrame } = render(<ProgressBar value={50} showPercentage={false} />);
    expect(lastFrame()).not.toContain('50%');
  });
});
