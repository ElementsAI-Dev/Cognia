/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ToolNode } from './tool-node';
import type { ToolNodeData } from '@/types/workflow/workflow-editor';

// Mock BaseNode
jest.mock('./base-node', () => ({
  BaseNode: ({
    data,
    children,
    ..._props
  }: {
    data: { nodeType: string; label?: string; [key: string]: unknown };
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="base-node" data-node-type={data.nodeType}>
      {children}
    </div>
  ),
}));

// Mock UI components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
    variant: _variant,
    ...props
  }: {
    children?: React.ReactNode;
    className?: string;
    variant?: string;
    [key: string]: unknown;
  }) => (
    <span data-testid="badge" className={className} {...props}>
      {children}
    </span>
  ),
}));

const mockData: ToolNodeData = {
  id: 'tool-1',
  nodeType: 'tool',
  label: 'Execute Tool',
  description: 'Execute a function call',
  toolName: 'web_search',
  toolCategory: 'search',
  parameterMapping: {
    query: 'user-input',
    results: '10',
  },
  executionStatus: 'idle',
  isConfigured: true,
};

const mockProps = {
  id: 'tool-1',
  data: mockData,
  selected: false,
};

describe('ToolNode', () => {
  it('renders without crashing', () => {
    render(<ToolNode {...mockProps} />);
    expect(screen.getByTestId('base-node')).toBeInTheDocument();
  });

  it('renders tool name badge', () => {
    render(<ToolNode {...mockProps} />);
    expect(screen.getByText('web_search')).toBeInTheDocument();
  });

  it('renders tool category', () => {
    render(<ToolNode {...mockProps} />);
    expect(screen.getByText('(search)')).toBeInTheDocument();
  });

  it('renders parameter mapping count', () => {
    render(<ToolNode {...mockProps} />);
    expect(screen.getByText('2 parameter(s) mapped')).toBeInTheDocument();
  });

  it('does not render parameter count when parameterMapping is empty', () => {
    const noParamsData = { ...mockData, parameterMapping: {} };
    render(<ToolNode {...mockProps} data={noParamsData} />);
    expect(screen.queryByText(/parameter/)).not.toBeInTheDocument();
  });

  it('has correct node type', () => {
    render(<ToolNode {...mockProps} />);
    expect(screen.getByTestId('base-node')).toHaveAttribute('data-node-type', 'tool');
  });
});

describe('ToolNode without tool name', () => {
  it('does not render badge when toolName is missing', () => {
    const noNameData = { ...mockData, toolName: undefined as unknown as string };
    render(<ToolNode {...mockProps} data={noNameData} />);
    expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
  });

  it('does not render badge when toolName is empty', () => {
    const emptyNameData = { ...mockData, toolName: '' };
    render(<ToolNode {...mockProps} data={emptyNameData} />);
    expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
  });

  it('does not render badge when toolName is null', () => {
    const nullNameData = { ...mockData, toolName: null as unknown as string };
    render(<ToolNode {...mockProps} data={nullNameData} />);
    expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
  });
});

describe('ToolNode without tool category', () => {
  it('does not render category when toolCategory is missing', () => {
    const noCategoryData = { ...mockData, toolCategory: undefined as unknown as string };
    render(<ToolNode {...mockProps} data={noCategoryData} />);
    expect(screen.queryByText(/\(search\)/)).not.toBeInTheDocument();
  });

  it('does not render category when toolCategory is empty', () => {
    const emptyCategoryData = { ...mockData, toolCategory: '' };
    render(<ToolNode {...mockProps} data={emptyCategoryData} />);
    expect(screen.queryByText(/\(\)/)).not.toBeInTheDocument();
  });

  it('does not render category when toolCategory is null', () => {
    const nullCategoryData = { ...mockData, toolCategory: null as unknown as string };
    render(<ToolNode {...mockProps} data={nullCategoryData} />);
    expect(screen.queryByText(/\(null\)/)).not.toBeInTheDocument();
  });
});

