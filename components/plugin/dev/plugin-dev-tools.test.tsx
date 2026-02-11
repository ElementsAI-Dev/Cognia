/**
 * Plugin Dev Tools Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PluginDevTools } from './plugin-dev-tools';
import { usePluginStore } from '@/stores/plugin';

jest.mock('@/stores/plugin', () => ({
  usePluginStore: jest.fn(),
}));

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('../monitoring/plugin-profiler', () => ({
  PluginProfiler: ({ pluginId }: { pluginId: string }) => (
    <div data-testid="plugin-profiler">Profiler for {pluginId}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button data-testid="button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder }: { value?: string; onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder?: string }) => (
    <textarea data-testid="textarea" value={value} onChange={onChange} placeholder={placeholder} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label data-testid="label">{children}</label>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange: _onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option data-testid="select-item" value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button data-testid="select-trigger">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span data-testid="select-value">{placeholder}</span>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3 data-testid="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue?: string }) => (
    <div data-testid="tabs" data-default={defaultValue}>{children}</div>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
}));

const mockPlugins = {
  'python-plugin': {
    manifest: {
      id: 'python-plugin',
      name: 'Python Plugin',
      type: 'python',
      version: '1.0.0',
    },
    status: 'enabled',
    tools: [{ name: 'search' }, { name: 'process' }],
    path: '/plugins/python-plugin',
    config: {},
  },
  'frontend-plugin': {
    manifest: {
      id: 'frontend-plugin',
      name: 'Frontend Plugin',
      type: 'frontend',
      version: '1.0.0',
    },
    status: 'enabled',
    tools: [],
    path: '/plugins/frontend-plugin',
    config: {},
  },
};

describe('PluginDevTools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePluginStore as unknown as jest.Mock).mockReturnValue({
      plugins: mockPlugins,
      getEnabledPlugins: () => Object.values(mockPlugins),
    });
  });

  it('should render dev tools header', () => {
    render(<PluginDevTools />);
    
    expect(screen.getByText('Plugin Dev Tools')).toBeInTheDocument();
  });

  it('should render plugin selector', () => {
    render(<PluginDevTools />);
    
    expect(screen.getByText('Select Plugin')).toBeInTheDocument();
  });

  it('should show message to select plugin when none selected', () => {
    render(<PluginDevTools />);
    
    expect(screen.getByText('Select an enabled plugin to inspect and debug')).toBeInTheDocument();
  });

  it('should only show Python and hybrid plugins in selector', () => {
    render(<PluginDevTools />);
    
    expect(screen.getByText('Python Plugin')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<PluginDevTools className="custom-class" />);
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-class');
  });
});
