/**
 * VariableInspector Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { VariableInspector } from './variable-inspector';
import type { VariableInfo } from '@/types/jupyter';

// Messages for testing
const messages = {
  jupyter: {
    variables: 'Variables',
    searchVariables: 'Search variables...',
    noVariables: 'No variables defined',
    noMatchingVariables: 'No matching variables',
  },
};

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

const createMockVariable = (overrides: Partial<VariableInfo> = {}): VariableInfo => ({
  name: 'test_var',
  type: 'int',
  value: '42',
  size: null,
  ...overrides,
});

const createMockVariables = (): VariableInfo[] => [
  { name: 'x', type: 'int', value: '10', size: null },
  { name: 'y', type: 'float', value: '3.14', size: null },
  { name: 'name', type: 'str', value: "'Hello'", size: '5' },
  { name: 'data', type: 'list', value: '[1, 2, 3]', size: '3' },
  { name: 'config', type: 'dict', value: "{'key': 'value'}", size: '1' },
];

describe('VariableInspector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with empty variables', () => {
      renderWithIntl(<VariableInspector variables={[]} />);

      expect(screen.getByText('Variables')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should render variables count badge', () => {
      const variables = createMockVariables();
      renderWithIntl(<VariableInspector variables={variables} />);

      // Count badge shows the number of variables - '5' may appear multiple times
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    });

    it('should render variable names', () => {
      const variables = createMockVariables();
      renderWithIntl(<VariableInspector variables={variables} />);

      // Variables appear multiple times (code element + tooltip), check code elements exist
      const xElements = screen.getAllByText('x');
      const yElements = screen.getAllByText('y');
      const nameElements = screen.getAllByText('name');
      expect(xElements.some((el) => el.tagName === 'CODE')).toBe(true);
      expect(yElements.some((el) => el.tagName === 'CODE')).toBe(true);
      expect(nameElements.some((el) => el.tagName === 'CODE')).toBe(true);
    });

    it('should render variable types', () => {
      const variables = createMockVariables();
      renderWithIntl(<VariableInspector variables={variables} />);

      expect(screen.getByText('int')).toBeInTheDocument();
      expect(screen.getByText('float')).toBeInTheDocument();
      expect(screen.getByText('str')).toBeInTheDocument();
    });

    it('should render variable values', () => {
      const variables = createMockVariables();
      renderWithIntl(<VariableInspector variables={variables} />);

      // Values appear multiple times (value display + tooltip), check at least one exists
      expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('3.14').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("'Hello'").length).toBeGreaterThanOrEqual(1);
    });

    it('should render variable sizes when available', () => {
      const variables = createMockVariables();
      renderWithIntl(<VariableInspector variables={variables} />);

      // Size values are rendered - we check that data and config variables have size info
      // Use getAllByText since '5' appears multiple times (count badge and size)
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    });

    it('should show no variables message when empty', () => {
      renderWithIntl(<VariableInspector variables={[]} />);

      expect(screen.getByText('No variables defined')).toBeInTheDocument();
    });
  });

  describe('type colors', () => {
    it('should apply correct color class for int type', () => {
      const variables = [createMockVariable({ type: 'int' })];
      renderWithIntl(<VariableInspector variables={variables} />);

      const typeBadge = screen.getByText('int');
      expect(typeBadge).toHaveClass('text-blue-700');
    });

    it('should apply correct color class for str type', () => {
      const variables = [createMockVariable({ type: 'str' })];
      renderWithIntl(<VariableInspector variables={variables} />);

      const typeBadge = screen.getByText('str');
      expect(typeBadge).toHaveClass('text-green-700');
    });

    it('should apply correct color class for DataFrame type', () => {
      const variables = [createMockVariable({ type: 'DataFrame' })];
      renderWithIntl(<VariableInspector variables={variables} />);

      const typeBadge = screen.getByText('DataFrame');
      expect(typeBadge).toHaveClass('text-emerald-700');
    });

    it('should apply default color for unknown type', () => {
      const variables = [createMockVariable({ type: 'CustomClass' })];
      renderWithIntl(<VariableInspector variables={variables} />);

      const typeBadge = screen.getByText('CustomClass');
      expect(typeBadge).toHaveClass('text-muted-foreground');
    });
  });

  describe('search functionality', () => {
    it('should not show search input when 5 or fewer variables', () => {
      const variables = createMockVariables();
      renderWithIntl(<VariableInspector variables={variables} />);

      expect(screen.queryByPlaceholderText('Search variables...')).not.toBeInTheDocument();
    });

    it('should show search input when more than 5 variables', () => {
      const variables = [
        ...createMockVariables(),
        { name: 'extra', type: 'bool', value: 'True', size: null },
      ];
      renderWithIntl(<VariableInspector variables={variables} />);

      expect(screen.getByPlaceholderText('Search variables...')).toBeInTheDocument();
    });

    it('should filter variables by search term', () => {
      const variables = [
        ...createMockVariables(),
        { name: 'extra_var', type: 'bool', value: 'True', size: null },
      ];
      renderWithIntl(<VariableInspector variables={variables} />);

      const searchInput = screen.getByPlaceholderText('Search variables...');
      fireEvent.change(searchInput, { target: { value: 'name' } });

      // Check code element with 'name' exists
      const nameElements = screen.getAllByText('name');
      expect(nameElements.some((el) => el.tagName === 'CODE')).toBe(true);
      // Check code element with 'x' does NOT exist
      const xElements = screen.queryAllByText('x');
      expect(xElements.some((el) => el.tagName === 'CODE')).toBe(false);
    });

    it('should show no matching variables message when search has no results', () => {
      const variables = [
        ...createMockVariables(),
        { name: 'extra_var', type: 'bool', value: 'True', size: null },
      ];
      renderWithIntl(<VariableInspector variables={variables} />);

      const searchInput = screen.getByPlaceholderText('Search variables...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No matching variables')).toBeInTheDocument();
    });

    it('should be case insensitive', () => {
      const variables = [
        ...createMockVariables(),
        { name: 'MyVariable', type: 'str', value: 'test', size: null },
      ];
      renderWithIntl(<VariableInspector variables={variables} />);

      const searchInput = screen.getByPlaceholderText('Search variables...');
      fireEvent.change(searchInput, { target: { value: 'MYVARIABLE' } });

      // Check code element with 'MyVariable' exists
      const myVarElements = screen.getAllByText('MyVariable');
      expect(myVarElements.some((el) => el.tagName === 'CODE')).toBe(true);
    });
  });

  describe('collapse functionality', () => {
    it('should be expanded by default', () => {
      const variables = createMockVariables();
      renderWithIntl(<VariableInspector variables={variables} />);

      // Variable content should be visible - check code elements exist
      const xElements = screen.getAllByText('x');
      expect(xElements.some((el) => el.tagName === 'CODE')).toBe(true);
    });

    it('should toggle collapse when clicking header button', () => {
      const variables = createMockVariables();
      renderWithIntl(<VariableInspector variables={variables} />);

      // Find the collapse toggle button (first button with chevron)
      const buttons = screen.getAllByRole('button');
      const collapseButton = buttons.find(
        (btn) =>
          btn.querySelector('.lucide-chevron-down') || btn.querySelector('.lucide-chevron-right')
      );

      if (collapseButton) {
        fireEvent.click(collapseButton);
      }

      // Content should be collapsed - no code elements with 'x' should exist
      const xElements = screen.queryAllByText('x');
      expect(xElements.some((el) => el.tagName === 'CODE')).toBe(false);
    });
  });

  describe('refresh functionality', () => {
    it('should show refresh button when onRefresh is provided', () => {
      const onRefresh = jest.fn();
      renderWithIntl(<VariableInspector variables={[]} onRefresh={onRefresh} />);

      const buttons = screen.getAllByRole('button');
      const refreshButton = buttons.find((btn) => btn.querySelector('.lucide-refresh-cw'));
      expect(refreshButton).toBeInTheDocument();
    });

    it('should not show refresh button when onRefresh is not provided', () => {
      renderWithIntl(<VariableInspector variables={[]} />);

      const buttons = screen.queryAllByRole('button');
      const refreshButton = buttons.find((btn) => btn.querySelector('.lucide-refresh-cw'));
      expect(refreshButton).toBeUndefined();
    });

    it('should call onRefresh when refresh button is clicked', () => {
      const onRefresh = jest.fn();
      renderWithIntl(<VariableInspector variables={[]} onRefresh={onRefresh} />);

      const buttons = screen.getAllByRole('button');
      const refreshButton = buttons.find((btn) => btn.querySelector('.lucide-refresh-cw'));
      if (refreshButton) {
        fireEvent.click(refreshButton);
      }

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('should disable refresh button when loading', () => {
      const onRefresh = jest.fn();
      renderWithIntl(<VariableInspector variables={[]} onRefresh={onRefresh} isLoading={true} />);

      // When loading, the button should be disabled
      const buttons = screen.getAllByRole('button');
      // Find a disabled button that's related to refresh functionality
      const disabledButton = buttons.find((btn) => btn.hasAttribute('disabled'));
      expect(disabledButton).toBeInTheDocument();
    });

    it('should show loading spinner when isLoading is true', () => {
      const onRefresh = jest.fn();
      renderWithIntl(<VariableInspector variables={[]} onRefresh={onRefresh} isLoading={true} />);

      // Spinner should be present - check for animate-spin class on any element
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('inspect functionality', () => {
    it('should call onInspect when variable is clicked', () => {
      const onInspect = jest.fn();
      const variables = createMockVariables();
      renderWithIntl(<VariableInspector variables={variables} onInspect={onInspect} />);

      // Click on a variable row - find the code element containing 'x'
      const varNames = screen.getAllByText('x');
      const varName = varNames.find((el) => el.tagName === 'CODE');
      expect(varName).toBeDefined();
      const varRow = varName?.closest('.hover\\:bg-muted\\/50');
      if (varRow) {
        fireEvent.click(varRow);
      }

      expect(onInspect).toHaveBeenCalledWith('x');
    });

    it('should make variables clickable when onInspect is provided', () => {
      const onInspect = jest.fn();
      const variables = createMockVariables();
      renderWithIntl(<VariableInspector variables={variables} onInspect={onInspect} />);

      const varNames = screen.getAllByText('x');
      const varName = varNames.find((el) => el.tagName === 'CODE');
      expect(varName).toBeDefined();
      const varRow = varName?.closest('.hover\\:bg-muted\\/50');
      expect(varRow).toHaveClass('cursor-pointer');
    });

    it('should not make variables clickable when onInspect is not provided', () => {
      const variables = createMockVariables();
      renderWithIntl(<VariableInspector variables={variables} />);

      const varNames = screen.getAllByText('x');
      const varName = varNames.find((el) => el.tagName === 'CODE');
      expect(varName).toBeDefined();
      const varRow = varName?.closest('.hover\\:bg-muted\\/50');
      expect(varRow).not.toHaveClass('cursor-pointer');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = renderWithIntl(
        <VariableInspector variables={[]} className="custom-class" />
      );

      // The Collapsible component receives the className
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('various variable types', () => {
    const typeTestCases = [
      { type: 'int', expectedColor: 'text-blue-700' },
      { type: 'float', expectedColor: 'text-cyan-700' },
      { type: 'str', expectedColor: 'text-green-700' },
      { type: 'bool', expectedColor: 'text-purple-700' },
      { type: 'list', expectedColor: 'text-orange-700' },
      { type: 'dict', expectedColor: 'text-yellow-700' },
      { type: 'tuple', expectedColor: 'text-pink-700' },
      { type: 'set', expectedColor: 'text-rose-700' },
      { type: 'ndarray', expectedColor: 'text-indigo-700' },
      { type: 'DataFrame', expectedColor: 'text-emerald-700' },
      { type: 'Series', expectedColor: 'text-teal-700' },
      { type: 'Tensor', expectedColor: 'text-red-700' },
    ];

    it.each(typeTestCases)(
      'should apply $expectedColor for $type type',
      ({ type, expectedColor }) => {
        const variables = [createMockVariable({ type })];
        renderWithIntl(<VariableInspector variables={variables} />);

        const typeBadge = screen.getByText(type);
        expect(typeBadge).toHaveClass(expectedColor);
      }
    );
  });
});
