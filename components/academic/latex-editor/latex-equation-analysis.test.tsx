import { render, screen, fireEvent } from '@testing-library/react';
import { LatexEquationAnalysis } from './latex-equation-analysis';
import { NextIntlClientProvider } from 'next-intl';

// Mock the equation-reasoner functions
jest.mock('@/lib/latex', () => ({
  EquationReasoner: jest.fn().mockImplementation(() => ({
    analyze: jest.fn().mockReturnValue({
      type: 'algebraic',
      variables: ['x', 'y'],
      constants: ['2', '3'],
      operators: ['+', '='],
      functions: [],
      complexity: 2.5,
    }),
    verify: jest.fn().mockReturnValue({
      isValid: true,
      confidence: 0.95,
      issues: [],
      suggestions: ['Consider using \\cdot for multiplication'],
    }),
    simplify: jest.fn().mockReturnValue({
      original: 'x + x',
      simplified: '2x',
      steps: [
        { step: 1, expression: 'x + x', description: 'Combine like terms' },
      ],
    }),
    expand: jest.fn().mockReturnValue({
      original: '(a+b)^2',
      expanded: 'a^2 + 2ab + b^2',
      steps: [
        { step: 1, expression: '(a+b)(a+b)', description: 'Expand the square' },
        { step: 2, expression: 'a^2 + 2ab + b^2', description: 'Apply FOIL method' },
      ],
    }),
  })),
}));

// Use translation keys matching actual component usage
const messages = {
  latex: {
    equation: 'Equation',
    enterEquation: 'Enter LaTeX equation',
    analyze: 'Analyze',
    simplify: 'Simplify',
    expand: 'Expand',
    verify: 'Verify',
    analysisResults: 'Analysis Results',
    verification: 'Verification',
    type: 'Type',
    complexity: 'Complexity',
    variables: 'Variables',
    functions: 'Functions',
    confidence: 'Confidence',
    issues: 'Issues',
    suggestions: 'Suggestions',
    suggestion: 'Suggestion',
    simplificationResult: 'Simplified Form',
    expandedForm: 'Expanded Form',
    steps: 'Steps',
    emptyState: 'Enter an equation and click Analyze to get started',
    insert: 'Insert',
  },
};

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('LatexEquationAnalysis', () => {
  const mockOnInsert = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with input field', () => {
    renderWithIntl(<LatexEquationAnalysis onInsert={mockOnInsert} />);

    // Check for textarea element
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    renderWithIntl(<LatexEquationAnalysis onInsert={mockOnInsert} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it('renders with initial equation prop', () => {
    renderWithIntl(
      <LatexEquationAnalysis equation="x + y" onInsert={mockOnInsert} />
    );

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('x + y');
  });

  it('updates equation when typing', () => {
    renderWithIntl(<LatexEquationAnalysis onInsert={mockOnInsert} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'x + y = 2' } });

    expect((textarea as HTMLTextAreaElement).value).toBe('x + y = 2');
  });

  it('has clickable analyze button', () => {
    renderWithIntl(<LatexEquationAnalysis onInsert={mockOnInsert} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'x + y' } });

    const buttons = screen.getAllByRole('button');
    // Should be able to click buttons
    buttons.forEach(button => {
      expect(button).toBeEnabled();
    });
  });
});
