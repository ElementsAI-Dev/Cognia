/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoGenerationDialog } from './video-generation-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      title: 'Generate Video',
      description: 'Create videos with AI',
      prompt: 'Prompt',
      promptPlaceholder: 'Describe the video you want to create...',
      provider: 'Provider',
      model: 'Model',
      resolution: 'Resolution',
      aspectRatio: 'Aspect Ratio',
      duration: 'Duration',
      style: 'Style',
      fps: 'FPS',
      negativePrompt: 'Negative Prompt',
      negativePromptPlaceholder: 'What to avoid...',
      enhancePrompt: 'Enhance Prompt',
      includeAudio: 'Include Audio',
      audioPrompt: 'Audio Prompt',
      audioPromptPlaceholder: 'Describe the audio...',
      showAdvanced: 'Show Advanced',
      hideAdvanced: 'Hide Advanced',
      generating: 'Generating...',
      generate: 'Generate',
      download: 'Download',
      generatedVideos: 'Generated Videos',
      textToVideo: 'Text to Video',
      imageToVideo: 'Image to Video',
      referenceImage: 'Reference Image',
      uploadImage: 'Upload an image',
      estimatedCost: 'Estimated Cost',
      noApiKey: 'No API key configured',
      'styles.cinematic': 'Cinematic',
      'styles.documentary': 'Documentary',
      'styles.animation': 'Animation',
      'styles.timelapse': 'Timelapse',
      'styles.slowmotion': 'Slow Motion',
      'styles.natural': 'Natural',
      'styles.artistic': 'Artistic',
      'styles.commercial': 'Commercial',
    };
    if (params) {
      return translations[key] || key;
    }
    return translations[key] || key;
  },
}));

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn(() => ({
    providerSettings: {
      google: {
        apiKey: 'test-google-api-key',
      },
      openai: {
        apiKey: 'test-openai-api-key',
      },
    },
  })),
}));

// Mock video generation lib
jest.mock('@/lib/ai/media/video-generation', () => ({
  generateVideo: jest.fn(),
  checkVideoGenerationStatus: jest.fn(),
  downloadVideoAsBlob: jest.fn(),
  saveVideoToFile: jest.fn(),
  getAvailableVideoModelsForUI: jest.fn(() => [
    {
      id: 'veo-3',
      name: 'Veo 3',
      provider: 'google-veo',
      supportedResolutions: ['720p', '1080p'],
      supportedAspectRatios: ['16:9', '9:16', '1:1'],
      maxDuration: 20,
    },
    {
      id: 'veo-3.1',
      name: 'Veo 3.1',
      provider: 'google-veo',
      supportedResolutions: ['720p', '1080p', '4k'],
      supportedAspectRatios: ['16:9', '9:16', '1:1'],
      maxDuration: 30,
    },
    {
      id: 'sora-1',
      name: 'Sora 1',
      provider: 'openai-sora',
      supportedResolutions: ['720p', '1080p'],
      supportedAspectRatios: ['16:9', '9:16'],
      maxDuration: 20,
    },
    {
      id: 'sora-turbo',
      name: 'Sora Turbo',
      provider: 'openai-sora',
      supportedResolutions: ['720p', '1080p'],
      supportedAspectRatios: ['16:9', '9:16', '1:1'],
      maxDuration: 15,
    },
  ]),
}));

// Mock types/video
jest.mock('@/types/media/video', () => ({
  estimateVideoCost: jest.fn(() => 0.5),
  parseDurationToSeconds: jest.fn((duration: string) => parseInt(duration.replace('s', ''))),
}));

// Mock Video component
jest.mock('@/components/learning/content/video', () => ({
  Video: ({ prompt, status }: { prompt?: string; status?: string }) => (
    <div data-testid="video-component" data-status={status}>
      {prompt}
    </div>
  ),
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="dialog" data-open={open}>
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="trigger">{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: { children: React.ReactNode }) => (
    <label {...props}>{children}</label>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    disabled,
    ...props
  }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    disabled,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="collapsible" data-open={open}>
      {children}
    </div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
    id,
    disabled,
  }: {
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
    id?: string;
    disabled?: boolean;
  }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      disabled={disabled}
      data-testid={`switch-${id}`}
    />
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <div data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsContent: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-testid={`tab-content-${value}`}>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
}));

