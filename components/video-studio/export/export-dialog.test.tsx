import { render, screen } from '@testing-library/react';
import { ExportDialog } from './export-dialog';

describe('ExportDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    projectName: 'Test Project',
    duration: 60,
    onExport: jest.fn(),
  };

  it('renders export dialog when open', () => {
    render(<ExportDialog {...defaultProps} />);
    expect(screen.getByText('Export Video')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(<ExportDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Export Video')).not.toBeInTheDocument();
  });

  it('renders buttons', () => {
    render(<ExportDialog {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
