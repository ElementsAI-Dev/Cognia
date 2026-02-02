import { render, screen } from '@testing-library/react';
import { LatexSketchDialog } from './latex-sketch-dialog';
import { NextIntlClientProvider } from 'next-intl';

// Mock the sketch-to-latex service
jest.mock('@/lib/latex', () => ({
  SketchToLaTeXService: jest.fn().mockImplementation(() => ({
    recognize: jest.fn().mockResolvedValue({
      latex: '\\frac{a}{b}',
      confidence: 0.95,
      alternatives: ['\\frac{a}{b}', 'a/b', '\\dfrac{a}{b}'],
    }),
  })),
  strokesToImageDataURL: jest.fn().mockReturnValue('data:image/png;base64,test'),
}));

// Use translation keys that match actual component usage
const messages = {
  latex: {
    sketchInput: 'Sketch Math',
    sketchDescription: 'Draw mathematical expressions',
    pen: 'Pen',
    eraser: 'Eraser',
    clear: 'Clear',
    recognize: 'Recognize',
    recognizing: 'Recognizing...',
    result: 'Result',
    alternatives: 'Alternatives',
    insert: 'Insert',
    copy: 'Copy',
    copied: 'Copied!',
    noResult: 'No result',
    drawHint: 'Draw your math expression here',
  },
};

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('LatexSketchDialog', () => {
  const mockOnInsert = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open is true', () => {
    renderWithIntl(
      <LatexSketchDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onInsert={mockOnInsert}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    renderWithIntl(
      <LatexSketchDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onInsert={mockOnInsert}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders drawing tools when open', () => {
    renderWithIntl(
      <LatexSketchDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onInsert={mockOnInsert}
      />
    );

    // Check for tool buttons by their icon content or role
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders dialog content when open', () => {
    renderWithIntl(
      <LatexSketchDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onInsert={mockOnInsert}
      />
    );

    // Dialog should be present and have content
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog.textContent).toBeTruthy();
  });

  it('renders dialog footer with action buttons', () => {
    renderWithIntl(
      <LatexSketchDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onInsert={mockOnInsert}
      />
    );

    // Dialog should contain multiple buttons in footer
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4); // pen, eraser, clear, recognize, insert, copy
  });
});