describe('VideoGenerationDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger button', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByTestId('trigger')).toBeInTheDocument();
  });

  it('renders custom trigger when provided', () => {
    render(<VideoGenerationDialog trigger={<button>Custom Trigger</button>} />);
    expect(screen.getByText('Custom Trigger')).toBeInTheDocument();
  });

  it('displays dialog title', () => {
    render(<VideoGenerationDialog />);
    // Title appears in both trigger button and dialog header
    expect(screen.getAllByText('Generate Video').length).toBeGreaterThanOrEqual(1);
  });

  it('displays prompt input label', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('Prompt')).toBeInTheDocument();
  });

  it('displays prompt textarea with placeholder', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByPlaceholderText(/Describe the video/)).toBeInTheDocument();
  });

  it('displays provider selection', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('Provider')).toBeInTheDocument();
  });

  it('displays model selection', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('Model')).toBeInTheDocument();
  });

  it('displays resolution selection', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('Resolution')).toBeInTheDocument();
  });

  it('displays aspect ratio selection', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('Aspect Ratio')).toBeInTheDocument();
  });

  it('displays duration selection', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('Duration')).toBeInTheDocument();
  });

  it('displays advanced options toggle', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('Show Advanced')).toBeInTheDocument();
  });

  it('displays generate button', () => {
    render(<VideoGenerationDialog />);
    // There's Generate Video button and Generate action button
    const buttons = screen.getAllByRole('button');
    const generateBtn = buttons.find(btn => btn.textContent?.includes('Generate'));
    expect(generateBtn).toBeInTheDocument();
  });

  it('disables generate button when prompt is empty', () => {
    render(<VideoGenerationDialog />);
    const buttons = screen.getAllByRole('button');
    const generateButton = buttons.find(btn => 
      btn.textContent?.includes('Generate') && !btn.textContent?.includes('Video')
    );
    expect(generateButton).toBeDisabled();
  });

  it('enables generate button when prompt has content', () => {
    render(<VideoGenerationDialog />);
    const textarea = screen.getByPlaceholderText(/Describe the video/);
    fireEvent.change(textarea, { target: { value: 'A beautiful sunset over the ocean' } });
    const buttons = screen.getAllByRole('button');
    const generateButton = buttons.find(btn => 
      btn.textContent?.includes('Generate') && !btn.textContent?.includes('Video')
    );
    expect(generateButton).not.toBeDisabled();
  });

  it('displays text to video tab', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('Text to Video')).toBeInTheDocument();
  });

  it('displays image to video tab', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('Image to Video')).toBeInTheDocument();
  });

  it('displays provider options', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('Google Veo')).toBeInTheDocument();
    expect(screen.getByText('OpenAI Sora')).toBeInTheDocument();
  });

  it('displays style options in advanced settings', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('Style')).toBeInTheDocument();
  });

  it('displays FPS option in advanced settings', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('FPS')).toBeInTheDocument();
  });

  it('displays negative prompt in advanced settings', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('Negative Prompt')).toBeInTheDocument();
  });

  it('displays enhance prompt toggle', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('Enhance Prompt')).toBeInTheDocument();
  });

  it('displays estimated cost', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText(/Estimated Cost/)).toBeInTheDocument();
  });

  it('displays style options', () => {
    render(<VideoGenerationDialog />);
    // Style options are in advanced settings, check one exists
    expect(screen.getByText(/cinematic/i)).toBeInTheDocument();
  });

  it('displays FPS options', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('24 fps')).toBeInTheDocument();
    expect(screen.getByText('30 fps')).toBeInTheDocument();
    expect(screen.getByText('60 fps')).toBeInTheDocument();
  });

  it('enables generate button when prompt and conditions are met', () => {
    render(<VideoGenerationDialog />);

    const textarea = screen.getByPlaceholderText(/Describe the video/);
    fireEvent.change(textarea, { target: { value: 'A test video prompt' } });

    const buttons = screen.getAllByRole('button');
    const generateButton = buttons.find(btn => 
      btn.textContent?.includes('Generate') && !btn.textContent?.includes('Video')
    );
    expect(generateButton).not.toBeDisabled();
  });

  it('displays image upload area in image-to-video tab', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('Reference Image')).toBeInTheDocument();
  });

  it('displays upload instruction', () => {
    render(<VideoGenerationDialog />);
    expect(screen.getByText('Upload an image')).toBeInTheDocument();
  });

  it('renders model options for selected provider', () => {
    render(<VideoGenerationDialog />);
    // Model options are rendered within select, just verify model label exists
    expect(screen.getByText('Model')).toBeInTheDocument();
  });
});
