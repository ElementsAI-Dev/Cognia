'use client';

/**
 * Settings Page - Dashboard layout with sidebar navigation
 * Responsive design: sidebar on desktop, tabs on mobile
 */

import { useState } from 'react';
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
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
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

type SettingsSection = 
  | 'providers'
  | 'mcp'
  | 'instructions'
  | 'memory'
  | 'usage'
  | 'appearance'
  | 'search'
  | 'data';

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const [activeSection, setActiveSection] = useState<SettingsSection>('providers');

  const navItems: NavItem[] = [
    {
      id: 'providers',
      label: t('tabProviders'),
      icon: <Cpu className="h-5 w-5" />,
      description: 'Configure AI provider API keys',
    },
    {
      id: 'mcp',
      label: 'MCP',
      icon: <Puzzle className="h-5 w-5" />,
      description: 'Model Context Protocol servers',
    },
    {
      id: 'instructions',
      label: 'Instructions',
      icon: <FileText className="h-5 w-5" />,
      description: 'Custom AI instructions',
    },
    {
      id: 'memory',
      label: 'Memory',
      icon: <Brain className="h-5 w-5" />,
      description: 'AI memory and context',
    },
    {
      id: 'usage',
      label: 'Usage',
      icon: <BarChart3 className="h-5 w-5" />,
      description: 'Token usage and costs',
    },
    {
      id: 'appearance',
      label: t('tabAppearance'),
      icon: <Palette className="h-5 w-5" />,
      description: 'Theme and display settings',
    },
    {
      id: 'search',
      label: t('tabSearch'),
      icon: <Search className="h-5 w-5" />,
      description: 'Web search configuration',
    },
    {
      id: 'data',
      label: t('tabData'),
      icon: <Database className="h-5 w-5" />,
      description: 'Data management and export',
    },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'providers':
        return <ProviderSettings />;
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
      case 'search':
        return <SearchSettings />;
      case 'data':
        return <DataSettings />;
      default:
        return <ProviderSettings />;
    }
  };

  const activeItem = navItems.find((item) => item.id === activeSection);

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b px-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
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
        <aside className="hidden w-64 shrink-0 border-r bg-muted/30 md:block lg:w-72">
          <ScrollArea className="h-full">
            <nav className="flex flex-col gap-1 p-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors',
                    activeSection === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  )}
                >
                  <div className={cn(
                    'mt-0.5',
                    activeSection === item.id ? 'text-primary-foreground' : 'text-muted-foreground'
                  )}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.label}</div>
                    <div className={cn(
                      'text-xs truncate',
                      activeSection === item.id
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    )}>
                      {item.description}
                    </div>
                  </div>
                </button>
              ))}
            </nav>
          </ScrollArea>
        </aside>

        {/* Mobile navigation - horizontal scroll */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="shrink-0 border-b md:hidden overflow-x-auto">
            <div className="flex gap-1 p-2 min-w-max">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      'flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors',
                      activeSection === item.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-accent'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Content area */}
          <ScrollArea className="flex-1">
            <div className="p-6 lg:p-8">
              <div className="mx-auto max-w-4xl">
                {renderContent()}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
