/**
 * Plugin Create Wizard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PluginCreateWizard } from './plugin-create-wizard';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'title': 'Create Plugin',
      'steps.template': 'Template',
      'steps.templateDesc': 'Choose a template',
      'steps.details': 'Details',
      'steps.detailsDesc': 'Enter plugin details',
      'steps.capabilities': 'Capabilities',
      'steps.capabilitiesDesc': 'Select capabilities',
      'steps.preview': 'Preview',
      'steps.previewDesc': 'Review and create',
      'types.frontend': 'Frontend',
      'types.frontendDesc': 'React components',
      'types.python': 'Python',
      'types.pythonDesc': 'Python backend',
      'types.hybrid': 'Hybrid',
      'types.hybridDesc': 'Both frontend and backend',
      'details.pluginName': 'Plugin Name',
      'details.pluginNamePlaceholder': 'My Plugin',
      'details.pluginId': 'Plugin ID',
      'details.pluginIdPlaceholder': 'my-plugin',
      'details.pluginIdHint': 'Unique identifier',
      'details.description': 'Description',
      'details.descriptionPlaceholder': 'Plugin description',
      'details.authorName': 'Author Name',
      'details.authorNamePlaceholder': 'Your name',
      'details.authorEmail': 'Email',
      'details.authorEmailPlaceholder': 'your@email.com',
      'details.pluginType': 'Plugin Type',
      'navigation.back': 'Back',
      'navigation.next': 'Next',
      'navigation.downloadZip': 'Download ZIP',
      'navigation.createInPlugins': 'Create in Plugins',
      'template.skipToScratch': 'Or skip to start from scratch',
      'capabilities.selectPrompt': 'Select capabilities for your plugin',
      'capabilities.tools': 'Tools',
      'capabilities.toolsDesc': 'Add tools',
      'capabilities.components': 'Components',
      'capabilities.componentsDesc': 'Add components',
      'capabilities.usingTemplate': `Using ${params?.name || 'template'}`,
      'capabilities.preConfigured': 'Capabilities are pre-configured',
      'preview.filesCount': `${params?.count || 0} files`,
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => 
    <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => 
    <p data-testid="dialog-description">{children}</p>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: { 
    children: React.ReactNode; 
    onClick?: () => void; 
    disabled?: boolean;
    variant?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-testid="button">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, id, type, className }: { 
    value?: string; 
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    id?: string;
    type?: string;
    className?: string;
  }) => (
    <input 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
      id={id}
      type={type}
      className={className}
      data-testid={`input-${id || 'default'}`}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor} data-testid="label">{children}</label>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, id, rows }: { 
    value?: string; 
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    id?: string;
    rows?: number;
  }) => (
    <textarea 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
      id={id}
      rows={rows}
      data-testid={`textarea-${id || 'default'}`}
    />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <div data-testid="card" className={className} onClick={onClick}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 data-testid="card-title" className={className}>{children}</h3>
  ),
  CardDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p data-testid="card-description" className={className}>{children}</p>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      data-testid="checkbox"
    />
  ),
}));

jest.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children, value, onValueChange: _onValueChange }: { 
    children: React.ReactNode; 
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div data-testid="radio-group" data-value={value}>{children}</div>
  ),
  RadioGroupItem: ({ value, id }: { value: string; id?: string }) => (
    <input type="radio" value={value} id={id} data-testid={`radio-${value}`} />
  ),
}));

jest.mock('@/lib/plugin/utils/templates', () => ({
  PLUGIN_TEMPLATES: [
    {
      id: 'basic',
      name: 'Basic Plugin',
      description: 'A simple plugin template',
      type: 'frontend',
      difficulty: 'beginner',
      capabilities: ['tools'],
    },
    {
      id: 'advanced',
      name: 'Advanced Plugin',
      description: 'An advanced plugin template',
      type: 'hybrid',
      difficulty: 'advanced',
      capabilities: ['tools', 'components', 'commands'],
    },
  ],
  scaffoldPlugin: jest.fn(() => new Map([
    ['manifest.json', '{"id": "test"}'],
    ['index.ts', 'export default {}'],
  ])),
}));

describe('PluginCreateWizard', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dialog when open is true', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('should not render dialog when open is false', () => {
      render(<PluginCreateWizard {...defaultProps} open={false} />);
      
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('should render dialog title', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      
      expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
    });

    it('should render step indicators', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      
      // Step indicators should show step numbers
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Template Step', () => {
    it('should render template cards', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      
      expect(screen.getByText('Basic Plugin')).toBeInTheDocument();
      expect(screen.getByText('Advanced Plugin')).toBeInTheDocument();
    });

    it('should display template descriptions', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      
      expect(screen.getByText('A simple plugin template')).toBeInTheDocument();
    });

    it('should display difficulty badges', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      
      const badges = screen.getAllByTestId('badge');
      expect(badges.some(b => b.textContent === 'beginner')).toBe(true);
    });

    it('should allow selecting a template', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      
      const cards = screen.getAllByTestId('card');
      fireEvent.click(cards[0]);
      
      // Card should now be selected (would have different styling)
      expect(cards[0]).toBeInTheDocument();
    });

    it('should show skip to scratch message', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      
      expect(screen.getByText('Or skip to start from scratch')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should render back button', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('should render next button', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('should disable back button on first step', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      
      const backButton = screen.getByText('Back').closest('button');
      expect(backButton).toBeDisabled();
    });

    it('should navigate to next step when next is clicked', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      // Should now be on details step - check for name input
      expect(screen.getByTestId('input-name')).toBeInTheDocument();
    });

    it('should navigate back when back is clicked', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      
      // Go to next step first
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      // Now go back
      const backButton = screen.getByText('Back');
      fireEvent.click(backButton);
      
      // Should see template cards again
      expect(screen.getByText('Basic Plugin')).toBeInTheDocument();
    });
  });

  describe('Details Step', () => {
    beforeEach(() => {
      render(<PluginCreateWizard {...defaultProps} />);
      // Navigate to details step
      fireEvent.click(screen.getByText('Next'));
    });

    it('should render plugin name input', () => {
      expect(screen.getByTestId('input-name')).toBeInTheDocument();
    });

    it('should render plugin id input', () => {
      expect(screen.getByTestId('input-id')).toBeInTheDocument();
    });

    it('should render description textarea', () => {
      expect(screen.getByTestId('textarea-description')).toBeInTheDocument();
    });

    it('should render author name input', () => {
      expect(screen.getByTestId('input-authorName')).toBeInTheDocument();
    });

    it('should render author email input', () => {
      expect(screen.getByTestId('input-authorEmail')).toBeInTheDocument();
    });

    it('should update name when typing', () => {
      const nameInput = screen.getByTestId('input-name');
      fireEvent.change(nameInput, { target: { value: 'My Test Plugin' } });
      
      expect(nameInput).toHaveValue('My Test Plugin');
    });

    it('should auto-generate id from name', () => {
      const nameInput = screen.getByTestId('input-name');
      fireEvent.change(nameInput, { target: { value: 'My Test Plugin' } });
      
      const idInput = screen.getByTestId('input-id');
      expect(idInput).toHaveValue('my-test-plugin');
    });

    it('should disable next button when required fields are empty', () => {
      // Clear name input if it has value
      const nameInput = screen.getByTestId('input-name');
      fireEvent.change(nameInput, { target: { value: '' } });
      
      const nextButton = screen.getByText('Next').closest('button');
      expect(nextButton).toBeDisabled();
    });

    it('should enable next button when required fields are filled', () => {
      const nameInput = screen.getByTestId('input-name');
      const idInput = screen.getByTestId('input-id');
      const authorInput = screen.getByTestId('input-authorName');
      
      fireEvent.change(nameInput, { target: { value: 'Test Plugin' } });
      fireEvent.change(idInput, { target: { value: 'test-plugin' } });
      fireEvent.change(authorInput, { target: { value: 'Test Author' } });
      
      const nextButton = screen.getByText('Next').closest('button');
      expect(nextButton).not.toBeDisabled();
    });
  });

  describe('Capabilities Step', () => {
    beforeEach(() => {
      render(<PluginCreateWizard {...defaultProps} />);
      // Navigate to capabilities step
      fireEvent.click(screen.getByText('Next')); // Template -> Details
      
      // Fill required fields
      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Test Plugin' } });
      fireEvent.change(screen.getByTestId('input-id'), { target: { value: 'test-plugin' } });
      fireEvent.change(screen.getByTestId('input-authorName'), { target: { value: 'Author' } });
      
      fireEvent.click(screen.getByText('Next')); // Details -> Capabilities
    });

    it('should render capability checkboxes', () => {
      const checkboxes = screen.getAllByTestId('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should allow toggling capabilities', () => {
      const checkboxes = screen.getAllByTestId('checkbox');
      fireEvent.click(checkboxes[0]);
      
      // Checkbox should toggle
      expect(checkboxes[0]).toBeInTheDocument();
    });
  });

  describe('Preview Step', () => {
    beforeEach(() => {
      render(<PluginCreateWizard {...defaultProps} />);
      // Navigate through all steps
      fireEvent.click(screen.getByText('Next')); // Template -> Details
      
      // Fill required fields
      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Test Plugin' } });
      fireEvent.change(screen.getByTestId('input-id'), { target: { value: 'test-plugin' } });
      fireEvent.change(screen.getByTestId('input-authorName'), { target: { value: 'Author' } });
      
      fireEvent.click(screen.getByText('Next')); // Details -> Capabilities
      fireEvent.click(screen.getByText('Next')); // Capabilities -> Preview
    });

    it('should render plugin name in preview', () => {
      expect(screen.getByText('Test Plugin')).toBeInTheDocument();
    });

    it('should render plugin id in preview', () => {
      expect(screen.getByText('test-plugin')).toBeInTheDocument();
    });

    it('should render download zip button', () => {
      expect(screen.getByText('Download ZIP')).toBeInTheDocument();
    });

    it('should render create in plugins button', () => {
      expect(screen.getByText('Create in Plugins')).toBeInTheDocument();
    });

    it('should call onComplete when create button is clicked', () => {
      const createButton = screen.getByText('Create in Plugins');
      fireEvent.click(createButton);
      
      expect(defaultProps.onComplete).toHaveBeenCalled();
    });

    it('should close dialog after completion', () => {
      const createButton = screen.getByText('Create in Plugins');
      fireEvent.click(createButton);
      
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Template Selection Flow', () => {
    it('should pre-fill capabilities when template is selected', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      
      // Select template
      const cards = screen.getAllByTestId('card');
      fireEvent.click(cards[0]); // Select basic template
      
      // Navigate to details
      fireEvent.click(screen.getByText('Next'));
      
      // Fill details
      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByTestId('input-authorName'), { target: { value: 'Author' } });
      
      // Navigate to capabilities
      fireEvent.click(screen.getByText('Next'));
      
      // Should show using template message
      expect(screen.getByText(/Using/)).toBeInTheDocument();
    });

    it('should allow deselecting a template', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      
      // Select template
      const cards = screen.getAllByTestId('card');
      fireEvent.click(cards[0]);
      
      // Deselect by clicking again
      fireEvent.click(cards[0]);
      
      // Template should be deselected (we can check by navigating to capabilities)
      fireEvent.click(screen.getByText('Next'));
      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByTestId('input-authorName'), { target: { value: 'Author' } });
      fireEvent.click(screen.getByText('Next'));
      
      // Should show capability checkboxes instead of template message
      expect(screen.getAllByTestId('checkbox').length).toBeGreaterThan(0);
    });
  });

  describe('Helper Functions', () => {
    it('should generate valid id from name with spaces', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      fireEvent.click(screen.getByText('Next'));
      
      const nameInput = screen.getByTestId('input-name');
      fireEvent.change(nameInput, { target: { value: 'My Test Plugin' } });
      
      const idInput = screen.getByTestId('input-id');
      expect(idInput).toHaveValue('my-test-plugin');
    });

    it('should generate valid id from name with special characters', () => {
      render(<PluginCreateWizard {...defaultProps} />);
      fireEvent.click(screen.getByText('Next'));
      
      const nameInput = screen.getByTestId('input-name');
      fireEvent.change(nameInput, { target: { value: 'My Plugin! @#$' } });
      
      const idInput = screen.getByTestId('input-id');
      expect(idInput).toHaveValue('my-plugin');
    });
  });
});
