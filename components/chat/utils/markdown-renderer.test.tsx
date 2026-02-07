import { render, screen } from '@testing-library/react';

// Mock react-markdown (ESM module)
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div data-testid="react-markdown">{children}</div>,
}));

// Mock remark/rehype plugins
jest.mock('remark-gfm', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('remark-math', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('rehype-raw', () => ({ __esModule: true, default: jest.fn() }));

// Mock the renderers
jest.mock('@/components/chat/renderers/mermaid-block', () => ({
  MermaidBlock: ({ content }: { content: string }) => (
    <div data-testid="mermaid-block">{content}</div>
  ),
}));

jest.mock('@/components/chat/renderers/vegalite-block', () => ({
  VegaLiteBlock: ({ content }: { content: string }) => (
    <div data-testid="vegalite-block">{content}</div>
  ),
}));

jest.mock('@/components/chat/renderers/code-block', () => ({
  CodeBlock: ({ code, language }: { code: string; language?: string }) => (
    <div data-testid="code-block" data-language={language}>{code}</div>
  ),
}));

jest.mock('@/components/chat/renderers/math-block', () => ({
  MathBlock: ({ content }: { content: string }) => (
    <div data-testid="math-block">{content}</div>
  ),
}));

jest.mock('@/components/chat/renderers/math-inline', () => ({
  MathInline: ({ content }: { content: string }) => (
    <span data-testid="math-inline">{content}</span>
  ),
}));

// Mock KaTeX CSS import
jest.mock('katex/dist/katex.min.css', () => ({}));

// Import after mocks
import { MarkdownRenderer } from './markdown-renderer';

describe('MarkdownRenderer', () => {
  it('renders content through ReactMarkdown', () => {
    render(<MarkdownRenderer content="Hello world" />);
    expect(screen.getByTestId('react-markdown')).toBeInTheDocument();
  });

  it('passes content to ReactMarkdown', () => {
    render(<MarkdownRenderer content="Test content" />);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MarkdownRenderer content="test" className="custom-md" />
    );
    expect(container.querySelector('.custom-md')).toBeInTheDocument();
  });

  it('has markdown-renderer class for styling', () => {
    const { container } = render(<MarkdownRenderer content="test" />);
    expect(container.querySelector('.markdown-renderer')).toBeInTheDocument();
  });

  it('renders with default props', () => {
    const { container } = render(<MarkdownRenderer content="test" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('accepts enableMermaid prop', () => {
    const { container } = render(
      <MarkdownRenderer content="test" enableMermaid={false} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('accepts enableMath prop', () => {
    const { container } = render(
      <MarkdownRenderer content="test" enableMath={false} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('accepts enableVegaLite prop', () => {
    const { container } = render(
      <MarkdownRenderer content="test" enableVegaLite={false} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('accepts showLineNumbers prop', () => {
    const { container } = render(
      <MarkdownRenderer content="test" showLineNumbers={true} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
