/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VectorSetupGuideModal } from './setup-guide-modal';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Vector Database Setup',
      subtitle: 'Complete these steps to configure your vector database',
      step1Title: 'Choose Provider',
      step1Desc: 'Select Native for local storage, or Chroma/Pinecone/Qdrant/Milvus for more capabilities.',
      step2Title: 'Configure Embedding',
      step2Desc: 'Choose an embedding provider and model to generate vectors.',
      step3Title: 'Test Connection',
      step3Desc: 'Verify your configuration by testing the connection and creating your first collection.',
      skip: 'Skip Guide',
      continue: 'Continue Setup',
      hint: 'You can always change these settings later on this page',
    };
    return translations[key] || key;
  },
}));

// Mock stores
jest.mock('@/stores/data', () => ({}));

// Mock Dialog components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant }: { children: React.ReactNode; onClick?: () => void; variant?: string }) => (
    <button onClick={onClick} data-variant={variant} data-testid="button">
      {children}
    </button>
  ),
}));

describe('VectorSetupGuideModal', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(
      <VectorSetupGuideModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="chroma"
        embeddingProvider="openai"
        hasEmbeddingKey={true}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <VectorSetupGuideModal
        open={false}
        onOpenChange={mockOnOpenChange}
        provider="chroma"
        embeddingProvider="openai"
        hasEmbeddingKey={true}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays the dialog title', () => {
    render(
      <VectorSetupGuideModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="chroma"
        embeddingProvider="openai"
        hasEmbeddingKey={true}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Vector Database Setup');
  });

  it('displays all step titles', () => {
    render(
      <VectorSetupGuideModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="chroma"
        embeddingProvider="openai"
        hasEmbeddingKey={true}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Choose Provider')).toBeInTheDocument();
    expect(screen.getByText('Configure Embedding')).toBeInTheDocument();
    expect(screen.getByText('Test Connection')).toBeInTheDocument();
  });

  it('displays step descriptions', () => {
    render(
      <VectorSetupGuideModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="chroma"
        embeddingProvider="openai"
        hasEmbeddingKey={true}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText(/Select Native for local storage/)).toBeInTheDocument();
    expect(screen.getByText(/Choose an embedding provider/)).toBeInTheDocument();
    expect(screen.getByText(/Verify your configuration/)).toBeInTheDocument();
  });

  it('displays Skip Guide button', () => {
    render(
      <VectorSetupGuideModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="chroma"
        embeddingProvider="openai"
        hasEmbeddingKey={true}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Skip Guide')).toBeInTheDocument();
  });

  it('displays Continue Setup button', () => {
    render(
      <VectorSetupGuideModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="chroma"
        embeddingProvider="openai"
        hasEmbeddingKey={true}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Continue Setup')).toBeInTheDocument();
  });

  it('calls onOpenChange when Skip Guide is clicked', () => {
    render(
      <VectorSetupGuideModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="chroma"
        embeddingProvider="openai"
        hasEmbeddingKey={true}
        onComplete={mockOnComplete}
      />
    );

    const skipButton = screen.getByText('Skip Guide');
    fireEvent.click(skipButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onComplete when Continue Setup is clicked', () => {
    render(
      <VectorSetupGuideModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="chroma"
        embeddingProvider="openai"
        hasEmbeddingKey={true}
        onComplete={mockOnComplete}
      />
    );

    const continueButton = screen.getByText('Continue Setup');
    fireEvent.click(continueButton);

    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('displays hint text', () => {
    render(
      <VectorSetupGuideModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="chroma"
        embeddingProvider="openai"
        hasEmbeddingKey={true}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText(/You can always change these settings/)).toBeInTheDocument();
  });
});
