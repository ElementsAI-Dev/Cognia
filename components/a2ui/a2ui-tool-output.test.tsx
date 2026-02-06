/**
 * Tests for A2UI Tool Output
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { A2UIToolOutput, A2UIStructuredOutput, hasA2UIToolOutput } from './a2ui-tool-output';

// Mock useA2UI hook
const mockProcessMessages = jest.fn();
const mockGetSurface = jest.fn();

jest.mock('@/hooks/a2ui', () => ({
  useA2UI: jest.fn(() => ({
    processMessages: mockProcessMessages,
    getSurface: mockGetSurface,
  })),
}));

// Mock parser functions
jest.mock('@/lib/a2ui/parser', () => ({
  parseA2UIMessages: jest.fn((data) => {
    if (Array.isArray(data) && data.length > 0 && data[0]?.type === 'createSurface') {
      return { success: true, messages: data };
    }
    if (data && typeof data === 'object' && 'type' in data && data.type === 'createSurface') {
      return { success: true, messages: [data] };
    }
    return { success: false, messages: [] };
  }),
  detectA2UIContent: jest.fn((content: string) => {
    return content.includes('createSurface') || content.includes('"a2ui"');
  }),
}));

// Mock A2UISurface
jest.mock('./a2ui-surface', () => ({
  A2UISurface: ({ surfaceId }: { surfaceId: string }) => (
    <div data-testid="a2ui-surface">{surfaceId}</div>
  ),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}));

describe('A2UIToolOutput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSurface.mockReturnValue({ id: 'tool-surface', ready: true });
  });

  it('should render A2UI surface from object output', () => {
    const output = [{ type: 'createSurface', surfaceId: 'tool-surface' }];

    render(<A2UIToolOutput toolId="tool1" toolName="TestTool" output={output} />);

    expect(screen.getByTestId('a2ui-surface')).toBeInTheDocument();
    expect(screen.getByText('TestTool')).toBeInTheDocument();
  });

  it('should render A2UI surface from string output', () => {
    const output = JSON.stringify([{ type: 'createSurface', surfaceId: 'string-surface' }]);

    render(<A2UIToolOutput toolId="tool2" toolName="StringTool" output={output} />);

    expect(screen.getByTestId('a2ui-surface')).toBeInTheDocument();
  });

  it('should return null for non-A2UI output', () => {
    mockGetSurface.mockReturnValue(null);
    const output = 'Regular string output';

    const { container } = render(
      <A2UIToolOutput toolId="tool3" toolName="RegularTool" output={output} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should call processMessages with parsed messages', () => {
    const output = [{ type: 'createSurface', surfaceId: 'test' }];

    render(<A2UIToolOutput toolId="tool4" toolName="TestTool" output={output} />);

    expect(mockProcessMessages).toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    const output = [{ type: 'createSurface', surfaceId: 'test' }];

    const { container } = render(
      <A2UIToolOutput toolId="tool5" toolName="TestTool" output={output} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should display tool name', () => {
    const output = [{ type: 'createSurface', surfaceId: 'test' }];

    render(<A2UIToolOutput toolId="tool6" toolName="MyCustomTool" output={output} />);

    expect(screen.getByText('MyCustomTool')).toBeInTheDocument();
    expect(screen.getByText('output')).toBeInTheDocument();
  });

  it('should use toolId as fallback surfaceId', () => {
    const output = [{ type: 'createSurface' }]; // No surfaceId in message
    mockGetSurface.mockImplementation((id) =>
      id === 'tool-fallback' ? { id: 'tool-fallback', ready: true } : null
    );

    render(<A2UIToolOutput toolId="fallback" toolName="FallbackTool" output={output} />);

    expect(mockGetSurface).toHaveBeenCalled();
  });

  it('should handle invalid JSON string gracefully', () => {
    mockGetSurface.mockReturnValue(null);
    const output = 'not valid json {{{';

    const { container } = render(
      <A2UIToolOutput toolId="tool7" toolName="InvalidTool" output={output} />
    );

    expect(container.firstChild).toBeNull();
  });
});

describe('hasA2UIToolOutput', () => {
  it('should return true for string with A2UI content', () => {
    expect(hasA2UIToolOutput('{"type": "createSurface"}')).toBe(true);
    expect(hasA2UIToolOutput('{"a2ui": true}')).toBe(true);
  });

  it('should return false for regular string', () => {
    expect(hasA2UIToolOutput('Hello world')).toBe(false);
    expect(hasA2UIToolOutput('Just text')).toBe(false);
  });

  it('should return true for object with A2UI messages', () => {
    expect(hasA2UIToolOutput([{ type: 'createSurface' }])).toBe(true);
    expect(hasA2UIToolOutput({ type: 'createSurface' })).toBe(true);
  });

  it('should return false for regular object', () => {
    expect(hasA2UIToolOutput({ regular: 'data' })).toBe(false);
    expect(hasA2UIToolOutput([])).toBe(false);
  });

  it('should return false for null and undefined', () => {
    expect(hasA2UIToolOutput(null)).toBe(false);
    expect(hasA2UIToolOutput(undefined)).toBe(false);
  });

  it('should return false for numbers and booleans', () => {
    expect(hasA2UIToolOutput(42)).toBe(false);
    expect(hasA2UIToolOutput(true)).toBe(false);
  });
});

describe('A2UIStructuredOutput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSurface.mockReturnValue({ id: 'structured-surface', ready: true });
  });

  it('should render A2UI surface from messages', () => {
    const messages = [{ type: 'createSurface', surfaceId: 'structured-surface' }];

    render(<A2UIStructuredOutput id="output1" messages={messages as never} />);

    expect(screen.getByTestId('a2ui-surface')).toBeInTheDocument();
  });

  it('should display title when provided', () => {
    const messages = [{ type: 'createSurface', surfaceId: 'test' }];

    render(<A2UIStructuredOutput id="output2" messages={messages as never} title="My Output" />);

    expect(screen.getByText('My Output')).toBeInTheDocument();
  });

  it('should not display title when not provided', () => {
    const messages = [{ type: 'createSurface', surfaceId: 'test' }];

    render(<A2UIStructuredOutput id="output3" messages={messages as never} />);

    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('should call processMessages with provided messages', () => {
    const messages = [{ type: 'createSurface', surfaceId: 'test' }];

    render(<A2UIStructuredOutput id="output4" messages={messages as never} />);

    expect(mockProcessMessages).toHaveBeenCalledWith(messages);
  });

  it('should use id as fallback surfaceId', () => {
    const messages = [{ type: 'addComponent' }]; // No surfaceId
    mockGetSurface.mockImplementation((id) =>
      id === 'output-fallback' ? { id: 'output-fallback', ready: true } : null
    );

    render(<A2UIStructuredOutput id="fallback" messages={messages as never} />);

    expect(mockGetSurface).toHaveBeenCalledWith('output-fallback');
  });

  it('should return null when surface not found', () => {
    mockGetSurface.mockReturnValue(null);
    const messages = [{ type: 'createSurface' }];

    const { container } = render(
      <A2UIStructuredOutput id="output5" messages={messages as never} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should apply custom className', () => {
    const messages = [{ type: 'createSurface', surfaceId: 'test' }];

    const { container } = render(
      <A2UIStructuredOutput id="output6" messages={messages as never} className="my-output-class" />
    );

    expect(container.firstChild).toHaveClass('my-output-class');
  });
});
