import { render, screen } from '@testing-library/react';
import { CodeBlock } from './code-block';

describe('CodeBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders code content', () => {
    render(<CodeBlock code="const x = 1;" />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });

  it('renders with language label when provided', () => {
    render(<CodeBlock code="const x = 1;" language="javascript" />);
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('renders without language label when not provided', () => {
    render(<CodeBlock code="const x = 1;" />);
    expect(screen.queryByText('javascript')).not.toBeInTheDocument();
  });

  it('renders line numbers by default', () => {
    const code = `line1
line2
line3`;
    render(<CodeBlock code={code} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('hides line numbers when showLineNumbers is false', () => {
    const code = `line1
line2`;
    render(<CodeBlock code={code} showLineNumbers={false} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <CodeBlock code="test" className="custom-class" />
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('renders copy button', () => {
    render(<CodeBlock code="test" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders copy button in header when language is provided', () => {
    render(<CodeBlock code="test" language="javascript" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders multiline code with correct line count', () => {
    const code = `line1
line2
line3
line4
line5`;
    render(<CodeBlock code={code} />);
    
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('handles empty lines in code', () => {
    const code = `line1

line3`;
    render(<CodeBlock code={code} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('applies language class to code element', () => {
    const { container } = render(
      <CodeBlock code="test" language="typescript" />
    );
    
    const codeElement = container.querySelector('code');
    expect(codeElement).toHaveClass('language-typescript');
  });

  it('does not apply language class when language is not provided', () => {
    const { container } = render(<CodeBlock code="test" />);
    
    const codeElement = container.querySelector('code');
    expect(codeElement).not.toHaveClass('language-undefined');
  });

  it('renders pre element', () => {
    const { container } = render(<CodeBlock code="test" />);
    expect(container.querySelector('pre')).toBeInTheDocument();
  });

  it('renders table for line numbers', () => {
    const code = `line1
line2`;
    const { container } = render(<CodeBlock code={code} />);
    expect(container.querySelector('table')).toBeInTheDocument();
  });

  it('does not render table when showLineNumbers is false', () => {
    const code = `line1
line2`;
    const { container } = render(
      <CodeBlock code={code} showLineNumbers={false} />
    );
    expect(container.querySelector('table')).not.toBeInTheDocument();
  });

  it('renders lines in table rows', () => {
    const code = `const a = 1;
const b = 2;`;
    render(<CodeBlock code={code} />);
    
    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
    expect(screen.getByText('const b = 2;')).toBeInTheDocument();
  });
});
