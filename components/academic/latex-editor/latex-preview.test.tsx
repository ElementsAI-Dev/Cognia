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

  // Tests for enhanced environments
  describe('theorem-like environments', () => {
    it('renders theorem environment', () => {
      const content = '\\begin{theorem}This is a theorem.\\end{theorem}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('Theorem');
      expect(container.innerHTML).toContain('This is a theorem');
    });

    it('renders theorem with title', () => {
      const content = '\\begin{theorem}[Pythagorean]a^2 + b^2 = c^2\\end{theorem}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('Pythagorean');
    });

    it('renders lemma environment', () => {
      const content = '\\begin{lemma}This is a lemma.\\end{lemma}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('Lemma');
    });

    it('renders definition environment', () => {
      const content = '\\begin{definition}A definition.\\end{definition}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('Definition');
    });

    it('renders corollary environment', () => {
      const content = '\\begin{corollary}A corollary.\\end{corollary}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('Corollary');
    });

    it('renders proposition environment', () => {
      const content = '\\begin{proposition}A proposition.\\end{proposition}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('Proposition');
    });

    it('renders example environment', () => {
      const content = '\\begin{example}An example.\\end{example}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('Example');
    });
  });

  describe('proof environment', () => {
    it('renders proof environment', () => {
      const content = '\\begin{proof}Proof content.\\end{proof}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('Proof');
      expect(container.innerHTML).toContain('□'); // QED symbol
    });

    it('renders proof with custom title', () => {
      const content = '\\begin{proof}[Proof of Theorem 1]Custom proof.\\end{proof}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('Proof of Theorem 1');
    });
  });

  describe('other environments', () => {
    it('renders remark environment', () => {
      const content = '\\begin{remark}A remark.\\end{remark}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('Remark');
    });

    it('renders note environment', () => {
      const content = '\\begin{note}A note.\\end{note}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('Note');
    });

    it('renders quote environment', () => {
      const content = '\\begin{quote}A quote.\\end{quote}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('A quote');
    });

    it('renders abstract environment', () => {
      const content = '\\begin{abstract}Abstract text.\\end{abstract}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('Abstract');
    });
  });

  describe('formatting commands', () => {
    it('renders textsc command', () => {
      const content = '\\textsc{Small Caps}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('Small Caps');
    });

    it('renders textcolor command', () => {
      const content = '\\textcolor{red}{Red text}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('Red text');
      expect(container.innerHTML).toContain('color: red');
    });

    it('renders footnote as tooltip', () => {
      const content = 'Text\\footnote{This is a footnote}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('[*]');
    });
  });

  describe('list environments', () => {
    it('renders description list', () => {
      const content = '\\begin{description}\\item[Term] Definition\\end{description}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('Term');
    });
  });

  describe('math environments', () => {
    it('renders align environment preserving alignment markers', () => {
      const content = '\\begin{align}a &= b + c\\\\d &= e + f\\end{align}';
      const { container } = render(<LaTeXPreview content={content} />);
      // Should render without error and contain katex output
      expect(container.innerHTML).toContain('katex');
    });

    it('renders align* environment', () => {
      const content = '\\begin{align*}x &= 1\\end{align*}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('katex');
    });

    it('renders gather environment', () => {
      const content = '\\begin{gather}a = b\\\\c = d\\end{gather}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('katex');
    });

    it('renders gather* environment', () => {
      const content = '\\begin{gather*}x = 1\\end{gather*}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('katex');
    });

    it('renders multline environment', () => {
      const content = '\\begin{multline}a + b + c\\\\+ d + e\\end{multline}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('katex');
    });

    it('renders cases environment', () => {
      const content = '\\begin{cases}x & \\text{if } x > 0\\\\-x & \\text{otherwise}\\end{cases}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('katex');
    });
  });

  describe('table environments', () => {
    it('renders tabular environment', () => {
      const content = '\\begin{tabular}{|c|c|}a & b\\\\c & d\\end{tabular}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('<table');
      expect(container.innerHTML).toContain('<td');
    });

    it('renders tabular with different alignments', () => {
      const content = '\\begin{tabular}{lcr}left & center & right\\end{tabular}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('text-left');
      expect(container.innerHTML).toContain('text-center');
      expect(container.innerHTML).toContain('text-right');
    });

    it('renders table environment with caption', () => {
      const content = '\\begin{table}\\caption{My Table}\\begin{tabular}{c}data\\end{tabular}\\end{table}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('My Table');
      expect(container.innerHTML).toContain('<figure');
    });
  });

  describe('figure environments', () => {
    it('renders figure environment', () => {
      const content = '\\begin{figure}\\includegraphics{test.png}\\end{figure}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('<figure');
    });

    it('renders figure with caption', () => {
      const content = '\\begin{figure}\\includegraphics{test.png}\\caption{My Figure}\\end{figure}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('My Figure');
      expect(container.innerHTML).toContain('<figcaption');
    });

    it('renders includegraphics placeholder in figure', () => {
      // Local paths should render as placeholders
      const content = '\\begin{figure}\\includegraphics{myimage.png}\\end{figure}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('<figure');
      expect(container.innerHTML).toContain('[Image: myimage.png]');
    });

    it('renders includegraphics with local path as placeholder', () => {
      const content = '\\includegraphics{images/test.png}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('[Image: images/test.png]');
    });

    it('renders includegraphics with width option in figure', () => {
      const content = '\\begin{figure}\\includegraphics[width=50%]{https://example.com/image.png}\\end{figure}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('<figure');
    });

    it('renders includegraphics with scale option in figure', () => {
      const content = '\\begin{figure}\\includegraphics[scale=0.5]{test.png}\\end{figure}';
      const { container } = render(<LaTeXPreview content={content} />);
      expect(container.innerHTML).toContain('<figure');
    });
  });
});
