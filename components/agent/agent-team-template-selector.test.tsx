/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentTeamTemplateSelector } from './agent-team-template-selector';
import type { AgentTeamTemplate } from '@/types/agent/agent-team';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: (string | boolean | undefined | null)[]) => args.filter(Boolean).join(' '),
}));

const mockTemplates: Record<string, AgentTeamTemplate> = {
  't1': {
    id: 't1',
    name: 'Code Review',
    description: 'A team for reviewing code changes',
    category: 'review',
    icon: 'ShieldCheck',
    teammates: [
      { name: 'Reviewer', description: 'Lead code reviewer', specialization: 'code review' },
      { name: 'Tester', description: 'Testing specialist', specialization: 'testing' },
    ],
    isBuiltIn: true,
  },
  't2': {
    id: 't2',
    name: 'My Custom Team',
    description: 'Custom research team',
    category: 'research',
    teammates: [
      { name: 'Researcher', description: 'Lead researcher', specialization: 'research' },
    ],
    isBuiltIn: false,
  },
};

jest.mock('@/stores/agent/agent-team-store', () => ({
  useAgentTeamStore: (selector: (s: { templates: typeof mockTemplates }) => unknown) =>
    selector({ templates: mockTemplates }),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

jest.mock('lucide-react', () => {
  const icon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />;
  return {
    ShieldCheck: icon, FlaskConical: icon, BookOpen: icon,
    Layers: icon, GitBranch: icon, Users: icon,
  };
});

describe('AgentTeamTemplateSelector', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnSelectTemplate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <AgentTeamTemplateSelector
        open={false}
        onOpenChange={mockOnOpenChange}
        onSelectTemplate={mockOnSelectTemplate}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog when open', () => {
    render(
      <AgentTeamTemplateSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        onSelectTemplate={mockOnSelectTemplate}
      />
    );
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Choose Team Template')).toBeInTheDocument();
  });

  it('shows built-in and custom templates', () => {
    render(
      <AgentTeamTemplateSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        onSelectTemplate={mockOnSelectTemplate}
      />
    );
    expect(screen.getByText('Code Review')).toBeInTheDocument();
    expect(screen.getByText('My Custom Team')).toBeInTheDocument();
    expect(screen.getByText('Built-in Templates')).toBeInTheDocument();
    expect(screen.getByText('Custom Templates')).toBeInTheDocument();
  });

  it('shows teammate names in template cards', () => {
    render(
      <AgentTeamTemplateSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        onSelectTemplate={mockOnSelectTemplate}
      />
    );
    expect(screen.getByText('Reviewer')).toBeInTheDocument();
    expect(screen.getByText('Tester')).toBeInTheDocument();
  });

  it('calls onSelectTemplate when template is clicked', () => {
    render(
      <AgentTeamTemplateSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        onSelectTemplate={mockOnSelectTemplate}
      />
    );
    fireEvent.click(screen.getByText('Code Review'));
    expect(mockOnSelectTemplate).toHaveBeenCalledWith(mockTemplates['t1']);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onSelectTemplate with custom template on Start from Scratch', () => {
    render(
      <AgentTeamTemplateSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        onSelectTemplate={mockOnSelectTemplate}
      />
    );
    fireEvent.click(screen.getByText('Start from Scratch'));
    expect(mockOnSelectTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'custom', name: 'Custom Team' })
    );
  });
});
