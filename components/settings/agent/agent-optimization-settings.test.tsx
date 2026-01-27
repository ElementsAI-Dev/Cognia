'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { AgentOptimizationSettings } from './agent-optimization-settings';

// Mock settings store
const mockSetAgentOptimizationSettings = jest.fn();
const mockSetSmartRoutingEnabled = jest.fn();
const mockSetTokenBudgetEnabled = jest.fn();
const mockSetContextIsolationEnabled = jest.fn();
const mockSetToolWarningsEnabled = jest.fn();
const mockSetSkillMcpAutoLoadEnabled = jest.fn();
const mockResetAgentOptimizationSettings = jest.fn();

const defaultAgentOptSettings = {
  enableSmartRouting: false,
  singleAgentThreshold: 0.6,
  enableTokenBudget: false,
  maxTokenBudget: 50000,
  estimatedTokensPerSubAgent: 2000,
  enableTokenWarnings: true,
  enableContextIsolation: false,
  summarizeSubAgentResults: false,
  maxResultTokens: 500,
  enableToolWarnings: true,
  toolWarningThreshold: 20,
  enableSkillMcpAutoLoad: true,
};

const createMockStore = (overrides = {}) => ({
  agentOptimizationSettings: { ...defaultAgentOptSettings, ...overrides },
  setAgentOptimizationSettings: mockSetAgentOptimizationSettings,
  setSmartRoutingEnabled: mockSetSmartRoutingEnabled,
  setTokenBudgetEnabled: mockSetTokenBudgetEnabled,
  setContextIsolationEnabled: mockSetContextIsolationEnabled,
  setToolWarningsEnabled: mockSetToolWarningsEnabled,
  setSkillMcpAutoLoadEnabled: mockSetSkillMcpAutoLoadEnabled,
  resetAgentOptimizationSettings: mockResetAgentOptimizationSettings,
});

jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = createMockStore();
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

