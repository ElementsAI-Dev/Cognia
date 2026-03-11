import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LaTeXExportDialog } from './latex-export-dialog';

const mockExportToFormat = jest.fn();

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: { defaultValue?: string }) => values?.defaultValue || key,
}));

jest.mock('@/hooks/latex', () => ({
  useLatex: () => ({
    exportToFormat: (...args: unknown[]) => mockExportToFormat(...args),
    isExporting: false,
  }),
}));

describe('LaTeXExportDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis.URL as unknown as { createObjectURL: jest.Mock }).createObjectURL = jest.fn(
      () => 'blob:mock-url'
    );
    (globalThis.URL as unknown as { revokeObjectURL: jest.Mock }).revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls onExportComplete for successful export', async () => {
    mockExportToFormat.mockResolvedValue('<html>ok</html>');
    const onExportComplete = jest.fn();

    render(
      <LaTeXExportDialog
        content={'\\section{Test}'}
        open={true}
        onOpenChange={() => {}}
        onExportComplete={onExportComplete}
      />
    );

    await userEvent.click(screen.getByTestId('latex-export-confirm'));

    expect(onExportComplete).toHaveBeenCalledWith('html', '<html>ok</html>');
    expect(mockExportToFormat).toHaveBeenCalledWith('\\section{Test}', 'html');
  });

  it('shows error and calls onExportError when export fails', async () => {
    mockExportToFormat.mockRejectedValue(new Error('Export failed from provider'));
    const onExportError = jest.fn();

    render(
      <LaTeXExportDialog
        content={'\\section{Test}'}
        open={true}
        onOpenChange={() => {}}
        onExportError={onExportError}
      />
    );

    await userEvent.click(screen.getByTestId('latex-export-confirm'));

    expect(onExportError).toHaveBeenCalledWith('html', 'Export failed from provider');
    expect(screen.getByText('Export failed from provider')).toBeInTheDocument();
  });

  it('reports empty-content export as a recoverable error', async () => {
    const onExportError = jest.fn();

    render(
      <LaTeXExportDialog
        content={'   '}
        open={true}
        onOpenChange={() => {}}
        onExportError={onExportError}
      />
    );

    await userEvent.click(screen.getByTestId('latex-export-confirm'));

    expect(onExportError).toHaveBeenCalledWith('html', 'No content available to export.');
    expect(screen.getByText('No content available to export.')).toBeInTheDocument();
  });
});
