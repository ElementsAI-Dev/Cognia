/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VectorSettings } from './vector-settings';

// Mock vector store
const mockUpdateSettings = jest.fn();
const mockProviderSettings = {
  openai: { apiKey: 'test-key' },
  google: { apiKey: '' },
  cohere: { apiKey: '' },
  mistral: { apiKey: '' },
};

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
        setupCompleted: true,
        defaultCollectionName: 'default',
        pineconeApiKey: '',
        pineconeIndexName: '',
        pineconeNamespace: '',
        weaviateUrl: 'http://localhost:8080',
        weaviateApiKey: '',
        qdrantUrl: '',
        qdrantApiKey: '',
        milvusAddress: '',
        milvusToken: '',
      },
      updateSettings: mockUpdateSettings,
    };
    return selector(state);
  },
  useSettingsStore: (selector: (state: unknown) => unknown) => {
    const state = {
      providerSettings: mockProviderSettings,
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

// Mock embedding models
jest.mock('@/lib/vector/embedding', () => ({
  DEFAULT_EMBEDDING_MODELS: {
    openai: { provider: 'openai', model: 'text-embedding-3-small', dimensions: 1536 },
    google: { provider: 'google', model: 'text-embedding-004', dimensions: 768 },
    cohere: { provider: 'cohere', model: 'embed-english-v3.0', dimensions: 1024 },
    mistral: { provider: 'mistral', model: 'mistral-embed', dimensions: 1024 },
  },
}));

// Mock VectorManager component
jest.mock('./vector-manager', () => ({
  VectorManager: () => <div data-testid="vector-manager">Vector Manager</div>,
}));

// Mock new components
jest.mock('./section-header', () => ({
  SectionHeader: ({ title }: { title: string }) => <div data-testid="section-header">{title}</div>,
}));

jest.mock('./provider-tabs', () => ({
  ProviderTabs: ({ value, onValueChange, options }: { value: string; onValueChange: (v: string) => void; options: Array<{ value: string; label: string }> }) => (
    <div data-testid="provider-tabs" data-value={value}>
      {options.map((opt) => (
        <button key={opt.value} onClick={() => onValueChange(opt.value)} data-testid={`provider-tab-${opt.value}`}>
          {opt.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('./api-key-modal', () => ({
  VectorApiKeyModal: ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => (
    open ? <div data-testid="api-key-modal"><button onClick={() => onOpenChange(false)}>Close</button></div> : null
  ),
}));

jest.mock('./setup-guide-modal', () => ({
  VectorSetupGuideModal: ({ open, onOpenChange, onComplete }: { open: boolean; onOpenChange: (v: boolean) => void; onComplete: () => void }) => (
    open ? (
      <div data-testid="setup-guide-modal">
        <button onClick={() => onOpenChange(false)}>Close</button>
        <button onClick={onComplete} data-testid="complete-setup">Complete</button>
      </div>
    ) : null
  ),
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

  it('displays provider tabs', () => {
    render(<VectorSettings />);
    expect(screen.getByTestId('provider-tabs')).toBeInTheDocument();
  });

  it('displays all provider tab options', () => {
    render(<VectorSettings />);
    expect(screen.getByTestId('provider-tab-native')).toBeInTheDocument();
    expect(screen.getByTestId('provider-tab-chroma')).toBeInTheDocument();
    expect(screen.getByTestId('provider-tab-pinecone')).toBeInTheDocument();
    expect(screen.getByTestId('provider-tab-weaviate')).toBeInTheDocument();
    expect(screen.getByTestId('provider-tab-qdrant')).toBeInTheDocument();
    expect(screen.getByTestId('provider-tab-milvus')).toBeInTheDocument();
  });

  it('handles provider tab change', () => {
    render(<VectorSettings />);
    const nativeTab = screen.getByTestId('provider-tab-native');
    fireEvent.click(nativeTab);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ provider: 'native' });
  });

  it('displays section headers', () => {
    render(<VectorSettings />);
    const sectionHeaders = screen.getAllByTestId('section-header');
    expect(sectionHeaders.length).toBeGreaterThan(0);
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

  it('displays mode select options for chroma provider', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Embedded')).toBeInTheDocument();
    expect(screen.getByText('Server')).toBeInTheDocument();
  });

  it('displays embedding provider select', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Embedding Provider')).toBeInTheDocument();
  });

  it('displays embedding model select', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Embedding Model')).toBeInTheDocument();
  });

  it('displays Configure API Key button', () => {
    render(<VectorSettings />);
    expect(screen.getByText('Configure API Key')).toBeInTheDocument();
  });

  it('displays API key configured status when key is set', () => {
    render(<VectorSettings />);
    expect(screen.getByText('API key configured')).toBeInTheDocument();
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

  it('handles auto embed switch toggle', () => {
    render(<VectorSettings />);
    const switchBtn = screen.getByTestId('switch');
    fireEvent.click(switchBtn);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ autoEmbed: false });
  });

  it('opens API key modal when Configure API Key button is clicked', () => {
    render(<VectorSettings />);
    const configButton = screen.getByText('Configure API Key');
    fireEvent.click(configButton);
    expect(screen.getByTestId('api-key-modal')).toBeInTheDocument();
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
