import { render, screen } from '@testing-library/react';
import { MathBlock } from './math-block';

// Mock KaTeX
jest.mock('katex', () => ({
  renderToString: jest.fn((content: string) => {
    if (content.includes('invalid')) {
      throw new Error('KaTeX parse error');
    }
    return `<span class="katex">${content}</span>`;
  }),
}));

describe('MathBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders LaTeX content correctly', () => {
    render(<MathBlock content="$$E = mc^2$$" />);
    
    const mathElement = document.querySelector('.katex-block');
    expect(mathElement).toBeInTheDocument();
    expect(mathElement?.innerHTML).toContain('E = mc^2');
  });

  it('strips $$ delimiters from content', () => {
    const katex = jest.requireMock('katex');
    render(<MathBlock content="$$x^2 + y^2 = z^2$$" />);
    
    expect(katex.renderToString).toHaveBeenCalledWith(
      'x^2 + y^2 = z^2',
      expect.any(Object)
    );
  });

  it('renders error state for invalid LaTeX', () => {
    render(<MathBlock content="$$invalid$$" />);
    
    expect(screen.getByText('LaTeX Error')).toBeInTheDocument();
    expect(screen.getByText('KaTeX parse error')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MathBlock content="$$x$$" className="custom-math" />
    );

    expect(container.querySelector('.custom-math')).toBeInTheDocument();
  });

  it('renders copy button', () => {
    render(<MathBlock content="$$x$$" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