const messages = {
  agentOptimization: {
    title: 'Agent Optimization',
    description: 'Configure Claude best practices for agent systems.',
    resetToDefaults: 'Reset to Defaults',
    smartRouting: {
      title: 'Smart Routing',
      subtitle: 'Automatically decide single vs multi-agent execution',
      enable: 'Enable Smart Routing',
      enableDesc: 'Let the system analyze task complexity',
      threshold: 'Single Agent Threshold',
      thresholdDesc: 'Higher values prefer single agent execution',
      preferMulti: 'Prefer Multi-Agent',
      preferSingle: 'Prefer Single Agent',
    },
    tokenBudget: {
      title: 'Token Budget',
      subtitle: 'Control costs in multi-agent scenarios',
      enable: 'Enable Token Budget',
      enableDesc: 'Limit total tokens used by sub-agents',
      maxBudget: 'Maximum Token Budget',
      perSubAgent: 'Estimated Tokens Per Sub-Agent',
      maxSubAgents: 'Maximum ~{count} sub-agents',
      showWarnings: 'Show Budget Warnings',
    },
    contextIsolation: {
      title: 'Context Isolation',
      subtitle: 'Prevent context pollution between agents',
      enable: 'Enable Context Isolation',
      enableDesc: 'Isolate sub-agent contexts',
      summarize: 'Summarize Sub-Agent Results',
      summarizeDesc: 'Compress sub-agent outputs',
      maxTokens: 'Maximum Summary Tokens',
    },
    skillsMcp: {
      title: 'Skills-MCP Auto-Loading',
      subtitle: 'Automatically load relevant skills for MCP tools',
      enable: 'Enable Auto-Loading',
      enableDesc: 'Automatically inject skill knowledge',
      info: 'Skills with associated MCP servers will be auto-loaded.',
    },
    toolWarnings: {
      title: 'Tool Warnings',
      subtitle: 'Alert when tool count is too high',
      enable: 'Enable Tool Warnings',
      enableDesc: 'Show warnings when active tools exceed the limit',
      threshold: 'Warning Threshold',
      tools: 'tools',
    },
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('AgentOptimizationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Header', () => {
    it('renders title', () => {
      renderWithProviders(<AgentOptimizationSettings />);
      expect(screen.getByText('Agent Optimization')).toBeInTheDocument();
    });

    it('renders Claude Best Practices badge', () => {
      renderWithProviders(<AgentOptimizationSettings />);
      expect(screen.getByText('Claude Best Practices')).toBeInTheDocument();
    });
  });

  describe('Accordion Sections', () => {
    it('renders smart routing section', () => {
      renderWithProviders(<AgentOptimizationSettings />);
      expect(screen.getByText('Smart Routing')).toBeInTheDocument();
      expect(screen.getByText('Automatically decide single vs multi-agent execution')).toBeInTheDocument();
    });

    it('renders token budget section', () => {
      renderWithProviders(<AgentOptimizationSettings />);
      expect(screen.getByText('Token Budget')).toBeInTheDocument();
      expect(screen.getByText('Control costs in multi-agent scenarios')).toBeInTheDocument();
    });

    it('renders context isolation section', () => {
      renderWithProviders(<AgentOptimizationSettings />);
      expect(screen.getByText('Context Isolation')).toBeInTheDocument();
      expect(screen.getByText('Prevent context pollution between agents')).toBeInTheDocument();
    });

    it('renders skills-mcp section', () => {
      renderWithProviders(<AgentOptimizationSettings />);
      expect(screen.getByText('Skills-MCP Auto-Loading')).toBeInTheDocument();
      expect(screen.getByText('Automatically load relevant skills for MCP tools')).toBeInTheDocument();
    });

    it('renders tool warnings section', () => {
      renderWithProviders(<AgentOptimizationSettings />);
      expect(screen.getByText('Tool Warnings')).toBeInTheDocument();
      expect(screen.getByText('Alert when tool count is too high')).toBeInTheDocument();
    });
  });

  describe('Reset Button', () => {
    it('renders reset button', () => {
      renderWithProviders(<AgentOptimizationSettings />);
      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    });

    it('calls resetAgentOptimizationSettings when clicked', () => {
      renderWithProviders(<AgentOptimizationSettings />);
      const resetButton = screen.getByText('Reset to Defaults');
      fireEvent.click(resetButton);
      expect(mockResetAgentOptimizationSettings).toHaveBeenCalled();
    });
  });

  describe('Accordion Expansion', () => {
    it('expands smart routing accordion and shows enable switch', () => {
      renderWithProviders(<AgentOptimizationSettings />);
      // Smart routing is open by default, check for the enable switch
      expect(screen.getByText('Enable Smart Routing')).toBeInTheDocument();
    });

    it('expands skills-mcp accordion by default and shows content', () => {
      renderWithProviders(<AgentOptimizationSettings />);
      // Skills-MCP is open by default
      expect(screen.getByText('Enable Auto-Loading')).toBeInTheDocument();
    });

    it('expands token budget accordion on click', () => {
      renderWithProviders(<AgentOptimizationSettings />);
      const trigger = screen.getByText('Token Budget');
      fireEvent.click(trigger);
      expect(screen.getByText('Enable Token Budget')).toBeInTheDocument();
    });

    it('expands context isolation accordion on click', () => {
      renderWithProviders(<AgentOptimizationSettings />);
      const trigger = screen.getByText('Context Isolation');
      fireEvent.click(trigger);
      expect(screen.getByText('Enable Context Isolation')).toBeInTheDocument();
    });

    it('expands tool warnings accordion on click', () => {
      renderWithProviders(<AgentOptimizationSettings />);
      const trigger = screen.getByText('Tool Warnings');
      fireEvent.click(trigger);
      expect(screen.getByText('Enable Tool Warnings')).toBeInTheDocument();
    });
  });
});

describe('AgentOptimizationSettings with enabled features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { useSettingsStore } = jest.requireMock('@/stores');
    useSettingsStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const state = createMockStore({
        enableSmartRouting: true,
        enableTokenBudget: true,
        enableContextIsolation: true,
        summarizeSubAgentResults: true,
        enableToolWarnings: true,
      });
      return typeof selector === 'function' ? selector(state) : state;
    });
  });

  it('shows threshold slider when smart routing is enabled', () => {
    renderWithProviders(<AgentOptimizationSettings />);
    expect(screen.getByText('Single Agent Threshold')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('shows token budget options when expanded', () => {
    renderWithProviders(<AgentOptimizationSettings />);
    const trigger = screen.getByText('Token Budget');
    fireEvent.click(trigger);
    expect(screen.getByText('Maximum Token Budget')).toBeInTheDocument();
    expect(screen.getByText('Estimated Tokens Per Sub-Agent')).toBeInTheDocument();
    expect(screen.getByText('Show Budget Warnings')).toBeInTheDocument();
  });

  it('shows context isolation options when expanded', () => {
    renderWithProviders(<AgentOptimizationSettings />);
    const trigger = screen.getByText('Context Isolation');
    fireEvent.click(trigger);
    expect(screen.getByText('Summarize Sub-Agent Results')).toBeInTheDocument();
    expect(screen.getByText('Maximum Summary Tokens')).toBeInTheDocument();
  });

  it('shows tool warning threshold when expanded', () => {
    renderWithProviders(<AgentOptimizationSettings />);
    const trigger = screen.getByText('Tool Warnings');
    fireEvent.click(trigger);
    expect(screen.getByText('Warning Threshold')).toBeInTheDocument();
  });
});
