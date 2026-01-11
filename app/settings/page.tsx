'use client';

/**
 * Settings Page - Dashboard layout with sidebar navigation
 * Responsive design: sidebar on desktop, tabs on mobile
 * Enhanced with smooth transitions and better visual hierarchy
 */

import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Cpu,
  Database,
  Puzzle,
  FileText,
  Brain,
  BarChart3,
  Palette,
  Search,
  ChevronRight,
  MessageSquare,
  Keyboard,
  Settings2,
  X,
  Wrench,
  Monitor,
  RotateCcw,
  Download,
  Upload,
  Mic,
  MousePointer2,
  Menu,
  Globe,
  GitBranch,
  Play,
  ShoppingBag,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from '@/components/ui/input-group';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ProviderSettings,
  AppearanceSettings,
  DataSettings,
  MemorySettings,
  CustomInstructionsSettings,
  UsageSettings,
  McpSettings,
  ResponseSettings,
  KeyboardSettings,
  ChatSettings,
  ToolSettings,
  DesktopSettings,
  EnvironmentSettings,
  ProxySettings,
  SpeechSettings,
  QuickSettingsCard,
  VectorSettings,
  NativeToolsSettings,
  SkillSettings,
  SearchSettings,
  SandboxSettings,
  GitSettings,
} from '@/components/settings';
import { SelectionToolbarSettings } from '@/components/selection-toolbar/settings-panel';
import { PromptTemplateManager, PromptMarketplaceBrowser } from '@/components/prompt';
import { PluginSettingsPage } from '@/components/plugin';

type SettingsSection = 
  | 'providers'
  | 'chat'
  | 'mcp'
  | 'tools'
  | 'skills'
  | 'plugins'
  | 'instructions'
  | 'memory'
  | 'usage'
  | 'appearance'
  | 'response'
  | 'keyboard'
  | 'speech'
  | 'search'
  | 'data'
  | 'vector'
  | 'desktop'
  | 'environment'
  | 'proxy'
  | 'selection'
  | 'native-tools'
  | 'prompt-templates'
  | 'prompt-marketplace'
  | 'sandbox'
  | 'git';

type SettingsGroup = 'ai' | 'interface' | 'data' | 'system';

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
  description: string;
  group: SettingsGroup;
}

const groupLabels: Record<SettingsGroup, string> = {
  ai: 'AI & Models',
  interface: 'Interface',
  data: 'Data & Privacy',
  system: 'System',
};

