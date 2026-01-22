/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImportSkillDialog } from './import-skill-dialog';

// Mock skill parser
jest.mock('@/lib/skills/parser', () => ({
  parseSkillMd: (content: string) => {
    if (content.includes('---') && content.includes('name:')) {
      return {
        success: true,
        metadata: { name: 'imported-skill', description: 'Imported skill' },
        content: '# Imported Skill',
        rawContent: content,
        errors: [],
      };
    }
    return { success: false, errors: [{ message: 'Invalid SKILL.md format' }] };
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Upload: () => <span data-testid="icon-upload">Upload</span>,
  AlertCircle: () => <span data-testid="icon-alert">Alert</span>,
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    rows,
  }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      data-testid="import-textarea"
    />
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-testid="alert" data-variant={variant} role="alert">
      {children}
    </div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

// Mock translation function
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    importSkill: 'Import Skill',
    importSkillDesc: 'Paste SKILL.md content to import a skill',
    cancel: 'Cancel',
    import: 'Import',
  };
  return translations[key] || key;
};

describe('ImportSkillDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnImport = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    render(
      <ImportSkillDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        t={mockT}
      />
    );
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when open', () => {
    render(
      <ImportSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        t={mockT}
      />
    );
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('displays dialog title', () => {
    render(
      <ImportSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        t={mockT}
      />
    );
    expect(screen.getByText('Import Skill')).toBeInTheDocument();
  });

  it('displays dialog description', () => {
    render(
      <ImportSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        t={mockT}
      />
    );
    expect(screen.getByText('Paste SKILL.md content to import a skill')).toBeInTheDocument();
  });

  it('displays textarea for content', () => {
    render(
      <ImportSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        t={mockT}
      />
    );
    expect(screen.getByTestId('import-textarea')).toBeInTheDocument();
  });

  it('displays cancel and import buttons', () => {
    render(
      <ImportSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        t={mockT}
      />
    );
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  it('import button is disabled when content is empty', () => {
    render(
      <ImportSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        t={mockT}
      />
    );
    const importButton = screen.getByText('Import');
    expect(importButton).toBeDisabled();
  });

  it('updates textarea value on change', () => {
    render(
      <ImportSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        t={mockT}
      />
    );
    const textarea = screen.getByTestId('import-textarea');
    fireEvent.change(textarea, { target: { value: 'test content' } });
    expect(textarea).toHaveValue('test content');
  });

  it('calls onOpenChange when cancel is clicked', () => {
    render(
      <ImportSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        t={mockT}
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows error alert for invalid content', () => {
    render(
      <ImportSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        t={mockT}
      />
    );

    // Enter invalid content
    const textarea = screen.getByTestId('import-textarea');
    fireEvent.change(textarea, { target: { value: 'invalid content without frontmatter' } });

    // Click import
    fireEvent.click(screen.getByText('Import'));

    // Should show error
    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByText('Invalid SKILL.md format')).toBeInTheDocument();
  });

  it('calls onImport with valid content', () => {
    render(
      <ImportSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        t={mockT}
      />
    );

    const validContent = '---\nname: test-skill\n---\n# Test';
    const textarea = screen.getByTestId('import-textarea');
    fireEvent.change(textarea, { target: { value: validContent } });

    fireEvent.click(screen.getByText('Import'));

    expect(mockOnImport).toHaveBeenCalledWith(validContent);
  });

  it('closes dialog after successful import', () => {
    render(
      <ImportSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        t={mockT}
      />
    );

    const validContent = '---\nname: test-skill\n---\n# Test';
    const textarea = screen.getByTestId('import-textarea');
    fireEvent.change(textarea, { target: { value: validContent } });

    fireEvent.click(screen.getByText('Import'));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('clears error when content changes', () => {
    render(
      <ImportSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        t={mockT}
      />
    );

    // Enter invalid content and trigger error
    const textarea = screen.getByTestId('import-textarea');
    fireEvent.change(textarea, { target: { value: 'invalid' } });
    fireEvent.click(screen.getByText('Import'));
    expect(screen.getByTestId('alert')).toBeInTheDocument();

    // Change content - error should be cleared
    fireEvent.change(textarea, { target: { value: 'new content' } });
    expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
  });

  it('displays upload icon in import button', () => {
    render(
      <ImportSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        t={mockT}
      />
    );
    expect(screen.getByTestId('icon-upload')).toBeInTheDocument();
  });

  it('resets content after successful import', () => {
    render(
      <ImportSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        t={mockT}
      />
    );

    const validContent = '---\nname: test-skill\n---\n# Test';
    const textarea = screen.getByTestId('import-textarea');
    fireEvent.change(textarea, { target: { value: validContent } });

    fireEvent.click(screen.getByText('Import'));

    // Content should be reset
    expect(textarea).toHaveValue('');
  });

  it('displays alert icon when error occurs', () => {
    render(
      <ImportSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        t={mockT}
      />
    );

    const textarea = screen.getByTestId('import-textarea');
    fireEvent.change(textarea, { target: { value: 'invalid' } });
    fireEvent.click(screen.getByText('Import'));

    expect(screen.getByTestId('icon-alert')).toBeInTheDocument();
  });
});
