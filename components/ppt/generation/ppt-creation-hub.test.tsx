/**
 * Tests for PPTCreationHub
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PPTCreationHub } from './ppt-creation-hub';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock hooks/ppt
const mockGenerate = jest.fn();
const mockGenerateFromMaterials = jest.fn();
jest.mock('@/hooks/ppt', () => ({
  usePPTGeneration: () => ({
    generate: mockGenerate,
    generateFromMaterials: mockGenerateFromMaterials,
    isGenerating: false,
    progress: { stage: 'idle', currentSlide: 0, totalSlides: 0, message: '' },
    error: null,
  }),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  loggers: { ui: { error: jest.fn(), info: jest.fn(), debug: jest.fn() } },
}));

// Mock DEFAULT_PPT_THEMES
jest.mock('@/types/workflow', () => ({
  DEFAULT_PPT_THEMES: [
    {
      id: 'modern-dark',
      name: 'Modern Dark',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      accentColor: '#60A5FA',
      backgroundColor: '#0F172A',
      textColor: '#F8FAFC',
      headingFont: 'Inter',
      bodyFont: 'Inter',
      codeFont: 'JetBrains Mono',
    },
  ],
}));

describe('PPTCreationHub', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dialog when open', () => {
    render(<PPTCreationHub {...defaultProps} />);
    expect(screen.getByText('Create Presentation')).toBeInTheDocument();
    expect(screen.getByText('Choose how to create your presentation')).toBeInTheDocument();
  });

  it('should render three mode tabs', () => {
    render(<PPTCreationHub {...defaultProps} />);
    expect(screen.getByRole('tab', { name: /Generate/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Import/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Paste/i })).toBeInTheDocument();
  });

  it('should render topic and description inputs', () => {
    render(<PPTCreationHub {...defaultProps} />);
    expect(screen.getByLabelText('Topic')).toBeInTheDocument();
    expect(screen.getByLabelText('Additional Details')).toBeInTheDocument();
  });

  it('should render generate tab content by default', () => {
    render(<PPTCreationHub {...defaultProps} />);
    expect(screen.getByText('Create from a topic or prompt')).toBeInTheDocument();
  });

  it('should render import tab content when initialMode is import', () => {
    render(<PPTCreationHub {...defaultProps} initialMode="import" />);
    expect(screen.getByText('Drag & drop a file here')).toBeInTheDocument();
  });

  it('should render paste tab content when initialMode is paste', () => {
    render(<PPTCreationHub {...defaultProps} initialMode="paste" />);
    expect(screen.getByPlaceholderText(/Paste your article/)).toBeInTheDocument();
  });

  it('should render all three tab triggers', () => {
    render(<PPTCreationHub {...defaultProps} />);
    expect(screen.getByRole('tab', { name: /Generate/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Import/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Paste/i })).toBeInTheDocument();
  });

  it('should set initial topic from props', () => {
    render(<PPTCreationHub {...defaultProps} initialTopic="AI in Healthcare" />);
    const topicInput = screen.getByLabelText('Topic') as HTMLInputElement;
    expect(topicInput.value).toBe('AI in Healthcare');
  });

  it('should enable generate button when topic is entered in generate mode', () => {
    render(<PPTCreationHub {...defaultProps} />);
    const topicInput = screen.getByLabelText('Topic');
    fireEvent.change(topicInput, { target: { value: 'My Presentation' } });

    const generateBtn = screen.getByRole('button', { name: /Generate/i });
    expect(generateBtn).not.toBeDisabled();
  });

  it('should disable generate button when topic is empty in generate mode', () => {
    render(<PPTCreationHub {...defaultProps} />);
    // The Generate button in the submit area (not the tab)
    const buttons = screen.getAllByRole('button');
    const generateBtn = buttons.find(
      (btn) => btn.textContent?.includes('Generate') && !btn.closest('[role="tablist"]')
    );
    expect(generateBtn).toBeDisabled();
  });

  it('should call generate when submit is clicked in generate mode', async () => {
    mockGenerate.mockResolvedValue({ id: 'ppt-123' });
    render(<PPTCreationHub {...defaultProps} />);

    const topicInput = screen.getByLabelText('Topic');
    fireEvent.change(topicInput, { target: { value: 'Test Topic' } });

    const buttons = screen.getAllByRole('button');
    const generateBtn = buttons.find(
      (btn) => btn.textContent?.includes('Generate') && !btn.closest('[role="tablist"]')
    );
    fireEvent.click(generateBtn!);

    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ topic: 'Test Topic' })
      );
    });
  });

  it('should show character count in paste mode', () => {
    render(<PPTCreationHub {...defaultProps} initialMode="paste" />);
    const textarea = screen.getByPlaceholderText(/Paste your article/);
    fireEvent.change(textarea, { target: { value: 'Hello world' } });
    expect(screen.getByText('11 characters')).toBeInTheDocument();
  });

  it('should show min chars hint when paste text is less than 50 chars', () => {
    render(<PPTCreationHub {...defaultProps} initialMode="paste" />);
    const textarea = screen.getByPlaceholderText(/Paste your article/);
    fireEvent.change(textarea, { target: { value: 'Short text' } });
    expect(screen.getByText('Minimum 50 characters recommended')).toBeInTheDocument();
  });

  it('should call onOpenChange when cancel is clicked', () => {
    const onOpenChange = jest.fn();
    render(<PPTCreationHub {...defaultProps} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should navigate to ppt page after successful generation', async () => {
    mockGenerate.mockResolvedValue({ id: 'ppt-new-123' });
    const onCreated = jest.fn();
    render(
      <PPTCreationHub {...defaultProps} onCreated={onCreated} />
    );

    fireEvent.change(screen.getByLabelText('Topic'), {
      target: { value: 'Test' },
    });

    const buttons = screen.getAllByRole('button');
    const generateBtn = buttons.find(
      (btn) => btn.textContent?.includes('Generate') && !btn.closest('[role="tablist"]')
    );
    fireEvent.click(generateBtn!);

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith('ppt-new-123');
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('should navigate directly when onCreated is not provided', async () => {
    mockGenerate.mockResolvedValue({ id: 'ppt-new-456' });
    render(<PPTCreationHub {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Topic'), {
      target: { value: 'Direct navigation' },
    });

    const buttons = screen.getAllByRole('button');
    const generateBtn = buttons.find(
      (btn) => btn.textContent?.includes('Generate') && !btn.closest('[role="tablist"]')
    );
    fireEvent.click(generateBtn!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/ppt?id=ppt-new-456');
    });
  });

  it('should render import tab with file upload zone and URL input', () => {
    render(<PPTCreationHub {...defaultProps} initialMode="import" />);
    expect(screen.getByText('Drag & drop a file here')).toBeInTheDocument();
    expect(screen.getByText('or click to select a file')).toBeInTheDocument();
    expect(screen.getByText('Supported: PDF, DOCX, TXT, MD')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://example.com/article')).toBeInTheDocument();
  });
});
