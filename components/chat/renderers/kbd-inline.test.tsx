import { render, screen } from '@testing-library/react';
import { KbdInline, KeyboardShortcut, parseShortcut } from './kbd-inline';

describe('KbdInline', () => {
  describe('Rendering', () => {
    it('renders keyboard key', () => {
      render(<KbdInline>A</KbdInline>);
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('renders as kbd element', () => {
      const { container } = render(<KbdInline>Enter</KbdInline>);
      expect(container.querySelector('kbd')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <KbdInline className="custom-class">Key</KbdInline>
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('applies base keyboard typography', () => {
      const { container } = render(<KbdInline>X</KbdInline>);
      expect(container.querySelector('.font-sans')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('renders default variant with background', () => {
      const { container } = render(
        <KbdInline variant="default">Key</KbdInline>
      );
      expect(container.querySelector('.bg-muted')).toBeInTheDocument();
    });

    it('renders outline variant with border', () => {
      const { container } = render(
        <KbdInline variant="outline">Key</KbdInline>
      );
      expect(container.querySelector('.border')).toBeInTheDocument();
    });

    it('renders ghost variant', () => {
      const { container } = render(
        <KbdInline variant="ghost">Key</KbdInline>
      );
      expect(container.querySelector('.bg-muted\\/50')).toBeInTheDocument();
    });
  });
});

describe('KeyboardShortcut', () => {
  describe('Rendering', () => {
    it('renders single key', () => {
      render(<KeyboardShortcut keys={['A']} />);
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('renders multiple keys', () => {
      render(<KeyboardShortcut keys={['Ctrl', 'C']} />);
      expect(screen.getByText('Ctrl')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('renders separator between keys', () => {
      render(<KeyboardShortcut keys={['Ctrl', 'Shift', 'P']} />);
      
      // Should have + separators
      const separators = screen.getAllByText('+');
      expect(separators.length).toBe(2);
    });

    it('uses custom separator', () => {
      render(<KeyboardShortcut keys={['Ctrl', 'C']} separator="-" />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <KeyboardShortcut keys={['A']} className="custom-class" />
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Key formatting', () => {
    it('capitalizes single letters', () => {
      render(<KeyboardShortcut keys={['a', 'b', 'c']} />);
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('preserves function keys', () => {
      render(<KeyboardShortcut keys={['F1', 'F12']} />);
      expect(screen.getByText('F1')).toBeInTheDocument();
      expect(screen.getByText('F12')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('applies variant to all keys', () => {
      const { container } = render(
        <KeyboardShortcut keys={['Ctrl', 'C']} variant="outline" />
      );
      const kbdElements = container.querySelectorAll('kbd[data-slot="kbd"]');
      expect(kbdElements.length).toBe(2);
    });
  });
});

describe('parseShortcut', () => {
  it('parses shortcut with + separator', () => {
    const result = parseShortcut('Ctrl+Shift+P');
    expect(result).toEqual(['Ctrl', 'Shift', 'P']);
  });

  it('parses shortcut with space separator', () => {
    const result = parseShortcut('Ctrl Shift P');
    expect(result).toEqual(['Ctrl', 'Shift', 'P']);
  });

  it('parses single key', () => {
    const result = parseShortcut('Enter');
    expect(result).toEqual(['Enter']);
  });

  it('handles mixed separators', () => {
    const result = parseShortcut('Ctrl+Shift P');
    expect(result).toEqual(['Ctrl', 'Shift', 'P']);
  });

  it('filters empty strings', () => {
    const result = parseShortcut('Ctrl++C');
    expect(result).toEqual(['Ctrl', 'C']);
  });

  it('handles empty string', () => {
    const result = parseShortcut('');
    expect(result).toEqual([]);
  });
});
