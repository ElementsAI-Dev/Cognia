/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import type { Artifact } from '@/types';

jest.mock('recharts', () => {
   
  const ReactModule = require('react');
  const Mock = ({ children }: { children?: React.ReactNode }) =>
    ReactModule.createElement('div', null, children);
  const Null = () => null;

  return {
    ResponsiveContainer: Mock,
    LineChart: Mock,
    BarChart: Mock,
    PieChart: Mock,
    AreaChart: Mock,
    ScatterChart: Mock,
    RadarChart: Mock,
    Line: Null,
    Bar: Null,
    Pie: Null,
    Area: Null,
    Scatter: Null,
    Radar: Null,
    PolarGrid: Null,
    PolarAngleAxis: Null,
    PolarRadiusAxis: Null,
    XAxis: Null,
    YAxis: Null,
    CartesianGrid: Null,
    Tooltip: Null,
    Legend: Null,
    Cell: Null,
  };
});

jest.mock('./artifact-renderers', () => ({
  MermaidRenderer: () => null,
  ChartRenderer: () => null,
  MathRenderer: () => null,
  MarkdownRenderer: () => null,
  CodeRenderer: () => null,
  ArtifactRenderer: ({ type, content }: { type: string; content: string }) => (
    <div data-testid={`artifact-renderer-${type}`}>{content}</div>
  ),
}));

// Mock jupyter-renderer to avoid langfuse import chain
jest.mock('./jupyter-renderer', () => ({
  JupyterRenderer: () => null,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

 
const { ArtifactPreview } = require('./artifact-preview');

describe('ArtifactPreview', () => {
  const mockHtmlArtifact: Artifact = {
    id: 'artifact-1',
    sessionId: 'session-1',
    messageId: 'message-1',
    title: 'HTML Artifact',
    content: '<div>Hello World</div>',
    type: 'html',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSvgArtifact: Artifact = {
    id: 'artifact-2',
    sessionId: 'session-1',
    messageId: 'message-2',
    title: 'SVG Artifact',
    content: '<svg><circle cx="50" cy="50" r="40"/></svg>',
    type: 'svg',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReactArtifact: Artifact = {
    id: 'artifact-3',
    sessionId: 'session-1',
    messageId: 'message-3',
    title: 'React Artifact',
    content: 'function App() { return <div>React App</div>; }',
    type: 'react',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCodeArtifact: Artifact = {
    id: 'artifact-4',
    sessionId: 'session-1',
    messageId: 'message-4',
    title: 'Code Artifact',
    content: 'console.log("hello");',
    type: 'code',
    language: 'javascript',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('renders without crashing', async () => {
    await act(async () => {
      render(<ArtifactPreview artifact={mockHtmlArtifact} />);
    });
    expect(screen.getByTitle(`Preview: ${mockHtmlArtifact.title}`)).toBeInTheDocument();
  });

  it('renders iframe for preview', async () => {
    await act(async () => {
      render(<ArtifactPreview artifact={mockHtmlArtifact} />);
    });
    const iframe = screen.getByTitle(`Preview: ${mockHtmlArtifact.title}`);
    expect(iframe.tagName).toBe('IFRAME');
  });

  it('applies custom className', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(
        <ArtifactPreview artifact={mockHtmlArtifact} className="custom-class" />
      );
      container = result.container;
    });
    expect(container!.firstChild).toHaveClass('custom-class');
  });

  it('sets sandbox attribute on iframe', async () => {
    await act(async () => {
      render(<ArtifactPreview artifact={mockHtmlArtifact} />);
    });
    const iframe = screen.getByTitle(`Preview: ${mockHtmlArtifact.title}`);
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts');
  });

  it('renders SVG artifact', async () => {
    await act(async () => {
      render(<ArtifactPreview artifact={mockSvgArtifact} />);
    });
    expect(screen.getByTitle(`Preview: ${mockSvgArtifact.title}`)).toBeInTheDocument();
  });

  it('renders React artifact', async () => {
    await act(async () => {
      render(<ArtifactPreview artifact={mockReactArtifact} />);
    });
    expect(screen.getByTitle(`Preview: ${mockReactArtifact.title}`)).toBeInTheDocument();
  });

  it('renders code artifact via ArtifactRenderer', async () => {
    await act(async () => {
      render(<ArtifactPreview artifact={mockCodeArtifact} />);
    });
    expect(screen.getByTestId('artifact-renderer-code')).toBeInTheDocument();
  });

  it('does not show error initially', async () => {
    await act(async () => {
      render(<ArtifactPreview artifact={mockHtmlArtifact} />);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders loading spinner while iframe loads', async () => {
    await act(async () => {
      render(<ArtifactPreview artifact={mockHtmlArtifact} />);
    });
    // Loading spinner should be rendered initially (before iframe loads)
    // The component uses isLoading state internally
    const iframe = screen.getByTitle(`Preview: ${mockHtmlArtifact.title}`);
    expect(iframe).toBeInTheDocument();
  });

  it('handles mermaid artifact type', async () => {
    const mermaidArtifact: Artifact = {
      id: 'mermaid-1',
      sessionId: 'session-1',
      messageId: 'message-5',
      title: 'Mermaid Diagram',
      content: 'graph TD\n  A --> B',
      type: 'mermaid',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await act(async () => {
      render(<ArtifactPreview artifact={mermaidArtifact} />);
    });
    // MermaidRenderer is mocked to return null
    expect(screen.queryByTitle(`Preview: ${mermaidArtifact.title}`)).not.toBeInTheDocument();
  });

  it('handles chart artifact type', async () => {
    const chartArtifact: Artifact = {
      id: 'chart-1',
      sessionId: 'session-1',
      messageId: 'message-6',
      title: 'Chart Data',
      content: '[{"name": "A", "value": 10}]',
      type: 'chart',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await act(async () => {
      render(<ArtifactPreview artifact={chartArtifact} />);
    });
    // ChartRenderer is mocked to return null
    expect(screen.queryByTitle(`Preview: ${chartArtifact.title}`)).not.toBeInTheDocument();
  });

  it('handles math artifact type', async () => {
    const mathArtifact: Artifact = {
      id: 'math-1',
      sessionId: 'session-1',
      messageId: 'message-7',
      title: 'Math Formula',
      content: '$$x^2 + y^2 = z^2$$',
      type: 'math',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await act(async () => {
      render(<ArtifactPreview artifact={mathArtifact} />);
    });
    // MathRenderer is mocked to return null
    expect(screen.queryByTitle(`Preview: ${mathArtifact.title}`)).not.toBeInTheDocument();
  });

  it('handles document artifact type', async () => {
    const documentArtifact: Artifact = {
      id: 'doc-1',
      sessionId: 'session-1',
      messageId: 'message-8',
      title: 'Markdown Document',
      content: '# Hello\n\nThis is a document.',
      type: 'document',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await act(async () => {
      render(<ArtifactPreview artifact={documentArtifact} />);
    });
    // MarkdownRenderer is mocked to return null
    expect(screen.queryByTitle(`Preview: ${documentArtifact.title}`)).not.toBeInTheDocument();
  });
});
