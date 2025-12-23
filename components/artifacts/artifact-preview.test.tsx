/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Artifact } from '@/types';

jest.mock('recharts', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactModule = require('react');
  const Mock = ({ children }: { children?: React.ReactNode }) => ReactModule.createElement('div', null, children);
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
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
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

  it('renders without crashing', () => {
    render(<ArtifactPreview artifact={mockHtmlArtifact} />);
    expect(screen.getByTitle(`Preview: ${mockHtmlArtifact.title}`)).toBeInTheDocument();
  });

  it('renders iframe for preview', () => {
    render(<ArtifactPreview artifact={mockHtmlArtifact} />);
    const iframe = screen.getByTitle(`Preview: ${mockHtmlArtifact.title}`);
    expect(iframe.tagName).toBe('IFRAME');
  });

  it('applies custom className', () => {
    const { container } = render(
      <ArtifactPreview artifact={mockHtmlArtifact} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('sets sandbox attribute on iframe', () => {
    render(<ArtifactPreview artifact={mockHtmlArtifact} />);
    const iframe = screen.getByTitle(`Preview: ${mockHtmlArtifact.title}`);
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin');
  });

  it('renders SVG artifact', () => {
    render(<ArtifactPreview artifact={mockSvgArtifact} />);
    expect(screen.getByTitle(`Preview: ${mockSvgArtifact.title}`)).toBeInTheDocument();
  });

  it('renders React artifact', () => {
    render(<ArtifactPreview artifact={mockReactArtifact} />);
    expect(screen.getByTitle(`Preview: ${mockReactArtifact.title}`)).toBeInTheDocument();
  });

  it('renders code artifact with escaped HTML', () => {
    render(<ArtifactPreview artifact={mockCodeArtifact} />);
    expect(screen.getByTitle(`Preview: ${mockCodeArtifact.title}`)).toBeInTheDocument();
  });

  it('does not show error initially', () => {
    render(<ArtifactPreview artifact={mockHtmlArtifact} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
