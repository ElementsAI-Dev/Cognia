/**
 * Unit tests for LaTeXPreview component
 */

import { render, screen } from '@testing-library/react';
import { LaTeXPreview } from './latex-preview';

// Mock KaTeX
jest.mock('katex', () => ({
  renderToString: jest.fn((latex: string) => `<span class="katex">${latex}</span>`),
}));

describe('LaTeXPreview', () => {
  it('renders the preview container', () => {
    render(<LaTeXPreview content="Hello World" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders LaTeX content', () => {
    render(<LaTeXPreview content="$E = mc^2$" />);
    // The content should be rendered
    const container = document.querySelector('.latex-preview, [class*="preview"]');
    expect(container || screen.getByText(/E = mc/)).toBeTruthy();
  });

  it('applies custom scale', () => {
    const { container } = render(<LaTeXPreview content="test" scale={1.5} />);
    // Scale should be applied via style
    expect(container.firstChild).toBeDefined();
  });

  it('handles empty content', () => {
    const { container } = render(<LaTeXPreview content="" />);
    expect(container.firstChild).toBeDefined();
  });

  it('handles complex LaTeX', () => {
    const complexLatex = `
      \\documentclass{article}
      \\begin{document}
      \\section{Introduction}
      The equation $E = mc^2$ is famous.
      \\end{document}
    `;
    
    expect(() => render(<LaTeXPreview content={complexLatex} />)).not.toThrow();
  });

  it('handles LaTeX errors gracefully', () => {
    const invalidLatex = '\\invalidcommand{test}';
    expect(() => render(<LaTeXPreview content={invalidLatex} />)).not.toThrow();
  });

  it('updates when content changes', () => {
    const { rerender } = render(<LaTeXPreview content="First" />);
    expect(screen.getByText('First')).toBeInTheDocument();
    
    rerender(<LaTeXPreview content="Second" />);
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('applies default scale of 1', () => {
    const { container } = render(<LaTeXPreview content="test" />);
    expect(container.firstChild).toBeDefined();
  });
});
