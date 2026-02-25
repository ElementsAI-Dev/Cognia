/**
 * Unit tests for DocumentOutline component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentOutline } from './document-outline';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
}));

describe('DocumentOutline', () => {
  describe('empty state', () => {
    it('renders empty state when no sections found', () => {
      render(<DocumentOutline content="Hello world, no sections here." />);
      expect(screen.getByText('No sections found')).toBeInTheDocument();
    });

    it('renders hint text in empty state', () => {
      render(<DocumentOutline content="" />);
      expect(screen.getByText(/Use \\section/)).toBeInTheDocument();
    });
  });

  describe('section parsing', () => {
    it('parses \\section commands', () => {
      const content = '\\section{Introduction}\nSome text\n\\section{Methods}';
      render(<DocumentOutline content={content} />);
      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('Methods')).toBeInTheDocument();
    });

    it('parses \\subsection commands', () => {
      const content = '\\section{Main}\n\\subsection{Sub One}\n\\subsection{Sub Two}';
      render(<DocumentOutline content={content} />);
      expect(screen.getByText('Main')).toBeInTheDocument();
      expect(screen.getByText('Sub One')).toBeInTheDocument();
      expect(screen.getByText('Sub Two')).toBeInTheDocument();
    });

    it('parses \\subsubsection commands', () => {
      const content = '\\subsubsection{Deep Section}';
      render(<DocumentOutline content={content} />);
      expect(screen.getByText('Deep Section')).toBeInTheDocument();
    });

    it('parses \\chapter commands', () => {
      const content = '\\chapter{Chapter One}';
      render(<DocumentOutline content={content} />);
      expect(screen.getByText('Chapter One')).toBeInTheDocument();
    });

    it('parses starred variants', () => {
      const content = '\\section*{Unnumbered Section}';
      render(<DocumentOutline content={content} />);
      expect(screen.getByText('Unnumbered Section')).toBeInTheDocument();
    });

    it('strips inner LaTeX commands from titles', () => {
      const content = '\\section{Some \\textbf{bold} title}';
      render(<DocumentOutline content={content} />);
      expect(screen.getByText('Some bold title')).toBeInTheDocument();
    });

    it('handles nested braces in section titles', () => {
      const content = '\\section{Title with {nested} braces}';
      render(<DocumentOutline content={content} />);
      expect(screen.getByText('Title with nested braces')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('calls onNavigate when clicking an entry', () => {
      const onNavigate = jest.fn();
      const content = '\\section{Click Me}';
      render(<DocumentOutline content={content} onNavigate={onNavigate} />);

      fireEvent.click(screen.getByText('Click Me'));
      expect(onNavigate).toHaveBeenCalledWith(1);
    });

    it('calls onNavigate with correct line number', () => {
      const onNavigate = jest.fn();
      const content = 'line 1\nline 2\n\\section{Third Line}';
      render(<DocumentOutline content={content} onNavigate={onNavigate} />);

      fireEvent.click(screen.getByText('Third Line'));
      expect(onNavigate).toHaveBeenCalledWith(3);
    });
  });

  describe('active section highlighting', () => {
    it('highlights current section based on currentLine', () => {
      const content = '\\section{First}\ntext\n\\section{Second}\nmore text';
      const { container } = render(<DocumentOutline content={content} currentLine={3} />);

      const buttons = container.querySelectorAll('button');
      // Second section should be active (line 3 >= line 3 of "Second")
      expect(buttons[1].className).toContain('bg-primary');
    });

    it('highlights first section when cursor is before second', () => {
      const content = '\\section{First}\ntext\n\\section{Second}';
      const { container } = render(<DocumentOutline content={content} currentLine={2} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons[0].className).toContain('bg-primary');
    });
  });

  describe('outline header', () => {
    it('renders outline title', () => {
      const content = '\\section{Test}';
      render(<DocumentOutline content={content} />);
      expect(screen.getByText('Outline')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const content = '\\section{Test}';
    const { container } = render(<DocumentOutline content={content} className="my-outline" />);
    expect(container.firstChild).toHaveClass('my-outline');
  });
});
