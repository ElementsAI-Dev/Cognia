/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PanelVersionHistory } from './panel-version-history';

const mockSaveArtifactVersion = jest.fn();
const mockRestoreArtifactVersion = jest.fn();
const mockGetArtifactVersions = jest.fn();

jest.mock('@/stores', () => ({
  useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      getArtifactVersions: mockGetArtifactVersions,
      saveArtifactVersion: mockSaveArtifactVersion,
      restoreArtifactVersion: mockRestoreArtifactVersion,
    };
    return selector(state);
  },
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('./version-diff-view', () => ({
  VersionDiffView: ({ oldLabel, newLabel }: { oldContent: string; newContent: string; oldLabel: string; newLabel: string }) => (
    <div data-testid="version-diff" data-old-label={oldLabel} data-new-label={newLabel} />
  ),
}));

const mockArtifact = {
  id: 'artifact-1',
  sessionId: 'session-1',
  messageId: 'message-1',
  title: 'Test',
  content: '<div>Current</div>',
  type: 'html' as const,
  language: 'html' as const,
  version: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockVersions = [
  {
    id: 'v1',
    artifactId: 'artifact-1',
    content: '<div>Version 1</div>',
    version: 1,
    createdAt: new Date('2024-01-01'),
    changeDescription: 'Initial',
  },
  {
    id: 'v2',
    artifactId: 'artifact-1',
    content: '<div>Version 2</div>',
    version: 2,
    createdAt: new Date('2024-01-02'),
    changeDescription: 'Update',
  },
];

describe('PanelVersionHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetArtifactVersions.mockReturnValue([]);
  });

  it('renders version history header', () => {
    render(<PanelVersionHistory artifact={mockArtifact} />);
    expect(screen.getByText('versionHistory')).toBeInTheDocument();
  });

  it('renders save version button', () => {
    render(<PanelVersionHistory artifact={mockArtifact} />);
    expect(screen.getByText('saveVersion')).toBeInTheDocument();
  });

  it('shows empty state when no versions', () => {
    render(<PanelVersionHistory artifact={mockArtifact} />);
    expect(screen.getByText('noVersions')).toBeInTheDocument();
  });

  it('calls saveArtifactVersion when save button is clicked', () => {
    render(<PanelVersionHistory artifact={mockArtifact} />);
    fireEvent.click(screen.getByText('saveVersion'));
    expect(mockSaveArtifactVersion).toHaveBeenCalledWith('artifact-1', 'Manual save v3');
  });

  it('renders version list when versions exist', () => {
    mockGetArtifactVersions.mockReturnValue(mockVersions);
    render(<PanelVersionHistory artifact={mockArtifact} />);
    expect(screen.getByText('Initial')).toBeInTheDocument();
    expect(screen.getByText('Update')).toBeInTheDocument();
  });

  it('renders restore buttons for each version', () => {
    mockGetArtifactVersions.mockReturnValue(mockVersions);
    render(<PanelVersionHistory artifact={mockArtifact} />);
    const restoreButtons = screen.getAllByText('restoreVersion');
    expect(restoreButtons).toHaveLength(2);
  });

  it('calls restoreArtifactVersion when restore button is clicked', () => {
    const mockOnVersionRestored = jest.fn();
    mockGetArtifactVersions.mockReturnValue(mockVersions);
    render(<PanelVersionHistory artifact={mockArtifact} onVersionRestored={mockOnVersionRestored} />);
    const restoreButtons = screen.getAllByText('restoreVersion');
    fireEvent.click(restoreButtons[0]);
    expect(mockRestoreArtifactVersion).toHaveBeenCalledWith('artifact-1', 'v1');
    expect(mockOnVersionRestored).toHaveBeenCalled();
  });

  it('does not show diff view by default', () => {
    mockGetArtifactVersions.mockReturnValue(mockVersions);
    render(<PanelVersionHistory artifact={mockArtifact} />);
    expect(screen.queryByTestId('version-diff')).not.toBeInTheDocument();
  });
});
