'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MathPreview } from './math-preview';

jest.mock('katex', () => ({
  renderToString: jest.fn().mockReturnValue('<span class="katex">E = mc²</span>'),
}));

describe('MathPreview', () => {
  it('renders preview label', () => {
    render(<MathPreview scale={1} alignment="center" previewLabel="Preview" />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('applies scale style', () => {
    const { container } = render(
      <MathPreview scale={1.5} alignment="center" previewLabel="Preview" />
    );
    const mathContainer = container.querySelector('.overflow-x-auto');
    expect(mathContainer).toHaveStyle({ fontSize: '1.5em' });
  });

  it('applies center alignment', () => {
    const { container } = render(
      <MathPreview scale={1} alignment="center" previewLabel="Preview" />
    );
    const mathContainer = container.querySelector('.overflow-x-auto');
    expect(mathContainer).toHaveStyle({ textAlign: 'center' });
  });

  it('applies left alignment', () => {
    const { container } = render(
      <MathPreview scale={1} alignment="left" previewLabel="Preview" />
    );
    const mathContainer = container.querySelector('.overflow-x-auto');
    expect(mathContainer).toHaveStyle({ textAlign: 'left' });
  });

  it('applies center alignment', () => {
    const { container } = render(
      <MathPreview scale={1} alignment="center" previewLabel="Preview" />
    );
    const mathContainer = container.querySelector('.overflow-x-auto');
    expect(mathContainer).toHaveStyle({ textAlign: 'center' });
  });

  it('renders katex output', () => {
    const { container } = render(
      <MathPreview scale={1} alignment="center" previewLabel="Preview" />
    );
    expect(container.innerHTML).toContain('katex');
  });

  it('has proper container structure', () => {
    const { container } = render(
      <MathPreview scale={1} alignment="center" previewLabel="Preview" />
    );
    expect(container.querySelector('.p-3.rounded-lg.border')).toBeInTheDocument();
  });
});
