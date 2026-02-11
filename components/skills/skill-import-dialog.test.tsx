/**
 * Tests for SkillImportDialog component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SkillImportDialog } from './skill-import-dialog';

const mockImportSkill = jest.fn();
const mockToastError = jest.fn();

jest.mock('@/stores/skills', () => ({
  useSkillStore: () => ({
    importSkill: mockImportSkill,
  }),
}));

jest.mock('@/components/ui/toaster', () => ({
  toast: {
    success: jest.fn(),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('SkillImportDialog', () => {
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<SkillImportDialog open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<SkillImportDialog open={false} onOpenChange={mockOnOpenChange} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has a textarea for JSON input', () => {
    render(<SkillImportDialog open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('import button is disabled when textarea is empty', () => {
    render(<SkillImportDialog open={true} onOpenChange={mockOnOpenChange} />);
    // next-intl mock returns the key as-is; the import button renders "import"
    const importBtn = screen.getByRole('button', { name: /^import$/i });
    expect(importBtn).toBeDisabled();
  });

  it('calls importSkill on valid JSON submission', async () => {
    render(<SkillImportDialog open={true} onOpenChange={mockOnOpenChange} />);
    const textarea = screen.getByRole('textbox');
    const validJson = JSON.stringify({ id: 'test', metadata: { name: 'test' } });

    fireEvent.change(textarea, { target: { value: validJson } });

    const importBtn = screen.getByRole('button', { name: /^import$/i });
    fireEvent.click(importBtn);

    await waitFor(() => {
      expect(mockImportSkill).toHaveBeenCalled();
    });
  });

  it('shows error toast on invalid JSON', async () => {
    render(<SkillImportDialog open={true} onOpenChange={mockOnOpenChange} />);
    const textarea = screen.getByRole('textbox');

    fireEvent.change(textarea, { target: { value: 'not valid json' } });

    const importBtn = screen.getByRole('button', { name: /^import$/i });
    fireEvent.click(importBtn);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });
});
