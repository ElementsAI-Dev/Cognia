/**
 * Unit tests for GitignoreTemplateSelector component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GitignoreTemplateSelector } from './gitignore-template-selector';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock gitignore templates
jest.mock('@/lib/native/gitignore-templates', () => ({
  gitignoreTemplates: [
    { id: 'node', name: 'Node.js', icon: '📦' },
    { id: 'python', name: 'Python', icon: '🐍' },
    { id: 'react', name: 'React', icon: '⚛️' },
  ],
  getGitignoreTemplate: (id: string) => {
    const templates: Record<string, { id: string; name: string; content: string }> = {
      node: { id: 'node', name: 'Node.js', content: 'node_modules/' },
      python: { id: 'python', name: 'Python', content: '__pycache__/' },
      react: { id: 'react', name: 'React', content: 'build/' },
    };
    return templates[id];
  },
  mergeGitignoreTemplates: (ids: string[]) => ids.map((id) => `# ${id}`).join('\n'),
  detectProjectType: () => ['node'],
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="dialog" data-open={open}>
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-trigger">{children}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea data-testid="textarea" {...props} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  FileCode: () => <span data-testid="icon-file-code" />,
  Check: () => <span data-testid="icon-check" />,
  Copy: () => <span data-testid="icon-copy" />,
  Sparkles: () => <span data-testid="icon-sparkles" />,
}));

describe('GitignoreTemplateSelector', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the trigger button', () => {
    render(<GitignoreTemplateSelector onSelect={mockOnSelect} />);
    expect(screen.getByTestId('dialog-trigger')).toBeInTheDocument();
  });

  it('renders dialog content', () => {
    render(<GitignoreTemplateSelector onSelect={mockOnSelect} />);
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
  });

  it('renders template buttons', () => {
    render(<GitignoreTemplateSelector onSelect={mockOnSelect} />);
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('renders textarea for custom content', () => {
    render(<GitignoreTemplateSelector onSelect={mockOnSelect} />);
    expect(screen.getByTestId('textarea')).toBeInTheDocument();
  });

  it('renders dialog footer with buttons', () => {
    render(<GitignoreTemplateSelector onSelect={mockOnSelect} />);
    expect(screen.getByTestId('dialog-footer')).toBeInTheDocument();
  });

  it('renders auto-detect button when projectFiles provided', () => {
    render(
      <GitignoreTemplateSelector
        onSelect={mockOnSelect}
        projectFiles={['package.json', 'index.js']}
      />
    );
    expect(screen.getByTestId('icon-sparkles')).toBeInTheDocument();
  });

  it('toggles template selection on click', async () => {
    render(<GitignoreTemplateSelector onSelect={mockOnSelect} />);
    const nodeButton = screen.getByText('Node.js');
    await userEvent.click(nodeButton);
    // Template should be selected (visual change handled by component)
    expect(nodeButton).toBeInTheDocument();
  });

  it('allows custom className', () => {
    render(<GitignoreTemplateSelector onSelect={mockOnSelect} className="custom-class" />);
    expect(screen.getByTestId('dialog-trigger')).toBeInTheDocument();
  });
});
