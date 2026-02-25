/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LearningSettings } from './learning-settings';
import { useLearningStore } from '@/stores/learning';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, params?: Record<string, unknown>) => {
      if (params) {
        let result = key;
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{${k}}`, String(v));
        }
        return result;
      }
      return key;
    };
    return t;
  },
}));

// Mock sonner toast
jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock prompt-templates
jest.mock('@/lib/learning/prompt-templates', () => ({
  getAvailableTemplates: jest.fn(() => [
    {
      id: 'builtin-socratic',
      name: 'Socratic Tutor',
      description: 'Pure questioning',
      approach: 'socratic',
      basePrompt: 'You are a Socratic mentor...',
      language: 'en',
      isBuiltIn: true,
    },
    {
      id: 'builtin-cognitive',
      name: 'Cognitive Tutor',
      description: 'Metacognitive support',
      approach: 'cognitive',
      basePrompt: 'You are a Cognitive Tutor...',
      language: 'en',
      isBuiltIn: true,
    },
  ]),
  resolveBasePrompt: jest.fn(() => 'Resolved base prompt preview'),
}));

describe('LearningSettings', () => {
  beforeEach(() => {
    const { getState } = useLearningStore;
    act(() => {
      getState().reset();
    });
  });

  it('should render the settings component with title', () => {
    render(<LearningSettings />);
    expect(screen.getByText('settings.title')).toBeInTheDocument();
  });

  it('should render two tabs: templates and behavior', () => {
    render(<LearningSettings />);
    expect(screen.getByText('settings.tabs.templates')).toBeInTheDocument();
    expect(screen.getByText('settings.tabs.behavior')).toBeInTheDocument();
  });

  it('should render template cards from available templates', () => {
    render(<LearningSettings />);
    expect(screen.getByText('Socratic Tutor')).toBeInTheDocument();
    expect(screen.getByText('Cognitive Tutor')).toBeInTheDocument();
  });

  it('should highlight the active template', () => {
    render(<LearningSettings />);
    const socraticCard = screen.getByText('Socratic Tutor').closest('[class*="cursor-pointer"]');
    expect(socraticCard?.className).toContain('border-primary');
  });

  it('should show prompt preview when preview button is clicked', () => {
    render(<LearningSettings />);
    const previewButton = screen.getByText('settings.preview');
    fireEvent.click(previewButton);
    expect(screen.getByText('settings.promptPreview')).toBeInTheDocument();
    expect(screen.getByText('Resolved base prompt preview')).toBeInTheDocument();
  });

  it('should open new template dialog', () => {
    render(<LearningSettings />);
    const newButton = screen.getByText('settings.newTemplate');
    fireEvent.click(newButton);
    expect(screen.getByText('settings.newTemplateTitle')).toBeInTheDocument();
  });

  it('should render action buttons in templates tab', () => {
    render(<LearningSettings />);
    expect(screen.getByText('settings.newTemplate')).toBeInTheDocument();
    expect(screen.getByText('settings.preview')).toBeInTheDocument();
    expect(screen.getByText('settings.export')).toBeInTheDocument();
    expect(screen.getByText('settings.import')).toBeInTheDocument();
  });

  it('should render built-in badge on built-in templates', () => {
    render(<LearningSettings />);
    const badges = screen.getAllByText('settings.builtIn');
    expect(badges.length).toBe(2);
  });

  it('should toggle preview panel on and off', () => {
    render(<LearningSettings />);
    const previewButton = screen.getByText('settings.preview');

    fireEvent.click(previewButton);
    expect(screen.getByText('Resolved base prompt preview')).toBeInTheDocument();

    fireEvent.click(previewButton);
    expect(screen.queryByText('Resolved base prompt preview')).not.toBeInTheDocument();
  });

  it('should create a new custom template via the dialog', () => {
    render(<LearningSettings />);

    fireEvent.click(screen.getByText('settings.newTemplate'));
    const input = screen.getByPlaceholderText('settings.templateNamePlaceholder');
    fireEvent.change(input, { target: { value: 'My Physics Tutor' } });
    fireEvent.click(screen.getByText('settings.create'));

    const store = useLearningStore.getState();
    const templates = Object.values(store.promptTemplates);
    expect(templates.some((t) => t.name === 'My Physics Tutor')).toBe(true);
  });

  it('should export templates as a JSON blob download', () => {
    const mockCreateObjectURL = jest.fn(() => 'blob:test');
    const mockRevokeObjectURL = jest.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    render(<LearningSettings />);
    fireEvent.click(screen.getByText('settings.export'));

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });
});
