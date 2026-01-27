'use client';

import React from 'react';
import { render } from '@testing-library/react';
import { ServerCardSkeleton } from './server-card-skeleton';

describe('ServerCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<ServerCardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders div elements', () => {
    const { container } = render(<ServerCardSkeleton />);
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBeGreaterThan(0);
  });

  it('has expected structure', () => {
    const { container } = render(<ServerCardSkeleton />);
    expect(container.innerHTML).toBeTruthy();
  });
});