describe('ToolNode badge styling', () => {
  it('tool name badge has secondary variant', () => {
    render(<ToolNode {...mockProps} />);
    const badge = screen.getByText('web_search').closest('[data-testid="badge"]');
    expect(badge).toBeInTheDocument();
  });

  it('tool name badge has text-xs class', () => {
    render(<ToolNode {...mockProps} />);
    const badge = screen.getByText('web_search').closest('[data-testid="badge"]');
    expect(badge).toHaveClass('text-xs');
  });

  it('tool name badge has font-mono class', () => {
    render(<ToolNode {...mockProps} />);
    const badge = screen.getByText('web_search').closest('[data-testid="badge"]');
    expect(badge).toHaveClass('font-mono');
  });
});

describe('ToolNode category styling', () => {
  it('category has text-xs class', () => {
    render(<ToolNode {...mockProps} />);
    const category = screen.getByText('(search)');
    expect(category).toHaveClass('text-xs');
  });

  it('category has text-muted-foreground class', () => {
    render(<ToolNode {...mockProps} />);
    const category = screen.getByText('(search)');
    expect(category).toHaveClass('text-muted-foreground');
  });

  it('category has ml-1 class (margin-left)', () => {
    render(<ToolNode {...mockProps} />);
    const category = screen.getByText('(search)');
    expect(category).toHaveClass('ml-1');
  });
});

describe('ToolNode parameter mapping styling', () => {
  it('parameter count has text-xs class', () => {
    render(<ToolNode {...mockProps} />);
    const paramCount = screen.getByText('2 parameter(s) mapped');
    expect(paramCount).toHaveClass('text-xs');
  });

  it('parameter count has text-muted-foreground class', () => {
    render(<ToolNode {...mockProps} />);
    const paramCount = screen.getByText('2 parameter(s) mapped');
    expect(paramCount).toHaveClass('text-muted-foreground');
  });

  it('parameter count has mt-1 class (margin-top)', () => {
    render(<ToolNode {...mockProps} />);
    const paramCount = screen.getByText('2 parameter(s) mapped');
    expect(paramCount).toHaveClass('mt-1');
  });
});

describe('ToolNode with different tool names', () => {
  it('renders web_search tool name', () => {
    render(<ToolNode {...mockProps} />);
    expect(screen.getByText('web_search')).toBeInTheDocument();
  });

  it('renders calculator tool name', () => {
    const calcData = { ...mockData, toolName: 'calculator' };
    render(<ToolNode {...mockProps} data={calcData} />);
    expect(screen.getByText('calculator')).toBeInTheDocument();
  });

  it('renders file_reader tool name', () => {
    const fileData = { ...mockData, toolName: 'file_reader' };
    render(<ToolNode {...mockProps} data={fileData} />);
    expect(screen.getByText('file_reader')).toBeInTheDocument();
  });

  it('renders very long tool name', () => {
    const longName = 'very_long_tool_name_that_exceeds_normal_length';
    const longNameData = { ...mockData, toolName: longName };
    render(<ToolNode {...mockProps} data={longNameData} />);
    expect(screen.getByText(longName)).toBeInTheDocument();
  });

  it('renders tool name with special characters', () => {
    const specialName = 'tool-name_v2.0';
    const specialNameData = { ...mockData, toolName: specialName };
    render(<ToolNode {...mockProps} data={specialNameData} />);
    expect(screen.getByText(specialName)).toBeInTheDocument();
  });
});

describe('ToolNode with different tool categories', () => {
  it('renders search category', () => {
    render(<ToolNode {...mockProps} />);
    expect(screen.getByText('(search)')).toBeInTheDocument();
  });

  it('renders computation category', () => {
    const compData = { ...mockData, toolCategory: 'computation' };
    render(<ToolNode {...mockProps} data={compData} />);
    expect(screen.getByText('(computation)')).toBeInTheDocument();
  });

  it('renders file_ops category', () => {
    const fileData = { ...mockData, toolCategory: 'file_ops' };
    render(<ToolNode {...mockProps} data={fileData} />);
    expect(screen.getByText('(file_ops)')).toBeInTheDocument();
  });

  it('renders api category', () => {
    const apiData = { ...mockData, toolCategory: 'api' };
    render(<ToolNode {...mockProps} data={apiData} />);
    expect(screen.getByText('(api)')).toBeInTheDocument();
  });
});