export default function SettingsPage() {
  const t = useTranslations('settings');
  const [activeSection, setActiveSection] = useState<SettingsSection>('providers');
  const [searchQuery, setSearchQuery] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  
  // Detect Tauri environment - using useMemo to avoid SSR hydration issues
  const isDesktop = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return '__TAURI_INTERNALS__' in window;
  }, []);

  const handleResetSettings = () => {
    resetSettings();
    setResetDialogOpen(false);
  };

  const handleExportSettings = () => {
    const settings = useSettingsStore.getState();
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      type: 'settings',
      data: settings,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognia-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.type === 'settings' && data.data) {
          const { setTheme, setLanguage, setDefaultProvider } = useSettingsStore.getState();
          if (data.data.theme) setTheme(data.data.theme);
          if (data.data.language) setLanguage(data.data.language);
          if (data.data.defaultProvider) setDefaultProvider(data.data.defaultProvider);
          alert('Settings imported successfully!');
        }
      } catch {
        alert('Failed to import settings. Invalid file format.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const navItems: NavItem[] = useMemo(() => [
    {
      id: 'providers',
      label: t('tabProviders'),
      icon: <Cpu className="h-4 w-4" />,
      description: 'Configure AI provider API keys',
      group: 'ai',
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <Settings2 className="h-4 w-4" />,
      description: 'Chat behavior settings',
      group: 'ai',
    },
    {
      id: 'mcp',
      label: 'MCP',
      icon: <Puzzle className="h-4 w-4" />,
      description: 'Model Context Protocol servers',
      group: 'ai',
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: <Wrench className="h-4 w-4" />,
      description: 'Built-in AI tools configuration',
      group: 'ai',
    },
    {
      id: 'skills',
      label: 'Skills',
      icon: <Puzzle className="h-4 w-4" />,
      description: 'Claude Skills for specialized workflows',
      group: 'ai',
    },
    {
      id: 'plugins',
      label: 'Plugins',
      icon: <Puzzle className="h-4 w-4" />,
      description: 'Plugin management and development',
      group: 'ai',
    },
    {
      id: 'instructions',
      label: 'Instructions',
      icon: <FileText className="h-4 w-4" />,
      description: 'Custom AI instructions',
      group: 'ai',
    },
    {
      id: 'memory',
      label: 'Memory',
      icon: <Brain className="h-4 w-4" />,
      description: 'AI memory and context',
      group: 'ai',
    },
    {
      id: 'search',
      label: t('tabSearch'),
      icon: <Search className="h-4 w-4" />,
      description: 'Web search configuration',
      group: 'ai',
    },
    {
      id: 'appearance',
      label: t('tabAppearance'),
      icon: <Palette className="h-4 w-4" />,
      description: 'Theme and display settings',
      group: 'interface',
    },
    {
      id: 'response',
      label: 'Response',
      icon: <MessageSquare className="h-4 w-4" />,
      description: 'AI response formatting',
      group: 'interface',
    },
    {
      id: 'prompt-templates',
      label: 'Prompt Templates',
      icon: <FileText className="h-4 w-4" />,
      description: 'Manage reusable prompt instructions',
      group: 'interface',
    },
    {
      id: 'prompt-marketplace',
      label: 'Prompt Marketplace',
      icon: <ShoppingBag className="h-4 w-4" />,
      description: 'Browse and install community prompts',
      group: 'interface',
    },
    {
      id: 'keyboard',
      label: 'Shortcuts',
      icon: <Keyboard className="h-4 w-4" />,
      description: 'Keyboard shortcuts',
      group: 'interface',
    },
    {
      id: 'speech',
      label: 'Speech',
      icon: <Mic className="h-4 w-4" />,
      description: 'Voice input and text-to-speech',
      group: 'interface',
    },
    {
      id: 'usage',
      label: 'Usage',
      icon: <BarChart3 className="h-4 w-4" />,
      description: 'Token usage and costs',
      group: 'data',
    },
    {
      id: 'data',
      label: t('tabData'),
      icon: <Database className="h-4 w-4" />,
      description: 'Data management and export',
      group: 'data',
    },
    {
      id: 'vector',
      label: 'Vector DB',
      icon: <Database className="h-4 w-4" />,
      description: 'Vector database provider and collections',
      group: 'data',
    },
    ...(isDesktop ? [
      {
        id: 'desktop' as const,
        label: 'Desktop',
        icon: <Monitor className="h-4 w-4" />,
        description: 'Desktop app settings',
        group: 'system' as const,
      },
      {
        id: 'environment' as const,
        label: 'Environment',
        icon: <Settings2 className="h-4 w-4" />,
        description: 'Install uv, nvm, Docker, Podman',
        group: 'system' as const,
      },
      {
        id: 'proxy' as const,
        label: 'Proxy',
        icon: <Globe className="h-4 w-4" />,
        description: 'Network proxy configuration',
        group: 'system' as const,
      },
      {
        id: 'selection' as const,
        label: 'Selection Toolbar',
        icon: <MousePointer2 className="h-4 w-4" />,
        description: 'AI-powered text selection actions',
        group: 'system' as const,
      },
      {
        id: 'native-tools' as const,
        label: 'Native Tools',
        icon: <Wrench className="h-4 w-4" />,
        description: 'Clipboard, screenshots, focus tracking',
        group: 'system' as const,
      },
      {
        id: 'sandbox' as const,
        label: 'Sandbox',
        icon: <Play className="h-4 w-4" />,
        description: 'Code execution sandbox configuration',
        group: 'system' as const,
      },
      {
        id: 'git' as const,
        label: 'Git',
        icon: <GitBranch className="h-4 w-4" />,
        description: 'Git version control settings',
        group: 'system' as const,
      },
    ] : []),
  ], [t, isDesktop]);

  const renderContent = () => {
    switch (activeSection) {
      case 'providers':
        return (
          <div className="space-y-4">
            <QuickSettingsCard />
            <ProviderSettings />
          </div>
        );
      case 'chat':
        return <ChatSettings />;
      case 'mcp':
        return <McpSettings />;
      case 'instructions':
        return <CustomInstructionsSettings />;
      case 'memory':
        return <MemorySettings />;
      case 'usage':
        return <UsageSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'response':
        return <ResponseSettings />;
      case 'keyboard':
        return <KeyboardSettings />;
      case 'speech':
        return <SpeechSettings />;
      case 'search':
        return <SearchSettings />;
      case 'data':
        return <DataSettings />;
      case 'vector':
        return <VectorSettings />;
      case 'tools':
        return <ToolSettings />;
      case 'skills':
        return <SkillSettings />;
      case 'plugins':
        return <PluginSettingsPage />;
      case 'desktop':
        return <DesktopSettings />;
      case 'environment':
        return <EnvironmentSettings />;
      case 'proxy':
        return <ProxySettings />;
      case 'selection':
        return <SelectionToolbarSettings />;
      case 'native-tools':
        return <NativeToolsSettings />;
      case 'prompt-templates':
        return <PromptTemplateManager />;
      case 'prompt-marketplace':
        return <PromptMarketplaceBrowser />;
      case 'sandbox':
        return <SandboxSettings />;
      case 'git':
        return <GitSettings />;
      default:
        return <ProviderSettings />;
    }
  };

  const activeItem = navItems.find((item) => item.id === activeSection);

  // Filter nav items based on search query
  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return navItems;
    const query = searchQuery.toLowerCase();
    return navItems.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    );
  }, [navItems, searchQuery]);

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: Record<SettingsGroup, NavItem[]> = { ai: [], interface: [], data: [], system: [] };
    for (const item of filteredNavItems) {
      groups[item.group].push(item);
    }
    return groups;
  }, [filteredNavItems]);

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-3">
        <Link href="/">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <h1 className="text-base font-semibold">{t('title')}</h1>
          {activeItem && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-base text-muted-foreground truncate">{activeItem.label}</span>
            </>
          )}
        </div>
        
        {/* Settings Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportSettings}>
              <Download className="mr-2 h-3.5 w-3.5" />
              Export Settings
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <label className="cursor-pointer flex items-center">
                <Upload className="mr-2 h-3.5 w-3.5" />
                Import Settings
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSettings}
                  className="hidden"
                />
              </label>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setResetDialogOpen(true)}
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Reset All Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Reset Dialog */}
        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset All Settings?</DialogTitle>
              <DialogDescription>
                This will reset all settings to their default values. Your API keys and chat history will be preserved.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleResetSettings}>
                Reset Settings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {/* Main content with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - hidden on mobile */}
        { }
        <aside className="hidden shrink-0 border-r bg-muted/10 md:block" style={{ width: 'var(--sidebar-width, 280px)' }}>
          <div className="p-2 border-b">
            <InputGroup className="h-8">
              <InputGroupAddon align="inline-start">
                <Search className="h-3.5 w-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm"
              />
              {searchQuery && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>
          <ScrollArea className="h-[calc(100%-44px)]">
            <TooltipProvider delayDuration={300}>
              <nav className="flex flex-col gap-0.5 p-2">
                {filteredNavItems.length > 0 ? (
                  (['ai', 'interface', 'data', 'system'] as SettingsGroup[]).map((group) => {
                    const items = groupedItems[group];
                    if (items.length === 0) return null;
                    return (
                      <div key={group} className="mb-1.5">
                        <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {groupLabels[group]}
                        </div>
                        <div className="flex flex-col gap-px">
                          {items.map((item) => (
                            <Tooltip key={item.id}>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => setActiveSection(item.id)}
                                  data-tour={`settings-${item.id}`}
                                  className={cn(
                                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors text-xs',
                                    activeSection === item.id
                                      ? 'bg-primary text-primary-foreground'
                                      : 'hover:bg-accent'
                                  )}
                                >
                                  <div className={cn(
                                    'shrink-0',
                                    activeSection === item.id ? 'text-primary-foreground' : 'text-muted-foreground'
                                  )}>
                                    {item.icon}
                                  </div>
                                  <span className="font-medium truncate">{item.label}</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="text-xs">
                                {item.description}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-3 text-xs text-muted-foreground">
                    No settings found
                  </div>
                )}
              </nav>
            </TooltipProvider>
          </ScrollArea>
        </aside>

        {/* Mobile navigation - Sheet panel */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Mobile header with menu button */}
          <div className="shrink-0 border-b md:hidden p-2 flex items-center gap-2">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <Menu className="h-4 w-4" />
                  <span className="text-xs">{activeItem?.label || 'Menu'}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="p-3 border-b">
                  <SheetTitle className="text-sm">{t('title')}</SheetTitle>
                </SheetHeader>
                <div className="p-2 border-b">
                  <InputGroup className="h-8">
                    <InputGroupAddon align="inline-start">
                      <Search className="h-3.5 w-3.5" />
                    </InputGroupAddon>
                    <InputGroupInput
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-sm"
                    />
                    {searchQuery && (
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          size="icon-xs"
                          onClick={() => setSearchQuery('')}
                          aria-label="Clear search"
                        >
                          <X className="h-3.5 w-3.5" />
                        </InputGroupButton>
                      </InputGroupAddon>
                    )}
                  </InputGroup>
                </div>
                <ScrollArea className="h-[calc(100vh-120px)]">
                  <nav className="flex flex-col gap-0.5 p-2">
                    {filteredNavItems.length > 0 ? (
                      (['ai', 'interface', 'data', 'system'] as SettingsGroup[]).map((group) => {
                        const items = groupedItems[group];
                        if (items.length === 0) return null;
                        return (
                          <div key={group} className="mb-2">
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              {groupLabels[group]}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              {items.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    setActiveSection(item.id);
                                    setMobileNavOpen(false);
                                  }}
                                  className={cn(
                                    'flex items-center gap-2 rounded-md px-2 py-2 text-left transition-colors text-sm',
                                    activeSection === item.id
                                      ? 'bg-primary text-primary-foreground'
                                      : 'hover:bg-accent'
                                  )}
                                >
                                  <div className={cn(
                                    'shrink-0',
                                    activeSection === item.id ? 'text-primary-foreground' : 'text-muted-foreground'
                                  )}>
                                    {item.icon}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-medium truncate">{item.label}</span>
                                    <span className={cn(
                                      'text-xs truncate',
                                      activeSection === item.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                    )}>
                                      {item.description}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No settings found
                      </div>
                    )}
                  </nav>
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <span className="text-xs text-muted-foreground truncate flex-1">
              {activeItem?.description}
            </span>
          </div>

          {/* Content area - Full width with grid support */}
          <ScrollArea className="flex-1 overflow-hidden">
            <div className="p-4 lg:p-6" data-settings-panel>
              <div className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                {renderContent()}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
