/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EditorSettings } from './editor-settings';
import {
  isTauriRuntime,
  lspGetServerStatus,
  lspInstallServer,
  lspListInstalledServers,
  lspRegistryGetRecommended,
  lspRegistrySearch,
  lspResolveLaunch,
  lspUninstallServer,
} from '@/lib/monaco/lsp/lsp-client';

const mockSetEditorSettings = jest.fn();
const mockResetEditorSettings = jest.fn();
const mockSettingsState = {
  editorSettings: {
    appearance: {
      fontSize: 14,
      tabSize: 2,
      wordWrap: false,
      minimap: true,
      cursorStyle: 'line',
      renderWhitespace: 'selection',
      formatOnPaste: false,
      formatOnType: false,
      bracketPairColorization: true,
      stickyScroll: true,
      autoSave: true,
    },
    lsp: {
      enabled: true,
      protocolV2Enabled: true,
      autoInstall: true,
      providerOrder: ['open_vsx', 'vs_marketplace'] as const,
      timeoutMs: 10_000,
    },
    palette: {
      showContextCommands: true,
      groupByContext: true,
    },
    diagnostics: {
      debounceMs: 300,
      minimumSeverity: 'hint',
    },
  },
  setEditorSettings: mockSetEditorSettings,
  resetEditorSettings: mockResetEditorSettings,
};

jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector: (state: typeof mockSettingsState) => unknown) =>
    selector(mockSettingsState)
  ),
}));

jest.mock('@/lib/monaco/lsp/lsp-client', () => ({
  isTauriRuntime: jest.fn(() => true),
  lspGetServerStatus: jest.fn(async () => ({
    languageId: 'typescript',
    normalizedLanguageId: 'typescript',
    supported: true,
    installed: true,
    ready: true,
    provider: 'open_vsx',
    extensionId: 'demo.lsp',
    command: 'typescript-language-server',
    args: ['--stdio'],
    needsApproval: false,
  })),
  lspResolveLaunch: jest.fn(async () => ({
    languageId: 'typescript',
    normalizedLanguageId: 'typescript',
    command: 'typescript-language-server',
    args: ['--stdio'],
    source: 'installed_extension_manifest',
    extensionId: 'demo.lsp',
    trusted: true,
    requiresApproval: false,
  })),
  lspListInstalledServers: jest.fn(async () => [
    {
      extensionId: 'demo.lsp',
      provider: 'open_vsx',
      version: '1.0.0',
      installPath: '/tmp/demo',
      manifestPath: '/tmp/demo/package.json',
      installedAt: '2026-03-05T00:00:00Z',
      languages: ['typescript'],
    },
  ]),
  lspRegistryGetRecommended: jest.fn(async () => ({
    languageId: 'typescript',
    normalizedLanguageId: 'typescript',
    entries: [
      {
        extensionId: 'demo.lsp',
        provider: 'open_vsx',
        publisher: 'demo',
        name: 'lsp',
        displayName: 'Demo LSP',
        version: '1.0.0',
        verified: true,
        tags: ['typescript'],
        languages: ['typescript'],
      },
    ],
    recommendations: [],
  })),
  lspRegistrySearch: jest.fn(async () => [
    {
      extensionId: 'search.lsp',
      provider: 'vs_marketplace',
      publisher: 'search',
      name: 'lsp',
      displayName: 'Search LSP',
      version: '2.0.0',
      verified: false,
      tags: ['typescript'],
      languages: ['typescript'],
    },
  ]),
  lspInstallServer: jest.fn(async () => ({
    extensionId: 'demo.lsp',
    provider: 'open_vsx',
    version: '1.0.0',
    installPath: '/tmp/demo',
    verified: true,
  })),
  lspUninstallServer: jest.fn(async () => true),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)}>
      switch
    </button>
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange }: { value?: number[]; onValueChange?: (v: number[]) => void }) => (
    <input
      aria-label="slider"
      type="range"
      value={value?.[0] ?? 0}
      onChange={(event) => onValueChange?.([Number(event.target.value)])}
    />
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} />,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/select', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const SelectContext = React.createContext({
    onValueChange: undefined as ((value: string) => void) | undefined,
  });

  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <SelectContext.Provider value={{ onValueChange }}>
        <div data-value={value}>{children}</div>
      </SelectContext.Provider>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectValue: () => <span>value</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({
      children,
      value,
    }: {
      children: React.ReactNode;
      value: string;
    }) => {
      const context = React.useContext(SelectContext);
      return <button onClick={() => context.onValueChange?.(value)}>{children}</button>;
    },
  };
});

describe('EditorSettings LSP management', () => {
  const mockIsTauriRuntime = isTauriRuntime as jest.MockedFunction<typeof isTauriRuntime>;
  const mockLspGetServerStatus = lspGetServerStatus as jest.MockedFunction<typeof lspGetServerStatus>;
  const mockLspResolveLaunch = lspResolveLaunch as jest.MockedFunction<typeof lspResolveLaunch>;
  const mockLspListInstalledServers =
    lspListInstalledServers as jest.MockedFunction<typeof lspListInstalledServers>;
  const mockLspRegistryGetRecommended =
    lspRegistryGetRecommended as jest.MockedFunction<typeof lspRegistryGetRecommended>;
  const mockLspRegistrySearch = lspRegistrySearch as jest.MockedFunction<typeof lspRegistrySearch>;
  const mockLspInstallServer = lspInstallServer as jest.MockedFunction<typeof lspInstallServer>;
  const mockLspUninstallServer = lspUninstallServer as jest.MockedFunction<typeof lspUninstallServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauriRuntime.mockReturnValue(true);
  });

  it('loads lifecycle data on mount in desktop runtime', async () => {
    render(<EditorSettings />);

    await waitFor(() => {
      expect(mockLspGetServerStatus).toHaveBeenCalledWith('typescript');
      expect(mockLspResolveLaunch).toHaveBeenCalledWith('typescript');
      expect(mockLspListInstalledServers).toHaveBeenCalled();
      expect(mockLspRegistryGetRecommended).toHaveBeenCalledWith('typescript', [
        'open_vsx',
        'vs_marketplace',
      ]);
    });
  });

  it('supports registry search and install/uninstall actions', async () => {
    render(<EditorSettings />);
    await waitFor(() => {
      expect(mockLspListInstalledServers).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByPlaceholderText('Search language servers'), {
      target: { value: 'eslint' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(mockLspRegistrySearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'eslint',
          languageId: 'typescript',
          providers: ['open_vsx', 'vs_marketplace'],
        })
      );
    });

    const recommendedEntry = await screen.findByText('Demo LSP');
    const recommendedRow = recommendedEntry.parentElement?.parentElement;
    const installButton = recommendedRow?.querySelector('button');
    expect(installButton).toBeTruthy();
    fireEvent.click(installButton as HTMLButtonElement);
    await waitFor(() => {
      expect(mockLspInstallServer).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /uninstall/i }));
    await waitFor(() => {
      expect(mockLspUninstallServer).toHaveBeenCalledWith('demo.lsp');
    });
  });
});