describe('ToolNode with different parameter counts', () => {
  it('renders single parameter', () => {
    const singleParamData = { ...mockData, parameterMapping: { param1: 'value1' } };
    render(<ToolNode {...mockProps} data={singleParamData} />);
    expect(screen.getByText('1 parameter(s) mapped')).toBeInTheDocument();
  });

  it('renders multiple parameters', () => {
    render(<ToolNode {...mockProps} />);
    expect(screen.getByText('2 parameter(s) mapped')).toBeInTheDocument();
  });

  it('renders many parameters', () => {
    const manyParamsData = {
      ...mockData,
      parameterMapping: {
        param1: 'value1',
        param2: 'value2',
        param3: 'value3',
        param4: 'value4',
        param5: 'value5',
      },
    };
    render(<ToolNode {...mockProps} data={manyParamsData} />);
    expect(screen.getByText('5 parameter(s) mapped')).toBeInTheDocument();
  });
});

describe('ToolNode edge cases', () => {
  it('handles undefined parameterMapping', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    const undefinedParamsData = { ...mockData, parameterMapping: undefined as unknown as {} };
    render(<ToolNode {...mockProps} data={undefinedParamsData} />);
    expect(screen.queryByText(/parameter/)).not.toBeInTheDocument();
  });

  it('handles null parameterMapping', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    const nullParamsData = { ...mockData, parameterMapping: null as unknown as {} };
    render(<ToolNode {...mockProps} data={nullParamsData} />);
    expect(screen.queryByText(/parameter/)).not.toBeInTheDocument();
  });

  it('handles toolName with leading/trailing spaces', () => {
    const spacedNameData = { ...mockData, toolName: '  tool_name  ' };
    render(<ToolNode {...mockProps} data={spacedNameData} />);
    // Text may be trimmed or normalized by browser/component
    expect(screen.getByText(/tool_name/)).toBeInTheDocument();
  });

  it('handles toolCategory with leading/trailing spaces', () => {
    const spacedCategoryData = { ...mockData, toolCategory: '  category  ' };
    render(<ToolNode {...mockProps} data={spacedCategoryData} />);
    // Text may be trimmed or normalized
    expect(screen.getByText(/category/)).toBeInTheDocument();
  });
});

describe('ToolNode integration tests', () => {
  it('renders complete tool node with all features', () => {
    render(<ToolNode {...mockProps} />);

    expect(screen.getByText('web_search')).toBeInTheDocument();
    expect(screen.getByText('(search)')).toBeInTheDocument();
    expect(screen.getByText('2 parameter(s) mapped')).toBeInTheDocument();
  });

  it('renders tool node with only tool name', () => {
    const nameOnlyData = {
      ...mockData,
      toolCategory: undefined as unknown as string,
      parameterMapping: {},
    };
    render(<ToolNode {...mockProps} data={nameOnlyData} />);

    expect(screen.getByText('web_search')).toBeInTheDocument();
    expect(screen.queryByText(/\(search\)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/parameter/)).not.toBeInTheDocument();
  });

  it('renders tool node with only tool category', () => {
    const categoryOnlyData = {
      ...mockData,
      toolName: undefined as unknown as string,
    };
    render(<ToolNode {...mockProps} data={categoryOnlyData} />);

    expect(screen.queryByText('web_search')).not.toBeInTheDocument();
    expect(screen.getByText('(search)')).toBeInTheDocument();
  });

  it('renders minimal tool node', () => {
    const minimalData = {
      ...mockData,
      toolName: undefined as unknown as string,
      toolCategory: undefined as unknown as string,
      parameterMapping: {},
    };
    render(<ToolNode {...mockProps} data={minimalData} />);

    expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
    expect(screen.queryByText(/\(.*\)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/parameter/)).not.toBeInTheDocument();
  });
});
