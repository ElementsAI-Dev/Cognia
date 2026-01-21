'use client';

/**
 * ToolSettings - Configure built-in tools for AI agents
 * Allows enabling/disabling file tools, document tools, search, etc.
 */

import { useTranslations } from 'next-intl';
import {
  FileText,
  FolderOpen,
  Search,
  Calculator,
  Code,
  Database,
  Shield,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { SourceVerificationSettings } from './source-verification-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSettingsStore } from '@/stores';
import { TOOL_CATEGORY_CONFIGS } from '@/lib/settings/tools';
import type { ToolCategory } from '@/types/settings/tools';
import type { ReactNode } from 'react';

/**
 * Icon mapping for tool categories
 */
const TOOL_CATEGORY_ICONS: Record<string, ReactNode> = {
  file: <FolderOpen className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
  rag: <Database className="h-4 w-4" />,
  calculator: <Calculator className="h-4 w-4" />,
  code: <Code className="h-4 w-4" />,
};

export function ToolSettings() {
  const t = useTranslations('toolSettings');

  // Tool settings from store
  const enableFileTools = useSettingsStore((state) => state.enableFileTools);
  const setEnableFileTools = useSettingsStore((state) => state.setEnableFileTools);
  const enableDocumentTools = useSettingsStore((state) => state.enableDocumentTools);
  const setEnableDocumentTools = useSettingsStore((state) => state.setEnableDocumentTools);
  const enableCodeExecution = useSettingsStore((state) => state.enableCodeExecution);
  const setEnableCodeExecution = useSettingsStore((state) => state.setEnableCodeExecution);
  const enableWebSearch = useSettingsStore((state) => state.enableWebSearch);
  const setEnableWebSearch = useSettingsStore((state) => state.setEnableWebSearch);
  const enableRAGSearch = useSettingsStore((state) => state.enableRAGSearch);
  const setEnableRAGSearch = useSettingsStore((state) => state.setEnableRAGSearch);
  const enableCalculator = useSettingsStore((state) => state.enableCalculator);
  const setEnableCalculator = useSettingsStore((state) => state.setEnableCalculator);

  // Map category IDs to their enabled state and setters
  const enabledStateMap: Record<
    string,
    { enabled: boolean; setEnabled: (enabled: boolean) => void }
  > = {
    file: { enabled: enableFileTools, setEnabled: setEnableFileTools },
    document: { enabled: enableDocumentTools, setEnabled: setEnableDocumentTools },
    search: { enabled: enableWebSearch, setEnabled: setEnableWebSearch },
    rag: { enabled: enableRAGSearch, setEnabled: setEnableRAGSearch },
    calculator: { enabled: enableCalculator, setEnabled: setEnableCalculator },
    code: { enabled: enableCodeExecution, setEnabled: setEnableCodeExecution },
  };

  // Build tool categories with runtime state from config
  const toolCategories: ToolCategory[] = TOOL_CATEGORY_CONFIGS.map((config) => ({
    ...config,
    icon: TOOL_CATEGORY_ICONS[config.id],
    enabled: enabledStateMap[config.id]?.enabled ?? false,
    setEnabled: enabledStateMap[config.id]?.setEnabled ?? (() => {}),
  }));

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <Alert className="py-2">
        <Shield className="h-3.5 w-3.5" />
        <AlertTitle className="text-sm">{t('permissions')}</AlertTitle>
        <AlertDescription className="text-xs">{t('permissionsDesc')}</AlertDescription>
      </Alert>

      {/* Tool Categories - Compact Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {toolCategories.map((category) => (
          <Card key={category.id} className={!category.enabled ? 'opacity-60' : ''}>
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {category.icon}
                  <CardTitle className="text-sm">{t(category.nameKey)}</CardTitle>
                  {category.requiresApproval && (
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  )}
                </div>
                <Switch checked={category.enabled} onCheckedChange={category.setEnabled} />
              </div>
              <CardDescription className="text-[10px] leading-tight">
                {t(category.descriptionKey)}
              </CardDescription>
            </CardHeader>
            {category.enabled && (
              <CardContent className="pt-0 px-4 pb-3">
                <div className="flex flex-wrap gap-1">
                  {category.tools.map((tool) => (
                    <span
                      key={tool.name}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono ${
                        tool.requiresApproval
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                      title={t(tool.descriptionKey)}
                    >
                      {tool.name}
                      {tool.requiresApproval && <AlertTriangle className="h-2.5 w-2.5" />}
                    </span>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Source Verification Settings - shown when web search is enabled */}
      {enableWebSearch && (
        <Collapsible defaultOpen={false} className="border rounded-lg">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">{t('sourceVerificationSettings')}</span>
            </div>
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t">
            <div className="p-4">
              <SourceVerificationSettings compact />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Desktop App Notice for File Tools */}
      {enableFileTools && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          <AlertTitle className="text-sm">{t('desktopRequired')}</AlertTitle>
          <AlertDescription className="text-xs">{t('desktopRequiredDesc')}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default ToolSettings;
