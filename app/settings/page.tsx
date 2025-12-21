'use client';

/**
 * Settings Page - Dashboard layout with sidebar navigation
 * Responsive design: sidebar on desktop, tabs on mobile
 */

import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Cpu,
  Puzzle,
  FileText,
  Brain,
  BarChart3,
  Palette,
  Search,
  Database,
  ChevronRight,
  MessageSquare,
  Keyboard,
  Settings2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ProviderSettings } from '@/components/settings/provider-settings';
import { AppearanceSettings } from '@/components/settings/appearance-settings';
import { SearchSettings } from '@/components/settings/search-settings';
import { DataSettings } from '@/components/settings/data-settings';
import { MemorySettings } from '@/components/settings/memory-settings';
import { CustomInstructionsSettings } from '@/components/settings/custom-instructions-settings';
import { UsageSettings } from '@/components/settings/usage-settings';
import { McpSettings } from '@/components/settings/mcp-settings';
import { ResponseSettings } from '@/components/settings/response-settings';
import { KeyboardSettings } from '@/components/settings/keyboard-settings';
import { ChatSettings } from '@/components/settings/chat-settings';

type SettingsSection = 
  | 'providers'
  | 'chat'
  | 'mcp'
  | 'instructions'
  | 'memory'
  | 'usage'
  | 'appearance'
  | 'response'
  | 'keyboard'
  | 'search'
  | 'data';

type SettingsGroup = 'ai' | 'interface' | 'data';

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
};

export default function SettingsPage() {
  const t = useTranslations('settings');
  const [activeSection, setActiveSection] = useState<SettingsSection>('providers');
  const [searchQuery, setSearchQuery] = useState('');

  const navItems: NavItem[] = useMemo(() => [
    {
      id: 'providers',
      label: t('tabProviders'),
      icon: <Cpu className="h-5 w-5" />,
      description: 'Configure AI provider API keys',
      group: 'ai',
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <Settings2 className="h-5 w-5" />,
      description: 'Chat behavior settings',
      group: 'ai',
    },
    {
      id: 'mcp',
      label: 'MCP',
      icon: <Puzzle className="h-5 w-5" />,
      description: 'Model Context Protocol servers',
      group: 'ai',
    },
    {
      id: 'instructions',
      label: 'Instructions',
      icon: <FileText className="h-5 w-5" />,
      description: 'Custom AI instructions',
      group: 'ai',
    },
    {
      id: 'memory',
      label: 'Memory',
      icon: <Brain className="h-5 w-5" />,
      description: 'AI memory and context',
      group: 'ai',
    },
    {
      id: 'search',
      label: t('tabSearch'),
      icon: <Search className="h-5 w-5" />,
      description: 'Web search configuration',
      group: 'ai',
    },
    {
      id: 'appearance',
      label: t('tabAppearance'),
      icon: <Palette className="h-5 w-5" />,
      description: 'Theme and display settings',
      group: 'interface',
    },
    {
      id: 'response',
      label: 'Response',
      icon: <MessageSquare className="h-5 w-5" />,
      description: 'AI response formatting',
      group: 'interface',
    },
    {
      id: 'keyboard',
      label: 'Shortcuts',
      icon: <Keyboard className="h-5 w-5" />,
      description: 'Keyboard shortcuts',
      group: 'interface',
    },
    {
      id: 'usage',
      label: 'Usage',
      icon: <BarChart3 className="h-5 w-5" />,
      description: 'Token usage and costs',
      group: 'data',
    },
    {
      id: 'data',
      label: t('tabData'),
      icon: <Database className="h-5 w-5" />,
      description: 'Data management and export',
      group: 'data',
    },
  ], [t]);

  const renderContent = () => {
    switch (activeSection) {
      case 'providers':
        return <ProviderSettings />;
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
      case 'search':
        return <SearchSettings />;
      case 'data':
        return <DataSettings />;
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
    const groups: Record<SettingsGroup, NavItem[]> = { ai: [], interface: [], data: [] };
    for (const item of filteredNavItems) {
      groups[item.group].push(item);
    }
    return groups;
  }, [filteredNavItems]);

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b px-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          {activeItem && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg text-muted-foreground">{activeItem.label}</span>
            </>
          )}
        </div>
      </header>

      {/* Main content with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - hidden on mobile */}
        <aside className="hidden w-56 shrink-0 border-r bg-muted/30 md:block lg:w-60">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <ScrollArea className="h-[calc(100%-60px)]">
            <nav className="flex flex-col gap-1 p-3">
              {filteredNavItems.length > 0 ? (
                (['ai', 'interface', 'data'] as SettingsGroup[]).map((group) => {
                  const items = groupedItems[group];
                  if (items.length === 0) return null;
                  return (
                    <div key={group} className="mb-2">
                      <div className="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {groupLabels[group]}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={cn(
                              'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors text-sm',
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
        </aside>

        {/* Mobile navigation - improved layout */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Mobile search bar */}
          <div className="shrink-0 border-b md:hidden p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Mobile navigation tabs */}
          <div className="shrink-0 border-b md:hidden overflow-x-auto">
            <div className="flex gap-1 p-2 min-w-max">
                {filteredNavItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      'flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                      activeSection === item.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-accent'
                    )}
                  >
                    <span className="[&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
                {filteredNavItems.length === 0 && (
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    No settings found
                  </div>
                )}
            </div>
          </div>

          {/* Content area */}
          <ScrollArea className="flex-1">
            <div className="p-4 lg:p-6">
              <div className="mx-auto max-w-3xl">
                {renderContent()}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
