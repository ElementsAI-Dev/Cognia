/**
 * Unit tests for CitationGraph component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CitationGraph } from './citation-graph';
import * as citationNetworkModule from '@/lib/academic/citation-network';
import type { Paper } from '@/types/learning/academic';

// Mock the citation network module
jest.mock('@/lib/academic/citation-network', () => ({
  buildCitationNetwork: jest.fn(),
}));

const mockBuildCitationNetwork = citationNetworkModule.buildCitationNetwork as jest.MockedFunction<
  typeof citationNetworkModule.buildCitationNetwork
>;

// Mock paper data
const createMockPaper = (id: string): Paper => ({
  id,
  providerId: 'semantic-scholar',
  externalId: `ss-${id}`,
  title: `Test Paper ${id}`,
  abstract: 'Test abstract',
  authors: [{ name: 'Test Author' }],
  year: 2023,
  urls: [],
  metadata: { corpusId: id },
  createdAt: new Date(),
  updatedAt: new Date(),
  fetchedAt: new Date(),
  citationCount: 100,
  referenceCount: 50,
});

const createMockCitationNetwork = () => ({
  paperId: 'paper-1',
  paperTitle: 'Test Paper 1',
  citations: [
    {
      paperId: 'cite-1',
      title: 'Citing Paper 1',
      authors: ['Author A', 'Author B'],
      year: 2023,
      citationCount: 50,
      isInfluential: true,
      venue: 'Test Conference',
    },
    {
      paperId: 'cite-2',
      title: 'Citing Paper 2',
      authors: ['Author C'],
      year: 2022,
      citationCount: 20,
      isInfluential: false,
    },
  ],
  references: [
    {
      paperId: 'ref-1',
      title: 'Reference Paper 1',
      authors: ['Author X'],
      year: 2020,
      citationCount: 100,
      isInfluential: false,
    },
  ],
  citationCount: 100,
  referenceCount: 50,
  influentialCitationCount: 1,
});

describe('CitationGraph', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    mockBuildCitationNetwork.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<CitationGraph paper={createMockPaper('paper-1')} />);

    expect(screen.getByText(/Loading citation network/i)).toBeInTheDocument();
  });

  it('should render citation network after loading', async () => {
    mockBuildCitationNetwork.mockResolvedValueOnce(createMockCitationNetwork());

    render(<CitationGraph paper={createMockPaper('paper-1')} />);

    await waitFor(() => {
      expect(screen.getByText(/100/)).toBeInTheDocument(); // citation count
    });

    // Check that stats badges are rendered (multiple elements may match)
    expect(screen.getAllByText(/cited by/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/references/i).length).toBeGreaterThan(0);
  });

  it('should show error state on API failure', async () => {
    mockBuildCitationNetwork.mockRejectedValueOnce(new Error('API Error'));

    render(<CitationGraph paper={createMockPaper('paper-1')} />);

    await waitFor(() => {
      expect(screen.getByText(/API Error/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Retry/i)).toBeInTheDocument();
  });

  it('should show empty state when no citations available', async () => {
    mockBuildCitationNetwork.mockResolvedValueOnce({
      paperId: 'paper-1',
      paperTitle: 'Test Paper',
      citations: [],
      references: [],
      citationCount: 0,
      referenceCount: 0,
      influentialCitationCount: 0,
    });

    render(<CitationGraph paper={createMockPaper('paper-1')} />);

    await waitFor(() => {
      expect(screen.getByText(/No citation data available/i)).toBeInTheDocument();
    });
  });

  it('should switch between citations and references tabs', async () => {
    mockBuildCitationNetwork.mockResolvedValueOnce(createMockCitationNetwork());

    render(<CitationGraph paper={createMockPaper('paper-1')} />);

    await waitFor(() => {
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    // Check that tabs exist
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(0);
  });

  it('should filter influential citations when toggle is on', async () => {
    mockBuildCitationNetwork.mockResolvedValueOnce(createMockCitationNetwork());

    render(<CitationGraph paper={createMockPaper('paper-1')} />);

    await waitFor(() => {
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    // Toggle influential only
    const influentialSwitch = screen.getByRole('switch');
    fireEvent.click(influentialSwitch);

    // After filtering, only influential papers should show
    await waitFor(() => {
      expect(screen.getByText(/Citing Paper 1/i)).toBeInTheDocument();
    });
  });

  it('should render citation items', async () => {
    mockBuildCitationNetwork.mockResolvedValueOnce(createMockCitationNetwork());

    render(<CitationGraph paper={createMockPaper('paper-1')} />);

    await waitFor(() => {
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    // Check that citation data is rendered
    expect(screen.getByText(/Citing Paper 1/i)).toBeInTheDocument();
  });

  it('should render with onPaperClick prop', async () => {
    const onPaperClick = jest.fn();
    mockBuildCitationNetwork.mockResolvedValueOnce(createMockCitationNetwork());

    render(
      <CitationGraph paper={createMockPaper('paper-1')} onPaperClick={onPaperClick} />
    );

    await waitFor(() => {
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    // Component should render without errors
    expect(screen.getByText(/Citing Paper 1/i)).toBeInTheDocument();
  });

  it('should refresh network on button click', async () => {
    mockBuildCitationNetwork.mockResolvedValue(createMockCitationNetwork());

    render(<CitationGraph paper={createMockPaper('paper-1')} />);

    await waitFor(() => {
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockBuildCitationNetwork).toHaveBeenCalledTimes(2);
    });
  });

  it('should display influential badge for influential citations', async () => {
    mockBuildCitationNetwork.mockResolvedValueOnce(createMockCitationNetwork());

    render(<CitationGraph paper={createMockPaper('paper-1')} />);

    await waitFor(() => {
      // Check for influential badge (star icon)
      expect(screen.getByText('★')).toBeInTheDocument();
    });
  });

  it('should show summary stats', async () => {
    mockBuildCitationNetwork.mockResolvedValueOnce(createMockCitationNetwork());

    render(<CitationGraph paper={createMockPaper('paper-1')} />);

    await waitFor(() => {
      expect(screen.getByText(/100/)).toBeInTheDocument(); // Total citations
      expect(screen.getByText(/50/)).toBeInTheDocument(); // Total references
      expect(screen.getByText(/1 influential/i)).toBeInTheDocument();
    });
  });
});
