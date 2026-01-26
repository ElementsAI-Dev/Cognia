'use client';

/**
 * Settings Page - Dashboard layout with sidebar navigation
 * Refactored to use shadcn/ui Sidebar components for consistency
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
  Wrench,
  Monitor,
  RotateCcw,
  Download,
  Upload,
  Mic,
  MousePointer2,
  Globe,
  GitBranch,
  Play,
  ShoppingBag,
  Shield,
  Activity,
  X,
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
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
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
  SafetySettings,
  TraySettings,
} from '@/components/settings';
import { ObservabilitySettings } from '@/components/observability';
import { SelectionToolbarSettings } from '@/components/selection-toolbar/settings-panel';
import { PromptTemplateManager, PromptMarketplaceBrowser } from '@/components/prompt';
import { PluginSettingsPage } from '@/components/plugin';

import { SettingsSection, SettingsGroup } from '@/types/settings';
import { SETTINGS_SEARCH_INDEX } from '@/lib/settings';

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
  description: string;
  group: SettingsGroup;
}

const getGroupLabels = (t: ReturnType<typeof useTranslations<'settings'>>) => ({
  ai: t('groupAi'),
  interface: t('groupInterface'),
  data: t('groupData'),
  system: t('groupSystem'),
});

function SettingsSidebar({
  activeSection,
  setActiveSection,
  searchQuery,
  setSearchQuery,
  navItems,
  t,
}: {
  activeSection: SettingsSection;
  setActiveSection: (section: SettingsSection) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  navItems: NavItem[];
  t: ReturnType<typeof useTranslations<'settings'>>;
}) {
  const { setOpenMobile, state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const groupLabels = useMemo(() => getGroupLabels(t), [t]);

  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return navItems;
    const query = searchQuery.toLowerCase();

    // Find matching sections from the index
    const matchedSections = new Set<SettingsSection>();

    // 1. Check direct matches in nav items
    navItems.forEach((item) => {
      if (
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      ) {
        matchedSections.add(item.id);
      }
    });

    // 2. Check matches in search index
    SETTINGS_SEARCH_INDEX.forEach((item) => {
      if (
        item.keywords.some((k) => k.toLowerCase().includes(query)) ||
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      ) {
        matchedSections.add(item.sectionId);
      }
    });

    return navItems.filter((item) => matchedSections.has(item.id));
  }, [navItems, searchQuery]);

  const groupedItems = useMemo(() => {
    const groups: Record<SettingsGroup, NavItem[]> = {
      ai: [],
      interface: [],
      data: [],
      system: [],
    };
    for (const item of filteredNavItems) {
      groups[item.group].push(item);
    }
    return groups;
  }, [filteredNavItems]);

  return (
    <Sidebar collapsible="icon" className="border-r h-full">
      <SidebarHeader className="h-16 border-b border-sidebar-border/50 p-4 flex items-center justify-between group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:border-none">
        {/* Placeholder for potential header content or just padding adjustment */}
        {!isCollapsed && (
          <InputGroup className="h-9">
            <InputGroupAddon align="inline-start">
              <Search className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-sm"
            />
            {searchQuery && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton onClick={() => setSearchQuery('')} size="icon-xs">
                  <X className="h-4 w-4" />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        )}
        {/* When collapsed, we might want to show nothing, or a specific icon if intended. 
            User said "Only keep one icon". If search is hidden, the menu items (icons) remain. 
            This matches homepage. */}
      </SidebarHeader>
      <SidebarContent className="p-2">
        {filteredNavItems.length > 0 ? (
          (['ai', 'interface', 'data', 'system'] as SettingsGroup[]).map((group) => {
            const items = groupedItems[group];
            if (items.length === 0) return null;
            return (
              <SidebarGroup key={group} className="py-1">
                {(!isCollapsed || items.length > 0) && (
                  <SidebarGroupLabel className="px-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                    {groupLabels[group]}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={activeSection === item.id}
                          onClick={() => {
                            setActiveSection(item.id);
                            setOpenMobile(false);
                          }}
                          tooltip={item.description}
                          className="px-2.5 py-2 h-auto"
                        >
                          {item.icon}
                          <div className="flex flex-col gap-0.5 text-left leading-none flex-1 min-w-0">
                            <span className="font-medium truncate">{item.label}</span>
                            {/* Optional: Show description in list? might be too cluttered. Tooltip takes care of it. */}
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t('noSettingsFound')}
          </div>
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const [activeSection, setActiveSection] = useState<SettingsSection>('providers');
  const [searchQuery, setSearchQuery] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

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

  const navItems: NavItem[] = useMemo(
    () => [
      {
        id: 'providers',
        label: t('tabProviders'),
        icon: <Cpu className="h-4 w-4" />,
        description: t('descProviders'),
        group: 'ai',
      },
      {
        id: 'chat',
        label: t('tabChat'),
        icon: <Settings2 className="h-4 w-4" />,
        description: t('descChat'),
        group: 'ai',
      },
      {
        id: 'mcp',
        label: t('tabMcp'),
        icon: <Puzzle className="h-4 w-4" />,
        description: t('descMcp'),
        group: 'ai',
      },
      {
        id: 'tools',
        label: t('tabTools'),
        icon: <Wrench className="h-4 w-4" />,
        description: t('descTools'),
        group: 'ai',
      },
      {
        id: 'skills',
        label: t('tabSkills'),
        icon: <Puzzle className="h-4 w-4" />,
        description: t('descSkills'),
        group: 'ai',
      },
      {
        id: 'plugins',
        label: t('tabPlugins'),
        icon: <Puzzle className="h-4 w-4" />,
        description: t('descPlugins'),
        group: 'ai',
      },
      {
        id: 'instructions',
        label: t('tabInstructions'),
        icon: <FileText className="h-4 w-4" />,
        description: t('descInstructions'),
        group: 'ai',
      },
      {
        id: 'memory',
        label: t('tabMemory'),
        icon: <Brain className="h-4 w-4" />,
        description: t('descMemory'),
        group: 'ai',
      },
      {
        id: 'search',
        label: t('tabSearch'),
        icon: <Search className="h-4 w-4" />,
        description: t('descSearch'),
        group: 'ai',
      },
      {
        id: 'safety',
        label: 'Safety Mode',
        icon: <Shield className="h-4 w-4" />,
        description: 'Configure security checks and content filtering',
        group: 'ai',
      },
      {
        id: 'observability',
        label: t('tabObservability') || 'Observability',
        icon: <Activity className="h-4 w-4" />,
        description: t('descObservability') || 'AI tracing, metrics, and cost analysis',
        group: 'ai',
      },
      {
        id: 'appearance',
        label: t('tabAppearance'),
        icon: <Palette className="h-4 w-4" />,
        description: t('descAppearance'),
        group: 'interface',
      },
      {
        id: 'response',
        label: t('tabResponse'),
        icon: <MessageSquare className="h-4 w-4" />,
        description: t('descResponse'),
        group: 'interface',
      },
      {
        id: 'prompt-templates',
        label: t('tabPromptTemplates'),
        icon: <FileText className="h-4 w-4" />,
        description: t('descPromptTemplates'),
        group: 'interface',
      },
      {
        id: 'prompt-marketplace',
        label: t('tabPromptMarketplace'),
        icon: <ShoppingBag className="h-4 w-4" />,
        description: t('descPromptMarketplace'),
        group: 'interface',
      },
      {
        id: 'keyboard',
        label: t('tabKeyboard'),
        icon: <Keyboard className="h-4 w-4" />,
        description: t('descKeyboard'),
        group: 'interface',
      },
      {
        id: 'speech',
        label: t('tabSpeech'),
        icon: <Mic className="h-4 w-4" />,
        description: t('descSpeech'),
        group: 'interface',
      },
      {
        id: 'usage',
        label: t('tabUsage'),
        icon: <BarChart3 className="h-4 w-4" />,
        description: t('descUsage'),
        group: 'data',
      },
      {
        id: 'data',
        label: t('tabData'),
        icon: <Database className="h-4 w-4" />,
        description: t('descData'),
        group: 'data',
      },
      {
        id: 'vector',
        label: t('tabVector'),
        icon: <Database className="h-4 w-4" />,
        description: t('descVector'),
        group: 'data',
      },
      ...(isDesktop
        ? [
            {
              id: 'desktop' as const,
              label: t('tabDesktop'),
              icon: <Monitor className="h-4 w-4" />,
              description: t('descDesktop'),
              group: 'system' as const,
            },
            {
              id: 'environment' as const,
              label: t('tabEnvironment'),
              icon: <Settings2 className="h-4 w-4" />,
              description: t('descEnvironment'),
              group: 'system' as const,
            },
            {
              id: 'proxy' as const,
              label: t('tabProxy'),
              icon: <Globe className="h-4 w-4" />,
              description: t('descProxy'),
              group: 'system' as const,
            },
            {
              id: 'selection' as const,
              label: t('tabSelection'),
              icon: <MousePointer2 className="h-4 w-4" />,
              description: t('descSelection'),
              group: 'system' as const,
            },
            {
              id: 'native-tools' as const,
              label: t('tabNativeTools'),
              icon: <Wrench className="h-4 w-4" />,
              description: t('descNativeTools'),
              group: 'system' as const,
            },
            {
              id: 'sandbox' as const,
              label: t('tabSandbox'),
              icon: <Play className="h-4 w-4" />,
              description: t('descSandbox'),
              group: 'system' as const,
            },
            {
              id: 'git' as const,
              label: t('tabGit'),
              icon: <GitBranch className="h-4 w-4" />,
              description: t('descGit'),
              group: 'system' as const,
            },
            {
              id: 'tray' as const,
              label: '系统托盘',
              icon: <Monitor className="h-4 w-4" />,
              description: '配置系统托盘菜单显示模式和内容',
              group: 'system' as const,
            },
          ]
        : []),
    ],
    [t, isDesktop]
  );

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
      case 'tray':
        return <TraySettings />;
      case 'safety':
        return <SafetySettings />;
      case 'observability':
        return <ObservabilitySettings />;
      default:
        return <ProviderSettings />;
    }
  };

  const activeItem = navItems.find((item) => item.id === activeSection);

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <SettingsSidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        navItems={navItems}
        t={t}
      />

      <SidebarInset className="flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-3 border-b px-3 z-10">
          <SidebarTrigger />
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
                {t('exportSettings')}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <label className="cursor-pointer flex items-center">
                  <Upload className="mr-2 h-3.5 w-3.5" />
                  {t('importSettings')}
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
                {t('resetAllSettings')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reset Dialog */}
          <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('resetDialogTitle')}</DialogTitle>
                <DialogDescription>{t('resetDialogDescription')}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button variant="destructive" onClick={handleResetSettings}>
                  {t('resetSettings')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {/* Content area */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 lg:p-6" data-settings-panel>
            <div className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-2 duration-200">
              {renderContent()}
            </div>
          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
