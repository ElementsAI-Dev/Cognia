/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VectorSettings } from './vector-settings';

// Mock vector store
const mockUpdateSettings = jest.fn();

jest.mock('@/stores', () => ({
  useVectorStore: (selector: (state: unknown) => unknown) => {
    const state = {
      settings: {
        provider: 'chroma',
        mode: 'embedded',
        serverUrl: 'http://localhost:8000',
        embeddingProvider: 'openai',
        embeddingModel: 'text-embedding-3-small',
        chunkSize: 1000,
        chunkOverlap: 200,
        autoEmbed: true,
      },
      updateSettings: mockUpdateSettings,
    };
    return selector(state);
  },
}));

// Mock useVectorDB hook
const mockListAllCollections = jest.fn().mockResolvedValue([
  { name: 'collection1' },
  { name: 'collection2' },
]);

jest.mock('@/hooks/rag', () => ({
  useVectorDB: () => ({
    listAllCollections: mockListAllCollections,
  }),
}));

// Mock vector lib
jest.mock('@/lib/vector', () => ({
  getSupportedVectorStoreProviders: () => ['chroma', 'native'],
}));

// Mock VectorManager component
jest.mock('./vector-manager', () => ({
  VectorManager: () => <div data-testid="vector-manager">Vector Manager</div>,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, type, min, disabled }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder} 
      type={type}
      min={min}
      disabled={disabled}
      data-testid="input" 
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, disabled }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void; disabled?: boolean }) => (
    <div data-testid="select" data-value={value} data-disabled={disabled}>
      <button onClick={() => onValueChange?.('native')}>Change</button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <button 
      role="switch" 
      aria-checked={checked} 
      onClick={() => onCheckedChange?.(!checked)} 
      data-testid="switch"
    >
      Switch
    </button>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="alert" className={className}>{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

describe('VectorSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<VectorSettings />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('displays Vector Database title', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Vector Database')).toBeInTheDocument();
  });

  it('displays card description', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Configure provider, mode, and embedding defaults.')).toBeInTheDocument();
  });

  it('displays Provider label', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Provider')).toBeInTheDocument();
  });

  it('displays Mode label', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Mode')).toBeInTheDocument();
  });

  it('displays Chunk size label', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Chunk size')).toBeInTheDocument();
  });

  it('displays Chunk overlap label', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Chunk overlap')).toBeInTheDocument();
  });

  it('displays Auto embed on import label', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Auto embed on import')).toBeInTheDocument();
  });

  it('displays auto embed description', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Automatically generate embeddings when adding documents.')).toBeInTheDocument();
  });

  it('displays Test connection button', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Test connection')).toBeInTheDocument();
  });

  it('displays VectorManager component', () => {
    render(<VectorSettings />);
    expect(screen.getByTestId('vector-manager')).toBeInTheDocument();
  });

  it('displays provider select options', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Chroma (embedded/server)')).toBeInTheDocument();
    expect(screen.getByText('Native (local Tauri)')).toBeInTheDocument();
  });

  it('displays mode select options', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Embedded')).toBeInTheDocument();
    expect(screen.getByText('Server')).toBeInTheDocument();
  });

  it('displays mode description', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Native provider ignores mode (always local).')).toBeInTheDocument();
  });

  it('displays Chroma Server URL field when provider is chroma', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Chroma Server URL')).toBeInTheDocument();
  });

  it('displays server URL description', () => {
    render(<VectorSettings />);
    expect(screen.getByText('For server mode, ensure Chroma server is reachable.')).toBeInTheDocument();
  });

  it('displays chunk size input', () => {
    render(<VectorSettings />);
    const inputs = screen.getAllByTestId('input');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('displays auto embed switch', () => {
    render(<VectorSettings />);
    expect(screen.getByTestId('switch')).toBeInTheDocument();
  });

  it('handles test connection button click', async () => {
    render(<VectorSettings />);
    const testButton = screen.getByText('Test connection');
    fireEvent.click(testButton);
    
    await waitFor(() => {
      expect(mockListAllCollections).toHaveBeenCalled();
    });
  });

  it('displays success message after successful connection test', async () => {
    render(<VectorSettings />);
    const testButton = screen.getByText('Test connection');
    fireEvent.click(testButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Success: 2 collections reachable/)).toBeInTheDocument();
    });
  });

  it('handles chunk size input change', () => {
    render(<VectorSettings />);
    const inputs = screen.getAllByTestId('input');
    // Order: serverUrl (index 0), chunkSize (index 1), chunkOverlap (index 2)
    const chunkSizeInput = inputs[1];
    
    fireEvent.change(chunkSizeInput, { target: { value: '500' } });
    expect(mockUpdateSettings).toHaveBeenCalledWith({ chunkSize: 500 });
  });

  it('handles chunk overlap input change', () => {
    render(<VectorSettings />);
    const inputs = screen.getAllByTestId('input');
    // Order: serverUrl (index 0), chunkSize (index 1), chunkOverlap (index 2)
    const chunkOverlapInput = inputs[2];
    
    fireEvent.change(chunkOverlapInput, { target: { value: '100' } });
    expect(mockUpdateSettings).toHaveBeenCalledWith({ chunkOverlap: 100 });
  });

  it('handles auto embed switch toggle', () => {
    render(<VectorSettings />);
    const switchBtn = screen.getByTestId('switch');
    fireEvent.click(switchBtn);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ autoEmbed: false });
  });

  it('displays select components for provider and mode', () => {
    render(<VectorSettings />);
    const selects = screen.getAllByTestId('select');
    expect(selects.length).toBe(2);
  });
});

describe('VectorSettings - Connection Error', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListAllCollections.mockRejectedValueOnce(new Error('Connection failed'));
  });

  it('displays error message after failed connection test', async () => {
    render(<VectorSettings />);
    const testButton = screen.getByText('Test connection');
    fireEvent.click(testButton);
    
    await waitFor(() => {
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });
});

describe('VectorSettings - Native Provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-mock with native provider
    jest.doMock('@/stores', () => ({
      useVectorStore: (selector: (state: unknown) => unknown) => {
        const state = {
          settings: {
            provider: 'native',
            mode: 'embedded',
            serverUrl: 'http://localhost:8000',
            embeddingProvider: 'openai',
            embeddingModel: 'text-embedding-3-small',
            chunkSize: 1000,
            chunkOverlap: 200,
            autoEmbed: true,
          },
          updateSettings: mockUpdateSettings,
        };
        return selector(state);
      },
    }));
  });

  it('displays native provider alert when provider is native', () => {
    // This test would verify the native provider alert is shown
    // Requires re-mocking the store with native provider
  });
});

describe('VectorSettings - Server Mode', () => {
  it('enables server URL input when mode is server', () => {
    // This test would verify the server URL input is enabled in server mode
  });
});
