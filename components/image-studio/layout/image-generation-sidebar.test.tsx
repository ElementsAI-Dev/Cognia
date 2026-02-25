import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageGenerationSidebar } from './image-generation-sidebar';

// Mock PromptOptimizerDialog
jest.mock('@/components/prompt/optimization/prompt-optimizer-dialog', () => ({
  PromptOptimizerDialog: ({ open, onApply }: { open: boolean; onApply: (v: string) => void; onOpenChange: (v: boolean) => void; initialPrompt: string }) =>
    open ? React.createElement('div', { 'data-testid': 'prompt-optimizer-dialog' },
      React.createElement('button', { 'data-testid': 'apply-optimized', onClick: () => onApply('optimized prompt') }, 'Apply')
    ) : null,
}));

// Mock ProviderIcon
jest.mock('@/components/providers/ai/provider-icon', () => ({
  ProviderIcon: ({ providerId }: { providerId: string; size?: number }) =>
    React.createElement('span', { 'data-testid': `provider-icon-${providerId}` }),
}));

// Mock image-generation-sdk
jest.mock('@/lib/ai/media/image-generation-sdk', () => ({
  getAvailableImageModels: (provider: string) => {
    const models: Record<string, Array<{ id: string; name: string }>> = {
      openai: [
        { id: 'gpt-image-1', name: 'GPT Image 1' },
        { id: 'dall-e-3', name: 'DALL-E 3' },
        { id: 'dall-e-2', name: 'DALL-E 2' },
      ],
      xai: [{ id: 'grok-2-image', name: 'Grok 2 Image' }],
      together: [{ id: 'together-model', name: 'Together Model' }],
    };
    return models[provider] || [];
  },
}));

// Mock image-studio constants
jest.mock('@/lib/image-studio', () => ({
  PROMPT_TEMPLATES: [
    { label: 'Landscape', prompt: 'A beautiful mountain', category: 'nature' },
    { label: 'Portrait', prompt: 'A professional portrait', category: 'portrait' },
  ],
  STYLE_PRESETS: [
    { label: 'Photo', value: 'photorealistic', short: '📷' },
  ],
  ASPECT_RATIOS: [
    { label: '1:1', size: '1024x1024', icon: '⬜' },
    { label: '9:16', size: '1024x1792', icon: '📱' },
  ],
}));

// Mock ScrollArea
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'scroll-area' }, children),
}));

// Mock Collapsible
jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    React.createElement('div', { 'data-testid': 'collapsible', 'data-open': open }, children),
  CollapsibleTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? children : React.createElement('div', null, children),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'collapsible-content' }, children),
}));

// Mock Alert
jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) =>
    React.createElement('div', { 'data-testid': 'alert', 'data-variant': variant }, children),
  AlertDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'alert-description' }, children),
}));

// Mock Select
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) =>
    React.createElement('div', { 'data-testid': 'select', 'data-value': value }, children),
  SelectTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'select-trigger' }, children),
  SelectValue: () => React.createElement('span', { 'data-testid': 'select-value' }),
  SelectContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'select-content' }, children),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) =>
    React.createElement('div', { 'data-testid': `select-item-${value}` }, children),
}));

// Mock Tabs
jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value }: { children: React.ReactNode; value: string }) =>
    React.createElement('div', { 'data-testid': 'tabs', 'data-value': value }, children),
  TabsList: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'tabs-list' }, children),
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) =>
    React.createElement('button', { 'data-testid': `tab-${value}` }, children),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) =>
    React.createElement('div', { 'data-testid': `tab-content-${value}` }, children),
}));

// Mock Badge
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) =>
    React.createElement('span', { 'data-testid': 'badge' }, children),
}));

// Mock Slider
jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange }: { value: number[]; onValueChange: (v: number[]) => void }) =>
    React.createElement('input', {
      'data-testid': 'slider',
      type: 'range',
      value: value[0],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onValueChange([Number(e.target.value)]),
    }),
}));

const createRef = () => ({ current: null });

