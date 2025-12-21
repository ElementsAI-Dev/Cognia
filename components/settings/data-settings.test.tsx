/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DataSettings } from './data-settings';

// Mock stores - inline to avoid hoisting issues
jest.mock('@/stores', () => {
  const artifactStore = Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) => {
      const state = { artifacts: {} };
      return selector(state);
    },
    { getState: () => ({ artifacts: {} }) }
  );
  
  return {
    useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
      const state = {
        sessions: [{ id: '1', title: 'Test Session' }],
        clearAllSessions: jest.fn(),
      };
      return selector(state);
    },
    useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
      const state = {};
      return selector(state);
    },
    useArtifactStore: artifactStore,
  };
});

// Mock db
jest.mock('@/lib/db', () => ({
  db: {
    messages: { toArray: jest.fn().mockResolvedValue([]) },
  },
}));

// Mock BatchExportDialog
jest.mock('@/components/export', () => ({
  BatchExportDialog: () => <div data-testid="batch-export-dialog">Batch Export</div>,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>{children}</button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h4>{children}</h4>,
}));

describe('DataSettings', () => {
  it('renders without crashing', () => {
    render(<DataSettings />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays storage section', () => {
    render(<DataSettings />);
    expect(screen.getByText('Storage')).toBeInTheDocument();
  });

  it('displays export data section', () => {
    render(<DataSettings />);
    expect(screen.getByText('Export Data')).toBeInTheDocument();
  });

  it('displays import data section', () => {
    render(<DataSettings />);
    expect(screen.getByText('Import Data')).toBeInTheDocument();
  });

  it('displays danger zone section', () => {
    render(<DataSettings />);
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  it('displays export section', () => {
    render(<DataSettings />);
    expect(screen.getByText('Export Data')).toBeInTheDocument();
  });

  it('displays import section', () => {
    render(<DataSettings />);
    expect(screen.getByText('Import Data')).toBeInTheDocument();
  });

  it('displays delete button', () => {
    render(<DataSettings />);
    expect(screen.getByText('Delete All Data')).toBeInTheDocument();
  });

  it('displays batch export dialog', () => {
    render(<DataSettings />);
    expect(screen.getByTestId('batch-export-dialog')).toBeInTheDocument();
  });
});
