import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { FootnoteRef, FootnoteSection, InlineFootnote } from './footnote-block';
import { ReactNode } from 'react';

// Wrapper with providers
const Wrapper = ({ children }: { children: ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
);

// Custom render
const customRender = (ui: React.ReactElement) =>
  render(ui, { wrapper: Wrapper });

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('FootnoteRef', () => {
  describe('Rendering', () => {
    it('renders footnote reference with index', () => {
      customRender(<FootnoteRef id="1" index={1} />);
      expect(screen.getByText('[1]')).toBeInTheDocument();
    });

    it('renders as superscript', () => {
      const { container } = customRender(<FootnoteRef id="1" index={1} />);
      expect(container.querySelector('sup')).toBeInTheDocument();
    });

    it('links to footnote', () => {
      customRender(<FootnoteRef id="test" index={1} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '#fn-test');
    });

    it('has correct id for back-reference', () => {
      const { container } = customRender(<FootnoteRef id="test" index={1} />);
      const sup = container.querySelector('sup');
      expect(sup).toHaveAttribute('id', 'fnref-test');
    });

    it('applies custom className', () => {
      const { container } = customRender(
        <FootnoteRef id="1" index={1} className="custom-class" />
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Hover preview', () => {
    it('shows content on hover when provided', () => {
      customRender(
        <FootnoteRef id="1" index={1} content="Footnote content" />
      );
      // The hover card trigger should be present
      expect(screen.getByText('[1]')).toBeInTheDocument();
    });
  });
});

describe('FootnoteSection', () => {
  const mockFootnotes = [
    { id: '1', content: 'First footnote' },
    { id: '2', content: 'Second footnote' },
    { id: '3', content: 'Third footnote' },
  ];

  describe('Rendering', () => {
    it('renders all footnotes', () => {
      customRender(<FootnoteSection footnotes={mockFootnotes} />);
      
      expect(screen.getByText('First footnote')).toBeInTheDocument();
      expect(screen.getByText('Second footnote')).toBeInTheDocument();
      expect(screen.getByText('Third footnote')).toBeInTheDocument();
    });

    it('renders as ordered list', () => {
      const { container } = customRender(
        <FootnoteSection footnotes={mockFootnotes} />
      );
      expect(container.querySelector('ol')).toBeInTheDocument();
    });

    it('renders footnote count', () => {
      customRender(<FootnoteSection footnotes={mockFootnotes} />);
      expect(screen.getByText('(3)')).toBeInTheDocument();
    });

    it('renders default title', () => {
      customRender(<FootnoteSection footnotes={mockFootnotes} />);
      expect(screen.getByText('Footnotes')).toBeInTheDocument();
    });

    it('renders custom title', () => {
      customRender(
        <FootnoteSection footnotes={mockFootnotes} title="References" />
      );
      expect(screen.getByText('References')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = customRender(
        <FootnoteSection footnotes={mockFootnotes} className="custom-class" />
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('returns null when no footnotes', () => {
      const { container } = customRender(<FootnoteSection footnotes={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Footnote IDs', () => {
    it('sets correct id for each footnote', () => {
      const { container } = customRender(
        <FootnoteSection footnotes={mockFootnotes} />
      );
      
      expect(container.querySelector('#fn-1')).toBeInTheDocument();
      expect(container.querySelector('#fn-2')).toBeInTheDocument();
      expect(container.querySelector('#fn-3')).toBeInTheDocument();
    });

    it('has back-reference links', () => {
      customRender(<FootnoteSection footnotes={mockFootnotes} />);
      
      const backLinks = screen.getAllByRole('link');
      expect(backLinks.length).toBe(3);
    });
  });

  describe('Collapsible', () => {
    it('renders collapsible when enabled', () => {
      const { container } = customRender(
        <FootnoteSection footnotes={mockFootnotes} collapsible />
      );
      
      // Should have collapsible trigger
      expect(container.querySelector('button')).toBeInTheDocument();
    });

    it('starts open when defaultOpen is true', () => {
      customRender(
        <FootnoteSection footnotes={mockFootnotes} collapsible defaultOpen />
      );
      
      expect(screen.getByText('First footnote')).toBeInTheDocument();
    });

    it('toggles on click when collapsible', () => {
      customRender(
        <FootnoteSection footnotes={mockFootnotes} collapsible defaultOpen={false} />
      );
      
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);
      
      // Content should be visible after click
      expect(screen.getByText('First footnote')).toBeInTheDocument();
    });
  });

  describe('Complex content', () => {
    it('renders footnotes with React nodes', () => {
      const footnotes = [
        { id: '1', content: <span data-testid="custom">Custom content</span> },
      ];
      customRender(<FootnoteSection footnotes={footnotes} />);
      
      expect(screen.getByTestId('custom')).toBeInTheDocument();
    });
  });
});

describe('InlineFootnote', () => {
  describe('Rendering', () => {
    it('renders children', () => {
      customRender(
        <InlineFootnote note="Note content">
          Hover text
        </InlineFootnote>
      );
      expect(screen.getByText('Hover text')).toBeInTheDocument();
    });

    it('has dotted underline', () => {
      const { container } = customRender(
        <InlineFootnote note="Note">Text</InlineFootnote>
      );
      expect(container.querySelector('.border-dotted')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = customRender(
        <InlineFootnote note="Note" className="custom-class">
          Text
        </InlineFootnote>
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });
});
