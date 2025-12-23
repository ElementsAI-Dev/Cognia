import { render, screen, waitFor } from '@testing-library/react';
import { MermaidBlock } from './mermaid-block';

// Mock mermaid - dynamic import pattern
jest.mock('mermaid', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    render: jest.fn().mockResolvedValue({ svg: '<svg data-testid="mermaid-svg">mock</svg>' }),
  },
}));

describe('MermaidBlock', () => {
  const mockContent = `graph TD
    A[Start] --> B[End]`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<MermaidBlock content={mockContent} />);
    expect(screen.getByText('Rendering diagram...')).toBeInTheDocument();
  });

  it('renders mermaid diagram after loading', async () => {
    render(<MermaidBlock content={mockContent} />);
    
    await waitFor(() => {
      expect(screen.queryByText('Rendering diagram...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByTestId('mermaid-svg')).toBeInTheDocument();
  });

  it('applies custom className to loading state', () => {
    const { container } = render(
      <MermaidBlock content={mockContent} className="custom-class" />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('displays spinner during loading', () => {
    render(<MermaidBlock content={mockContent} />);
    expect(screen.getByText('Rendering diagram...')).toBeInTheDocument();
  });
});
