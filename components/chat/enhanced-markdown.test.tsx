import { render, screen } from '@testing-library/react';

// Mock react-markdown (ESM module)
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div data-testid="react-markdown">{children}</div>,
}));

// Mock remark/rehype plugins
jest.mock('remark-gfm', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('remark-math', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('rehype-katex', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('rehype-raw', () => ({ __esModule: true, default: jest.fn() }));

// Mock the renderers
jest.mock('./renderers/mermaid-block', () => ({
  MermaidBlock: ({ content }: { content: string }) => (
    <div data-testid="mermaid-block">{content}</div>
  ),
}));

jest.mock('./renderers/vegalite-block', () => ({
  VegaLiteBlock: ({ content }: { content: string }) => (
    <div data-testid="vegalite-block">{content}</div>
  ),
}));

jest.mock('./renderers/code-block', () => ({
  CodeBlock: ({ code, language }: { code: string; language?: string }) => (
    <div data-testid="code-block" data-language={language}>{code}</div>
  ),
}));

// Mock KaTeX CSS import
jest.mock('katex/dist/katex.min.css', () => ({}));

// Import after mocks
import { EnhancedMarkdown } from './enhanced-markdown';

describe('EnhancedMarkdown', () => {
  it('renders content through ReactMarkdown', () => {
    render(<EnhancedMarkdown content="Hello world" />);
    expect(screen.getByTestId('react-markdown')).toBeInTheDocument();
  });

  it('passes content to ReactMarkdown', () => {
    render(<EnhancedMarkdown content="Test content" />);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <EnhancedMarkdown content="test" className="custom-md" />
    );
    expect(container.querySelector('.custom-md')).toBeInTheDocument();
  });

  it('has enhanced-markdown class for styling', () => {
    const { container } = render(<EnhancedMarkdown content="test" />);
    expect(container.querySelector('.enhanced-markdown')).toBeInTheDocument();
  });

  it('renders with default props', () => {
    const { container } = render(<EnhancedMarkdown content="test" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('accepts enableMermaid prop', () => {
    const { container } = render(
      <EnhancedMarkdown content="test" enableMermaid={false} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('accepts enableMath prop', () => {
    const { container } = render(
      <EnhancedMarkdown content="test" enableMath={false} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('accepts enableVegaLite prop', () => {
    const { container } = render(
      <EnhancedMarkdown content="test" enableVegaLite={false} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('accepts showLineNumbers prop', () => {
    const { container } = render(
      <EnhancedMarkdown content="test" showLineNumbers={true} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
