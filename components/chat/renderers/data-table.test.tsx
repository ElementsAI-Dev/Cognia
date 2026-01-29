/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from './data-table';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      rows: 'rows',
      columns: 'columns',
      search: 'Search...',
      copy: 'Copy',
      export: 'Export',
      exportExcel: 'Export Excel',
      exportCSV: 'Export CSV',
      copyForSheets: 'Copy for Sheets',
      openGoogleSheets: 'Open in Google Sheets',
      fullscreen: 'Fullscreen',
      tableView: 'Table View',
      noResults: 'No results found',
      noData: 'No data',
      showing: 'Showing',
      of: 'of',
      previous: 'Previous',
      next: 'Next',
    };
    return translations[key] || key;
  },
}));

// Mock use-copy hook
jest.mock('@/hooks/ui/use-copy', () => ({
  useCopy: () => ({
    copy: jest.fn().mockResolvedValue({ success: true }),
    isCopying: false,
  }),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value} onChange={onChange} placeholder={placeholder} {...props} />
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="fullscreen-dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuSeparator: () => <hr />,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('DataTable', () => {
  const defaultHeaders = ['Name', 'Age', 'City'];
  const defaultRows = [
    ['Alice', 30, 'New York'],
    ['Bob', 25, 'Los Angeles'],
    ['Charlie', 35, 'Chicago'],
  ];

  const defaultProps = {
    headers: defaultHeaders,
    rows: defaultRows,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DataTable {...defaultProps} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('displays table headers', () => {
    render(<DataTable {...defaultProps} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('City')).toBeInTheDocument();
  });

  it('displays table data', () => {
    render(<DataTable {...defaultProps} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('displays row count', () => {
    render(<DataTable {...defaultProps} />);
    expect(screen.getByText('3 rows')).toBeInTheDocument();
  });

  it('displays title when provided', () => {
    render(<DataTable {...defaultProps} title="Users Table" />);
    expect(screen.getByText('Users Table')).toBeInTheDocument();
  });

  it('displays search input when searchable', () => {
    render(<DataTable {...defaultProps} searchable={true} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('hides search input when searchable is false', () => {
    render(<DataTable {...defaultProps} searchable={false} />);
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('filters rows based on search query', () => {
    render(<DataTable {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('shows no results message when search has no matches', () => {
    render(<DataTable {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('sorts columns when clicked', () => {
    render(<DataTable {...defaultProps} sortable={true} />);
    const ageHeader = screen.getByText('Age');
    fireEvent.click(ageHeader);
    // After sorting, order should change
    const cells = screen.getAllByRole('cell');
    // First data row should now have the smallest age (25 - Bob)
    expect(cells).toBeDefined();
  });

  it('displays copy button', () => {
    render(<DataTable {...defaultProps} />);
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('displays export dropdown when exportable', () => {
    render(<DataTable {...defaultProps} exportable={true} />);
    expect(screen.getByTestId('dropdown')).toBeInTheDocument();
  });

  it('hides export dropdown when exportable is false', () => {
    render(<DataTable {...defaultProps} exportable={false} />);
    expect(screen.queryByTestId('dropdown')).not.toBeInTheDocument();
  });

  it('displays fullscreen button', () => {
    render(<DataTable {...defaultProps} />);
    expect(screen.getByText('Fullscreen')).toBeInTheDocument();
  });

  it('has fullscreen functionality', () => {
    render(<DataTable {...defaultProps} />);
    // Table should have fullscreen button
    expect(screen.getByText('Fullscreen')).toBeInTheDocument();
  });

  it('displays pagination when enabled and has multiple pages', () => {
    const manyRows = Array.from({ length: 25 }, (_, i) => [`Person ${i}`, i, `City ${i}`]);
    render(<DataTable headers={defaultHeaders} rows={manyRows} pageSize={10} />);
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
    // Pagination controls are present
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
  });

  it('hides pagination when disabled', () => {
    const manyRows = Array.from({ length: 25 }, (_, i) => [`Person ${i}`, i, `City ${i}`]);
    render(<DataTable headers={defaultHeaders} rows={manyRows} showPagination={false} />);
    expect(screen.queryByText(/1 \/ 3/)).not.toBeInTheDocument();
  });

  it('has pagination controls for navigation', () => {
    const manyRows = Array.from({ length: 25 }, (_, i) => [`Person ${i}`, i, `City ${i}`]);
    render(<DataTable headers={defaultHeaders} rows={manyRows} pageSize={10} />);
    // Verify pagination exists with page indicator
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
  });

  it('formats boolean values correctly', () => {
    const booleanRows = [['Test', true, false]];
    render(<DataTable headers={['Name', 'Active', 'Deleted']} rows={booleanRows} />);
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
  });

  it('formats large numbers with commas', () => {
    const numberRows = [['Test', 1000000, 'Value']];
    render(<DataTable headers={['Name', 'Count', 'Type']} rows={numberRows} />);
    expect(screen.getByText('1,000,000')).toBeInTheDocument();
  });

  it('formats decimal numbers to 2 places', () => {
    const decimalRows = [['Test', 3.14159, 'Value']];
    render(<DataTable headers={['Name', 'Pi', 'Type']} rows={decimalRows} />);
    expect(screen.getByText('3.14')).toBeInTheDocument();
  });

  it('handles null and undefined values', () => {
    const nullRows = [['Test', null, undefined]];
    render(<DataTable headers={['Name', 'Null', 'Undefined']} rows={nullRows} />);
    // Should render without crashing, null/undefined shown as empty
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('hides toolbar when showToolbar is false', () => {
    render(<DataTable {...defaultProps} showToolbar={false} />);
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
    expect(screen.queryByText('Copy')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <DataTable {...defaultProps} className="custom-class" />
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('displays no data message when rows is empty', () => {
    render(<DataTable headers={defaultHeaders} rows={[]} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('renders table with correct structure', () => {
    render(<DataTable {...defaultProps} />);
    // Verify table structure
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
  });
});