const defaultProps = {
  show: true,
  activeTab: 'generate' as const,
  onActiveTabChange: jest.fn(),
  prompt: '',
  onPromptChange: jest.fn(),
  negativePrompt: '',
  onNegativePromptChange: jest.fn(),
  provider: 'openai' as const,
  onProviderChange: jest.fn(),
  model: 'dall-e-3',
  onModelChange: jest.fn(),
  size: '1024x1024' as const,
  onSizeChange: jest.fn(),
  quality: 'standard' as const,
  onQualityChange: jest.fn(),
  style: 'vivid' as const,
  onStyleChange: jest.fn(),
  numberOfImages: 1,
  onNumberOfImagesChange: jest.fn(),
  seed: null,
  onSeedChange: jest.fn(),
  estimatedCost: 0.04,
  editImageFile: null,
  onEditImageFileChange: jest.fn(),
  maskFile: null,
  onMaskFileChange: jest.fn(),
  variationImage: null,
  onVariationImageChange: jest.fn(),
  fileInputRef: createRef() as React.RefObject<HTMLInputElement | null>,
  maskInputRef: createRef() as React.RefObject<HTMLInputElement | null>,
  variationInputRef: createRef() as React.RefObject<HTMLInputElement | null>,
  isGenerating: false,
  error: null,
  onGenerate: jest.fn(),
  onEdit: jest.fn(),
  onCreateVariations: jest.fn(),
  showSettings: false,
  onShowSettingsChange: jest.fn(),
};

