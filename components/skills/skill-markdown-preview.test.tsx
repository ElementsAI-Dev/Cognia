import { render, screen } from '@testing-library/react';
import { SkillMarkdownPreview, SkillMarkdownStyles } from './skill-markdown-preview';

describe('SkillMarkdownPreview', () => {
  it('renders markdown content', () => {
    render(<SkillMarkdownPreview content="# Hello World" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders headers correctly', () => {
    render(
      <SkillMarkdownPreview 
        content={`# H1
## H2
### H3`} 
      />
    );
    
    const container = document.querySelector('.skill-markdown-preview');
    expect(container?.querySelector('h1')).toBeInTheDocument();
    expect(container?.querySelector('h2')).toBeInTheDocument();
    expect(container?.querySelector('h3')).toBeInTheDocument();
  });

  it('renders bold text', () => {
    render(<SkillMarkdownPreview content="This is **bold** text" />);
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByText('bold').tagName).toBe('STRONG');
  });

  it('renders italic text', () => {
    render(<SkillMarkdownPreview content="This is *italic* text" />);
    expect(screen.getByText('italic')).toBeInTheDocument();
    expect(screen.getByText('italic').tagName).toBe('EM');
  });

  it('renders code blocks', () => {
    render(
      <SkillMarkdownPreview 
        content={`\`\`\`javascript
const x = 1;
\`\`\``} 
      />
    );
    
    const codeBlock = document.querySelector('.code-block');
    expect(codeBlock).toBeInTheDocument();
  });

  it('renders inline code', () => {
    render(<SkillMarkdownPreview content="Use `const` for variables" />);
    
    const inlineCode = document.querySelector('.inline-code');
    expect(inlineCode).toBeInTheDocument();
    expect(inlineCode?.textContent).toBe('const');
  });

  it('renders unordered lists', () => {
    render(
      <SkillMarkdownPreview 
        content={`- Item 1
- Item 2
- Item 3`} 
      />
    );
    
    const list = document.querySelector('ul');
    expect(list).toBeInTheDocument();
    expect(list?.querySelectorAll('li').length).toBe(3);
  });

  it('renders blockquotes', () => {
    render(<SkillMarkdownPreview content="> This is a quote" />);
    
    // Blockquotes are rendered with a specific class
    const blockquoteContainer = document.querySelector('.skill-markdown-preview');
    expect(blockquoteContainer).toBeInTheDocument();
    expect(blockquoteContainer?.textContent).toContain('This is a quote');
  });

  it('renders links', () => {
    render(<SkillMarkdownPreview content="[Click here](https://example.com)" />);
    
    const link = screen.getByRole('link', { name: 'Click here' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('escapes HTML to prevent XSS', () => {
    render(<SkillMarkdownPreview content="<script>alert('xss')</script>" />);
    
    const script = document.querySelector('script');
    expect(script).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<SkillMarkdownPreview content="Test" className="custom-class" />);
    
    const container = document.querySelector('.skill-markdown-preview');
    expect(container).toHaveClass('custom-class');
  });
});

describe('SkillMarkdownStyles', () => {
  it('renders style tag', () => {
    render(<SkillMarkdownStyles />);
    
    const style = document.querySelector('style');
    expect(style).toBeInTheDocument();
  });
});
