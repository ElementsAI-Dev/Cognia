import { render } from '@testing-library/react';
import { MathInline } from './math-inline';

// Mock KaTeX
jest.mock('katex', () => ({
  renderToString: jest.fn((content: string) => {
    if (content.includes('invalid')) {
      throw new Error('KaTeX parse error');
    }
    return `<span class="katex">${content}</span>`;
  }),
}));

describe('MathInline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders inline LaTeX content correctly', () => {
    const { container } = render(<MathInline content="$x^2$" />);
    
    const mathElement = container.querySelector('.katex-inline');
    expect(mathElement).toBeInTheDocument();
    expect(mathElement?.innerHTML).toContain('x^2');
  });

  it('strips $ delimiters from content', () => {
    const katex = jest.requireMock('katex');
    render(<MathInline content="$a + b$" />);
    
    expect(katex.renderToString).toHaveBeenCalledWith(
      'a + b',
      expect.objectContaining({ displayMode: false })
    );
  });

  it('renders as code element on error', () => {
    const { container } = render(<MathInline content="$invalid$" />);
    
    const codeElement = container.querySelector('code');
    expect(codeElement).toBeInTheDocument();
    expect(codeElement).toHaveTextContent('$invalid$');
  });

  it('applies custom className', () => {
    const { container } = render(
      <MathInline content="$x$" className="custom-inline" />
    );

    expect(container.querySelector('.custom-inline')).toBeInTheDocument();
  });
});