describe('ImageGenerationSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<ImageGenerationSidebar {...defaultProps} />);
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
  });

  it('should render three tab triggers', () => {
    render(<ImageGenerationSidebar {...defaultProps} />);
    expect(screen.getByTestId('tab-generate')).toBeInTheDocument();
    expect(screen.getByTestId('tab-edit')).toBeInTheDocument();
    expect(screen.getByTestId('tab-variations')).toBeInTheDocument();
  });

  it('should render with w-0 when show is false', () => {
    const { container } = render(<ImageGenerationSidebar {...defaultProps} show={false} />);
    const sidebar = container.querySelector('.w-0');
    expect(sidebar).toBeInTheDocument();
  });

  it('should render with w-full when show is true', () => {
    const { container } = render(<ImageGenerationSidebar {...defaultProps} show={true} />);
    const sidebar = container.querySelector('.w-full');
    expect(sidebar).toBeInTheDocument();
  });

  describe('Prompt Input', () => {
    it('should render prompt textarea', () => {
      render(<ImageGenerationSidebar {...defaultProps} />);
      const textarea = screen.getByPlaceholderText('promptPlaceholder');
      expect(textarea).toBeInTheDocument();
    });

    it('should call onPromptChange when typing in prompt', () => {
      render(<ImageGenerationSidebar {...defaultProps} />);
      const textarea = screen.getByPlaceholderText('promptPlaceholder');
      fireEvent.change(textarea, { target: { value: 'new prompt' } });
      expect(defaultProps.onPromptChange).toHaveBeenCalledWith('new prompt');
    });

    it('should display character counter', () => {
      render(<ImageGenerationSidebar {...defaultProps} prompt="hello" />);
      expect(screen.getByText('5/4000')).toBeInTheDocument();
    });

    it('should display 0/4000 when prompt is empty', () => {
      render(<ImageGenerationSidebar {...defaultProps} prompt="" />);
      expect(screen.getByText('0/4000')).toBeInTheDocument();
    });
  });

  describe('Enhance Button', () => {
    it('should render Enhance button', () => {
      render(<ImageGenerationSidebar {...defaultProps} />);
      expect(screen.getByText('Enhance')).toBeInTheDocument();
    });

    it('should disable Enhance button when prompt is empty', () => {
      render(<ImageGenerationSidebar {...defaultProps} prompt="" />);
      const enhanceBtn = screen.getByText('Enhance').closest('button');
      expect(enhanceBtn).toBeDisabled();
    });

    it('should enable Enhance button when prompt has text', () => {
      render(<ImageGenerationSidebar {...defaultProps} prompt="A cat" />);
      const enhanceBtn = screen.getByText('Enhance').closest('button');
      expect(enhanceBtn).not.toBeDisabled();
    });

    it('should open PromptOptimizerDialog when Enhance is clicked', () => {
      render(<ImageGenerationSidebar {...defaultProps} prompt="A cat" />);
      expect(screen.queryByTestId('prompt-optimizer-dialog')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Enhance'));
      expect(screen.getByTestId('prompt-optimizer-dialog')).toBeInTheDocument();
    });

    it('should call onPromptChange when optimized prompt is applied', () => {
      render(<ImageGenerationSidebar {...defaultProps} prompt="A cat" />);
      fireEvent.click(screen.getByText('Enhance'));
      fireEvent.click(screen.getByTestId('apply-optimized'));
      expect(defaultProps.onPromptChange).toHaveBeenCalledWith('optimized prompt');
    });
  });

  describe('Generate Button', () => {
    it('should disable generate button when prompt is empty', () => {
      render(<ImageGenerationSidebar {...defaultProps} prompt="" />);
      const genBtn = screen.getByText('generateImage').closest('button');
      expect(genBtn).toBeDisabled();
    });

    it('should enable generate button when prompt has text', () => {
      render(<ImageGenerationSidebar {...defaultProps} prompt="A test" />);
      const genBtn = screen.getByText('generateImage').closest('button');
      expect(genBtn).not.toBeDisabled();
    });

    it('should show generating state', () => {
      render(<ImageGenerationSidebar {...defaultProps} prompt="test" isGenerating={true} />);
      expect(screen.getByText('generating')).toBeInTheDocument();
    });

    it('should call onGenerate when generate button is clicked', () => {
      render(<ImageGenerationSidebar {...defaultProps} prompt="A test" />);
      fireEvent.click(screen.getByText('generateImage'));
      expect(defaultProps.onGenerate).toHaveBeenCalled();
    });
  });

  describe('Error Display', () => {
    it('should display error when error prop is set', () => {
      render(<ImageGenerationSidebar {...defaultProps} error="Something went wrong" />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should NOT display error when error is null', () => {
      render(<ImageGenerationSidebar {...defaultProps} error={null} />);
      expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
    });
  });

  describe('Provider Selection', () => {
    it('should render provider select items in settings', () => {
      render(<ImageGenerationSidebar {...defaultProps} showSettings={true} />);
      expect(screen.getByTestId('select-item-openai')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-xai')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-together')).toBeInTheDocument();
    });

    it('should render dynamic model list based on provider', () => {
      render(<ImageGenerationSidebar {...defaultProps} showSettings={true} provider="openai" />);
      expect(screen.getByTestId('select-item-gpt-image-1')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-dall-e-3')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-dall-e-2')).toBeInTheDocument();
    });

    it('should render xai models when provider is xai', () => {
      render(<ImageGenerationSidebar {...defaultProps} showSettings={true} provider={"xai" as any} />);
      expect(screen.getByTestId('select-item-grok-2-image')).toBeInTheDocument();
    });

    it('should render ProviderIcon for the selected provider', () => {
      render(<ImageGenerationSidebar {...defaultProps} showSettings={true} provider="openai" />);
      expect(screen.getByTestId('provider-icon-openai')).toBeInTheDocument();
    });
  });

  describe('Settings Panel', () => {
    it('should render settings toggle button', () => {
      render(<ImageGenerationSidebar {...defaultProps} />);
      expect(screen.getByText('settings')).toBeInTheDocument();
    });

    it('should render estimated cost', () => {
      render(<ImageGenerationSidebar {...defaultProps} showSettings={true} estimatedCost={0.04} />);
      expect(screen.getByText('$0.040')).toBeInTheDocument();
    });
  });

  describe('Template Cards', () => {
    it('should render prompt templates', () => {
      render(<ImageGenerationSidebar {...defaultProps} />);
      expect(screen.getByText('Landscape')).toBeInTheDocument();
      expect(screen.getByText('Portrait')).toBeInTheDocument();
    });

    it('should call onPromptChange when template is clicked', () => {
      render(<ImageGenerationSidebar {...defaultProps} />);
      fireEvent.click(screen.getByText('Landscape'));
      expect(defaultProps.onPromptChange).toHaveBeenCalledWith('A beautiful mountain');
    });
  });

  describe('i18n', () => {
    it('should render tab labels via i18n keys', () => {
      render(<ImageGenerationSidebar {...defaultProps} />);
      expect(screen.getByText('tabGenerate')).toBeInTheDocument();
      expect(screen.getByText('tabEdit')).toBeInTheDocument();
      expect(screen.getByText('tabVariations')).toBeInTheDocument();
    });

    it('should render prompt label via i18n', () => {
      render(<ImageGenerationSidebar {...defaultProps} />);
      expect(screen.getByText('prompt')).toBeInTheDocument();
    });
  });

  describe('Ctrl+Enter Shortcut', () => {
    it('should call onGenerate on Ctrl+Enter in prompt textarea', () => {
      render(<ImageGenerationSidebar {...defaultProps} prompt="A test prompt" />);
      const textarea = screen.getByPlaceholderText('promptPlaceholder');
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
      expect(defaultProps.onGenerate).toHaveBeenCalled();
    });

    it('should NOT call onGenerate on Ctrl+Enter when prompt is empty', () => {
      render(<ImageGenerationSidebar {...defaultProps} prompt="" />);
      const textarea = screen.getByPlaceholderText('promptPlaceholder');
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
      expect(defaultProps.onGenerate).not.toHaveBeenCalled();
    });
  });
});
